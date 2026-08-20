import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private auditService: AuditService,
  ) {}

  async handleOmiseWebhook(payload: any) {
    this.logger.log(`Received Omise Webhook: ${payload.key}`);

    if (payload.key === 'charge.complete' && payload.data?.status === 'successful') {
      const chargeId = payload.data.id;
      
      // Find payment by providerRef (chargeId)
      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: chargeId },
      });

      if (payment) {
        // Update payment status
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'paid', paidAt: new Date() },
        });

        if (payment.bookingId) {
          const previousBooking = await this.prisma.booking.findUnique({
            where: { id: payment.bookingId },
          });

          // Update booking status
          const booking = await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { 
              paymentStatus: 'paid',
              status: 'confirmed'
            },
          });

          if (booking.tenantId) {
            await this.auditService.record({
              tenantId: booking.tenantId,
              actorId: null,
              actorType: 'webhook',
              action: 'booking_confirmed',
              entityType: 'booking',
              entityId: booking.id,
              beforeState: {
                status: previousBooking?.status,
                paymentStatus: previousBooking?.paymentStatus,
              },
              afterState: {
                status: 'confirmed',
                paymentStatus: 'paid',
                chargeId,
              },
              reason: 'Payment confirmed via Omise Webhook',
            });

            await this.notifications.queueBookingEvent(
              booking.tenantId,
              booking.id,
              'booking_confirmed',
            );
          }
        }

        this.logger.log(`Payment and Booking confirmed for payment ID: ${payment.id}`);
      }
    }

    return { received: true };
  }

  async handleLineWebhook(
    tenantSlug: string,
    signature: string,
    rawBody: Buffer | undefined,
    payload: any,
  ) {
    const tenant = tenantSlug
      ? await this.prisma.tenant.findUnique({
          where: { slug: tenantSlug },
          select: { lineChannelSecret: true },
        })
      : null;
    if (!tenant?.lineChannelSecret || !signature || !rawBody) {
      throw new UnauthorizedException('Invalid LINE webhook signature');
    }

    const expected = createHmac('sha256', tenant.lineChannelSecret)
      .update(rawBody)
      .digest('base64');
    const expectedBytes = Buffer.from(expected);
    const actualBytes = Buffer.from(signature);
    if (
      expectedBytes.length !== actualBytes.length ||
      !timingSafeEqual(expectedBytes, actualBytes)
    ) {
      throw new UnauthorizedException('Invalid LINE webhook signature');
    }

    this.logger.log(`Received LINE Webhook`);
    
    if (payload.events && Array.isArray(payload.events)) {
      for (const event of payload.events) {
        if (event.type === 'message') {
          this.logger.log(`Received message from LINE user: ${event.source?.userId}`);
          // Handle incoming LINE messages here (e.g. reply with a bot)
        }
      }
    }

    return { received: true };
  }
}
