import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { LineMessagingClient } from './line-messaging.client';
import { NOTIFICATIONS_QUEUE } from './notifications.types';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  providers: [NotificationsProcessor, LineMessagingClient],
})
export class NotificationsWorkerModule {}
