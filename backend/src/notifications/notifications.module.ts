import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
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
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    LineMessagingClient,
    SupabaseAuthGuard,
    TenantAccessGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
