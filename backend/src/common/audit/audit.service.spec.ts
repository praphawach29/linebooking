import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  const tenantId = '00000000-0000-4000-8000-000000000001';
  const actorId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('records an audit log via PrismaService when no transaction is provided', async () => {
    await service.record({
      tenantId,
      actorId,
      actorType: 'merchant_admin',
      action: 'booking_confirmed',
      entityType: 'booking',
      entityId: 'booking-123',
      beforeState: { status: 'pending' },
      afterState: { status: 'confirmed' },
      reason: 'Customer arrived',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        actorId,
        actorType: 'merchant_admin',
        action: 'booking_confirmed',
        entityType: 'booking',
        entityId: 'booking-123',
        beforeState: { status: 'pending' },
        afterState: { status: 'confirmed' },
        reason: 'Customer arrived',
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  it('records an audit log via transaction client when tx is provided', async () => {
    const mockTx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-tx-id' }),
      },
    };

    await service.record(
      {
        tenantId,
        actorId,
        actorType: 'merchant_admin',
        action: 'points_adjusted',
        entityType: 'membership',
        entityId: 'membership-456',
        beforeState: { points: 100 },
        afterState: { points: 150, pointsDelta: 50 },
      },
      mockTx as any,
    );

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        actorId,
        actorType: 'merchant_admin',
        action: 'points_adjusted',
        entityType: 'membership',
        entityId: 'membership-456',
        beforeState: { points: 100 },
        afterState: { points: 150, pointsDelta: 50 },
        reason: null,
        ipAddress: null,
        userAgent: null,
      },
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('retrieves tenant audit logs with tenant isolation and include actor', async () => {
    prisma.auditLog.findMany.mockResolvedValueOnce([
      { id: 'log-1', action: 'booking_confirmed' },
    ]);

    const result = await service.getTenantAuditLogs(tenantId, {
      entityType: 'booking',
      limit: 10,
      offset: 0,
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        entityType: 'booking',
        entityId: undefined,
        action: undefined,
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    });
    expect(result.length).toBe(1);
  });
});
