import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(SupabaseAuthGuard, TenantAccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('line/quota')
  getLineQuota(@TenantId() tenantId: string) {
    return this.notifications.getLineQuotaStatus(tenantId);
  }
}
