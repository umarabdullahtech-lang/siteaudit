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
      const response = await fetch(robotsUrl);

      if (!response.ok) {
        return rules;
      }

      const content = await response.text();
      const lines = content.split('\n');

      let isRelevantUserAgent = false;

      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase();

        if (trimmedLine.startsWith('user-agent:')) {
          const agent = trimmedLine.replace('user-agent:', '').trim();
          isRelevantUserAgent = agent === '*' || agent.includes('bot');
        } else if (isRelevantUserAgent) {
          if (trimmedLine.startsWith('allow:')) {
            rules.allowedPaths.push(trimmedLine.replace('allow:', '').trim());
          } else if (trimmedLine.startsWith('disallow:')) {
            rules.disallowedPaths.push(trimmedLine.replace('disallow:', '').trim());
          } else if (trimmedLine.startsWith('crawl-delay:')) {
            rules.crawlDelay = parseInt(trimmedLine.replace('crawl-delay:', '').trim());
          }
        }

        if (trimmedLine.startsWith('sitemap:')) {
          rules.sitemaps.push(line.replace(/sitemap:/i, '').trim());
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to fetch robots.txt: ${error.message}`);
    }

    return rules;
  }

  isAllowed(rules: RobotsRules, url: string): boolean {
    const path = new URL(url).pathname;

    // Check disallowed first
    for (const disallowed of rules.disallowedPaths) {
      if (path.startsWith(disallowed)) {
        // Check if there's a more specific allow rule
        for (const allowed of rules.allowedPaths) {
          if (path.startsWith(allowed) && allowed.length > disallowed.length) {
            return true;
          }
        }
        return false;
      }
    }

    return true;
  }
}
