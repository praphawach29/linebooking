import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';

@UseGuards(LineIdTokenGuard)
@Controller('customer/membership')
export class CustomerMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('summary')
  async getMyProfileSummary(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
    @Query('phone') phone?: string,
  ) {
    return this.membershipsService.getCustomerProfileSummary(
      tenantId,
      customer.id,
      phone,
    );
  }

  @Get()
  async getMyMembership(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
    @Query('phone') phone?: string,
  ) {
    return this.membershipsService.getMembershipWithPhoneFallback(
      tenantId,
      customer.id,
      phone,
    );
  }

  @Post('link-phone')
  async linkPhone(
    @CurrentCustomer() customer: { id: string },
    @Body('phone') phone?: string,
  ) {
    if (!phone || !phone.trim()) {
      throw new BadRequestException('phone is required');
    }
    return this.membershipsService.linkPhoneAndMergeIdentity(
      customer.id,
      phone,
    );
  }
}
