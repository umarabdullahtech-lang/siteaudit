import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { CrawlerModule } from '../crawler/crawler.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [CrawlerModule, QueueModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
