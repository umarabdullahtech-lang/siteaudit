import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext, Response as PlaywrightResponse } from 'playwright';
import { RobotsTxtService } from './robotstxt.service';
import { SitemapService } from './sitemap.service';
import { StaticAnalyzerService } from './static-analyzer.service';

// ─── Public interfaces (keep backward-compatible) ─────────────────────────────

export interface CrawlResult {
  url: string;
  finalUrl?: string;
  statusCode: number;
  title: string;
  analysis: any;
  error?: string;
  errorType?: ErrorType;
  responseTimeMs?: number;
}

export type ErrorType =
  | 'timeout'
  | 'dns'
  | 'ssl'
  | 'connection_refused'
  | 'blocked'
  | 'anti_bot'
  | 'http_error'
  | 'parse_error'
  | 'unknown';

// ─── Internal constants ───────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
];

const COOKIE_CONSENT_SELECTORS = [
  // Common cookie consent buttons
  '[id*="cookie"] button[class*="accept"]',
  '[id*="cookie"] button[class*="agree"]',
  '[class*="cookie"] button[class*="accept"]',
  '[class*="cookie"] button[class*="agree"]',
  '[id*="consent"] button[class*="accept"]',
  '[class*="consent"] button[class*="accept"]',
  'button[id*="accept-cookie"]',
  'button[id*="acceptCookie"]',
  'button[id*="cookie-accept"]',
  'button[class*="cookie-accept"]',
  '#onetrust-accept-btn-handler',
  '.cc-accept',
  '.cc-dismiss',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  '[data-testid="cookie-policy-dialog-accept-button"]',
  'button[aria-label*="accept cookie"]',
  'button[aria-label*="Accept cookie"]',
  'button[aria-label*="Accept all"]',
  'button[aria-label*="accept all"]',
  '.js-cookie-consent-agree',
  '#gdpr-cookie-accept',
  '.gdpr-accept',
];

const ANTI_BOT_SIGNALS = [
  'cf-browser-verification',
  'cf-challenge',
  'challenge-platform',
  'just a moment',
  'checking your browser',
  'attention required',
  'access denied',
  'please verify you are a human',
  'captcha',
  'recaptcha',
  'hcaptcha',
  'cloudflare',
  'ddos protection',
  'bot protection',
];

const PAGE_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const MAX_CONCURRENT_PAGES = 5;
const DEFAULT_DELAY_MS = 500;

// ─── Service ──────────────────────────────────────────────────────────────────

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

    // Normalize the base URL
    baseUrl = this.normalizeUrl(baseUrl) || baseUrl;
    let baseHost: string;
    try {
      baseHost = new URL(baseUrl).hostname;
    } catch {
      return [{
        url: baseUrl,
        statusCode: 0,
        title: '',
        analysis: null,
        error: `Invalid base URL: ${baseUrl}`,
        errorType: 'parse_error',
      }];
    }

    try {
      // Launch browser with stealth-friendly options
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--disable-dev-shm-usage',
        ],
      });

      // Check robots.txt
      onProgress?.(5, 'Checking robots.txt...');
      const robotsRules = await this.robotsTxtService.parse(baseUrl);
      const crawlDelay = robotsRules.crawlDelay
        ? Math.max(robotsRules.crawlDelay * 1000, DEFAULT_DELAY_MS)
        : DEFAULT_DELAY_MS;

      // Get sitemap URLs
      onProgress?.(10, 'Parsing sitemap...');
      const sitemapUrls = await this.sitemapService.getUrls(baseUrl, robotsRules.sitemaps);

      // Add sitemap URLs to queue (normalize each)
      for (const url of sitemapUrls.slice(0, maxPages * 2)) {
        const normalized = this.normalizeUrl(url);
        if (normalized && !visited.has(normalized)) {
          queue.push({ url: normalized, depth: 0 });
        }
      }

      // Add base URL if not already queued
      const normalizedBase = this.normalizeUrl(baseUrl) || baseUrl;
      if (!visited.has(normalizedBase)) {
        queue.unshift({ url: normalizedBase, depth: 0 });
      }

      // Crawl pages sequentially (one page at a time for reliability + respecting crawl-delay)
      let crawled = 0;

      while (queue.length > 0 && results.length < maxPages) {
        const item = queue.shift()!;
        const { url, depth } = item;

        if (visited.has(url)) continue;
        if (!this.isSameHost(url, baseHost)) continue;
        if (!this.robotsTxtService.isAllowed(robotsRules, url)) {
          this.logger.debug(`Blocked by robots.txt: ${url}`);
          continue;
        }

        visited.add(url);

        try {
          onProgress?.(
            10 + Math.floor((crawled / maxPages) * 70),
            `Crawling ${this.getPathname(url)}...`,
          );

          const result = await this.crawlPageWithRetry(url, crawlDelay);
          results.push(result);
          crawled++;

          // Extract links for deeper crawling from the HTML we already have
          if (depth < maxDepth && result.statusCode >= 200 && result.statusCode < 400 && result.analysis) {
            // We extract links during crawlPage using Playwright's page.evaluate,
            // but the page is already closed. Instead, extract from the HTML we analyzed.
            // Use a lightweight approach: parse links from the analysis or re-extract.
            // The crawlPageWithRetry already closes the page, so we extract links
            // inside that method and attach them to the result.
            if ((result as any)._extractedLinks) {
              for (const link of (result as any)._extractedLinks) {
                const normalized = this.normalizeUrl(link);
                if (normalized && !visited.has(normalized)) {
                  queue.push({ url: normalized, depth: depth + 1 });
                }
              }
              delete (result as any)._extractedLinks;
            }
          }
        } catch (error: any) {
          this.logger.error(`Unexpected error crawling ${url}: ${error.message}`);
          results.push({
            url,
            statusCode: 0,
            title: '',
            analysis: null,
            error: error.message,
            errorType: 'unknown',
          });
          crawled++;
        }

        // Rate limiting delay between requests
        if (crawlDelay > 0 && queue.length > 0) {
          await this.sleep(crawlDelay);
        }
      }

    } finally {
      await this.cleanup();
    }

    return results;
  }

  /**
   * Crawl a single page with retry logic and exponential backoff.
   */
  private async crawlPageWithRetry(
    url: string,
    _crawlDelay: number,
  ): Promise<CrawlResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let page: Page | null = null;

      try {
        if (!this.browser) throw new Error('Browser not initialized');

        // Create a fresh context for isolation (with a rotated user-agent)
        const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const context = await this.browser.newContext({
          userAgent: ua,
          viewport: { width: 1920, height: 1080 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
          ignoreHTTPSErrors: true,
          javaScriptEnabled: true,
          extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
          },
        });

        // Anti-detection: override navigator.webdriver
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          // Remove Playwright/automation markers
          // @ts-ignore
          delete window.__playwright;
          // @ts-ignore
          delete window.__pw_manual;
        });

        page = await context.newPage();

        const startTime = Date.now();

        // Navigate with appropriate wait strategy
        let response: PlaywrightResponse | null = null;
        try {
          response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: PAGE_TIMEOUT,
          });

          // Wait for network to settle (with a shorter timeout)
          try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          } catch {
            // Network idle timeout is okay - some sites never stop loading
            this.logger.debug(`Network idle timeout for ${url}, proceeding with DOM content`);
          }
        } catch (navError: any) {
          // If domcontentloaded fails, try a more lenient approach
          if (navError.message?.includes('timeout')) {
            this.logger.debug(`Navigation timeout for ${url}, attempting commit-only`);
            try {
              response = await page.goto(url, {
                waitUntil: 'commit',
                timeout: PAGE_TIMEOUT,
              });
            } catch {
              throw navError; // Re-throw original
            }
          } else {
            throw navError;
          }
        }

        const responseTimeMs = Date.now() - startTime;

        // Check for anti-bot pages
        const content = await page.content();
        const lowerContent = content.toLowerCase();
        const isAntiBot = this.detectAntiBot(lowerContent, response);

        if (isAntiBot) {
          // Wait a bit and check if the challenge resolves
          await this.sleep(3000);
          const newContent = await page.content();
          const stillBlocked = this.detectAntiBot(newContent.toLowerCase(), null);

          if (stillBlocked) {
            await page.close();
            await context.close();
            return {
              url,
              finalUrl: page.url(),
              statusCode: response?.status() || 403,
              title: '',
              analysis: null,
              error: 'Page blocked by anti-bot protection (Cloudflare/CAPTCHA)',
              errorType: 'anti_bot',
              responseTimeMs,
            };
          }
          // Challenge was solved, continue with new content
        }

        // Dismiss cookie consent banners
        await this.dismissCookieConsent(page);

        // Get final content after any consent dismissal
        const html = await page.content();
        const title = await page.title().catch(() => '');
        const finalUrl = page.url();
        const statusCode = response?.status() || 0;

        // Extract links before closing the page
        let extractedLinks: string[] = [];
        try {
          extractedLinks = await this.extractLinks(page, url);
        } catch {
          // Link extraction is best-effort
        }

        // Analyze the page
        const analysis = this.staticAnalyzer.analyze(html, finalUrl || url);

        await page.close();
        await context.close();

        const result: CrawlResult & { _extractedLinks?: string[] } = {
          url,
          finalUrl: finalUrl !== url ? finalUrl : undefined,
          statusCode,
          title,
          analysis,
          responseTimeMs,
        };
        // Attach links for the parent crawl loop to use
        result._extractedLinks = extractedLinks;
        return result;
      } catch (error: any) {
        lastError = error;

        // Close page/context on error
        try {
          if (page) {
            const ctx = page.context();
            await page.close().catch(() => {});
            await ctx.close().catch(() => {});
          }
        } catch {
          // Ignore cleanup errors
        }

        const errorType = this.classifyError(error);

        // Don't retry certain errors
        if (errorType === 'dns' || errorType === 'ssl' || errorType === 'blocked') {
          return {
            url,
            statusCode: 0,
            title: '',
            analysis: null,
            error: error.message,
            errorType,
          };
        }

        if (attempt < MAX_RETRIES - 1) {
          const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          this.logger.debug(`Retry ${attempt + 1}/${MAX_RETRIES} for ${url} after ${Math.round(backoff)}ms`);
          await this.sleep(backoff);
        }
      }
    }

    return {
      url,
      statusCode: 0,
      title: '',
      analysis: null,
      error: lastError?.message || 'Max retries exceeded',
      errorType: this.classifyError(lastError),
    };
  }

  /**
   * Attempt to dismiss cookie consent banners.
   */
  private async dismissCookieConsent(page: Page): Promise<void> {
    try {
      for (const selector of COOKIE_CONSENT_SELECTORS) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible().catch(() => false);
            if (isVisible) {
              await element.click({ timeout: 2000 }).catch(() => {});
              this.logger.debug(`Dismissed cookie consent with selector: ${selector}`);
              await this.sleep(500); // Wait for dialog to close
              return;
            }
          }
        } catch {
          // Selector not found or not clickable, try next
        }
      }

      // Fallback: try to find any visible button with accept/agree text
      try {
        const buttons = await page.$$('button, a[role="button"], [class*="btn"]');
        for (const button of buttons.slice(0, 20)) {
          // Only check first 20 to avoid slowness
          const text = await button.textContent().catch(() => '');
          const isVisible = await button.isVisible().catch(() => false);
          if (
            isVisible &&
            text &&
            /^(accept|agree|ok|got it|i agree|accept all|allow all|allow cookies|close)/i.test(
              text.trim(),
            )
          ) {
            await button.click({ timeout: 2000 }).catch(() => {});
            this.logger.debug(`Dismissed cookie consent via text match: "${text.trim()}"`);
            return;
          }
        }
      } catch {
        // Not critical
      }
    } catch {
      // Cookie consent dismissal is best-effort
    }
  }

  /**
   * Detect anti-bot protection pages.
   */
  private detectAntiBot(
    lowerContent: string,
    response: PlaywrightResponse | null,
  ): boolean {
    // Check for known anti-bot page signatures
    const matchCount = ANTI_BOT_SIGNALS.filter((sig) =>
      lowerContent.includes(sig),
    ).length;

    // Need at least 2 signals to be confident (avoid false positives)
    if (matchCount >= 2) return true;

    // Check HTTP status + signal combo
    if (response) {
      const status = response.status();
      if ((status === 403 || status === 503) && matchCount >= 1) return true;

      // Cloudflare-specific headers
      const server = response.headers()['server'] || '';
      if (server.toLowerCase().includes('cloudflare') && status === 403) return true;
    }

    return false;
  }

  /**
   * Extract links from the current page, restricted to same-host.
   */
  private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    let links: (string | null)[];
    try {
      links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map((a) => a.getAttribute('href'))
          .filter((href) => href && !href.startsWith('#') && !href.startsWith('javascript:')
            && !href.startsWith('mailto:') && !href.startsWith('tel:'));
      });
    } catch {
      return [];
    }

    let baseHost: string;
    try {
      baseHost = new URL(baseUrl).hostname;
    } catch {
      return [];
    }

    const uniqueLinks = new Set<string>();

    for (const link of links) {
      if (!link) continue;
      try {
        const fullUrl = new URL(link, page.url());
        if (fullUrl.hostname === baseHost && (fullUrl.protocol === 'http:' || fullUrl.protocol === 'https:')) {
          const normalized = this.normalizeUrl(fullUrl.toString());
          if (normalized) {
            uniqueLinks.add(normalized);
          }
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    return Array.from(uniqueLinks);
  }

  // ─── URL Normalization ────────────────────────────────────────────────────

  /**
   * Normalize a URL for deduplication:
   * - Strip fragments
   * - Remove trailing slashes (except root)
   * - Sort query parameters
   * - Lowercase hostname and scheme
   * - Decode unnecessary percent-encoding
   */
  normalizeUrl(rawUrl: string): string | null {
    try {
      const url = new URL(rawUrl);

      // Only crawl HTTP(S)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

      // Strip fragment
      url.hash = '';

      // Sort query parameters
      const params = new URLSearchParams(url.searchParams);
      const sorted = new URLSearchParams([...params.entries()].sort());
      url.search = sorted.toString() ? `?${sorted.toString()}` : '';

      // Remove trailing slash (except root path)
      let pathname = url.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      url.pathname = pathname;

      // Remove default ports
      if ((url.protocol === 'http:' && url.port === '80') ||
          (url.protocol === 'https:' && url.port === '443')) {
        url.port = '';
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  // ─── Error Classification ─────────────────────────────────────────────────

  private classifyError(error: any): ErrorType {
    if (!error) return 'unknown';
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('timeout') || msg.includes('exceeded')) return 'timeout';
    if (msg.includes('getaddrinfo') || msg.includes('dns') || msg.includes('enotfound')) return 'dns';
    if (msg.includes('ssl') || msg.includes('cert') || msg.includes('tls') || msg.includes('err_cert')) return 'ssl';
    if (msg.includes('econnrefused') || msg.includes('connection refused')) return 'connection_refused';
    if (msg.includes('403') || msg.includes('forbidden') || msg.includes('blocked')) return 'blocked';
    if (msg.includes('captcha') || msg.includes('cloudflare') || msg.includes('bot')) return 'anti_bot';

    return 'unknown';
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private isSameHost(url: string, host: string): boolean {
    try {
      return new URL(url).hostname === host;
    } catch {
      return false;
    }
  }

  private getPathname(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        // Close all contexts first
        for (const context of this.browser.contexts()) {
          for (const page of context.pages()) {
            await page.close().catch(() => {});
          }
          await context.close().catch(() => {});
        }
        await this.browser.close();
      } catch (error: any) {
        this.logger.warn(`Browser cleanup error: ${error.message}`);
      } finally {
        this.browser = null;
      }
    }
  }
}
