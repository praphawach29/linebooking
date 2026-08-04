import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import {
  BookingFlowMode,
  VALID_BOOKING_FLOW_MODES,
} from '../common/types/booking-flow-mode';

export interface CandidateSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  staffId: string | null;
  courtId?: string | null;
  available: boolean;
}

export interface AvailabilityResult {
  tenantId: string;
  bookingDate: string;
  timezone: string;
  slotIntervalMinutes: number;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
    price: number;
  };
  slots: CandidateSlot[];
}

export interface AvailabilityOptions {
  actor?: 'customer' | 'merchant';
  txPrisma?: Prisma.TransactionClient | PrismaService;
  courtId?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically calculates slot availability for a tenant, date, and service.
   * Shared algorithm between GET /bookings/available-slots and POST /bookings.
   * Supports customer and merchant actor contexts.
   */
  async calculateAvailability(
    tenantId: string,
    bookingDateStr: string,
    serviceId: string,
    staffId?: string,
    options: AvailabilityOptions = {},
  ): Promise<AvailabilityResult> {
    const db = options.txPrisma || this.prisma;
    const actor = options.actor || 'customer';
    const courtId = options.courtId;

    // 1. Fetch & validate Tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true, settings: true },
    });

    if (!tenant) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    if (tenant.isActive !== true) {
      throw new ConflictException({
        statusCode: 409,
        code: ErrorCode.TENANT_INACTIVE,
        message: 'Tenant is currently inactive',
      });
    }

    const settings = (tenant.settings as any) || {};
    const timezone = settings.timezone || 'Asia/Bangkok';

    // Phase 1 Timezone Scope Validation (Asia/Bangkok)
    this.validatePhase1Timezone(timezone);

    // 1, 3, 5. Read & validate BookingFlowMode ONLY from tenant.settings
    const bookingFlowMode: BookingFlowMode =
      settings.bookingFlowMode || 'service_staff_time';

    if (!VALID_BOOKING_FLOW_MODES.includes(bookingFlowMode)) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Invalid bookingFlowMode configuration: ${bookingFlowMode}`,
      });
    }

    const isStaffMode = bookingFlowMode === 'service_staff_time';

    // 6 & 7. enableStaffSelection ONLY controls explicit staff picking for CUSTOMERS
    const enableStaffSelection = settings.enableStaffSelection !== false;
    if (staffId && !enableStaffSelection && actor === 'customer') {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.STAFF_SELECTION_DISABLED,
        message: 'Manual staff selection is disabled for customer bookings',
      });
    }

    const slotIntervalMinutes =
      settings.slotIntervalMinutes !== undefined && settings.slotIntervalMinutes !== null
        ? Number(settings.slotIntervalMinutes)
        : 30;

    const minLeadTimeHours =
      settings.minLeadTimeHours !== undefined && settings.minLeadTimeHours !== null
        ? Number(settings.minLeadTimeHours)
        : 0;

    const maxAdvanceBookingDays =
      settings.maxAdvanceBookingDays !== undefined && settings.maxAdvanceBookingDays !== null
        ? Number(settings.maxAdvanceBookingDays)
        : 365;

    // Validate numeric settings with Number.isFinite and integer/range constraints
    if (
      !Number.isInteger(slotIntervalMinutes) ||
      slotIntervalMinutes < 1 ||
      slotIntervalMinutes > 1440 ||
      !Number.isFinite(minLeadTimeHours) ||
      minLeadTimeHours < 0 ||
      !Number.isInteger(maxAdvanceBookingDays) ||
      maxAdvanceBookingDays < 0
    ) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Invalid tenant numeric configuration settings',
      });
    }

    // 2. Fetch & validate Service (WITHOUT invalid include of bookings.select.bufferMinutes or service.bookingFlowMode)
    const service = await db.service.findFirst({
      where: { id: serviceId, tenantId },
    });

    if (!service) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.SERVICE_NOT_FOUND,
        message: 'Service not found',
      });
    }

    if (service.isActive !== true) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.SERVICE_INACTIVE,
        message: 'Service is currently inactive',
      });
    }

    let selectedCourt: { id: string; name: string } | null = null;
    if (courtId) {
      const court = await db.courts.findFirst({
        where: {
          id: courtId,
          tenant_id: tenantId,
          is_active: true,
          OR: [{ service_id: serviceId }, { service_id: null }],
        },
        select: { id: true, name: true },
      });

      if (!court) {
        throw new NotFoundException({
          statusCode: 404,
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'Court not found or inactive for this service',
        });
      }

      selectedCourt = court;
    }

    const durationMinutes = service.durationMinutes;
    const bufferMinutes = service.bufferMinutes ?? 0;
    const maxCapacity = service.maxCapacity ?? 1; // Item 5: Use ?? 1 so 0 is caught by validation below
    const servicePrice = Number(service.price) || 0;

    // Validate service numeric settings
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      !Number.isInteger(bufferMinutes) ||
      bufferMinutes < 0 ||
      !Number.isInteger(maxCapacity) ||
      maxCapacity < 1
    ) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Invalid service numeric configuration parameters',
      });
    }

    // Timezone aware Current Instant calculation & Lead Time validation
    const nowLocal = this.getZonedNow(timezone);
    const dateParts = bookingDateStr.split('-').map(Number);
    const bookingDateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    const dayOfWeek = bookingDateObj.getUTCDay();

    if (bookingDateStr < nowLocal.todayStr) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.BOOKING_IN_PAST,
        message: 'Booking date cannot be in the past',
      });
    }

    // Check maxAdvanceBookingDays
    const maxAdvanceDate = new Date(nowLocal.todayObj);
    maxAdvanceDate.setUTCDate(maxAdvanceDate.getUTCDate() + maxAdvanceBookingDays);
    const maxAdvanceStr = maxAdvanceDate.toISOString().split('T')[0];
    if (bookingDateStr > maxAdvanceStr) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.BOOKING_TOO_FAR_AHEAD,
        message: `Booking date exceeds maximum advance booking limit of ${maxAdvanceBookingDays} days`,
      });
    }

    // Fetch Business Hours for dayOfWeek
    const businessHours = await db.businessHours.findFirst({
      where: { tenantId, dayOfWeek },
    });

    if (!businessHours || businessHours.isOpen !== true) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.BOOKING_OUTSIDE_BUSINESS_HOURS,
        message: 'Business is closed on the selected date',
      });
    }

    const openTimeStr = this.formatTimeString(businessHours.openTime);
    const closeTimeStr = this.formatTimeString(businessHours.closeTime);
    const openMinutes = this.timeToMinutes(openTimeStr);
    const closeMinutes = this.timeToMinutes(closeTimeStr);

    if (openMinutes >= closeMinutes) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.BOOKING_OUTSIDE_BUSINESS_HOURS,
        message: 'Business open time must be earlier than close time',
      });
    }

    // Staff eligibility query for Staff Mode
    let eligibleStaffIds: string[] = [];
    if (isStaffMode) {
      if (staffId) {
        const staff = await db.staff.findFirst({
          where: { id: staffId, tenant_id: tenantId, is_active: true },
        });

        if (!staff) {
          throw new NotFoundException({
            statusCode: 404,
            code: ErrorCode.STAFF_NOT_FOUND,
            message: 'Staff not found or inactive',
          });
        }

        const staffServiceMapping = await db.staffService.findFirst({
          where: { staffId, serviceId },
        });

        if (!staffServiceMapping) {
          throw new BadRequestException({
            statusCode: 400,
            code: ErrorCode.STAFF_NOT_ELIGIBLE,
            message: 'Selected staff is not eligible for this service',
          });
        }

        eligibleStaffIds = [staffId];
      } else {
        const staffServices = await db.staffService.findMany({
          where: { serviceId, staff: { tenant_id: tenantId, is_active: true } },
          select: { staffId: true },
          orderBy: { staffId: 'asc' },
        });
        eligibleStaffIds = staffServices.map((ss) => ss.staffId).sort();
      }
    }

    // Fetch StaffSchedules for eligible staff
    const staffSchedules = eligibleStaffIds.length > 0
      ? await db.staffSchedule.findMany({
          where: {
            tenantId,
            staffId: { in: eligibleStaffIds },
            OR: [
              { specificDate: bookingDateObj },
              { dayOfWeek: dayOfWeek, specificDate: null },
            ],
          },
        })
      : [];

    // Fetch existing overlapping bookings with blocking statuses ['pending', 'confirmed', 'checked_in']
    const existingBookings = await db.booking.findMany({
      where: {
        tenantId,
        bookingDate: bookingDateObj,
        status: { in: ['pending', 'confirmed', 'checked_in'] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        staffId: true,
        serviceId: true,
        court_id: true,
        service: {
          select: { bufferMinutes: true },
        },
      },
    });

    const leadTimeMs = minLeadTimeHours * 3600 * 1000;

    // Generate candidate slots
    const slots: CandidateSlot[] = [];

    for (
      let startMins = openMinutes;
      startMins + durationMinutes <= closeMinutes;
      startMins += slotIntervalMinutes
    ) {
      const endMins = startMins + durationMinutes;
      const candidateConflictEndMins = endMins + bufferMinutes;

      const slotStartStr = this.minutesToTime(startMins);
      const slotEndStr = this.minutesToTime(endMins);

      // Candidate Instant check in Tenant Timezone (cross-day lead time support)
      const candidateInstant = this.parseZonedSlotInstant(bookingDateStr, slotStartStr, timezone);
      if (candidateInstant.getTime() < nowLocal.nowInstant.getTime() + leadTimeMs) {
        slots.push({
          startTime: slotStartStr,
          endTime: slotEndStr,
          staffId: null,
          available: false,
        });
        continue;
      }

      let isAvailable = true;
      let assignedStaffId: string | null = staffId || null;

      if (isStaffMode) {
        // In Staff Mode, if eligibleStaffIds is empty, ALL SLOTS ARE UNAVAILABLE
        if (eligibleStaffIds.length === 0) {
          slots.push({
            startTime: slotStartStr,
            endTime: slotEndStr,
            staffId: null,
            available: false,
          });
          continue;
        }

        // Filter staff who are scheduled and free from overlap
        const availableStaff = eligibleStaffIds.filter((sId) => {
          const specificSchedule = staffSchedules.find(
            (s) =>
              s.staffId === sId &&
              s.specificDate &&
              new Date(s.specificDate).toISOString().split('T')[0] === bookingDateStr,
          );

          const effectiveSchedule =
            specificSchedule ||
            staffSchedules.find(
              (s) => s.staffId === sId && s.dayOfWeek === dayOfWeek && !s.specificDate,
            );

          // If NO schedule found at all, treat staff as UNAVAILABLE!
          if (!effectiveSchedule) {
            return false;
          }

          if (effectiveSchedule.isAvailable !== true) {
            return false;
          }

          const schedStart = this.timeToMinutes(this.formatTimeString(effectiveSchedule.startTime));
          const schedEnd = this.timeToMinutes(this.formatTimeString(effectiveSchedule.endTime));
          if (startMins < schedStart || endMins > schedEnd) {
            return false;
          }

          // Check overlap combining candidate buffer AND existing booking's service buffer
          const staffOverlaps = existingBookings.filter((b) => {
            if (b.staffId !== sId) return false;
            const bStartMins = this.timeToMinutes(this.formatTimeString(b.startTime));
            const bEndMins = this.timeToMinutes(this.formatTimeString(b.endTime));
            const bBufferMins = b.service?.bufferMinutes || 0;
            const bConflictEndMins = bEndMins + bBufferMins;

            return startMins < bConflictEndMins && candidateConflictEndMins > bStartMins;
          });

          return staffOverlaps.length === 0;
        });

        if (availableStaff.length === 0) {
          isAvailable = false;
        } else if (!assignedStaffId) {
          assignedStaffId = availableStaff[0]; // Deterministic first staff
        }
      } else {
        // Resource / Capacity Mode (service_time_only or sports_court_time): PEAK CONCURRENT BOOKINGS Check
        const overlappingBookings = existingBookings
          .filter((b) => b.serviceId === serviceId)
          .map((b) => {
            const bStartMins = this.timeToMinutes(this.formatTimeString(b.startTime));
            const bEndMins = this.timeToMinutes(this.formatTimeString(b.endTime));
            const bBufferMins = b.service?.bufferMinutes || 0;
            return {
              start: bStartMins,
              end: bEndMins + bBufferMins,
            };
          });

        if (selectedCourt) {
          isAvailable = !existingBookings.some((b) => {
            if (b.court_id !== selectedCourt.id) return false;
            const bStartMins = this.timeToMinutes(this.formatTimeString(b.startTime));
            const bEndMins = this.timeToMinutes(this.formatTimeString(b.endTime));
            const bBufferMins = b.service?.bufferMinutes || 0;
            return startMins < bEndMins + bBufferMins && candidateConflictEndMins > bStartMins;
          });
        } else {
          const peakConcurrent = this.calculatePeakConcurrentBookings(
            startMins,
            candidateConflictEndMins,
            overlappingBookings,
          );

          if (peakConcurrent >= maxCapacity) {
            isAvailable = false;
          }
        }
      }

      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        staffId: isAvailable ? assignedStaffId : null,
        courtId: isAvailable ? selectedCourt?.id ?? null : null,
        available: isAvailable,
      });
    }

    return {
      tenantId,
      bookingDate: bookingDateStr,
      timezone,
      slotIntervalMinutes,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes,
        bufferMinutes,
        price: servicePrice,
      },
      slots,
    };
  }

  // --- Helper Methods ---

  private validatePhase1Timezone(timezone: string): void {
    if (timezone !== 'Asia/Bangkok') {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Phase 1 supported timezone is Asia/Bangkok. Received: ${timezone}`,
      });
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Invalid tenant timezone configuration: ${timezone}`,
      });
    }
  }

  private calculatePeakConcurrentBookings(
    windowStart: number,
    windowEnd: number,
    bookings: Array<{ start: number; end: number }>,
  ): number {
    if (bookings.length === 0) return 0;

    const points = new Set<number>();
    points.add(windowStart);
    points.add(windowEnd);

    for (const b of bookings) {
      if (b.start > windowStart && b.start < windowEnd) points.add(b.start);
      if (b.end > windowStart && b.end < windowEnd) points.add(b.end);
    }

    const sortedPoints = Array.from(points).sort((a, b) => a - b);
    let maxConcurrent = 0;

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const mid = (sortedPoints[i] + sortedPoints[i + 1]) / 2;
      let count = 0;
      for (const b of bookings) {
        if (mid >= b.start && mid < b.end) {
          count++;
        }
      }
      if (count > maxConcurrent) {
        maxConcurrent = count;
      }
    }

    return maxConcurrent;
  }

  private getZonedNow(timezone: string): {
    todayStr: string;
    nowInstant: Date;
    todayObj: Date;
  } {
    const nowInstant = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(nowInstant);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

    const year = Number(getPart('year'));
    const month = Number(getPart('month'));
    const day = Number(getPart('day'));

    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const todayObj = new Date(Date.UTC(year, month - 1, day));

    return { todayStr, nowInstant, todayObj };
  }

  private parseZonedSlotInstant(bookingDateStr: string, timeStr: string, timezone: string): Date {
    if (timezone === 'Asia/Bangkok') {
      return new Date(`${bookingDateStr}T${timeStr}:00+07:00`);
    }
    return new Date(`${bookingDateStr}T${timeStr}:00Z`);
  }

  private formatTimeString(dateOrTime: any): string {
    if (typeof dateOrTime === 'string') {
      if (/^\d{2}:\d{2}/.test(dateOrTime)) {
        return dateOrTime.slice(0, 5);
      }
    }
    const d = new Date(dateOrTime);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    throw new InternalServerErrorException({
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: `Invalid time format encountered in database: ${dateOrTime}`,
    });
  }

  private timeToMinutes(timeStr: string): number {
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Invalid time format in timeToMinutes: ${timeStr}`,
      });
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
