import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.types';

export interface SlaItem {
  key: string;
  name: string;
  target: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  operator: 'gte' | 'lte' | 'eq';
  status: 'pass' | 'warn' | 'fail';
}

export interface PilotTenantMetrics {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  plan: string;
  totalBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  pendingSlipsCount: number;
  lineMessagesSent: number;
  lineMessagesFailed: number;
  status: 'healthy' | 'warning' | 'action_needed';
}

export interface PilotValidationReport {
  overallStatus: 'READY_FOR_LAUNCH' | 'PILOT_IN_PROGRESS' | 'ACTION_REQUIRED';
  generatedAt: string;
  period: string;
  slas: SlaItem[];
  totals: {
    totalTenants: number;
    totalBookings: number;
    totalRevenue: number;
    totalLineMessages: number;
    queueWaiting: number;
    queueActive: number;
    dlqCount: number;
  };
  tenants: PilotTenantMetrics[];
}

@Injectable()
export class PilotMetricsService {
  private readonly logger = new Logger(PilotMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  async getPilotValidationReport(): Promise<PilotValidationReport> {
    const [
      tenants,
      bookings,
      payments,
      slips,
      lineDeliveries,
      auditLogs,
      queueWaiting,
      queueActive,
    ] = await Promise.all([
      this.prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          businessType: true,
          plan: true,
        },
      }),
      this.prisma.booking.findMany({
        select: {
          id: true,
          tenantId: true,
          status: true,
          paymentStatus: true,
          finalPrice: true,
          court_id: true,
          staffId: true,
          bookingDate: true,
          startTime: true,
          endTime: true,
          checkedInAt: true,
        },
      }),
      this.prisma.payment.findMany({
        select: { id: true, status: true, amount: true, tenantId: true },
      }),
      this.prisma.payment_slips.findMany({
        select: { id: true, verification_status: true, tenant_id: true },
      }),
      this.prisma.lineMessageDelivery.findMany({
        select: { id: true, status: true, tenantId: true, attempts: true },
      }),
      this.prisma.auditLog.findMany({
        select: { id: true, action: true, tenantId: true },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      this.notificationQueue.getWaitingCount().catch(() => 0),
      this.notificationQueue.getActiveCount().catch(() => 0),
    ]);

    // 1. Calculate SLA KPIs
    const totalBookings = bookings.length;
    const successfulBookings = bookings.filter((b) =>
      ['confirmed', 'checked_in', 'completed'].includes(b.status || ''),
    ).length;
    const bookingSuccessRate =
      totalBookings > 0
        ? Math.round((successfulBookings / totalBookings) * 1000) / 10
        : 100;

    // Double booking detection (overlapping intervals on same court or staff)
    let doubleBookingCount = 0;
    const activeBookings = bookings.filter(
      (b) => !['cancelled', 'rejected'].includes(b.status || ''),
    );
    for (let i = 0; i < activeBookings.length; i++) {
      for (let j = i + 1; j < activeBookings.length; j++) {
        const a = activeBookings[i];
        const b = activeBookings[j];
        if (
          a.tenantId === b.tenantId &&
          a.bookingDate.toISOString().slice(0, 10) ===
            b.bookingDate.toISOString().slice(0, 10)
        ) {
          const sameResource =
            (a.court_id && a.court_id === b.court_id) ||
            (a.staffId && a.staffId === b.staffId);
          if (sameResource) {
            const aStart = a.startTime.getTime();
            const aEnd = a.endTime.getTime();
            const bStart = b.startTime.getTime();
            const bEnd = b.endTime.getTime();
            if (aStart < bEnd && aEnd > bStart) {
              doubleBookingCount++;
            }
          }
        }
      }
    }

    // Payment Success Rate
    const totalPaymentAttempts = payments.length + slips.length;
    const confirmedPayments =
      payments.filter((p) => p.status === 'paid' || p.status === 'successful')
        .length +
      slips.filter((s) => s.verification_status === 'verified').length;
    const paymentSuccessRate =
      totalPaymentAttempts > 0
        ? Math.round((confirmedPayments / totalPaymentAttempts) * 1000) / 10
        : 100;

    // Flex Delivery Success Rate
    const totalDeliveries = lineDeliveries.length;
    const completedDeliveries = lineDeliveries.filter(
      (d) => d.status === 'completed',
    ).length;
    const failedDeliveries = lineDeliveries.filter(
      (d) => d.status === 'failed' || d.status === 'dead_letter',
    ).length;
    const flexDeliverySuccessRate =
      completedDeliveries + failedDeliveries > 0
        ? Math.round(
            (completedDeliveries /
              (completedDeliveries + failedDeliveries)) *
              1000,
          ) / 10
        : 100;
    const dlqCount = lineDeliveries.filter(
      (d) => d.status === 'dead_letter',
    ).length;

    // Check-in Success Rate
    const eligibleForCheckIn = bookings.filter((b) =>
      ['checked_in', 'completed'].includes(b.status || '') || b.checkedInAt !== null,
    ).length;
    const checkedInCount = bookings.filter((b) => b.checkedInAt !== null).length;
    const checkInSuccessRate =
      eligibleForCheckIn > 0
        ? Math.round((checkedInCount / eligibleForCheckIn) * 1000) / 10
        : 100;

    // API Error Rate (from Audit logs)
    const errorAudits = auditLogs.filter(
      (a) => a.action.includes('fail') || a.action.includes('error'),
    ).length;
    const apiErrorRate =
      auditLogs.length > 0
        ? Math.round((errorAudits / auditLogs.length) * 1000) / 10
        : 0;

    // 2. Build SLA items list
    const slas: SlaItem[] = [
      {
        key: 'booking_success_rate',
        name: 'Booking Success Rate',
        target: '> 99%',
        targetValue: 99,
        currentValue: bookingSuccessRate,
        unit: '%',
        operator: 'gte',
        status:
          bookingSuccessRate >= 99
            ? 'pass'
            : bookingSuccessRate >= 95
            ? 'warn'
            : 'fail',
      },
      {
        key: 'double_booking_count',
        name: 'Double Booking Count',
        target: '= 0 รายการ',
        targetValue: 0,
        currentValue: doubleBookingCount,
        unit: 'รายการ',
        operator: 'eq',
        status: doubleBookingCount === 0 ? 'pass' : 'fail',
      },
      {
        key: 'payment_success_rate',
        name: 'Payment Confirmation Success',
        target: '> 98%',
        targetValue: 98,
        currentValue: paymentSuccessRate,
        unit: '%',
        operator: 'gte',
        status:
          paymentSuccessRate >= 98
            ? 'pass'
            : paymentSuccessRate >= 90
            ? 'warn'
            : 'fail',
      },
      {
        key: 'flex_delivery_rate',
        name: 'LINE Flex Message Delivery',
        target: '> 99%',
        targetValue: 99,
        currentValue: flexDeliverySuccessRate,
        unit: '%',
        operator: 'gte',
        status:
          flexDeliverySuccessRate >= 99
            ? 'pass'
            : flexDeliverySuccessRate >= 90
            ? 'warn'
            : 'fail',
      },
      {
        key: 'check_in_rate',
        name: 'Check-in Completion Rate',
        target: '> 99%',
        targetValue: 99,
        currentValue: checkInSuccessRate,
        unit: '%',
        operator: 'gte',
        status:
          checkInSuccessRate >= 99
            ? 'pass'
            : checkInSuccessRate >= 90
            ? 'warn'
            : 'fail',
      },
      {
        key: 'api_error_rate',
        name: 'API Error Rate',
        target: '< 1%',
        targetValue: 1,
        currentValue: apiErrorRate,
        unit: '%',
        operator: 'lte',
        status:
          apiErrorRate <= 1 ? 'pass' : apiErrorRate <= 3 ? 'warn' : 'fail',
      },
    ];

    const hasFailedSla = slas.some((s) => s.status === 'fail');
    const hasWarnSla = slas.some((s) => s.status === 'warn');
    const overallStatus: 'READY_FOR_LAUNCH' | 'PILOT_IN_PROGRESS' | 'ACTION_REQUIRED' =
      hasFailedSla
        ? 'ACTION_REQUIRED'
        : hasWarnSla
        ? 'PILOT_IN_PROGRESS'
        : 'READY_FOR_LAUNCH';

    // 3. Per-tenant breakdown
    const tenantMetrics: PilotTenantMetrics[] = tenants.map((t) => {
      const tBookings = bookings.filter((b) => b.tenantId === t.id);
      const tSlips = slips.filter((s) => s.tenant_id === t.id);
      const tDeliveries = lineDeliveries.filter((d) => d.tenantId === t.id);

      const confirmed = tBookings.filter((b) => b.status === 'confirmed').length;
      const checkedIn = tBookings.filter((b) => b.status === 'checked_in').length;
      const completed = tBookings.filter((b) => b.status === 'completed').length;
      const cancelled = tBookings.filter((b) => b.status === 'cancelled').length;

      const revenue = tBookings
        .filter((b) => ['confirmed', 'checked_in', 'completed'].includes(b.status || ''))
        .reduce((sum, b) => sum + Number(b.finalPrice || 0), 0);

      const pendingSlips = tSlips.filter(
        (s) => s.verification_status === 'pending',
      ).length;
      const sentMsg = tDeliveries.filter((d) => d.status === 'completed').length;
      const failedMsg = tDeliveries.filter(
        (d) => d.status === 'failed' || d.status === 'dead_letter',
      ).length;

      const status: 'healthy' | 'warning' | 'action_needed' =
        failedMsg > 5 || pendingSlips > 10
          ? 'action_needed'
          : failedMsg > 0 || pendingSlips > 0
          ? 'warning'
          : 'healthy';

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        businessType: t.businessType || 'general',
        plan: t.plan || 'free',
        totalBookings: tBookings.length,
        confirmedBookings: confirmed,
        checkedInBookings: checkedIn,
        completedBookings: completed,
        cancelledBookings: cancelled,
        totalRevenue: Math.round(revenue),
        pendingSlipsCount: pendingSlips,
        lineMessagesSent: sentMsg,
        lineMessagesFailed: failedMsg,
        status,
      };
    });

    const totalRevenue = bookings
      .filter((b) => ['confirmed', 'checked_in', 'completed'].includes(b.status || ''))
      .reduce((sum, b) => sum + Number(b.finalPrice || 0), 0);

    return {
      overallStatus,
      generatedAt: new Date().toISOString(),
      period: 'Past 30 Days (Pilot Release Window)',
      slas,
      totals: {
        totalTenants: tenants.length,
        totalBookings,
        totalRevenue: Math.round(totalRevenue),
        totalLineMessages: totalDeliveries,
        queueWaiting,
        queueActive,
        dlqCount,
      },
      tenants: tenantMetrics,
    };
  }
}
