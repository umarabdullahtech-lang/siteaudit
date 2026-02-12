import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CrawlerService } from '../crawler/crawler.service';
import { LighthouseService } from '../crawler/lighthouse.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CrawlJobData } from './queue.service';

@Processor('crawl')
export class CrawlProcessor extends WorkerHost {
  private logger = new Logger(CrawlProcessor.name);

  constructor(
    private crawlerService: CrawlerService,
    private lighthouseService: LighthouseService,
    private aiService: AiService,
    private prisma: PrismaService,
    private wsGateway: WebsocketGateway,
  ) {
    super();
  }

  async process(job: Job<CrawlJobData>) {
    const { auditId, url, maxDepth, maxPages } = job.data;
    this.logger.log(`Starting crawl job ${job.id} for ${url}`);

    try {
      // Update audit status
      await this.prisma.audit.update({
        where: { id: auditId },
        data: { status: 'running' },
      });

      // Crawl pages
      const crawlResults = await this.crawlerService.crawl(
        url,
        maxDepth,
        maxPages,
        (progress, status) => {
          job.updateProgress(progress);
          this.wsGateway.sendAuditProgress(auditId, progress, status);
        },
      );

      // Run Lighthouse
      this.wsGateway.sendAuditProgress(auditId, 85, 'Running performance analysis...');
      const lighthouseResult = await this.lighthouseService.analyze(url);

      // AI Analysis
      this.wsGateway.sendAuditProgress(auditId, 92, 'AI content analysis...');
      const aiInsights = await this.aiService.analyzeContent(crawlResults);

      // Calculate overall score
      const score = this.calculateHealthScore(crawlResults, lighthouseResult);

      // Count issues
      const errors = crawlResults.reduce(
        (acc, r) => acc + (r.analysis?.issues?.filter((i: any) => i.type === 'error')?.length || 0),
        0,
      );
      const warnings = crawlResults.reduce(
        (acc, r) => acc + (r.analysis?.issues?.filter((i: any) => i.type === 'warning')?.length || 0),
        0,
      );

      // Save results
      const results = {
        score,
        pagesAnalyzed: crawlResults.length,
        errors,
        warnings,
        pages: crawlResults,
        lighthouse: lighthouseResult,
        aiInsights,
      };

      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: 'complete',
          results,
          completedAt: new Date(),
        },
      });

      this.wsGateway.sendAuditProgress(auditId, 100, 'Complete!');
      this.wsGateway.sendAuditComplete(auditId, results);

      return results;
    } catch (error: any) {
      this.logger.error(`Crawl job failed: ${error.message}`);

      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: 'failed',
          results: { error: error.message },
        },
      });

      this.wsGateway.sendAuditError(auditId, error.message);
      throw error;
    }
  }

  private calculateHealthScore(crawlResults: any[], lighthouseResult: any): number {
    let score = 100;

    // Deduct for errors and warnings
    for (const result of crawlResults) {
      if (result.analysis?.issues) {
        for (const issue of result.analysis.issues) {
          if (issue.type === 'error') score -= 5;
          if (issue.type === 'warning') score -= 1;
        }
      }
    }

    // Factor in Lighthouse performance
    if (lighthouseResult) {
      const avgLighthouse =
        (lighthouseResult.performance +
          lighthouseResult.accessibility +
          lighthouseResult.seo) /
        3;
      score = Math.round((score + avgLighthouse) / 2);
    }

    return Math.max(0, Math.min(100, score));
  }
}
