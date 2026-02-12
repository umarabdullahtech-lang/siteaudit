import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { CrawlProcessor } from './crawl.processor';
import { CrawlerModule } from '../crawler/crawler.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crawl',
    }),
    CrawlerModule,
    AiModule,
  ],
  providers: [QueueService, CrawlProcessor],
  exports: [QueueService],
})
export class QueueModule {}
