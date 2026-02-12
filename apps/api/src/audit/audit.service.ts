import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateAuditDto } from './dto/create-audit.dto';

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async createAudit(userId: string, dto: CreateAuditDto) {
    // Create project if it doesn't exist
    let project = await this.prisma.project.findFirst({
      where: { url: dto.url, userId },
    });

    if (!project) {
      project = await this.prisma.project.create({
        data: {
          url: dto.url,
          name: new URL(dto.url).hostname,
          userId,
        },
      });
    }

    // Create audit record
    const audit = await this.prisma.audit.create({
      data: {
        projectId: project.id,
        status: 'pending',
        config: {
          maxDepth: dto.maxDepth || 3,
          maxPages: dto.maxPages || 100,
        },
      },
    });

    // Queue the crawl job
    await this.queueService.addCrawlJob({
      auditId: audit.id,
      url: dto.url,
      maxDepth: dto.maxDepth || 3,
      maxPages: dto.maxPages || 100,
    });

    return audit;
  }

  async getAudit(auditId: string) {
    return this.prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        project: true,
      },
    });
  }

  async getUserAudits(userId: string) {
    return this.prisma.audit.findMany({
      where: {
        project: { userId },
      },
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAuditStatus(auditId: string, status: string, results?: any) {
    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status,
        results,
        completedAt: status === 'complete' ? new Date() : undefined,
      },
    });
  }
}
