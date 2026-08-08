import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { CustomerTenantGuard } from '../common/guards/customer-tenant.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, SupabaseModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    AvailabilityService,
    CustomerTenantGuard,
    SupabaseAuthGuard,
    TenantAccessGuard,
  ],
  exports: [BookingsService, AvailabilityService],
})
export class BookingsModule {}
