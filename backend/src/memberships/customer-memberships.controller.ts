import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MembershipsService } from './memberships.service';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';

@UseGuards(LineIdTokenGuard)
@Controller('customer/membership')
export class CustomerMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('summary')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
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
  @Throttle({ default: { limit: 30, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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

  @Get('data-export')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async exportMyData(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
  ) {
    return this.membershipsService.exportCustomerData(tenantId, customer.id);
  }

  @Post('data-erasure')
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  async eraseMyData(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
  ) {
    return this.membershipsService.eraseCustomerData(tenantId, customer.id);
  }
}
