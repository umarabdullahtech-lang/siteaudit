import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SitemapService {
  private logger = new Logger(SitemapService.name);

  async getUrls(baseUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Try common sitemap locations
      const sitemapUrls = [
        new URL('/sitemap.xml', baseUrl).toString(),
        new URL('/sitemap_index.xml', baseUrl).toString(),
        new URL('/sitemap/sitemap.xml', baseUrl).toString(),
      ];

      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await fetch(sitemapUrl);
          if (response.ok) {
            const content = await response.text();
            const extractedUrls = this.extractUrlsFromSitemap(content);
            urls.push(...extractedUrls);
            break;
          }
        } catch {
          // Try next location
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to fetch sitemap: ${error.message}`);
    }

    return [...new Set(urls)]; // Remove duplicates
  }

  private extractUrlsFromSitemap(xml: string): string[] {
    const urls: string[] = [];

    // Extract <loc> tags (simple regex approach)
    const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
    for (const match of locMatches) {
      const url = match[1].trim();
      // Check if it's a sitemap index (contains other sitemaps)
      if (url.endsWith('.xml')) {
        // Could recursively fetch nested sitemaps here
        // For now, skip sitemap index entries
        if (!url.includes('sitemap')) {
          urls.push(url);
        }
      } else {
        urls.push(url);
      }
    }

    return urls;
  }
}
