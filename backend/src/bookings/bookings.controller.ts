import { Controller, Get, Post, Patch, Body, Query, Param, Headers, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; // I'll need to create this

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('available-slots')
  async getAvailableSlots(
    @Headers('x-tenant-id') tenantId: string,
    @Query('date') date: string,
    @Query('service_id') serviceId: string,
    @Query('staff_id') staffId?: string,
  ) {
    return this.bookingsService.getAvailableSlots(tenantId, date, serviceId, staffId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createBooking(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    const userId = req.user.id;
    return this.bookingsService.createBooking(tenantId, userId, createBookingDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancelBooking(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') bookingId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.bookingsService.cancelBooking(tenantId, userId, bookingId);
  }
}
