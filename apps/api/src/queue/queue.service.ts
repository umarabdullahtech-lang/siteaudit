import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface CrawlJobData {
  auditId: string;
  url: string;
  maxDepth: number;
  maxPages: number;
}

@Injectable()
export class QueueService {
  constructor(@InjectQueue('crawl') private crawlQueue: Queue) {}

  async addCrawlJob(data: CrawlJobData) {
    return this.crawlQueue.add('crawl', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async getJobStatus(jobId: string) {
    const job = await this.crawlQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
    };
  }
}
