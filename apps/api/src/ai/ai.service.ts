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

  async analyzeContent(crawlResults: any[]): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];

    // Aggregate issues for analysis
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
        // Fallback to rule-based insights
        insights.push(...this.generateFallbackInsights(issuesSummary));
      }
    } catch (error: any) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      insights.push(...this.generateFallbackInsights(issuesSummary));
    }

    return insights;
  }

  async generateCodeFix(issue: string, htmlContext: string): Promise<string | null> {
    try {
      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: `Fix this HTML issue: ${issue}

Current HTML:
${htmlContext}

Provide only the corrected HTML code.`,
            },
          ],
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        return textBlock && textBlock.type === 'text' ? textBlock.text : null;
      }
    } catch (error: any) {
      this.logger.error(`Code fix generation failed: ${error.message}`);
    }

    return null;
  }

  private aggregateIssues(crawlResults: any[]) {
    const issues: Record<string, { count: number; pages: string[] }> = {};

    for (const result of crawlResults) {
      if (result.analysis?.issues) {
        for (const issue of result.analysis.issues) {
          const key = issue.message;
          if (!issues[key]) {
            issues[key] = { count: 0, pages: [] };
          }
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
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
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
}
