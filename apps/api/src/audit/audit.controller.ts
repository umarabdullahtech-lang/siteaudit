import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Audits')
@ApiBearerAuth()
@Controller('audits')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new site audit' })
  async createAudit(@Request() req: any, @Body() dto: CreateAuditDto) {
    return this.auditService.createAudit(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all audits for the authenticated user' })
  async getAudits(@Request() req: any) {
    return this.auditService.getUserAudits(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific audit by ID' })
  @ApiParam({ name: 'id', description: 'Audit ID' })
  async getAudit(@Param('id') id: string) {
    return this.auditService.getAudit(id);
  }
}
