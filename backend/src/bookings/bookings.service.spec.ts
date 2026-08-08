import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';
import {
  AvailabilityService,
  AvailabilityResult,
} from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingCommand } from './dto/create-booking-command.dto';
import { ErrorCode } from '../common/constants/error-codes';

describe('BookingsService.createBookingAtomic (Unit Tests)', () => {
  let service: BookingsService;
  let prisma: any;
  let availabilityService: jest.Mocked<AvailabilityService>;

  const tenantId = '00000000-0000-4000-8000-000000000001';
  const customerUserId = '99999999-9999-4999-8999-999999999999';
  const serviceId = '11111111-1111-4111-8111-111111111111';
  const staffIdA = '22222222-2222-4222-8222-222222222222';
  const bookingDate = '2026-08-03';
  const startTime = '10:00';

  const mockTenant = { id: tenantId, isActive: true };
  const mockCustomerUser = {
    id: customerUserId,
    displayName: 'Somchai Jaidee',
    phone: '0812345678',
    avatarUrl: 'https://example.com/avatar.jpg',
  };
  const mockMembership = {
    id: 'm-12345',
    tenantId,
    userId: customerUserId,
  };
  const mockService = {
    id: serviceId,
    name: 'Hair Cut',
    durationMinutes: 60,
    bufferMinutes: 15,
    price: new Prisma.Decimal(500),
    isActive: true,
  };
  const mockStaff = {
    id: staffIdA,
    name: 'Master Barber',
    avatar_url: 'https://example.com/staff.jpg',
  };

  const mockAvailabilityResult: AvailabilityResult = {
    tenantId,
    bookingDate,
    timezone: 'Asia/Bangkok',
    slotIntervalMinutes: 30,
    service: {
      id: serviceId,
      name: 'Hair Cut',
      durationMinutes: 60,
      bufferMinutes: 15,
      price: 500,
    },
    slots: [
      {
        startTime: '10:00',
        endTime: '11:00',
        staffId: staffIdA,
        available: true,
      },
      {
        startTime: '10:30',
        endTime: '11:30',
        staffId: null,
        available: false,
      },
    ],
  };

  const mockCreatedBooking = {
    id: 'b-created-uuid-12345',
    ref_no: 'BK-123456-ABCDEF',
    tenantId,
    userId: customerUserId,
    user_name: 'Somchai Jaidee',
    user_phone: '0812345678',
    user_avatar: 'https://example.com/avatar.jpg',
    serviceId,
    service_name: 'Hair Cut',
    service_duration: 60,
    service_price: new Prisma.Decimal(500),
    staffId: staffIdA,
    staff_name: 'Master Barber',
    staff_avatar: 'https://example.com/staff.jpg',
    bookingDate: new Date('2026-08-03T00:00:00Z'),
    startTime: new Date('1970-01-01T10:00:00Z'),
    endTime: new Date('1970-01-01T11:00:00Z'),
    status: 'pending',
    price: new Prisma.Decimal(500),
    discountAmount: new Prisma.Decimal(0),
    finalPrice: new Prisma.Decimal(500),
    deposit_amount: new Prisma.Decimal(0),
    paymentStatus: 'unpaid',
    payment_method: null,
    source: 'line_liff',
    notes: 'Please cut short',
    createdAt: new Date('2026-08-01T10:00:00Z'),
  };

  let mockTx: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTx = {
      tenant: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      membership: { findUnique: jest.fn() },
      service: { findFirst: jest.fn() },
      courts: { findFirst: jest.fn() },
      staff: { findFirst: jest.fn() },
      booking: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        return cb(mockTx);
      }),
      booking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockAvailabilityService = {
      calculateAvailability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get(PrismaService);
    availabilityService = module.get(AvailabilityService);
  });

  describe('customer booking history isolation', () => {
    it('always scopes history by both tenant and authenticated customer', async () => {
      prisma.booking.findMany.mockResolvedValueOnce([mockCreatedBooking]);

      const result = await service.getCustomerBookings(
        tenantId,
        customerUserId,
      );

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: { tenantId, userId: customerUserId },
        orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
        take: 100,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ tenantId, userId: customerUserId });
    });
  });

  describe('merchant booking mutations', () => {
    it('validates and persists a server-owned status transition', async () => {
      prisma.booking.findFirst.mockResolvedValueOnce(mockCreatedBooking);
      prisma.booking.update.mockResolvedValueOnce({
        ...mockCreatedBooking,
        status: 'confirmed',
      });

      const result = await service.updateBookingStatusAsMerchant(
        tenantId,
        mockCreatedBooking.id,
        'confirmed',
      );

      expect(prisma.booking.findFirst).toHaveBeenCalledWith({
        where: { id: mockCreatedBooking.id, tenantId },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockCreatedBooking.id },
        data: expect.objectContaining({ status: 'confirmed' }),
      });
      expect(result.status).toBe('confirmed');
    });

    it('checks in a confirmed booking from its tenant-scoped QR code', async () => {
      const confirmedBooking = { ...mockCreatedBooking, status: 'confirmed' };
      prisma.booking.findFirst.mockResolvedValue(confirmedBooking);
      prisma.booking.update.mockResolvedValueOnce({
        ...confirmedBooking,
        status: 'checked_in',
        checkedInAt: new Date('2026-08-03T03:00:00Z'),
      });

      const result = await service.checkInBookingAsMerchant(
        tenantId,
        `CHECKIN-${mockCreatedBooking.ref_no}`,
      );

      expect(prisma.booking.findFirst).toHaveBeenNthCalledWith(1, {
        where: { ref_no: mockCreatedBooking.ref_no, tenantId },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockCreatedBooking.id },
        data: expect.objectContaining({
          status: 'checked_in',
          checkedInAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe('checked_in');
    });

    it('returns an already checked-in booking without writing again', async () => {
      prisma.booking.findFirst.mockResolvedValueOnce({
        ...mockCreatedBooking,
        status: 'checked_in',
      });

      const result = await service.checkInBookingAsMerchant(
        tenantId,
        mockCreatedBooking.ref_no,
      );

      expect(result.status).toBe('checked_in');
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('reschedules atomically and excludes the current booking from conflicts', async () => {
      mockTx.booking.findFirst.mockResolvedValueOnce(mockCreatedBooking);
      mockTx.booking.update.mockResolvedValueOnce({
        ...mockCreatedBooking,
        bookingDate: new Date('2026-08-04T00:00:00Z'),
        startTime: new Date('1970-01-01T11:00:00Z'),
        endTime: new Date('1970-01-01T12:00:00Z'),
      });
      availabilityService.calculateAvailability.mockResolvedValueOnce({
        ...mockAvailabilityResult,
        bookingDate: '2026-08-04',
        slots: [
          {
            startTime: '11:00',
            endTime: '12:00',
            staffId: staffIdA,
            available: true,
          },
        ],
      });

      const result = await service.rescheduleBookingAsMerchant(
        tenantId,
        mockCreatedBooking.id,
        '2026-08-04',
        '11:00',
      );

      expect(availabilityService.calculateAvailability).toHaveBeenCalledWith(
        tenantId,
        '2026-08-04',
        serviceId,
        staffIdA,
        expect.objectContaining({
          actor: 'merchant',
          txPrisma: mockTx,
          excludeBookingId: mockCreatedBooking.id,
        }),
      );
      expect(mockTx.booking.update).toHaveBeenCalled();
      expect(result).toMatchObject({
        bookingDate: '2026-08-04',
        startTime: '11:00',
        endTime: '12:00',
      });
    });
  });

  describe('1. Successful Booking Creation & Backend Calculations', () => {
    it('should create booking with backend-calculated price, endTime, and refNo', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);
      mockTx.staff.findFirst.mockResolvedValueOnce(mockStaff);
      mockTx.booking.create.mockResolvedValueOnce(mockCreatedBooking);

      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        staffId: staffIdA,
        bookingDate,
        startTime,
        customerName: 'Somchai Jaidee',
        customerPhone: '0812345678',
        notes: 'Please cut short',
      };

      const result = await service.createBookingAtomic(command);

      expect(result.id).toBe(mockCreatedBooking.id);
      expect(result.refNo).toBe(mockCreatedBooking.ref_no);
      expect(result.endTime).toBe('11:00');
      expect(result.price).toBe(500);
      expect(result.finalPrice).toBe(500);
      expect(result.serviceDuration).toBe(60);
      expect(result.servicePrice).toBe(500);
      expect(result.depositAmount).toBe(0);
      expect(result.paymentMethod).toBeNull();
      expect(result.status).toBe('pending');
      expect(result.paymentStatus).toBe('unpaid');
      expect(result.source).toBe('line_liff');

      // Verify AvailabilityService received current txPrisma: mockTx
      expect(availabilityService.calculateAvailability).toHaveBeenCalledWith(
        tenantId,
        bookingDate,
        serviceId,
        staffIdA,
        {
          actor: 'customer',
          txPrisma: mockTx,
          courtId: undefined,
          durationMinutesOverride: 60,
        },
      );
    });

    it('prices and reserves the complete multi-hour range', async () => {
      const courtId = '44444444-4444-4444-8444-444444444444';
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce({
        ...mockService,
        price: new Prisma.Decimal(1200),
      });
      mockTx.courts.findFirst.mockResolvedValueOnce({
        id: courtId,
        name: 'Court 3',
        extra_price_per_hour: new Prisma.Decimal(-200),
      });
      mockTx.booking.create.mockResolvedValueOnce({
        ...mockCreatedBooking,
        service_duration: 180,
        service_price: new Prisma.Decimal(3000),
        court_id: courtId,
        court_name: 'Court 3',
        endTime: new Date('1970-01-01T13:00:00Z'),
        price: new Prisma.Decimal(3000),
        finalPrice: new Prisma.Decimal(3000),
      });
      availabilityService.calculateAvailability.mockResolvedValueOnce({
        ...mockAvailabilityResult,
        slots: [
          {
            startTime: '10:00',
            endTime: '13:00',
            staffId: staffIdA,
            courtId,
            available: true,
          },
        ],
      });

      const result = await service.createBookingAtomic({
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        staffId: staffIdA,
        bookingDate,
        startTime,
        bookingHours: 3,
        courtId,
      });

      expect(availabilityService.calculateAvailability).toHaveBeenCalledWith(
        tenantId,
        bookingDate,
        serviceId,
        staffIdA,
        expect.objectContaining({ durationMinutesOverride: 180 }),
      );
      expect(mockTx.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            service_duration: 180,
            service_price: new Prisma.Decimal(3000),
            court_id: courtId,
            court_name: 'Court 3',
            price: new Prisma.Decimal(3000),
            finalPrice: new Prisma.Decimal(3000),
            endTime: new Date('1970-01-01T13:00:00Z'),
          }),
        }),
      );
      expect(result).toMatchObject({
        endTime: '13:00',
        serviceDuration: 180,
        servicePrice: 3000,
        price: 3000,
        finalPrice: 3000,
      });
    });

    it('should ignore client attempts to dictate price or endTime (derived strictly from DB/AvailabilityService)', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);
      mockTx.staff.findFirst.mockResolvedValueOnce(mockStaff);
      mockTx.booking.create.mockResolvedValueOnce(mockCreatedBooking);

      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      const result = await service.createBookingAtomic(command);

      expect(result.price).toBe(500);
      expect(result.finalPrice).toBe(500);
      expect(result.endTime).toBe('11:00');
    });
  });

  describe('2. Slot Matching & Availability Conflicts', () => {
    it('should throw 409 BOOKING_SLOT_UNAVAILABLE when matching slot is unavailable', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);

      const unavailableResult = {
        ...mockAvailabilityResult,
        slots: [
          {
            startTime: '10:00',
            endTime: '11:00',
            staffId: staffIdA,
            available: false,
          },
        ],
      };
      availabilityService.calculateAvailability.mockResolvedValueOnce(
        unavailableResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime: '10:00',
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse().code).toBe(ErrorCode.BOOKING_SLOT_UNAVAILABLE);
    });

    it('should throw 409 BOOKING_SLOT_UNAVAILABLE when requested startTime is not in candidate slots', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);

      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime: '09:15',
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse().code).toBe(ErrorCode.BOOKING_SLOT_UNAVAILABLE);
    });
  });

  describe('3. Entity Ownership & Tenant Membership Validation', () => {
    it('should throw 404 TENANT_NOT_FOUND if tenant does not exist', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(null);

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse().code).toBe(ErrorCode.TENANT_NOT_FOUND);
    });

    it('should throw 404 CUSTOMER_NOT_FOUND if customer user record does not exist', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(null);

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse().code).toBe(ErrorCode.CUSTOMER_NOT_FOUND);
    });

    it('should throw 404 CUSTOMER_NOT_FOUND when customer is not a member of tenant (cross-tenant check)', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(null);

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse().code).toBe(ErrorCode.CUSTOMER_NOT_FOUND);
    });

    it('should throw 404 SERVICE_NOT_FOUND if service does not belong to tenant', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(null);

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse().code).toBe(ErrorCode.SERVICE_NOT_FOUND);
    });

    it('should throw 400 SERVICE_INACTIVE if service is inactive', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce({
        ...mockService,
        isActive: false,
      });

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().code).toBe(ErrorCode.SERVICE_INACTIVE);
    });
  });

  describe('4. Staff Assignment Modes', () => {
    it('should insert auto-assigned staffId when in staff mode and client did not specify staffId', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);
      mockTx.staff.findFirst.mockResolvedValueOnce(mockStaff);
      mockTx.booking.create.mockResolvedValueOnce(mockCreatedBooking);

      const autoAssignedResult = {
        ...mockAvailabilityResult,
        slots: [
          {
            startTime: '10:00',
            endTime: '11:00',
            staffId: staffIdA,
            available: true,
          },
        ],
      };
      availabilityService.calculateAvailability.mockResolvedValueOnce(
        autoAssignedResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      await service.createBookingAtomic(command);

      expect(mockTx.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ staffId: staffIdA }),
        }),
      );
    });

    it('should insert staffId = null when operating in resource/capacity mode', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);
      mockTx.booking.create.mockResolvedValueOnce({
        ...mockCreatedBooking,
        staffId: null,
        staff_name: null,
      });

      const resourceResult = {
        ...mockAvailabilityResult,
        slots: [
          {
            startTime: '10:00',
            endTime: '11:00',
            staffId: null,
            available: true,
          },
        ],
      };
      availabilityService.calculateAvailability.mockResolvedValueOnce(
        resourceResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      await service.createBookingAtomic(command);

      expect(mockTx.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ staffId: null }),
        }),
      );
    });
  });

  describe('5. Mandatory Field Controls & Strict Zero-Fallback', () => {
    it('should throw 400 VALIDATION_FAILED when neither customerName nor displayName is available', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce({
        ...mockCustomerUser,
        displayName: '',
      });
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);

      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
        customerName: '',
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().code).toBe(ErrorCode.VALIDATION_FAILED);
    });

    it('should throw 500 INTERNAL_SERVER_ERROR when DB booking creation returns null createdAt', async () => {
      mockTx.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockTx.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValueOnce(mockMembership);
      mockTx.service.findFirst.mockResolvedValueOnce(mockService);
      mockTx.staff.findFirst.mockResolvedValueOnce(mockStaff);
      mockTx.booking.create.mockResolvedValueOnce({
        ...mockCreatedBooking,
        createdAt: null,
      });

      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(error.getResponse().code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });
  });

  describe('6. Retry Strategies & Isolation Control', () => {
    it('should retry transaction on P2034 serialization error and succeed on 2nd attempt', async () => {
      let attempts = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        attempts++;
        if (attempts === 1) {
          const p2034Err: any = new Prisma.PrismaClientKnownRequestError(
            'Transaction failed',
            {
              code: 'P2034',
              clientVersion: '5.0.0',
            },
          );
          throw p2034Err;
        }
        return cb(mockTx);
      });

      mockTx.tenant.findUnique.mockResolvedValue(mockTenant);
      mockTx.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValue(mockMembership);
      mockTx.service.findFirst.mockResolvedValue(mockService);
      mockTx.staff.findFirst.mockResolvedValue(mockStaff);
      mockTx.booking.create.mockResolvedValue(mockCreatedBooking);

      availabilityService.calculateAvailability.mockResolvedValue(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      const result = await service.createBookingAtomic(command);

      expect(attempts).toBe(2);
      expect(result.id).toBe(mockCreatedBooking.id);
    });

    it('should retry a Prisma 7 DriverAdapterError TransactionWriteConflict', async () => {
      let attempts = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        attempts++;
        if (attempts === 1) {
          const adapterConflict = Object.assign(
            new Error('TransactionWriteConflict'),
            {
              name: 'DriverAdapterError',
              cause: { kind: 'TransactionWriteConflict' },
            },
          );
          throw adapterConflict;
        }
        return cb(mockTx);
      });

      mockTx.tenant.findUnique.mockResolvedValue(mockTenant);
      mockTx.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValue(mockMembership);
      mockTx.service.findFirst.mockResolvedValue(mockService);
      mockTx.staff.findFirst.mockResolvedValue(mockStaff);
      mockTx.booking.create.mockResolvedValue(mockCreatedBooking);
      availabilityService.calculateAvailability.mockResolvedValue(
        mockAvailabilityResult,
      );

      const result = await service.createBookingAtomic({
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      });

      expect(attempts).toBe(2);
      expect(result.id).toBe(mockCreatedBooking.id);
    });

    it('should exhaust 3 retries on persistent P2034 serialization error and throw 409 BOOKING_SLOT_UNAVAILABLE', async () => {
      prisma.$transaction.mockImplementation(async () => {
        throw new Prisma.PrismaClientKnownRequestError('Write conflict', {
          code: 'P2034',
          clientVersion: '5.0.0',
        });
      });

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse().code).toBe(ErrorCode.BOOKING_SLOT_UNAVAILABLE);
    });

    it('should start a NEW transaction attempt when P2002 ref_no collision occurs (Outer Retry)', async () => {
      let txAttempts = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        txAttempts++;
        if (txAttempts === 1) {
          const p2002Err: any = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint on ref_no',
            {
              code: 'P2002',
              clientVersion: '5.0.0',
              meta: { target: ['ref_no'] },
            },
          );
          throw p2002Err;
        }
        return cb(mockTx);
      });

      mockTx.tenant.findUnique.mockResolvedValue(mockTenant);
      mockTx.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockTx.membership.findUnique.mockResolvedValue(mockMembership);
      mockTx.service.findFirst.mockResolvedValue(mockService);
      mockTx.staff.findFirst.mockResolvedValue(mockStaff);
      mockTx.booking.create.mockResolvedValue(mockCreatedBooking);

      availabilityService.calculateAvailability.mockResolvedValue(
        mockAvailabilityResult,
      );

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      const result = await service.createBookingAtomic(command);

      expect(txAttempts).toBe(2);
      expect(result.id).toBe(mockCreatedBooking.id);
    });

    it('should NOT retry when P2002 occurs on a non-ref_no field (e.g. id)', async () => {
      let txAttempts = 0;
      const p2002Other: any = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint on id',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['id'] },
        },
      );

      prisma.$transaction.mockImplementation(async (cb: any) => {
        txAttempts++;
        throw p2002Other;
      });

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(txAttempts).toBe(1);
      expect(error).toBe(p2002Other);
    });

    it('should NOT retry non-retryable domain exceptions (e.g. NotFoundException)', async () => {
      let txAttempts = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        txAttempts++;
        return cb(mockTx);
      });

      mockTx.tenant.findUnique.mockResolvedValueOnce(null);

      const command: CreateBookingCommand = {
        actor: 'customer',
        tenantId,
        customerUserId,
        serviceId,
        bookingDate,
        startTime,
      };

      let error: any;
      try {
        await service.createBookingAtomic(command);
      } catch (err) {
        error = err;
      }

      expect(txAttempts).toBe(1);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('7. Merchant-only cancellation', () => {
    const bookingId = '44444444-4444-4444-8444-444444444444';

    it('scopes booking lookup to the validated tenant', async () => {
      prisma.booking.findFirst.mockResolvedValueOnce({
        id: bookingId,
        status: 'confirmed',
      });
      prisma.booking.update.mockResolvedValueOnce({
        id: bookingId,
        status: 'cancelled',
      });

      await expect(
        service.cancelBookingAsMerchant(tenantId, bookingId),
      ).resolves.toMatchObject({ status: 'cancelled' });
      expect(prisma.booking.findFirst).toHaveBeenCalledWith({
        where: { id: bookingId, tenantId },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('returns BOOKING_NOT_FOUND for a booking outside the tenant', async () => {
      prisma.booking.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.cancelBookingAsMerchant(tenantId, bookingId),
      ).rejects.toMatchObject({
        response: {
          statusCode: 404,
          code: ErrorCode.BOOKING_NOT_FOUND,
        },
      });
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('rejects cancellation of a terminal booking status', async () => {
      prisma.booking.findFirst.mockResolvedValueOnce({
        id: bookingId,
        status: 'completed',
      });

      await expect(
        service.cancelBookingAsMerchant(tenantId, bookingId),
      ).rejects.toMatchObject({
        response: {
          statusCode: 400,
          code: ErrorCode.INVALID_BOOKING_STATUS,
        },
      });
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });
  });
});
