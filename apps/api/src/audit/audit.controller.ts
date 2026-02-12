import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audits')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Post()
  async createAudit(@Request() req: any, @Body() dto: CreateAuditDto) {
    return this.auditService.createAudit(req.user.userId, dto);
  }

  @Get()
  async getAudits(@Request() req: any) {
    return this.auditService.getUserAudits(req.user.userId);
  }

  @Get(':id')
  async getAudit(@Param('id') id: string) {
    return this.auditService.getAudit(id);
  }
}
