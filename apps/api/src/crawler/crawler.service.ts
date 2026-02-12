import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { RobotsTxtService } from './robotstxt.service';
import { SitemapService } from './sitemap.service';
import { StaticAnalyzerService } from './static-analyzer.service';

export interface CrawlResult {
  url: string;
  statusCode: number;
  title: string;
  analysis: any;
  error?: string;
}

@Injectable()
export class CrawlerService {
  private logger = new Logger(CrawlerService.name);
  private browser: Browser | null = null;

  constructor(
    private robotsTxtService: RobotsTxtService,
    private sitemapService: SitemapService,
    private staticAnalyzer: StaticAnalyzerService,
  ) {}

  async crawl(
    baseUrl: string,
    maxDepth: number,
    maxPages: number,
    onProgress?: (progress: number, status: string) => void,
  ): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [];

    try {
      // Initialize browser
      this.browser = await chromium.launch({ headless: true });

      // Check robots.txt
      onProgress?.(5, 'Checking robots.txt...');
      const robotsRules = await this.robotsTxtService.parse(baseUrl);

      // Get sitemap URLs
      onProgress?.(10, 'Parsing sitemap...');
      const sitemapUrls = await this.sitemapService.getUrls(baseUrl);

      // Add sitemap URLs to queue
      for (const url of sitemapUrls.slice(0, maxPages)) {
        if (!visited.has(url)) {
          queue.push({ url, depth: 0 });
        }
      }

      // Add base URL if not in sitemap
      if (!visited.has(baseUrl)) {
        queue.push({ url: baseUrl, depth: 0 });
      }

      // Crawl pages
      const page = await this.browser.newPage();
      let crawled = 0;

      while (queue.length > 0 && results.length < maxPages) {
        const { url, depth } = queue.shift()!;

        if (visited.has(url)) continue;
        if (!this.robotsTxtService.isAllowed(robotsRules, url)) continue;

        visited.add(url);

        try {
          onProgress?.(
            10 + Math.floor((crawled / maxPages) * 70),
            `Crawling ${new URL(url).pathname}...`,
          );

          const result = await this.crawlPage(page, url);
          results.push(result);

          // Extract links for deeper crawling
          if (depth < maxDepth) {
            const links = await this.extractLinks(page, baseUrl);
            for (const link of links) {
              if (!visited.has(link)) {
                queue.push({ url: link, depth: depth + 1 });
              }
            }
          }

          crawled++;
        } catch (error: any) {
          this.logger.error(`Error crawling ${url}: ${error.message}`);
          results.push({
            url,
            statusCode: 0,
            title: '',
            analysis: null,
            error: error.message,
          });
        }
      }

      await page.close();
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }

    return results;
  }

  private async crawlPage(page: Page, url: string): Promise<CrawlResult> {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const html = await page.content();
    const title = await page.title();

    const analysis = this.staticAnalyzer.analyze(html, url);

    return {
      url,
      statusCode: response?.status() || 0,
      title,
      analysis,
    };
  }

  private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.getAttribute('href'))
        .filter((href) => href && !href.startsWith('#'));
    });

    const baseUrlObj = new URL(baseUrl);
    const uniqueLinks = new Set<string>();

    for (const link of links) {
      try {
        const fullUrl = new URL(link!, baseUrl);
        if (fullUrl.hostname === baseUrlObj.hostname) {
          uniqueLinks.add(fullUrl.origin + fullUrl.pathname);
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    return Array.from(uniqueLinks);
  }
}
