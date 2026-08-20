import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ActorType =
  | 'merchant_admin'
  | 'staff'
  | 'customer'
  | 'system'
  | 'webhook'
  | 'platform_admin';

export interface RecordAuditLogInput {
  tenantId: string;
  actorId?: string | null;
  actorType?: ActorType;
  action: string;
  entityType: 'booking' | 'membership' | 'payment' | 'tenant' | 'user' | 'line_message_delivery';
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: RecordAuditLogInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;

    try {
      await client.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId || null,
          actorType: input.actorType || 'system',
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          beforeState: input.beforeState ? (input.beforeState as Prisma.InputJsonValue) : Prisma.JsonNull,
          afterState: input.afterState ? (input.afterState as Prisma.InputJsonValue) : Prisma.JsonNull,
          reason: input.reason || null,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for action ${input.action} on ${input.entityType}:${input.entityId} (tenant: ${input.tenantId}): ${error instanceof Error ? error.message : String(error)}`,
      );
      // If we are inside an atomic transaction, rethrow to preserve transaction consistency
      if (tx) {
        throw error;
      }
    }
  }

  async getTenantAuditLogs(
    tenantId: string,
    options?: {
      entityType?: string;
      entityId?: string;
      action?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: options?.entityType,
        entityId: options?.entityId,
        action: options?.action,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
  }
}
