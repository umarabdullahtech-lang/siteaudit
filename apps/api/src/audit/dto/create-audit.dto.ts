import { IsUrl, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditDto {
  @ApiProperty({ example: 'https://example.com', description: 'URL of the website to audit' })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  url: string;

  @ApiPropertyOptional({ example: 3, description: 'Maximum crawl depth (1-10)', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxDepth?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum pages to crawl (1-500)', default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxPages?: number;
}
