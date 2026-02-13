import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    // No API keys → uses fallback logic
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    service = new AiService();
  });

  describe('analyzeContent', () => {
    it('should return fallback insights when no AI provider is configured', async () => {
      const crawlResults = [
        {
          url: 'https://example.com',
          analysis: {
            issues: [
              { type: 'error', message: 'Missing title tag' },
              { type: 'warning', message: 'No meta description' },
            ],
          },
        },
        {
          url: 'https://example.com/about',
          analysis: {
            issues: [
              { type: 'error', message: 'Missing title tag' },
            ],
          },
        },
      ];

      const insights = await service.analyzeContent(crawlResults);

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('type');
      expect(insights[0]).toHaveProperty('title');
      expect(insights[0]).toHaveProperty('priority');
    });

    it('should return empty insights for empty crawl results', async () => {
      const insights = await service.analyzeContent([]);
      expect(insights).toEqual([]);
    });
  });

  describe('scoreContentQuality', () => {
    it('should return a fallback content score', async () => {
      const crawlResults = [
        {
          url: 'https://example.com',
          analysis: {
            meta: { title: 'Home Page', description: 'Welcome' },
            headings: { h1: ['Welcome'], h2: [], h3: [] },
            images: { total: 5, withAlt: 3, withoutAlt: ['img1.jpg', 'img2.jpg'] },
            issues: [{ type: 'warning', message: 'test' }],
          },
        },
      ];

      const score = await service.scoreContentQuality(crawlResults);

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.readability).toBeDefined();
      expect(score.seoOptimization).toBeDefined();
      expect(score.technicalHealth).toBeDefined();
      expect(score.contentDepth).toBeDefined();
      expect(score.summary).toBeTruthy();
    });
  });

  describe('suggestKeywords', () => {
    it('should return fallback keyword suggestions', async () => {
      const crawlResults = [
        {
          url: 'https://example.com',
          analysis: {
            meta: { title: 'Best JavaScript Framework Guide 2024' },
            headings: {
              h1: ['JavaScript Framework Comparison'],
              h2: ['React Features', 'Vue Features', 'Angular Features'],
            },
          },
        },
      ];

      const keywords = await service.suggestKeywords(crawlResults);

      expect(keywords).toBeDefined();
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords[0]).toHaveProperty('keyword');
      expect(keywords[0]).toHaveProperty('relevance');
    });
  });

  describe('generateCodeFix', () => {
    it('should return null when no AI provider is configured', async () => {
      const fix = await service.generateCodeFix(
        'Missing alt attribute',
        '<img src="test.jpg">',
      );
      expect(fix).toBeNull();
    });
  });
});
