import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import {
  AvailabilityService,
  AvailabilityResult,
} from './availability.service';
import {
  BookingResponseDto,
  CreateCustomerBookingDto,
  CreateMerchantBookingDto,
  GetAvailableSlotsQueryDto,
} from './dto';
import { CustomerTenantGuard } from '../common/guards/customer-tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * GET /bookings/available-slots
   * Public slot availability endpoint for customer LIFF flow.
   * Uses CustomerTenantGuard to validate x-tenant-id header and @TenantId decorator.
   * Delegates availability calculation strictly to AvailabilityService with actor: 'customer'.
   */
  @Get('available-slots')
  @UseGuards(CustomerTenantGuard)
  async getAvailableSlots(
    @TenantId() tenantId: string,
    @Query() query: GetAvailableSlotsQueryDto,
  ): Promise<AvailabilityResult> {
    return this.availabilityService.calculateAvailability(
      tenantId,
      query.bookingDate,
      query.serviceId,
      query.staffId,
      { actor: 'customer' },
    );
  }

  @Post()
  @UseGuards(LineIdTokenGuard)
  async createCustomerBooking(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
    @Body() dto: CreateCustomerBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.createBookingAtomic({
      actor: 'customer',
      tenantId,
      customerUserId: customer.id,
      serviceId: dto.serviceId,
      staffId: dto.staffId ?? undefined,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      notes: dto.notes,
    });
  }

  @Post('merchant')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async createMerchantBooking(
    @TenantId() tenantId: string,
    @Body() dto: CreateMerchantBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.createBookingAtomic({
      actor: 'merchant',
      tenantId,
      customerUserId: dto.customerId,
      serviceId: dto.serviceId,
      staffId: dto.staffId ?? undefined,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      notes: dto.notes,
    });
  }

  @Patch(':id/cancel')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async cancelMerchantBooking(
    @TenantId() tenantId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) bookingId: string,
  ) {
    return this.bookingsService.cancelBookingAsMerchant(tenantId, bookingId);
  }
}
