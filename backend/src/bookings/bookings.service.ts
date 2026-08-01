import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(tenantId: string, date: string, serviceId: string, staffId?: string) {
    if (!tenantId || !date || !serviceId) {
      throw new BadRequestException('tenantId, date, and serviceId are required');
    }

    // Mock implementation for MVP
    // Real implementation would calculate intervals based on BusinessHours, StaffSchedule, and existing Bookings.
    return {
      date,
      service_id: serviceId,
      staff_id: staffId || null,
      available_slots: [
        { start_time: '10:00', end_time: '11:00' },
        { start_time: '11:00', end_time: '12:00' },
        { start_time: '13:00', end_time: '14:00' },
      ],
    };
  }

  async createBooking(tenantId: string, userId: string, dto: CreateBookingDto) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Verify service exists
      const service = await prisma.service.findFirst({
        where: { id: dto.service_id, tenantId },
      });
      if (!service) throw new NotFoundException('Service not found');

      // 2. Check for double booking (simplified for MVP)
      const existingBooking = await prisma.booking.findFirst({
        where: {
          tenantId,
          bookingDate: new Date(dto.booking_date),
          startTime: dto.start_time,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...(dto.staff_id ? { staffId: dto.staff_id } : {}),
        },
      });

      if (existingBooking) {
        throw new BadRequestException('This slot is already booked');
      }

      // 3. Create booking
      const booking = await prisma.booking.create({
        data: {
          tenantId,
          userId,
          serviceId: dto.service_id,
          staffId: dto.staff_id,
          bookingDate: new Date(dto.booking_date),
          startTime: dto.start_time,
          endTime: dto.end_time,
          price: service.price,
          finalPrice: service.price,
          notes: dto.customer_note,
        },
      });

      return booking;
    });
  }

  async cancelBooking(tenantId: string, userId: string, bookingId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot cancel booking with status ${booking.status}`);
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });
  }
}
