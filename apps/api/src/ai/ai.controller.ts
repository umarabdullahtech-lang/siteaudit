import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

class AnalyzeContentDto {
  crawlResults: any[];
}

class GenerateFixDto {
  issue: string;
  htmlContext: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('analyze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get AI content analysis insights' })
  @ApiBody({ type: AnalyzeContentDto })
  async analyze(@Body() dto: AnalyzeContentDto) {
    const insights = await this.aiService.analyzeContent(dto.crawlResults || []);
    return { insights };
  }

  @Post('content-score')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get content quality scores' })
  @ApiBody({ type: AnalyzeContentDto })
  async contentScore(@Body() dto: AnalyzeContentDto) {
    const score = await this.aiService.scoreContentQuality(dto.crawlResults || []);
    return { score };
  }

  @Post('keywords')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get SEO keyword suggestions' })
  @ApiBody({ type: AnalyzeContentDto })
  async keywords(@Body() dto: AnalyzeContentDto) {
    const keywords = await this.aiService.suggestKeywords(dto.crawlResults || []);
    return { keywords };
  }

  @Post('generate-fix')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate HTML fix code for an issue' })
  @ApiBody({ type: GenerateFixDto })
  async generateFix(@Body() dto: GenerateFixDto) {
    const fix = await this.aiService.generateCodeFix(dto.issue, dto.htmlContext);
    return { fix };
  }
}
