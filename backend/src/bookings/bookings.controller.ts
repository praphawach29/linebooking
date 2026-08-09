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
  CheckInBookingDto,
  CreateCustomerBookingDto,
  CreateMerchantBookingDto,
  GetAvailableSlotsQueryDto,
  RescheduleBookingDto,
  UpdateBookingStatusDto,
} from './dto';
import { CustomerTenantGuard } from '../common/guards/customer-tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('mine')
  @UseGuards(LineIdTokenGuard)
  async getCustomerBookings(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
  ): Promise<BookingResponseDto[]> {
    return this.bookingsService.getCustomerBookings(tenantId, customer.id);
  }

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
      { actor: 'customer', courtId: query.courtId },
    );
  }

  @Post()
  @UseGuards(LineIdTokenGuard)
  async createCustomerBooking(
    @TenantId() tenantId: string,
    @CurrentCustomer() customer: { id: string },
    @Body() dto: CreateCustomerBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.createBookingAtomic({
      actor: 'customer',
      tenantId,
      customerUserId: customer.id,
      serviceId: dto.serviceId,
      staffId: dto.staffId ?? undefined,
      courtId: dto.courtId ?? undefined,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      bookingHours: dto.bookingHours,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
      depositPaid: dto.depositPaid,
      paymentSlipUrl: dto.paymentSlipUrl,
    });
    await this.notificationsService.queueBookingEvent(
      tenantId,
      booking.id,
      'booking_created',
    );
    return booking;
  }

  @Post('merchant')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async createMerchantBooking(
    @TenantId() tenantId: string,
    @Body() dto: CreateMerchantBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.createBookingAtomic({
      actor: 'merchant',
      tenantId,
      customerUserId: dto.customerId,
      serviceId: dto.serviceId,
      staffId: dto.staffId ?? undefined,
      courtId: dto.courtId ?? undefined,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      bookingHours: dto.bookingHours,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod ?? 'cash',
    });
    await this.notificationsService.queueBookingEvent(
      tenantId,
      booking.id,
      'booking_created',
    );
    return booking;
  }

  @Patch(':id/verify-payment')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async verifyBookingPayment(
    @TenantId() tenantId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) bookingId: string,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.verifyBookingPaymentAsMerchant(
      tenantId,
      bookingId,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async cancelMerchantBooking(
    @TenantId() tenantId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) bookingId: string,
  ) {
    const booking = await this.bookingsService.cancelBookingAsMerchant(
      tenantId,
      bookingId,
    );
    await this.notificationsService.queueBookingEvent(
      tenantId,
      bookingId,
      'booking_cancelled',
    );
    return booking;
  }

  @Post('check-in')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async checkInMerchantBooking(
    @TenantId() tenantId: string,
    @Body() dto: CheckInBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.checkInBookingAsMerchant(
      tenantId,
      dto.code,
    );
    await this.notificationsService.queueBookingEvent(
      tenantId,
      booking.id,
      'booking_checked_in',
    );
    return booking;
  }

  @Patch(':id/status')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async updateMerchantBookingStatus(
    @TenantId() tenantId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.updateBookingStatusAsMerchant(
      tenantId,
      bookingId,
      dto.status,
      dto.reason,
    );
    if (dto.status === 'confirmed') {
      await this.notificationsService.queueBookingEvent(
        tenantId,
        bookingId,
        'booking_confirmed',
      );
    } else if (dto.status === 'cancelled') {
      await this.notificationsService.queueBookingEvent(
        tenantId,
        bookingId,
        'booking_cancelled',
      );
    }
    return booking;
  }

  @Patch(':id/reschedule')
  @UseGuards(SupabaseAuthGuard, TenantAccessGuard)
  async rescheduleMerchantBooking(
    @TenantId() tenantId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() dto: RescheduleBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.rescheduleBookingAsMerchant(
      tenantId,
      bookingId,
      dto.bookingDate,
      dto.startTime,
    );
    await this.notificationsService.queueBookingEvent(
      tenantId,
      bookingId,
      'booking_rescheduled',
    );
    return booking;
  }
}
