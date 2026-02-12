import { IsUrl, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateAuditDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxDepth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxPages?: number;
}
