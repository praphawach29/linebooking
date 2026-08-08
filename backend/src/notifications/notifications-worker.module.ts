import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';
import { NotificationsProcessor } from './notifications.processor';
import { LineMessagingClient } from './line-messaging.client';

@Module({
  imports: [NotificationsModule],
  providers: [NotificationsProcessor, LineMessagingClient],
})
export class NotificationsWorkerModule {}
