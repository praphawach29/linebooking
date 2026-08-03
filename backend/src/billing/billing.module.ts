import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillingController, BillingWebhookController } from './billing.controller';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { BillingService } from './billing.service';
import { SubscriptionsService } from './subscriptions.service';
import { OmiseService } from './omise.service';
import { SlipsService } from './slips.service';
import { BillingProcessor, BILLING_QUEUE } from './billing.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BILLING_QUEUE,
    }),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [
    BillingService,
    SubscriptionsService,
    SlipsService,
    OmiseService,
    BillingProcessor,
    SupabaseAuthGuard,
    TenantAccessGuard,
    PlatformAdminGuard,
  ],
  exports: [BillingService, SubscriptionsService, SlipsService],
})
export class BillingModule {}
