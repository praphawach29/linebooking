import { Controller, Get, UseGuards } from '@nestjs/common';
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
  ) {
    return this.membershipsService.getMembership(tenantId, customer.id);
  }
}
