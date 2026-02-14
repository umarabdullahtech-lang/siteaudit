import { Injectable, Logger } from '@nestjs/common';

export interface RobotsRules {
  allowedPaths: string[];
  disallowedPaths: string[];
  crawlDelay?: number;
  sitemaps: string[];
}

@Injectable()
export class RobotsTxtService {
  private logger = new Logger(RobotsTxtService.name);

  async parse(baseUrl: string): Promise<RobotsRules> {
    const rules: RobotsRules = {
      allowedPaths: [],
      disallowedPaths: [],
      sitemaps: [],
    };

    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(robotsUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SiteAuditBot/1.0',
          },
          redirect: 'follow',
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        this.logger.debug(`robots.txt returned ${response.status} for ${baseUrl}`);
        return rules;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.includes('text/') && !contentType.includes('application/octet-stream')) {
        this.logger.debug(`robots.txt has unexpected content-type: ${contentType}`);
        return rules;
      }

      const content = await response.text();

      // Guard against absurdly large files (some hosts serve HTML error pages)
      if (content.length > 512 * 1024) {
        this.logger.warn(`robots.txt is unusually large (${content.length} bytes), truncating`);
      }

      const lines = content.slice(0, 512 * 1024).split(/\r?\n/);

      let isRelevantUserAgent = false;
      let hasSpecificMatch = false; // Track if we matched a specific user-agent

      for (const line of lines) {
        // Strip comments
        const commentIdx = line.indexOf('#');
        const cleanLine = (commentIdx >= 0 ? line.slice(0, commentIdx) : line).trim();
        if (!cleanLine) continue;

        const colonIdx = cleanLine.indexOf(':');
        if (colonIdx < 0) continue;

        const directive = cleanLine.slice(0, colonIdx).trim().toLowerCase();
        const value = cleanLine.slice(colonIdx + 1).trim();

        if (directive === 'user-agent') {
          const agent = value.toLowerCase();
          // Prefer wildcard, but any bot-related agent is fine
          if (agent === '*' || agent.includes('bot') || agent.includes('crawler') || agent.includes('spider')) {
            isRelevantUserAgent = true;
          } else {
            // Different user-agent block, stop adding rules unless we haven't matched yet
            if (hasSpecificMatch) {
              isRelevantUserAgent = false;
            } else {
              isRelevantUserAgent = false;
            }
          }
        } else if (isRelevantUserAgent) {
          if (directive === 'allow') {
            if (value) rules.allowedPaths.push(value);
          } else if (directive === 'disallow') {
            if (value) rules.disallowedPaths.push(value);
          } else if (directive === 'crawl-delay') {
            const delay = parseFloat(value);
            if (!isNaN(delay) && delay >= 0 && delay <= 120) {
              rules.crawlDelay = delay;
            }
          }
        }

        // Sitemaps are global (not user-agent specific)
        if (directive === 'sitemap' && value) {
          try {
            // Validate it's a proper URL
            new URL(value);
            rules.sitemaps.push(value);
          } catch {
            this.logger.debug(`Invalid sitemap URL in robots.txt: ${value}`);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.warn(`robots.txt fetch timed out for ${baseUrl}`);
      } else {
        this.logger.warn(`Failed to fetch robots.txt: ${error.message}`);
      }
    }

    return rules;
  }

  isAllowed(rules: RobotsRules, url: string): boolean {
    let path: string;
    try {
      path = new URL(url).pathname;
    } catch {
      return true; // If URL is invalid, let it through
    }

    // Find the most specific matching rule
    // In robots.txt, the most specific (longest) match wins
    let bestMatch = '';
    let bestResult = true; // Default: allowed

    for (const allowed of rules.allowedPaths) {
      if (this.pathMatches(path, allowed) && allowed.length > bestMatch.length) {
        bestMatch = allowed;
        bestResult = true;
      }
    }

    for (const disallowed of rules.disallowedPaths) {
      if (this.pathMatches(path, disallowed) && disallowed.length > bestMatch.length) {
        bestMatch = disallowed;
        bestResult = false;
      }
    }

    return bestResult;
  }

  /**
   * Match a path against a robots.txt pattern.
   * Supports wildcards (*) and end-of-string anchor ($).
   */
  private pathMatches(path: string, pattern: string): boolean {
    if (!pattern) return false;

    // Handle $ anchor at end
    const mustMatchEnd = pattern.endsWith('$');
    const cleanPattern = mustMatchEnd ? pattern.slice(0, -1) : pattern;

    // No wildcards - simple prefix match
    if (!cleanPattern.includes('*')) {
      if (mustMatchEnd) {
        return path === cleanPattern;
      }
      return path.startsWith(cleanPattern);
    }

    // Convert wildcard pattern to regex
    const regexStr = cleanPattern
      .split('*')
      .map((part) => this.escapeRegex(part))
      .join('.*');

    try {
      const regex = new RegExp('^' + regexStr + (mustMatchEnd ? '$' : ''));
      return regex.test(path);
    } catch {
      // Malformed pattern, fall back to prefix match
      return path.startsWith(cleanPattern.replace(/\*/g, ''));
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
