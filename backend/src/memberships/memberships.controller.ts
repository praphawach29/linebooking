import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  Req,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import type { AppUser } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdjustPointsDto } from './dto/adjust-points.dto';

@Controller()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('memberships/me')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getMyMembership(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    const userId = req.user.userId;
    return this.membershipsService.getMembership(tenantId, userId);
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getRewards(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.membershipsService.getRewards(tenantId);
  }

  @Post('rewards/:id/redeem')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async redeemReward(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') rewardId: string,
    @Req() req: any,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    const userId = req.user.userId;
    return this.membershipsService.redeemReward(tenantId, userId, rewardId);
  }

  @Post('memberships/adjust-points')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async adjustPoints(
    @TenantId() tenantId: string,
    @Body() dto: AdjustPointsDto,
    @CurrentUser() user?: AppUser,
  ) {
    return this.membershipsService.adjustCustomerPointsAsMerchant(
      tenantId,
      dto.targetUserId,
      dto.pointsDelta,
      dto.reason,
      user ? { id: user.dbUserId, role: user.role } : undefined,
    );
  }
}
