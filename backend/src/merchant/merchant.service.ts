import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService) {}

  async getBookings(tenantId: string, date?: string, status?: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const whereClause: any = {
      tenantId,
    };

    if (date) {
      // Assuming date format YYYY-MM-DD
      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);
      whereClause.bookingDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      whereClause.status = status;
    }

    return this.prisma.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, displayName: true, email: true, lineUserId: true } },
        service: { select: { id: true, name: true, price: true } },
      },
      orderBy: [
        { bookingDate: 'asc' },
        { startTime: 'asc' }
      ],
    });
  }

  async getDashboardStats(tenantId: string, startDate?: string, endDate?: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const whereClause: any = {
      tenantId,
      status: { not: 'CANCELLED' } // Don't count cancelled for revenue
    };

    if (startDate && endDate) {
      whereClause.bookingDate = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      select: {
        finalPrice: true,
        status: true,
        serviceId: true,
      }
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);
    const totalBookings = bookings.length;
    
    // Calculate top services
    const serviceCounts = bookings.reduce((acc: any, b) => {
      acc[b.serviceId] = (acc[b.serviceId] || 0) + 1;
      return acc;
    }, {});
    
    // In a real app we'd join with the Service table to get names, or group by query directly.

    return {
      total_revenue: totalRevenue,
      total_bookings: totalBookings,
      top_services_raw_data: serviceCounts,
    };
  }
}
