import { Injectable, Logger } from '@nestjs/common';
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
    viewport: string | null;
    language: string | null;
    favicon: string | null;
    twitterCard: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    twitterImage: string | null;
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
  performance: {
    inlineCssSize: number;
    inlineJsSize: number;
    renderBlockingScripts: number;
    totalImageCount: number;
    lazyLoadedImages: number;
  };
  accessibility: {
    formLabels: { total: number; withLabels: number; withoutLabels: number };
    ariaLandmarks: string[];
    hasSkipLink: boolean;
    tabindex: { total: number; negative: number };
  };
  issues: {
    type: 'error' | 'warning' | 'info';
    message: string;
    element?: string;
  }[];
}

@Injectable()
export class StaticAnalyzerService {
  private logger = new Logger(StaticAnalyzerService.name);

  analyze(html: string, url: string): PageAnalysis {
    const issues: PageAnalysis['issues'] = [];

    let $: cheerio.CheerioAPI;
    try {
      $ = cheerio.load(html);
    } catch (error: any) {
      this.logger.warn(`Failed to parse HTML for ${url}: ${error.message}`);
      return this.emptyAnalysis('HTML parsing failed');
    }

    // === META TAGS ===
    const meta = this.analyzeMeta($, issues);

    // === HEADINGS ===
    const headings = this.analyzeHeadings($, issues);

    // === IMAGES ===
    const images = this.analyzeImages($, issues);

    // === LINKS ===
    const links = this.analyzeLinks($, url);

    // === SCHEMA / STRUCTURED DATA ===
    const schema = this.analyzeSchema($);

    // === PERFORMANCE HINTS ===
    const performance = this.analyzePerformance($, issues);

    // === ACCESSIBILITY ===
    const accessibility = this.analyzeAccessibility($, issues);

    // === LANGUAGE ===
    const language = $('html').attr('lang') || $('html').attr('xml:lang') || null;
    if (!language) {
      issues.push({ type: 'warning', message: 'Missing lang attribute on <html> element' });
    }

    // === FAVICON ===
    const favicon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      null;
    if (!favicon) {
      issues.push({ type: 'info', message: 'No favicon link found in HTML' });
    }

    // === VIEWPORT ===
    const viewport = $('meta[name="viewport"]').attr('content') || null;
    if (!viewport) {
      issues.push({ type: 'error', message: 'Missing viewport meta tag (mobile unfriendly)' });
    }

    meta.viewport = viewport;
    meta.language = language;
    meta.favicon = favicon;

    return {
      meta,
      headings,
      images,
      links,
      schema,
      performance,
      accessibility,
      issues,
    };
  }

  private analyzeMeta(
    $: cheerio.CheerioAPI,
    issues: PageAnalysis['issues'],
  ): PageAnalysis['meta'] {
    const title = $('title').first().text()?.trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() || null;
    const keywords = $('meta[name="keywords"]').attr('content')?.trim() || null;
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;
    const robots = $('meta[name="robots"]').attr('content')?.trim() || null;
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
    const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || null;
    const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || null;
    const twitterCard = $('meta[name="twitter:card"], meta[property="twitter:card"]').attr('content')?.trim() || null;
    const twitterTitle = $('meta[name="twitter:title"], meta[property="twitter:title"]').attr('content')?.trim() || null;
    const twitterDescription = $('meta[name="twitter:description"], meta[property="twitter:description"]').attr('content')?.trim() || null;
    const twitterImage = $('meta[name="twitter:image"], meta[property="twitter:image"]').attr('content')?.trim() || null;

    // Title checks
    if (!title) {
      issues.push({ type: 'error', message: 'Missing title tag' });
    } else {
      if (title.length < 10) {
        issues.push({ type: 'warning', message: `Title too short (${title.length} chars, recommend 30-60)` });
      } else if (title.length > 60) {
        issues.push({ type: 'warning', message: `Title too long (${title.length} chars, recommend ≤60)` });
      }
    }

    // Description checks
    if (!description) {
      issues.push({ type: 'warning', message: 'Missing meta description' });
    } else {
      if (description.length < 50) {
        issues.push({ type: 'warning', message: `Meta description too short (${description.length} chars, recommend 120-160)` });
      } else if (description.length > 160) {
        issues.push({ type: 'warning', message: `Meta description too long (${description.length} chars, recommend ≤160)` });
      }
    }

    // Social tags
    if (!ogTitle && !ogDescription && !ogImage) {
      issues.push({ type: 'info', message: 'No Open Graph tags found (impacts social media sharing)' });
    }
    if (!twitterCard) {
      issues.push({ type: 'info', message: 'No Twitter Card tags found' });
    }

    // Canonical
    if (!canonical) {
      issues.push({ type: 'info', message: 'No canonical URL specified' });
    }

    return {
      title,
      description,
      keywords,
      canonical,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      viewport: null, // Set later
      language: null,  // Set later
      favicon: null,   // Set later
      twitterCard,
      twitterTitle,
      twitterDescription,
      twitterImage,
    };
  }

  private analyzeHeadings(
    $: cheerio.CheerioAPI,
    issues: PageAnalysis['issues'],
  ): PageAnalysis['headings'] {
    const h1: string[] = [];
    const h2: string[] = [];
    const h3: string[] = [];

    $('h1').each((_, el) => {
      const text = $(el).text().trim();
      if (text) h1.push(text.slice(0, 200)); // Cap length
    });
    $('h2').each((_, el) => {
      const text = $(el).text().trim();
      if (text) h2.push(text.slice(0, 200));
    });
    $('h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) h3.push(text.slice(0, 200));
    });

    if (h1.length === 0) {
      issues.push({ type: 'error', message: 'Missing H1 tag' });
    } else if (h1.length > 1) {
      issues.push({ type: 'warning', message: `Multiple H1 tags found (${h1.length})` });
    }

    // Check heading hierarchy
    if (h1.length === 0 && h2.length > 0) {
      issues.push({ type: 'warning', message: 'H2 tags found without an H1 (broken heading hierarchy)' });
    }

    return { h1, h2, h3 };
  }

  private analyzeImages(
    $: cheerio.CheerioAPI,
    issues: PageAnalysis['issues'],
  ): PageAnalysis['images'] {
    const imagesWithoutAlt: string[] = [];
    let total = 0;
    let withAlt = 0;

    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      const alt = $(el).attr('alt');
      total++;

      if (!alt || alt.trim() === '') {
        if (src) imagesWithoutAlt.push(src.slice(0, 200));
        else imagesWithoutAlt.push('[no src]');
      } else {
        withAlt++;
      }
    });

    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        message: `${imagesWithoutAlt.length} of ${total} images missing alt text`,
      });
    }

    return {
      total,
      withAlt,
      withoutAlt: imagesWithoutAlt.slice(0, 50), // Cap to avoid huge payloads
    };
  }

  private analyzeLinks(
    $: cheerio.CheerioAPI,
    url: string,
  ): PageAnalysis['links'] {
    let baseHost: string;
    try {
      baseHost = new URL(url).hostname;
    } catch {
      return { internal: 0, external: 0, broken: [] };
    }

    let internalLinks = 0;
    let externalLinks = 0;
    const broken: string[] = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const trimmedHref = href.trim();
      // Skip javascript:, mailto:, tel:, data:, and fragments
      if (/^(javascript:|mailto:|tel:|data:|#)/i.test(trimmedHref)) return;

      try {
        const linkUrl = new URL(trimmedHref, url);
        if (linkUrl.hostname === baseHost) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {
        // Truly invalid URL
        broken.push(trimmedHref.slice(0, 200));
      }
    });

    return {
      internal: internalLinks,
      external: externalLinks,
      broken: broken.slice(0, 20),
    };
  }

  private analyzeSchema($: cheerio.CheerioAPI): PageAnalysis['schema'] {
    const types: string[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;

        // Handle multiple JSON-LD objects (some sites concatenate)
        const json = JSON.parse(raw);

        const extractTypes = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj['@type']) {
            const t = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
            types.push(...t.map((s: any) => String(s)));
          }
          if (Array.isArray(obj['@graph'])) {
            for (const item of obj['@graph']) {
              extractTypes(item);
            }
          }
        };

        if (Array.isArray(json)) {
          json.forEach(extractTypes);
        } else {
          extractTypes(json);
        }
      } catch {
        // Invalid JSON-LD - ignore
      }
    });

    // Also check for microdata
    $('[itemtype]').each((_, el) => {
      const itemtype = $(el).attr('itemtype');
      if (itemtype) {
        const typeName = itemtype.split('/').pop();
        if (typeName) types.push(`microdata:${typeName}`);
      }
    });

    return {
      hasStructuredData: types.length > 0,
      types: [...new Set(types)],
    };
  }

  private analyzePerformance(
    $: cheerio.CheerioAPI,
    issues: PageAnalysis['issues'],
  ): PageAnalysis['performance'] {
    // Inline CSS
    let inlineCssSize = 0;
    $('style').each((_, el) => {
      const text = $(el).html();
      if (text) inlineCssSize += text.length;
    });
    // Also count style attributes (excessive inline styles)
    $('[style]').each((_, el) => {
      const style = $(el).attr('style');
      if (style) inlineCssSize += style.length;
    });

    // Inline JS
    let inlineJsSize = 0;
    $('script:not([src])').each((_, el) => {
      const text = $(el).html();
      if (text) inlineJsSize += text.length;
    });

    // Render-blocking scripts (scripts in <head> without async/defer)
    let renderBlockingScripts = 0;
    $('head script[src]').each((_, el) => {
      const hasAsync = $(el).attr('async') !== undefined;
      const hasDefer = $(el).attr('defer') !== undefined;
      const hasType = $(el).attr('type');
      // module scripts are deferred by default
      if (!hasAsync && !hasDefer && hasType !== 'module') {
        renderBlockingScripts++;
      }
    });

    // Lazy loaded images
    let lazyLoadedImages = 0;
    const totalImages = $('img').length;
    $('img').each((_, el) => {
      const loading = $(el).attr('loading');
      const dataSrc = $(el).attr('data-src') || $(el).attr('data-lazy');
      if (loading === 'lazy' || dataSrc) {
        lazyLoadedImages++;
      }
    });

    // Performance warnings
    if (inlineCssSize > 50000) {
      issues.push({
        type: 'warning',
        message: `Large inline CSS (${Math.round(inlineCssSize / 1024)}KB) - consider external stylesheets`,
      });
    }
    if (renderBlockingScripts > 3) {
      issues.push({
        type: 'warning',
        message: `${renderBlockingScripts} render-blocking scripts in <head> - consider async/defer`,
      });
    }
    if (totalImages > 10 && lazyLoadedImages === 0) {
      issues.push({
        type: 'info',
        message: `${totalImages} images found but none use lazy loading`,
      });
    }

    return {
      inlineCssSize,
      inlineJsSize,
      renderBlockingScripts,
      totalImageCount: totalImages,
      lazyLoadedImages,
    };
  }

  private analyzeAccessibility(
    $: cheerio.CheerioAPI,
    issues: PageAnalysis['issues'],
  ): PageAnalysis['accessibility'] {
    // Form labels
    let formInputsTotal = 0;
    let formInputsWithLabels = 0;
    let formInputsWithoutLabels = 0;

    $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea').each(
      (_, el) => {
        formInputsTotal++;
        const id = $(el).attr('id');
        const ariaLabel = $(el).attr('aria-label');
        const ariaLabelledby = $(el).attr('aria-labelledby');
        const title = $(el).attr('title');
        const placeholder = $(el).attr('placeholder');
        const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
        const isWrappedInLabel = $(el).closest('label').length > 0;

        if (hasLabel || isWrappedInLabel || ariaLabel || ariaLabelledby || title) {
          formInputsWithLabels++;
        } else {
          formInputsWithoutLabels++;
        }
      },
    );

    if (formInputsWithoutLabels > 0) {
      issues.push({
        type: 'warning',
        message: `${formInputsWithoutLabels} form inputs without proper labels (accessibility issue)`,
      });
    }

    // ARIA landmarks
    const landmarks: string[] = [];
    const landmarkRoles = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search', 'form', 'region'];
    for (const role of landmarkRoles) {
      if ($(`[role="${role}"]`).length > 0) {
        landmarks.push(role);
      }
    }
    // HTML5 semantic elements that map to landmarks
    if ($('header').length > 0 && !landmarks.includes('banner')) landmarks.push('banner');
    if ($('nav').length > 0 && !landmarks.includes('navigation')) landmarks.push('navigation');
    if ($('main').length > 0 && !landmarks.includes('main')) landmarks.push('main');
    if ($('footer').length > 0 && !landmarks.includes('contentinfo')) landmarks.push('contentinfo');
    if ($('aside').length > 0 && !landmarks.includes('complementary')) landmarks.push('complementary');

    if (!landmarks.includes('main')) {
      issues.push({ type: 'info', message: 'No <main> element or role="main" landmark found' });
    }

    // Skip link
    const firstLinks = $('a').slice(0, 5);
    let hasSkipLink = false;
    firstLinks.each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      if (href?.startsWith('#') && (text.includes('skip') || text.includes('main content'))) {
        hasSkipLink = true;
      }
    });

    // Tabindex audit
    let tabindexTotal = 0;
    let tabindexNegative = 0;
    $('[tabindex]').each((_, el) => {
      tabindexTotal++;
      const val = parseInt($(el).attr('tabindex') || '0', 10);
      if (val < 0) tabindexNegative++;
    });

    return {
      formLabels: {
        total: formInputsTotal,
        withLabels: formInputsWithLabels,
        withoutLabels: formInputsWithoutLabels,
      },
      ariaLandmarks: [...new Set(landmarks)],
      hasSkipLink,
      tabindex: { total: tabindexTotal, negative: tabindexNegative },
    };
  }

  private emptyAnalysis(errorMessage: string): PageAnalysis {
    return {
      meta: {
        title: null, description: null, keywords: null, canonical: null,
        robots: null, ogTitle: null, ogDescription: null, ogImage: null,
        viewport: null, language: null, favicon: null,
        twitterCard: null, twitterTitle: null, twitterDescription: null, twitterImage: null,
      },
      headings: { h1: [], h2: [], h3: [] },
      images: { total: 0, withAlt: 0, withoutAlt: [] },
      links: { internal: 0, external: 0, broken: [] },
      schema: { hasStructuredData: false, types: [] },
      performance: {
        inlineCssSize: 0, inlineJsSize: 0, renderBlockingScripts: 0,
        totalImageCount: 0, lazyLoadedImages: 0,
      },
      accessibility: {
        formLabels: { total: 0, withLabels: 0, withoutLabels: 0 },
        ariaLandmarks: [],
        hasSkipLink: false,
        tabindex: { total: 0, negative: 0 },
      },
      issues: [{ type: 'error', message: errorMessage }],
    };
  }
}
