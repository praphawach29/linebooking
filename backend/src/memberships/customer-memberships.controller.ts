import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';

@UseGuards(LineIdTokenGuard)
@Controller('customer/membership')
export class CustomerMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  async getMyMembership(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
    @Query('phone') phone?: string,
  ) {
    return this.membershipsService.getMembershipWithPhoneFallback(tenantId, customer.id, phone);
  }
}
