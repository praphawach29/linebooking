import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsProcessor } from './notifications.processor';
import { LineMessagingClient } from './line-messaging.client';
import { NOTIFICATIONS_QUEUE } from './notifications.types';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [
    NotificationsService,
    ...(process.env.NODE_ENV === 'test' ? [] : [NotificationsProcessor]),
    LineMessagingClient,
    SupabaseAuthGuard,
    TenantAccessGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
