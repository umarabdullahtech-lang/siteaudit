import { Global, Module } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { CrawlResultsRepository } from './crawl-results.repository';

@Global()
@Module({
  providers: [MongoService, CrawlResultsRepository],
  exports: [MongoService, CrawlResultsRepository],
})
export class MongoModule {}
