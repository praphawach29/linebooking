import { Controller, Get, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get('bookings')
  async getBookings(
    @Headers('x-tenant-id') tenantId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.merchantService.getBookings(tenantId, date, status);
  }

  @Get('dashboard/stats')
  async getDashboardStats(
    @Headers('x-tenant-id') tenantId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.merchantService.getDashboardStats(tenantId, startDate, endDate);
  }
}
