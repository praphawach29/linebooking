import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import type { AppUser } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('admin/notifications')
@UseGuards(SupabaseAuthGuard)
export class NotificationsAdminController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('line/failed')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getFailedDeliveries(
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.notifications.getFailedDeliveries({
      tenantId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      eventType,
    });
  }

  @Post('line/retry/:id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  retryDelivery(
    @Param('id', new ParseUUIDPipe({ version: '4' })) deliveryId: string,
    @CurrentUser() user?: AppUser,
  ) {
    return this.notifications.retryDelivery(
      deliveryId,
      user ? { id: user.dbUserId, role: user.role } : undefined,
    );
  }

  @Post('line/retry-all')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  retryAllFailedDeliveries(
    @Query('tenantId') tenantId?: string,
    @CurrentUser() user?: AppUser,
  ) {
    return this.notifications.retryAllFailedDeliveries(
      tenantId,
      user ? { id: user.dbUserId, role: user.role } : undefined,
    );
  }
}
