import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingClient } from './line-messaging.client';
import { AuditService } from '../common/audit/audit.service';
import {
  LineBookingEvent,
  LineQuotaStatus,
  LineQuotaWarningLevel,
  NOTIFICATIONS_QUEUE,
} from './notifications.types';

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly lineClient: LineMessagingClient,
    private readonly auditService: AuditService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const queued = await this.prisma.lineMessageDelivery.findMany({
      where: { status: 'queued', scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
      select: { id: true },
    });

    for (const delivery of queued) {
      await this.enqueueDelivery(delivery.id, true);
    }

    this.logger.log(`LINE delivery recovery scan found ${queued.length} queued jobs`);
  }

  async queueBookingEvent(
    tenantId: string,
    bookingId: string,
    eventType: LineBookingEvent,
  ): Promise<void> {
    try {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
        select: { userId: true, bookingDate: true, startTime: true, status: true },
      });
      if (!booking) return;

      const stateKey = eventType === 'booking_rescheduled'
        ? `${booking.bookingDate.toISOString()}:${booking.startTime.toISOString()}`
        : String(booking.status || eventType);
      const idempotencyKey = `line:${eventType}:${bookingId}:${stateKey}`;
      const existing = await this.prisma.lineMessageDelivery.findUnique({
        where: { idempotencyKey },
        select: { id: true, status: true },
      });
      if (existing?.status === 'sent' || existing?.status?.startsWith('skipped_')) return;

      const delivery = existing || await this.prisma.lineMessageDelivery.create({
        data: {
          tenantId,
          bookingId,
          userId: booking.userId,
          eventType,
          idempotencyKey,
        },
        select: { id: true, status: true },
      });

      await this.enqueueDelivery(delivery.id);
    } catch (error) {
      this.logger.error(
        `Unable to queue LINE event ${eventType} for booking ${bookingId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async enqueueDelivery(deliveryId: string, replaceStaleJob = false): Promise<void> {
    if (replaceStaleJob) {
      const existingJob = await this.notificationQueue.getJob(deliveryId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === 'active') {
          this.logger.log(`LINE delivery ${deliveryId} is already active`);
          return;
        }
        await existingJob.remove();
        this.logger.log(`Removed stale LINE delivery job ${deliveryId} from state ${state}`);
      }
    }

    await this.notificationQueue.add(
      'line-booking-event',
      { deliveryId },
      {
        jobId: deliveryId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );
  }

  async getFailedDeliveries(options?: {
    tenantId?: string;
    limit?: number;
    offset?: number;
    eventType?: string;
  }) {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    const where: any = {
      status: 'failed',
    };
    if (options?.tenantId) {
      where.tenantId = options.tenantId;
    }
    if (options?.eventType) {
      where.eventType = options.eventType;
    }

    const [deliveries, total] = await Promise.all([
      this.prisma.lineMessageDelivery.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, displayName: true, phone: true, lineUserId: true } },
          booking: {
            select: {
              id: true,
              ref_no: true,
              service_name: true,
              bookingDate: true,
              startTime: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.lineMessageDelivery.count({ where }),
    ]);

    return { deliveries, total, limit, offset };
  }

  async retryDelivery(
    deliveryId: string,
    actor?: { id?: string; role?: string },
  ) {
    const delivery = await this.prisma.lineMessageDelivery.findUnique({
      where: { id: deliveryId },
      include: { tenant: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery job not found');
    }

    if (delivery.status !== 'failed') {
      throw new BadRequestException(
        `Cannot retry delivery with status ${delivery.status}. Only failed deliveries can be retried.`,
      );
    }

    await this.prisma.lineMessageDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'queued',
        attempts: 0,
        errorCode: null,
        errorMessage: null,
        scheduledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.enqueueDelivery(deliveryId, true);

    await this.auditService.record({
      tenantId: delivery.tenantId,
      actorId: actor?.id || null,
      actorType: (actor?.role as any) || 'merchant_admin',
      action: 'notification_retried',
      entityType: 'line_message_delivery',
      entityId: delivery.id,
      beforeState: {
        status: 'failed',
        errorCode: delivery.errorCode,
        errorMessage: delivery.errorMessage,
        attempts: delivery.attempts,
      },
      afterState: { status: 'queued', attempts: 0 },
      reason: 'Manual retry triggered by admin/merchant',
    });

    return {
      success: true,
      deliveryId,
      status: 'queued',
      message: 'Delivery job re-enqueued successfully',
    };
  }

  async retryAllFailedDeliveries(
    tenantId?: string,
    actor?: { id?: string; role?: string },
  ) {
    const where: any = { status: 'failed' };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const failedDeliveries = await this.prisma.lineMessageDelivery.findMany({
      where,
      select: { id: true, tenantId: true },
      take: 100,
    });

    for (const delivery of failedDeliveries) {
      await this.prisma.lineMessageDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'queued',
          attempts: 0,
          errorCode: null,
          errorMessage: null,
          scheduledAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await this.enqueueDelivery(delivery.id, true);
    }

    if (failedDeliveries.length > 0 && tenantId) {
      await this.auditService.record({
        tenantId,
        actorId: actor?.id || null,
        actorType: (actor?.role as any) || 'merchant_admin',
        action: 'notifications_bulk_retried',
        entityType: 'line_message_delivery',
        entityId: tenantId,
        beforeState: { retriedCount: failedDeliveries.length },
        afterState: { status: 'queued' },
        reason: 'Bulk retry triggered by admin',
      });
    }

    return {
      success: true,
      retriedCount: failedDeliveries.length,
      message: `Successfully re-enqueued ${failedDeliveries.length} failed delivery jobs`,
    };
  }

  async getLineQuotaStatus(tenantId: string): Promise<LineQuotaStatus> {
    const period = new Date().toISOString().slice(0, 7);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lineChannelAccessToken: true },
    });

    if (tenant?.lineChannelAccessToken) {
      try {
        const quota = await this.lineClient.getQuota(tenant.lineChannelAccessToken);
        const snapshot = await this.prisma.lineQuotaSnapshot.upsert({
          where: { tenantId_period: { tenantId, period } },
          create: {
            tenantId,
            period,
            quotaType: quota.type,
            quotaValue: quota.value,
            totalUsage: quota.totalUsage,
          },
          update: {
            quotaType: quota.type,
            quotaValue: quota.value,
            totalUsage: quota.totalUsage,
            fetchedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        return this.toQuotaStatus(snapshot, 'line');
      } catch (error) {
        this.logger.warn(
          `LINE quota lookup failed for tenant ${tenantId}; using cached/local usage: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const snapshot = await this.prisma.lineQuotaSnapshot.findUnique({
      where: { tenantId_period: { tenantId, period } },
    });
    if (snapshot) return this.toQuotaStatus(snapshot, 'snapshot');

    const start = new Date(`${period}-01T00:00:00+07:00`);
    const next = new Date(start);
    next.setMonth(next.getMonth() + 1);
    const usage = await this.prisma.lineMessageDelivery.aggregate({
      where: { tenantId, status: 'sent', sentAt: { gte: start, lt: next } },
      _sum: { lineMessageCount: true },
    });
    return this.buildStatus(period, 'limited', 300, usage._sum.lineMessageCount || 0, 'local', new Date());
  }

  private toQuotaStatus(
    snapshot: { period: string; quotaType: string; quotaValue: number | null; totalUsage: number; fetchedAt: Date },
    source: 'line' | 'snapshot',
  ): LineQuotaStatus {
    return this.buildStatus(
      snapshot.period,
      snapshot.quotaType === 'none' ? 'none' : 'limited',
      snapshot.quotaValue,
      snapshot.totalUsage,
      source,
      snapshot.fetchedAt,
    );
  }

  private buildStatus(
    period: string,
    quotaType: 'limited' | 'none',
    limit: number | null,
    usage: number,
    source: 'line' | 'snapshot' | 'local',
    fetchedAt: Date,
  ): LineQuotaStatus {
    const percentage = limit && limit > 0 ? Math.round((usage / limit) * 100) : null;
    const warningLevel: LineQuotaWarningLevel =
      percentage === null ? 'normal'
        : percentage >= 100 ? 'exceeded'
        : percentage >= 95 ? 'critical'
        : percentage >= 85 ? 'warning'
        : percentage >= 70 ? 'notice'
        : 'normal';

    return {
      period,
      quotaType,
      limit: quotaType === 'none' ? null : limit,
      usage,
      remaining: quotaType === 'none' || limit === null ? null : Math.max(0, limit - usage),
      percentage,
      warningLevel,
      source,
      sendingBlocked: false,
      fetchedAt: fetchedAt.toISOString(),
    };
  }
}
