import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { RobotsTxtService } from './robotstxt.service';
import { SitemapService } from './sitemap.service';
import { StaticAnalyzerService } from './static-analyzer.service';
import { LighthouseService } from './lighthouse.service';

@Module({
  providers: [
    CrawlerService,
    RobotsTxtService,
    SitemapService,
    StaticAnalyzerService,
    LighthouseService,
  ],
  exports: [
    CrawlerService,
    RobotsTxtService,
    SitemapService,
    StaticAnalyzerService,
    LighthouseService,
  ],
})
export class CrawlerModule {}
