import { Injectable, Logger } from '@nestjs/common';
import { CrawlResultModel, ICrawlResult } from './schemas';

@Injectable()
export class CrawlResultsRepository {
  private logger = new Logger(CrawlResultsRepository.name);

  async saveCrawlResult(data: Partial<ICrawlResult>): Promise<ICrawlResult> {
    try {
      const result = await CrawlResultModel.findOneAndUpdate(
        { auditId: data.auditId, url: data.url },
        { $set: data },
        { upsert: true, new: true },
      );
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to save crawl result: ${error.message}`);
      throw error;
    }
  }

  async saveBulkResults(results: Partial<ICrawlResult>[]): Promise<number> {
    if (results.length === 0) return 0;
    try {
      const ops = results.map((r) => ({
        updateOne: {
          filter: { auditId: r.auditId, url: r.url },
          update: { $set: r },
          upsert: true,
        },
      }));
      const result = await CrawlResultModel.bulkWrite(ops);
      return result.upsertedCount + result.modifiedCount;
    } catch (error: any) {
      this.logger.error(`Bulk save failed: ${error.message}`);
      throw error;
    }
  }

  async getResultsByAudit(auditId: string): Promise<ICrawlResult[]> {
    return CrawlResultModel.find({ auditId }).lean() as unknown as ICrawlResult[];
  }

  async getResultByUrl(auditId: string, url: string): Promise<ICrawlResult | null> {
    return CrawlResultModel.findOne({ auditId, url }).lean() as unknown as ICrawlResult | null;
  }

  async getErrorPages(auditId: string): Promise<ICrawlResult[]> {
    return CrawlResultModel.find({
      auditId,
      'analysis.issues.type': 'error',
    }).lean() as unknown as ICrawlResult[];
  }

  async getPageCount(auditId: string): Promise<number> {
    return CrawlResultModel.countDocuments({ auditId });
  }

  async deleteByAudit(auditId: string): Promise<number> {
    const result = await CrawlResultModel.deleteMany({ auditId });
    return result.deletedCount;
  }
}
