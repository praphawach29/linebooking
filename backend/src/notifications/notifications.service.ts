import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingClient } from './line-messaging.client';
import {
  LineBookingEvent,
  LineQuotaStatus,
  LineQuotaWarningLevel,
  NOTIFICATIONS_QUEUE,
} from './notifications.types';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly lineClient: LineMessagingClient,
  ) {}

  async onModuleInit(): Promise<void> {
    const queued = await this.prisma.lineMessageDelivery.findMany({
      where: { status: 'queued', scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
      select: { id: true },
    });

    for (const delivery of queued) {
      await this.enqueueDelivery(delivery.id);
    }

    if (queued.length > 0) {
      this.logger.log(`Recovered ${queued.length} queued LINE deliveries`);
    }
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

  private async enqueueDelivery(deliveryId: string): Promise<void> {
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
