import { Injectable, Logger } from '@nestjs/common';

export interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  metrics: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    cls: number; // Cumulative Layout Shift
    tbt: number; // Total Blocking Time
    speedIndex: number;
  };
}

@Injectable()
export class LighthouseService {
  private logger = new Logger(LighthouseService.name);

  async analyze(url: string): Promise<LighthouseResult | null> {
    try {
      // Dynamic import of lighthouse
      const lighthouse = (await import('lighthouse')).default;
      const chromeLauncher = await import('chrome-launcher');

      const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox'],
      });

      const options = {
        logLevel: 'error' as const,
        output: 'json' as const,
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      };

      const result = await lighthouse(url, options);
      await chrome.kill();

      if (!result?.lhr) {
        return null;
      }

      const { lhr } = result;

      return {
        performance: Math.round((lhr.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100),
        metrics: {
          fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
          lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
          cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
          tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
          speedIndex: lhr.audits['speed-index']?.numericValue || 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Lighthouse analysis failed: ${error.message}`);
      return null;
    }
  }
}
