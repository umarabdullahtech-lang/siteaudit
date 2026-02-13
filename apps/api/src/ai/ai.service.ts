import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AiInsight {
  type: 'suggestion' | 'fix' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  affectedPages?: string[];
  codeSnippet?: string;
}

export interface ContentQualityScore {
  overall: number;
  readability: number;
  seoOptimization: number;
  technicalHealth: number;
  contentDepth: number;
  summary: string;
}

export interface SeoKeywordSuggestion {
  keyword: string;
  relevance: 'high' | 'medium' | 'low';
  currentUsage: number;
  suggestion: string;
}

@Injectable()
export class AiService {
  private logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  // ── Content Analysis (existing, enhanced) ───────────
  async analyzeContent(crawlResults: any[]): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];
    const issuesSummary = this.aggregateIssues(crawlResults);

    try {
      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Analyze these SEO issues and provide actionable recommendations:

${JSON.stringify(issuesSummary, null, 2)}

Provide 3-5 prioritized recommendations in JSON format:
[{"type": "suggestion|fix|warning", "title": "string", "description": "string", "priority": "high|medium|low"}]`,
            },
          ],
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        if (textBlock && textBlock.type === 'text') {
          const parsed = this.parseAiResponse(textBlock.text);
          insights.push(...parsed);
        }
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Analyze these SEO issues and provide actionable recommendations:

${JSON.stringify(issuesSummary, null, 2)}

Provide 3-5 prioritized recommendations in JSON format:
[{"type": "suggestion|fix|warning", "title": "string", "description": "string", "priority": "high|medium|low"}]`,
            },
          ],
          max_tokens: 1024,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = this.parseAiResponse(content);
          insights.push(...parsed);
        }
      } else {
        insights.push(...this.generateFallbackInsights(issuesSummary));
      }
    } catch (error: any) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      insights.push(...this.generateFallbackInsights(issuesSummary));
    }

    return insights;
  }

  // ── Content Quality Scoring ─────────────────────────
  async scoreContentQuality(crawlResults: any[]): Promise<ContentQualityScore> {
    const summary = this.buildContentSummary(crawlResults);

    try {
      const prompt = `Score this website's content quality based on the following crawl data.

${JSON.stringify(summary, null, 2)}

Return a JSON object with these exact fields:
{
  "overall": <0-100>,
  "readability": <0-100>,
  "seoOptimization": <0-100>,
  "technicalHealth": <0-100>,
  "contentDepth": <0-100>,
  "summary": "<2-3 sentence summary>"
}`;

      const text = await this.callAi(prompt, 512);
      if (text) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            overall: this.clamp(parsed.overall, 0, 100),
            readability: this.clamp(parsed.readability, 0, 100),
            seoOptimization: this.clamp(parsed.seoOptimization, 0, 100),
            technicalHealth: this.clamp(parsed.technicalHealth, 0, 100),
            contentDepth: this.clamp(parsed.contentDepth, 0, 100),
            summary: parsed.summary || 'Analysis complete.',
          };
        }
      }
    } catch (error: any) {
      this.logger.error(`Content quality scoring failed: ${error.message}`);
    }

    // Fallback: rule-based scoring
    return this.fallbackContentScore(crawlResults);
  }

  // ── SEO Keyword Suggestions ─────────────────────────
  async suggestKeywords(crawlResults: any[]): Promise<SeoKeywordSuggestion[]> {
    const summary = this.buildContentSummary(crawlResults);

    try {
      const prompt = `Based on this website's content, suggest SEO keywords.

Content summary:
${JSON.stringify(summary, null, 2)}

Return a JSON array of 5-8 keyword suggestions:
[{"keyword": "string", "relevance": "high|medium|low", "currentUsage": <count>, "suggestion": "string"}]`;

      const text = await this.callAi(prompt, 768);
      if (text) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (error: any) {
      this.logger.error(`Keyword suggestion failed: ${error.message}`);
    }

    // Fallback
    return this.fallbackKeywords(crawlResults);
  }

  // ── HTML Fix Code Generation ────────────────────────
  async generateCodeFix(
    issue: string,
    htmlContext: string,
  ): Promise<{ fixedHtml: string; explanation: string } | null> {
    try {
      const prompt = `Fix this HTML issue: ${issue}

Current HTML:
\`\`\`html
${htmlContext.slice(0, 2000)}
\`\`\`

Return a JSON object with:
{"fixedHtml": "<corrected HTML>", "explanation": "<brief explanation of the fix>"}`;

      const text = await this.callAi(prompt, 1024);
      if (text) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (error: any) {
      this.logger.error(`Code fix generation failed: ${error.message}`);
    }
    return null;
  }

  // ── Private helpers ─────────────────────────────────

  private async callAi(prompt: string, maxTokens: number): Promise<string | null> {
    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = response.content.find((c) => c.type === 'text');
      return textBlock && textBlock.type === 'text' ? textBlock.text : null;
    }

    if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      });
      return response.choices[0]?.message?.content || null;
    }

    return null;
  }

  private buildContentSummary(crawlResults: any[]) {
    const pages = crawlResults.slice(0, 20);
    const titles = pages.map((p) => p.analysis?.meta?.title).filter(Boolean);
    const descriptions = pages.map((p) => p.analysis?.meta?.description).filter(Boolean);
    const h1s = pages.flatMap((p) => p.analysis?.headings?.h1 || []);
    const h2s = pages.flatMap((p) => p.analysis?.headings?.h2 || []);
    const totalImages = pages.reduce((sum, p) => sum + (p.analysis?.images?.total || 0), 0);
    const imagesWithAlt = pages.reduce((sum, p) => sum + (p.analysis?.images?.withAlt || 0), 0);
    const issueCount = pages.reduce((sum, p) => sum + (p.analysis?.issues?.length || 0), 0);
    const hasSchema = pages.filter((p) => p.analysis?.schema?.hasStructuredData).length;

    return {
      totalPages: crawlResults.length,
      sampledPages: pages.length,
      titles: titles.slice(0, 10),
      descriptions: descriptions.slice(0, 10),
      h1Headings: h1s.slice(0, 15),
      h2Headings: h2s.slice(0, 15),
      imageStats: { total: totalImages, withAlt: imagesWithAlt },
      totalIssues: issueCount,
      pagesWithSchema: hasSchema,
    };
  }

  private aggregateIssues(crawlResults: any[]) {
    const issues: Record<string, { count: number; pages: string[] }> = {};
    for (const result of crawlResults) {
      if (result.analysis?.issues) {
        for (const issue of result.analysis.issues) {
          const key = issue.message;
          if (!issues[key]) issues[key] = { count: 0, pages: [] };
          issues[key].count++;
          issues[key].pages.push(result.url);
        }
      }
    }
    return {
      totalPages: crawlResults.length,
      issues: Object.entries(issues)
        .map(([message, data]) => ({
          message,
          count: data.count,
          affectedPages: data.pages.slice(0, 5),
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private parseAiResponse(content: string): AiInsight[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn('Failed to parse AI response');
    }
    return [];
  }

  private generateFallbackInsights(summary: any): AiInsight[] {
    const insights: AiInsight[] = [];
    for (const issue of summary.issues.slice(0, 5)) {
      insights.push({
        type: 'suggestion',
        title: `Fix: ${issue.message}`,
        description: `This issue affects ${issue.count} pages. Consider reviewing and fixing this across your site.`,
        priority: issue.count > 5 ? 'high' : issue.count > 2 ? 'medium' : 'low',
        affectedPages: issue.affectedPages,
      });
    }
    return insights;
  }

  private fallbackContentScore(crawlResults: any[]): ContentQualityScore {
    const total = crawlResults.length || 1;
    const withTitle = crawlResults.filter((p) => p.analysis?.meta?.title).length;
    const withDesc = crawlResults.filter((p) => p.analysis?.meta?.description).length;
    const withH1 = crawlResults.filter((p) => p.analysis?.headings?.h1?.length > 0).length;
    const totalImages = crawlResults.reduce((s, p) => s + (p.analysis?.images?.total || 0), 0);
    const altImages = crawlResults.reduce((s, p) => s + (p.analysis?.images?.withAlt || 0), 0);
    const errors = crawlResults.reduce(
      (s, p) => s + (p.analysis?.issues?.filter((i: any) => i.type === 'error')?.length || 0),
      0,
    );

    const seo = Math.round(((withTitle + withDesc) / (total * 2)) * 100);
    const technical = Math.max(0, 100 - errors * 5);
    const readability = Math.round((withH1 / total) * 100);
    const depth = Math.round(
      ((totalImages > 0 ? altImages / totalImages : 1) * 50 +
        (withDesc / total) * 50),
    );
    const overall = Math.round((seo + technical + readability + depth) / 4);

    return {
      overall: this.clamp(overall, 0, 100),
      readability: this.clamp(readability, 0, 100),
      seoOptimization: this.clamp(seo, 0, 100),
      technicalHealth: this.clamp(technical, 0, 100),
      contentDepth: this.clamp(depth, 0, 100),
      summary: `Analyzed ${total} pages. ${withTitle} have titles, ${withDesc} have descriptions, ${errors} errors found.`,
    };
  }

  private fallbackKeywords(crawlResults: any[]): SeoKeywordSuggestion[] {
    // Extract common words from titles and headings
    const words = new Map<string, number>();
    for (const page of crawlResults) {
      const texts = [
        page.analysis?.meta?.title,
        page.analysis?.meta?.description,
        ...(page.analysis?.headings?.h1 || []),
        ...(page.analysis?.headings?.h2 || []),
      ].filter(Boolean);

      for (const text of texts) {
        for (const word of (text as string)
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 3)) {
          words.set(word, (words.get(word) || 0) + 1);
        }
      }
    }

    return Array.from(words.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([keyword, count]) => ({
        keyword,
        relevance: count > 5 ? 'high' : count > 2 ? 'medium' : ('low' as const),
        currentUsage: count,
        suggestion: `"${keyword}" appears ${count} times across your content. Consider optimizing around this term.`,
      }));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
