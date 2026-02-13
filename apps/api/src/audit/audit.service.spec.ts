import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;
  let queueService: QueueService;

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    audit: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockQueueService = {
    addCrawlJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);

    jest.clearAllMocks();
  });

  describe('createAudit', () => {
    it('should create a new project and audit', async () => {
      const userId = 'user-1';
      const dto = { url: 'https://example.com', maxDepth: 2, maxPages: 50 };

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({
        id: 'proj-1',
        url: dto.url,
        name: 'example.com',
        userId,
      });
      mockPrisma.audit.create.mockResolvedValue({
        id: 'audit-1',
        projectId: 'proj-1',
        status: 'pending',
        config: { maxDepth: 2, maxPages: 50 },
      });
      mockQueueService.addCrawlJob.mockResolvedValue({});

      const result = await service.createAudit(userId, dto);

      expect(result.id).toBe('audit-1');
      expect(result.status).toBe('pending');
      expect(mockPrisma.project.create).toHaveBeenCalled();
      expect(mockQueueService.addCrawlJob).toHaveBeenCalledWith({
        auditId: 'audit-1',
        url: dto.url,
        maxDepth: 2,
        maxPages: 50,
      });
    });

    it('should reuse existing project', async () => {
      const userId = 'user-1';
      const dto = { url: 'https://example.com' };

      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        url: dto.url,
        name: 'example.com',
        userId,
      });
      mockPrisma.audit.create.mockResolvedValue({
        id: 'audit-2',
        projectId: 'proj-1',
        status: 'pending',
        config: { maxDepth: 3, maxPages: 100 },
      });
      mockQueueService.addCrawlJob.mockResolvedValue({});

      const result = await service.createAudit(userId, dto);

      expect(result.id).toBe('audit-2');
      expect(mockPrisma.project.create).not.toHaveBeenCalled();
    });
  });

  describe('getAudit', () => {
    it('should return audit with project', async () => {
      mockPrisma.audit.findUnique.mockResolvedValue({
        id: 'audit-1',
        status: 'complete',
        project: { id: 'proj-1', url: 'https://example.com' },
      });

      const result = await service.getAudit('audit-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('audit-1');
      expect(mockPrisma.audit.findUnique).toHaveBeenCalledWith({
        where: { id: 'audit-1' },
        include: { project: true },
      });
    });
  });

  describe('getUserAudits', () => {
    it('should return user audits sorted by date', async () => {
      mockPrisma.audit.findMany.mockResolvedValue([
        { id: 'a2', createdAt: new Date('2024-02-02') },
        { id: 'a1', createdAt: new Date('2024-02-01') },
      ]);

      const result = await service.getUserAudits('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('updateAuditStatus', () => {
    it('should set completedAt when status is complete', async () => {
      mockPrisma.audit.update.mockResolvedValue({ id: 'audit-1', status: 'complete' });

      await service.updateAuditStatus('audit-1', 'complete', { score: 85 });

      expect(mockPrisma.audit.update).toHaveBeenCalledWith({
        where: { id: 'audit-1' },
        data: expect.objectContaining({
          status: 'complete',
          results: { score: 85 },
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should not set completedAt for non-complete status', async () => {
      mockPrisma.audit.update.mockResolvedValue({ id: 'audit-1', status: 'running' });

      await service.updateAuditStatus('audit-1', 'running');

      expect(mockPrisma.audit.update).toHaveBeenCalledWith({
        where: { id: 'audit-1' },
        data: expect.objectContaining({
          status: 'running',
          completedAt: undefined,
        }),
      });
    });
  });
});
