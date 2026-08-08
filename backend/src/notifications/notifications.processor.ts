import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { buildBookingFlexMessage } from './line-flex.templates';
import { LineMessagingApiError, LineMessagingClient } from './line-messaging.client';
import { LineBookingEvent, NOTIFICATIONS_QUEUE } from './notifications.types';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineClient: LineMessagingClient,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.log(`LINE notification worker listening on queue ${NOTIFICATIONS_QUEUE}`);
  }

  async process(job: Job<{ deliveryId: string }>): Promise<void> {
    if (job.name !== 'line-booking-event') return;

    const delivery = await this.prisma.lineMessageDelivery.findUnique({
      where: { id: job.data.deliveryId },
      include: {
        tenant: true,
        user: true,
        booking: true,
      },
    });
    if (!delivery || delivery.status === 'sent' || delivery.status.startsWith('skipped_')) return;

    await this.prisma.lineMessageDelivery.update({
      where: { id: delivery.id },
      data: { status: 'processing', attempts: { increment: 1 }, updatedAt: new Date() },
    });

    const settings = (delivery.tenant.settings || {}) as Record<string, unknown>;
    if (settings.lineBookingConfirmationEnabled === false) {
      await this.finish(delivery.id, 'skipped_disabled');
      return;
    }
    if (!delivery.tenant.lineChannelAccessToken || !delivery.user?.lineUserId || !delivery.booking) {
      await this.finish(delivery.id, 'skipped_recipient', 'LINE_NOT_CONFIGURED', 'Missing channel token, recipient, or booking');
      return;
    }

    try {
      const message = buildBookingFlexMessage(
        delivery.eventType as LineBookingEvent,
        delivery.booking,
        delivery.tenant.name,
        delivery.tenant.liffId,
      );
      const result = await this.lineClient.pushMessage(
        delivery.tenant.lineChannelAccessToken,
        delivery.user.lineUserId,
        [message],
      );
      await this.prisma.lineMessageDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'sent',
          lineRequestId: result.requestId,
          sentAt: new Date(),
          errorCode: null,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      const lastAttempt = job.attemptsMade + 1 >= Number(job.opts.attempts || 1);
      if (lastAttempt || (error instanceof LineMessagingApiError && !error.retryable)) {
        await this.finish(
          delivery.id,
          'failed',
          error instanceof LineMessagingApiError ? String(error.status) : 'SEND_FAILED',
          error instanceof Error ? error.message : String(error),
        );
        if (!lastAttempt && error instanceof LineMessagingApiError && !error.retryable) return;
      }
      this.logger.warn(`LINE delivery ${delivery.id} failed on attempt ${job.attemptsMade + 1}`);
      throw error;
    }
  }

  private async finish(id: string, status: string, errorCode?: string, errorMessage?: string) {
    await this.prisma.lineMessageDelivery.update({
      where: { id },
      data: {
        status,
        errorCode: errorCode || null,
        errorMessage: errorMessage?.slice(0, 1000) || null,
        updatedAt: new Date(),
      },
    });
  }
}
