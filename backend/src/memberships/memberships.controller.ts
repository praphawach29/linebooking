import { Controller, Get, Post, Headers, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('memberships/me')
  async getMyMembership(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    const userId = req.user.userId;
    return this.membershipsService.getMembership(tenantId, userId);
  }

  @Get('rewards')
  async getRewards(
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.membershipsService.getRewards(tenantId);
  }

  @Post('rewards/:id/redeem')
  async redeemReward(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') rewardId: string,
    @Req() req: any
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    const userId = req.user.userId;
    return this.membershipsService.redeemReward(tenantId, userId, rewardId);
  }
}
