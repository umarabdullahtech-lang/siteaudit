import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';

const SITEMAP_FETCH_TIMEOUT = 15000;
const MAX_SITEMAP_SIZE = 10 * 1024 * 1024; // 10MB per sitemap
const MAX_URLS = 50000; // Google's limit per sitemap
const MAX_NESTED_DEPTH = 3; // Prevent infinite sitemap index recursion

@Injectable()
export class SitemapService {
  private logger = new Logger(SitemapService.name);

  async getUrls(baseUrl: string, robotsSitemaps?: string[]): Promise<string[]> {
    const urls = new Set<string>();

    // Build list of sitemap URLs to try
    const sitemapCandidates: string[] = [];

    // Add sitemaps from robots.txt first (most authoritative)
    if (robotsSitemaps && robotsSitemaps.length > 0) {
      sitemapCandidates.push(...robotsSitemaps);
    }

    // Fall back to common locations
    sitemapCandidates.push(
      new URL('/sitemap.xml', baseUrl).toString(),
      new URL('/sitemap_index.xml', baseUrl).toString(),
      new URL('/sitemap/sitemap.xml', baseUrl).toString(),
      new URL('/wp-sitemap.xml', baseUrl).toString(), // WordPress
      new URL('/sitemap.xml.gz', baseUrl).toString(), // Compressed
    );

    // Deduplicate
    const uniqueCandidates = [...new Set(sitemapCandidates)];

    for (const sitemapUrl of uniqueCandidates) {
      if (urls.size >= MAX_URLS) break;

      try {
        await this.fetchSitemap(sitemapUrl, urls, 0);
        if (urls.size > 0) {
          this.logger.debug(`Found ${urls.size} URLs from ${sitemapUrl}`);
          break; // Found a working sitemap, stop trying others
        }
      } catch (error: any) {
        this.logger.debug(`Sitemap ${sitemapUrl}: ${error.message}`);
        // Try next location
      }
    }

    return Array.from(urls);
  }

  private async fetchSitemap(
    sitemapUrl: string,
    urls: Set<string>,
    depth: number,
  ): Promise<void> {
    if (depth > MAX_NESTED_DEPTH) {
      this.logger.debug(`Max sitemap nesting depth reached at ${sitemapUrl}`);
      return;
    }
    if (urls.size >= MAX_URLS) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SITEMAP_FETCH_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SiteAuditBot/1.0',
          'Accept': 'application/xml, text/xml, application/gzip, */*',
          'Accept-Encoding': 'gzip, deflate',
        },
        redirect: 'follow',
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Timeout fetching ${sitemapUrl}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let content: string;

    // Handle gzipped sitemaps
    const contentEncoding = response.headers.get('content-encoding');
    const isGzipped = sitemapUrl.endsWith('.gz') || contentEncoding === 'gzip';

    if (isGzipped && response.body) {
      content = await this.decompressGzip(response);
    } else {
      content = await response.text();
    }

    // Guard against huge files
    if (content.length > MAX_SITEMAP_SIZE) {
      this.logger.warn(`Sitemap ${sitemapUrl} exceeds ${MAX_SITEMAP_SIZE} bytes, truncating`);
      content = content.slice(0, MAX_SITEMAP_SIZE);
    }

    // Detect if this is a sitemap index
    const isSitemapIndex = content.includes('<sitemapindex') || content.includes('<sitemap>');

    if (isSitemapIndex) {
      // Extract nested sitemap URLs
      const nestedSitemaps = this.extractSitemapIndexUrls(content);
      this.logger.debug(`Sitemap index at ${sitemapUrl} contains ${nestedSitemaps.length} sitemaps`);

      for (const nestedUrl of nestedSitemaps) {
        if (urls.size >= MAX_URLS) break;
        try {
          await this.fetchSitemap(nestedUrl, urls, depth + 1);
        } catch (error: any) {
          this.logger.debug(`Failed to fetch nested sitemap ${nestedUrl}: ${error.message}`);
        }
      }
    } else {
      // Extract page URLs
      const pageUrls = this.extractUrlsFromSitemap(content);
      for (const url of pageUrls) {
        if (urls.size >= MAX_URLS) break;
        urls.add(url);
      }
    }
  }

  private async decompressGzip(response: Response): Promise<string> {
    try {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new Promise<string>((resolve, reject) => {
        const gunzip = createGunzip();
        const chunks: Buffer[] = [];
        let totalSize = 0;

        const readable = Readable.from(buffer);
        readable
          .pipe(gunzip)
          .on('data', (chunk: Buffer) => {
            totalSize += chunk.length;
            if (totalSize > MAX_SITEMAP_SIZE) {
              gunzip.destroy(new Error('Decompressed sitemap exceeds size limit'));
              return;
            }
            chunks.push(chunk);
          })
          .on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
          .on('error', (err) => reject(err));
      });
    } catch (error: any) {
      // If gzip decompression fails, try reading as plain text
      this.logger.debug(`Gzip decompression failed, might be plain text: ${error.message}`);
      throw error;
    }
  }

  private extractSitemapIndexUrls(xml: string): string[] {
    const urls: string[] = [];
    // Match <loc> inside <sitemap> elements
    const sitemapBlockRegex = /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi;
    let blockMatch;

    while ((blockMatch = sitemapBlockRegex.exec(xml)) !== null) {
      const locMatch = blockMatch[1].match(/<loc>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/loc>|<loc>(.*?)<\/loc>/i);
      if (locMatch) {
        const url = (locMatch[1] || locMatch[2] || '').trim();
        if (url) {
          try {
            new URL(url); // Validate
            urls.push(url);
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    return urls;
  }

  private extractUrlsFromSitemap(xml: string): string[] {
    const urls: string[] = [];

    // Handle CDATA and regular loc tags
    const locRegex = /<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/loc>/gi;
    let match;

    while ((match = locRegex.exec(xml)) !== null) {
      const url = match[1].trim();
      if (!url) continue;

      try {
        const parsed = new URL(url);
        // Skip sitemap files (they should be in sitemapindex)
        if (parsed.pathname.match(/sitemap.*\.xml(\.gz)?$/i)) continue;
        urls.push(url);
      } catch {
        // Skip invalid URLs
      }
    }

    return urls;
  }
}
