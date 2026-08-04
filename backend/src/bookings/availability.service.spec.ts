import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const serviceId = '11111111-1111-1111-1111-111111111111';
  const staffIdA = '22222222-2222-2222-2222-222222222222';
  const staffIdB = '33333333-3333-3333-3333-333333333333';

  // System time: Saturday, August 1, 2026 01:00:00 UTC = 08:00:00 Asia/Bangkok
  const fixedNow = new Date('2026-08-01T01:00:00Z');
  const validBookingDate = '2026-08-01';

  const mockPrismaService = {
    tenant: { findUnique: jest.fn() },
    service: { findFirst: jest.fn() },
    businessHours: { findFirst: jest.fn() },
    staff: { findFirst: jest.fn() },
    staffService: { findFirst: jest.fn(), findMany: jest.fn() },
    staffSchedule: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.setSystemTime(fixedNow);
    jest.useRealTimers();
  });

  // --- Existing Baseline Tests ---

  it('should throw TENANT_NOT_FOUND when tenant does not exist', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce(null);

    let error: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse().code).toBe(ErrorCode.TENANT_NOT_FOUND);
  });

  it('should throw TENANT_INACTIVE when tenant is inactive or null', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: false });

    let error: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse().code).toBe(ErrorCode.TENANT_INACTIVE);
  });

  it('should separate SERVICE_NOT_FOUND from SERVICE_INACTIVE', async () => {
    // 1) Service not found
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce(null);

    let errorNotFound: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      errorNotFound = err;
    }
    expect(errorNotFound).toBeInstanceOf(NotFoundException);
    expect(errorNotFound.getResponse().code).toBe(ErrorCode.SERVICE_NOT_FOUND);

    // 2) Service inactive
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({ id: serviceId, isActive: false });

    let errorInactive: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      errorInactive = err;
    }
    expect(errorInactive).toBeInstanceOf(BadRequestException);
    expect(errorInactive.getResponse().code).toBe(ErrorCode.SERVICE_INACTIVE);
  });

  it('should throw INTERNAL_SERVER_ERROR when maxCapacity is 0 (nullish check ?? 1)', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { timezone: 'Asia/Bangkok' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 0,
    });

    let error: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(error.getResponse().code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });

  it('should throw INTERNAL_SERVER_ERROR when timezone is not Asia/Bangkok (Phase 1 scope)', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { timezone: 'America/New_York' },
    });

    let errorTz: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      errorTz = err;
    }
    expect(errorTz).toBeInstanceOf(InternalServerErrorException);
    expect(errorTz.getResponse().code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });

  it('should throw INTERNAL_SERVER_ERROR when bookingFlowMode is unknown/invalid', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'invalid_mode_xyz' },
    });

    let errorFlow: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      errorFlow = err;
    }
    expect(errorFlow).toBeInstanceOf(InternalServerErrorException);
    expect(errorFlow.getResponse().code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });

  it('should use capacity mode for service_time_only and sports_court_time', async () => {
    // 1) service_time_only
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 2,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const resServiceTimeOnly = await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    expect(resServiceTimeOnly.slots[0].available).toBe(true);

    // 2) sports_court_time
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'sports_court_time' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 4,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const resCourtTime = await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    expect(resCourtTime.slots[0].available).toBe(true);
  });

  it('should reject explicit staffId for CUSTOMER when enableStaffSelection is false, but allow for MERCHANT actor', async () => {
    // 1) Customer actor (default) -> throws STAFF_SELECTION_DISABLED
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_staff_time', enableStaffSelection: false },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });

    let errorCustomer: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId, staffIdA, { actor: 'customer' });
    } catch (err) {
      errorCustomer = err;
    }
    expect(errorCustomer).toBeInstanceOf(BadRequestException);
    expect(errorCustomer.getResponse().code).toBe(ErrorCode.STAFF_SELECTION_DISABLED);

    // 2) Merchant actor -> allowed even if enableStaffSelection is false
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_staff_time', enableStaffSelection: false },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.staff.findFirst.mockResolvedValueOnce({ id: staffIdA, tenant_id: tenantId, is_active: true });
    prisma.staffService.findFirst.mockResolvedValueOnce({ staffId: staffIdA, serviceId });
    prisma.staffSchedule.findMany.mockResolvedValueOnce([
      {
        staffId: staffIdA,
        dayOfWeek: 6,
        specificDate: null,
        startTime: '10:00',
        endTime: '11:00',
        isAvailable: true,
      },
    ]);
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const resMerchant = await service.calculateAvailability(tenantId, validBookingDate, serviceId, staffIdA, {
      actor: 'merchant',
    });
    expect(resMerchant.slots[0].available).toBe(true);
    expect(resMerchant.slots[0].staffId).toBe(staffIdA);
  });

  it('should handle real CROSS-DAY minLeadTimeHours calculation (system time late night 23:00)', async () => {
    jest.setSystemTime(new Date('2026-08-01T16:00:00Z'));

    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { minLeadTimeHours: 3, bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '00:00',
      closeTime: '06:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const result = await service.calculateAvailability(tenantId, '2026-08-02', serviceId);

    expect(result.slots[0].available).toBe(false);
    expect(result.slots[2].available).toBe(false);
    const slot02 = result.slots.find((s) => s.startTime === '02:00');
    expect(slot02?.available).toBe(true);

    jest.setSystemTime(fixedNow);
  });

  it('should mark all slots UNAVAILABLE when staff mode has NO mapped active staff', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_staff_time' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 5,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '12:00',
    });

    prisma.staffService.findMany.mockResolvedValueOnce([]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    expect(result.slots[0].available).toBe(false);
    expect(result.slots[0].staffId).toBeNull();
    expect(result.slots[1].available).toBe(false);
  });

  it('should handle PEAK CONCURRENT BOOKINGS for capacity > 1 with disjoint overlaps', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 2,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });

    prisma.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b-1',
        startTime: '10:00',
        endTime: '10:30',
        serviceId,
        staffId: null,
      },
      {
        id: 'b-2',
        startTime: '10:30',
        endTime: '11:00',
        serviceId,
        staffId: null,
      },
    ]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    expect(result.slots[0].available).toBe(true);
  });

  it('should parse Prisma-shaped Date objects for time fields', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });

    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: new Date('1970-01-01T10:00:00Z'),
      closeTime: new Date('1970-01-01T12:00:00Z'),
    });

    prisma.booking.findMany.mockResolvedValueOnce([]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    expect(result.slots.length).toBe(3); // 10:00, 10:30, 11:00
    expect(result.slots[0].startTime).toBe('10:00');
    expect(result.slots[0].endTime).toBe('11:00');
  });

  // --- Step 6 Explicit Regression Tests ---

  it('1. BOOKING_IN_PAST: should throw BOOKING_IN_PAST when date is before today in tenant timezone', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });

    let error: any;
    try {
      await service.calculateAvailability(tenantId, '2026-07-31', serviceId);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse().code).toBe(ErrorCode.BOOKING_IN_PAST);
  });

  it('2. BOOKING_TOO_FAR_AHEAD & Boundary: should allow last advance day and reject day after', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { maxAdvanceBookingDays: 7, bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '12:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const resAllowed = await service.calculateAvailability(tenantId, '2026-08-08', serviceId);
    expect(resAllowed.slots[0].available).toBe(true);

    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { maxAdvanceBookingDays: 7, bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });

    let errorRejected: any;
    try {
      await service.calculateAvailability(tenantId, '2026-08-09', serviceId);
    } catch (err) {
      errorRejected = err;
    }
    expect(errorRejected).toBeInstanceOf(BadRequestException);
    expect(errorRejected.getResponse().code).toBe(ErrorCode.BOOKING_TOO_FAR_AHEAD);
  });

  it('3. Business closed and openTime >= closeTime', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({ isOpen: false, openTime: '09:00', closeTime: '17:00' });

    let errClosed: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      errClosed = err;
    }
    expect(errClosed).toBeInstanceOf(BadRequestException);
    expect(errClosed.getResponse().code).toBe(ErrorCode.BOOKING_OUTSIDE_BUSINESS_HOURS);

    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({ isOpen: true, openTime: '18:00', closeTime: '09:00' });

    let errInvalidTimes: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    } catch (err) {
      errInvalidTimes = err;
    }
    expect(errInvalidTimes).toBeInstanceOf(BadRequestException);
    expect(errInvalidTimes.getResponse().code).toBe(ErrorCode.BOOKING_OUTSIDE_BUSINESS_HOURS);
  });

  it('4. slotIntervalMinutes != durationMinutes (e.g., interval 15m, duration 45m)', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { slotIntervalMinutes: 15, bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 45,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    expect(result.slots.length).toBe(2);
    expect(result.slots[0]).toEqual({
      startTime: '10:00',
      endTime: '10:45',
      staffId: null,
      courtId: null,
      available: true,
    });
    expect(result.slots[1]).toEqual({
      startTime: '10:15',
      endTime: '11:00',
      staffId: null,
      courtId: null,
      available: true,
    });
  });

  // --- 1. Split Buffer Regression into 3 Explicit Cases ---

  it('5a. Buffer Regression: existing booking service buffer overlaps candidate slot', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 30,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:30',
    });
    // Existing booking 10:00-10:30 with service buffer 15m (conflict window 10:00-10:45)
    prisma.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b-1',
        startTime: '10:00',
        endTime: '10:30',
        serviceId,
        staffId: null,
        service: { bufferMinutes: 15 },
      },
    ]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    // Candidate 10:30-11:00 starts at 10:30 < 10:45 conflict end -> unavailable!
    const slot1030 = result.slots.find((s) => s.startTime === '10:30');
    expect(slot1030?.available).toBe(false);
  });

  it('5b. Buffer Regression: candidate buffer overlaps next existing booking', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 30,
      bufferMinutes: 15, // candidate conflict window 10:00-10:45
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:30',
    });
    // Existing booking 10:30-11:00 (starts at 10:30)
    prisma.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b-2',
        startTime: '10:30',
        endTime: '11:00',
        serviceId,
        staffId: null,
        service: { bufferMinutes: 0 },
      },
    ]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    // Candidate 10:00-10:30 has conflict end 10:45 > 10:30 next start -> unavailable!
    const slot1000 = result.slots.find((s) => s.startTime === '10:00');
    expect(slot1000?.available).toBe(false);
  });

  it('5c. Buffer Regression: zero-buffer half-open boundary does NOT overlap (existingEnd == candidateStart)', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 30,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:30',
    });
    // Existing booking 10:00-10:30 with 0 buffer (conflict end 10:30)
    prisma.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b-3',
        startTime: '10:00',
        endTime: '10:30',
        serviceId,
        staffId: null,
        service: { bufferMinutes: 0 },
      },
    ]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    // Candidate 10:30-11:00 starts at 10:30 === existing end 10:30 -> available: true!
    const slot1030 = result.slots.find((s) => s.startTime === '10:30');
    expect(slot1030?.available).toBe(true);
  });

  it('7. Assert Prisma query uses specific blocking statuses pending, confirmed, checked_in', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([]);

    await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['pending', 'confirmed', 'checked_in'] },
        }),
      }),
    );
  });

  // --- 2. SpecificDate Override Tests with BOTH Weekly and Specific Rows ---

  it('8a. SpecificDate Override: weekly available=true + specificDate available=false -> UNAVAILABLE', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_staff_time' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.staff.findFirst.mockResolvedValueOnce({ id: staffIdA, tenant_id: tenantId, is_active: true });
    prisma.staffService.findFirst.mockResolvedValueOnce({ staffId: staffIdA, serviceId });
    // BOTH weekly and specificDate rows in the SAME mock return
    prisma.staffSchedule.findMany.mockResolvedValueOnce([
      {
        staffId: staffIdA,
        dayOfWeek: 6,
        specificDate: null,
        startTime: '10:00',
        endTime: '11:00',
        isAvailable: true, // Weekly schedule available
      },
      {
        staffId: staffIdA,
        dayOfWeek: 6,
        specificDate: new Date('2026-08-01T00:00:00Z'),
        startTime: '10:00',
        endTime: '11:00',
        isAvailable: false, // Specific date override OFF
      },
    ]);
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const resOverrideOff = await service.calculateAvailability(tenantId, validBookingDate, serviceId, staffIdA);
    expect(resOverrideOff.slots[0].available).toBe(false);
  });

  it('8b. SpecificDate Override: weekly available=false + specificDate available=true -> AVAILABLE', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_staff_time' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.staff.findFirst.mockResolvedValueOnce({ id: staffIdA, tenant_id: tenantId, is_active: true });
    prisma.staffService.findFirst.mockResolvedValueOnce({ staffId: staffIdA, serviceId });
    // BOTH weekly and specificDate rows in the SAME mock return
    prisma.staffSchedule.findMany.mockResolvedValueOnce([
      {
        staffId: staffIdA,
        dayOfWeek: 6,
        specificDate: null,
        startTime: '10:00',
        endTime: '11:00',
        isAvailable: false, // Weekly schedule unavailable
      },
      {
        staffId: staffIdA,
        dayOfWeek: 6,
        specificDate: new Date('2026-08-01T00:00:00Z'),
        startTime: '10:00',
        endTime: '11:00',
        isAvailable: true, // Specific date override ON
      },
    ]);
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const resOverrideOn = await service.calculateAvailability(tenantId, validBookingDate, serviceId, staffIdA);
    expect(resOverrideOn.slots[0].available).toBe(true);
  });

  it('9. STAFF_NOT_FOUND and STAFF_NOT_ELIGIBLE', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({ id: serviceId, isActive: true, durationMinutes: 60, bufferMinutes: 0, maxCapacity: 1 });
    prisma.businessHours.findFirst.mockResolvedValueOnce({ isOpen: true, openTime: '10:00', closeTime: '11:00' });
    prisma.staff.findFirst.mockResolvedValueOnce(null);

    let errStaffNotFound: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId, staffIdA);
    } catch (err) {
      errStaffNotFound = err;
    }
    expect(errStaffNotFound).toBeInstanceOf(NotFoundException);
    expect(errStaffNotFound.getResponse().code).toBe(ErrorCode.STAFF_NOT_FOUND);

    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({ id: serviceId, isActive: true, durationMinutes: 60, bufferMinutes: 0, maxCapacity: 1 });
    prisma.businessHours.findFirst.mockResolvedValueOnce({ isOpen: true, openTime: '10:00', closeTime: '11:00' });
    prisma.staff.findFirst.mockResolvedValueOnce({ id: staffIdA, tenant_id: tenantId, is_active: true });
    prisma.staffService.findFirst.mockResolvedValueOnce(null);

    let errIneligible: any;
    try {
      await service.calculateAvailability(tenantId, validBookingDate, serviceId, staffIdA);
    } catch (err) {
      errIneligible = err;
    }
    expect(errIneligible).toBeInstanceOf(BadRequestException);
    expect(errIneligible.getResponse().code).toBe(ErrorCode.STAFF_NOT_ELIGIBLE);
  });

  it('10. Deterministic auto-assignment with at least 2 staff members', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_staff_time' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 1,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });

    prisma.staffService.findMany.mockResolvedValueOnce([
      { staffId: staffIdB },
      { staffId: staffIdA },
    ]);
    prisma.staffSchedule.findMany.mockResolvedValueOnce([
      { staffId: staffIdA, dayOfWeek: 6, specificDate: null, startTime: '10:00', endTime: '11:00', isAvailable: true },
      { staffId: staffIdB, dayOfWeek: 6, specificDate: null, startTime: '10:00', endTime: '11:00', isAvailable: true },
    ]);
    prisma.booking.findMany.mockResolvedValueOnce([]);

    const result = await service.calculateAvailability(tenantId, validBookingDate, serviceId);

    expect(result.slots[0].staffId).toBe(staffIdA);
    expect(result.slots[0].available).toBe(true);
  });

  it('11. Capacity full -> unavailable, and disjoint overlap -> available', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 2,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([
      { id: 'b1', startTime: '10:00', endTime: '11:00', serviceId, staffId: null },
      { id: 'b2', startTime: '10:00', endTime: '11:00', serviceId, staffId: null },
    ]);

    const resFull = await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    expect(resFull.slots[0].available).toBe(false);

    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { bookingFlowMode: 'service_time_only' },
    });
    prisma.service.findFirst.mockResolvedValueOnce({
      id: serviceId,
      isActive: true,
      durationMinutes: 60,
      bufferMinutes: 0,
      maxCapacity: 2,
    });
    prisma.businessHours.findFirst.mockResolvedValueOnce({
      isOpen: true,
      openTime: '10:00',
      closeTime: '11:00',
    });
    prisma.booking.findMany.mockResolvedValueOnce([
      { id: 'b1', startTime: '10:00', endTime: '10:30', serviceId, staffId: null },
      { id: 'b2', startTime: '10:30', endTime: '11:00', serviceId, staffId: null },
    ]);

    const resDisjoint = await service.calculateAvailability(tenantId, validBookingDate, serviceId);
    expect(resDisjoint.slots[0].available).toBe(true);
  });

  // --- 3. Invalid Parameter Tests including bufferMinutes=-1 and maxAdvanceBookingDays=-1 ---

  it('12. Invalid numeric settings (slotInterval <= 0, duration <= 0, buffer < 0, maxCapacity < 1, minLead < 0, maxAdvance < 0)', async () => {
    // slotIntervalMinutes <= 0
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { slotIntervalMinutes: -10 },
    });
    let err1: any;
    try { await service.calculateAvailability(tenantId, validBookingDate, serviceId); } catch (e) { err1 = e; }
    expect(err1).toBeInstanceOf(InternalServerErrorException);

    // durationMinutes <= 0
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({ id: serviceId, isActive: true, durationMinutes: 0, bufferMinutes: 0, maxCapacity: 1 });
    let err2: any;
    try { await service.calculateAvailability(tenantId, validBookingDate, serviceId); } catch (e) { err2 = e; }
    expect(err2).toBeInstanceOf(InternalServerErrorException);

    // bufferMinutes = -1
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: tenantId, isActive: true });
    prisma.service.findFirst.mockResolvedValueOnce({ id: serviceId, isActive: true, durationMinutes: 60, bufferMinutes: -1, maxCapacity: 1 });
    let errBuffer: any;
    try { await service.calculateAvailability(tenantId, validBookingDate, serviceId); } catch (e) { errBuffer = e; }
    expect(errBuffer).toBeInstanceOf(InternalServerErrorException);

    // minLeadTimeHours < 0
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { minLeadTimeHours: -1 },
    });
    let err3: any;
    try { await service.calculateAvailability(tenantId, validBookingDate, serviceId); } catch (e) { err3 = e; }
    expect(err3).toBeInstanceOf(InternalServerErrorException);

    // maxAdvanceBookingDays = -1
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: tenantId,
      isActive: true,
      settings: { maxAdvanceBookingDays: -1 },
    });
    let errMaxAdvance: any;
    try { await service.calculateAvailability(tenantId, validBookingDate, serviceId); } catch (e) { errMaxAdvance = e; }
    expect(errMaxAdvance).toBeInstanceOf(InternalServerErrorException);
  });
});
