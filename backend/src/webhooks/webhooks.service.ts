import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

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
          data: { status: 'PAID', paidAt: new Date() },
        });

        // Update booking status
        await this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: { 
            paymentStatus: 'PAID',
            status: 'CONFIRMED'
          },
        });

        this.logger.log(`Payment and Booking confirmed for payment ID: ${payment.id}`);
      }
    }

    return { received: true };
  }

  async handleLineWebhook(payload: any) {
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
