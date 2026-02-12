import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface PageAnalysis {
  meta: {
    title: string | null;
    description: string | null;
    keywords: string | null;
    canonical: string | null;
    robots: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: string[];
  };
  links: {
    internal: number;
    external: number;
    broken: string[];
  };
  schema: {
    hasStructuredData: boolean;
    types: string[];
  };
  issues: {
    type: 'error' | 'warning';
    message: string;
    element?: string;
  }[];
}

@Injectable()
export class StaticAnalyzerService {
  analyze(html: string, url: string): PageAnalysis {
    const $ = cheerio.load(html);
    const issues: PageAnalysis['issues'] = [];

    // Meta tags
    const meta = {
      title: $('title').text() || null,
      description: $('meta[name="description"]').attr('content') || null,
      keywords: $('meta[name="keywords"]').attr('content') || null,
      canonical: $('link[rel="canonical"]').attr('href') || null,
      robots: $('meta[name="robots"]').attr('content') || null,
      ogTitle: $('meta[property="og:title"]').attr('content') || null,
      ogDescription: $('meta[property="og:description"]').attr('content') || null,
      ogImage: $('meta[property="og:image"]').attr('content') || null,
    };

    // Check meta issues
    if (!meta.title) {
      issues.push({ type: 'error', message: 'Missing title tag' });
    } else if (meta.title.length > 60) {
      issues.push({ type: 'warning', message: 'Title too long (>60 chars)' });
    }

    if (!meta.description) {
      issues.push({ type: 'warning', message: 'Missing meta description' });
    } else if (meta.description.length > 160) {
      issues.push({ type: 'warning', message: 'Meta description too long (>160 chars)' });
    }

    // Headings
    const h1Elements = $('h1');
    const h1: string[] = [];
    h1Elements.each((_, el) => {
      h1.push($(el).text().trim());
    });

    const h2: string[] = [];
    $('h2').each((_, el) => {
      h2.push($(el).text().trim());
    });

    const h3: string[] = [];
    $('h3').each((_, el) => {
      h3.push($(el).text().trim());
    });

    if (h1.length === 0) {
      issues.push({ type: 'error', message: 'Missing H1 tag' });
    } else if (h1.length > 1) {
      issues.push({ type: 'warning', message: 'Multiple H1 tags found' });
    }

    // Images
    const images: string[] = [];
    const imagesWithoutAlt: string[] = [];
    let imagesWithAlt = 0;

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt');

      if (src) {
        images.push(src);
        if (!alt || alt.trim() === '') {
          imagesWithoutAlt.push(src);
        } else {
          imagesWithAlt++;
        }
      }
    });

    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        message: `${imagesWithoutAlt.length} images missing alt text`,
      });
    }

    // Links
    const baseHost = new URL(url).hostname;
    let internalLinks = 0;
    let externalLinks = 0;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const linkUrl = new URL(href, url);
          if (linkUrl.hostname === baseHost) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        } catch {
          // Relative or invalid URL
          internalLinks++;
        }
      }
    });

    // Schema/Structured data
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json['@type']) {
          schemaTypes.push(json['@type']);
        }
      } catch {
        // Invalid JSON-LD
      }
    });

    return {
      meta,
      headings: { h1, h2, h3 },
      images: {
        total: images.length,
        withAlt: imagesWithAlt,
        withoutAlt: imagesWithoutAlt,
      },
      links: {
        internal: internalLinks,
        external: externalLinks,
        broken: [], // Would need to verify links
      },
      schema: {
        hasStructuredData: schemaTypes.length > 0,
        types: schemaTypes,
      },
      issues,
    };
  }
}
