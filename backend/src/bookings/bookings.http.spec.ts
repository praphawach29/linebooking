import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { BookingsModule } from './bookings.module';
import {
  AvailabilityService,
  AvailabilityResult,
} from './availability.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ErrorCode } from '../common/constants/error-codes';
import { BookingsService } from './bookings.service';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingResponseDto } from './dto';

describe('BookingsController HTTP / Validation E2E Tests', () => {
  let app: INestApplication;
  let availabilityService: jest.Mocked<AvailabilityService>;
  let bookingsService: jest.Mocked<BookingsService>;

  const validTenantId = '00000000-0000-4000-8000-000000000001';
  const validServiceId = '11111111-1111-4111-8111-111111111111';
  const validStaffId = '22222222-2222-4222-8222-222222222222';
  const validBookingDate = '2026-08-03';

  const mockAvailabilityResult: AvailabilityResult = {
    tenantId: validTenantId,
    bookingDate: validBookingDate,
    timezone: 'Asia/Bangkok',
    slotIntervalMinutes: 30,
    service: {
      id: validServiceId,
      name: 'Massage Service',
      durationMinutes: 60,
      bufferMinutes: 15,
      price: 500,
    },
    slots: [
      {
        startTime: '10:00',
        endTime: '11:00',
        staffId: validStaffId,
        available: true,
      },
    ],
  };

  const mockPrismaService = {
    tenant: { findUnique: jest.fn() },
    service: { findFirst: jest.fn() },
    businessHours: { findFirst: jest.fn() },
    staff: { findFirst: jest.fn() },
    staffService: { findFirst: jest.fn(), findMany: jest.fn() },
    staffSchedule: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const mockAvailabilityService = {
    calculateAvailability: jest.fn(),
  };

  const validCustomerId = '33333333-3333-4333-8333-333333333333';
  const mockBookingResponse: BookingResponseDto = {
    id: '44444444-4444-4444-8444-444444444444',
    refNo: 'BK-STEP9-HTTP',
    tenantId: validTenantId,
    userId: validCustomerId,
    userName: 'HTTP Customer',
    userPhone: '0812345678',
    serviceId: validServiceId,
    serviceName: 'Massage Service',
    staffId: validStaffId,
    staffName: 'HTTP Staff',
    bookingDate: validBookingDate,
    startTime: '10:00',
    endTime: '11:00',
    status: 'pending',
    price: 500,
    discountAmount: 0,
    finalPrice: 500,
    paymentStatus: 'unpaid',
    source: 'line_liff',
    notes: null,
    createdAt: '2026-08-02T18:00:00.000Z',
  };

  const mockBookingsService = {
    createBookingAtomic: jest.fn(),
    cancelBookingAsMerchant: jest.fn(),
  };

  const mockLineIdTokenGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.tenantId = req.headers['x-tenant-id'];
      req.customerUser = { id: validCustomerId };
      return true;
    }),
  };

  const mockSupabaseAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.appUser = {
        dbUserId: '55555555-5555-4555-8555-555555555555',
        role: 'merchant_admin',
        tenantIds: [validTenantId],
      };
      return true;
    }),
  };

  const mockTenantAccessGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.tenantId = req.headers['x-tenant-id'];
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, BookingsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(AvailabilityService)
      .useValue(mockAvailabilityService)
      .overrideProvider(BookingsService)
      .useValue(mockBookingsService)
      .overrideProvider(NotificationsService)
      .useValue({ queueBookingEvent: jest.fn().mockResolvedValue(undefined) })
      .overrideGuard(LineIdTokenGuard)
      .useValue(mockLineIdTokenGuard)
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockSupabaseAuthGuard)
      .overrideGuard(TenantAccessGuard)
      .useValue(mockTenantAccessGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    availabilityService = moduleFixture.get(AvailabilityService);
    bookingsService = moduleFixture.get(BookingsService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /bookings/available-slots', () => {
    it('200 OK: should return slots when x-tenant-id and valid query parameters are provided', async () => {
      mockAvailabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .set('x-tenant-id', validTenantId)
        .query({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
          staffId: validStaffId,
        })
        .expect(200);

      expect(response.body).toEqual(mockAvailabilityResult);
      expect(
        mockAvailabilityService.calculateAvailability,
      ).toHaveBeenCalledWith(
        validTenantId,
        validBookingDate,
        validServiceId,
        validStaffId,
        { actor: 'customer' },
      );
    });

    it('400 TENANT_ID_REQUIRED: should return 400 when x-tenant-id header is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .query({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
        })
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_REQUIRED,
        message: 'x-tenant-id header is required',
        details: null,
      });
    });

    it('400 TENANT_ID_INVALID: should return 400 when x-tenant-id header is not a valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .set('x-tenant-id', 'invalid-tenant-uuid')
        .query({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
        })
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_INVALID,
        message: 'x-tenant-id header must be a valid UUID',
        details: null,
      });
    });

    it('400 VALIDATION_FAILED: should return 400 when query is missing serviceId', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .set('x-tenant-id', validTenantId)
        .query({
          bookingDate: validBookingDate,
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('400 VALIDATION_FAILED: should return 400 when bookingDate format is invalid (e.g. DD-MM-YYYY)', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .set('x-tenant-id', validTenantId)
        .query({
          serviceId: validServiceId,
          bookingDate: '03-08-2026',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('400 VALIDATION_FAILED: should return 400 when bookingDate is not a real calendar date (e.g. 2026-02-31)', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .set('x-tenant-id', validTenantId)
        .query({
          serviceId: validServiceId,
          bookingDate: '2026-02-31',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('400 VALIDATION_FAILED: should return 400 when staffId query param is not a valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/available-slots')
        .set('x-tenant-id', validTenantId)
        .query({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
          staffId: 'not-a-valid-uuid',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.details)).toBe(true);
    });
  });

  describe('Step 9 POST booking contracts', () => {
    it('201: creates a LINE customer booking through the atomic service', async () => {
      mockBookingsService.createBookingAtomic.mockResolvedValueOnce(
        mockBookingResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('authorization', 'Bearer line-id-token')
        .set('x-tenant-id', validTenantId)
        .send({
          serviceId: validServiceId,
          staffId: validStaffId,
          bookingDate: validBookingDate,
          startTime: '10:00',
          customerName: 'HTTP Customer',
          customerPhone: '0812345678',
        })
        .expect(201);

      expect(response.body).toEqual(mockBookingResponse);
      expect(bookingsService.createBookingAtomic).toHaveBeenCalledWith({
        actor: 'customer',
        tenantId: validTenantId,
        customerUserId: validCustomerId,
        serviceId: validServiceId,
        staffId: validStaffId,
        bookingDate: validBookingDate,
        startTime: '10:00',
        customerName: 'HTTP Customer',
        customerPhone: '0812345678',
        notes: undefined,
      });
    });

    it('400 VALIDATION_FAILED: rejects server-owned booking fields from customer requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('authorization', 'Bearer line-id-token')
        .set('x-tenant-id', validTenantId)
        .send({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
          startTime: '10:00',
          price: 1,
          endTime: '23:59',
          status: 'confirmed',
        })
        .expect(400);

      expect(response.body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(mockBookingsService.createBookingAtomic).not.toHaveBeenCalled();
    });

    it('201: creates a merchant booking using customerId from the strict DTO', async () => {
      mockBookingsService.createBookingAtomic.mockResolvedValueOnce({
        ...mockBookingResponse,
        source: 'admin',
      });

      await request(app.getHttpServer())
        .post('/bookings/merchant')
        .set('authorization', 'Bearer supabase-access-token')
        .set('x-tenant-id', validTenantId)
        .send({
          customerId: validCustomerId,
          serviceId: validServiceId,
          staffId: null,
          bookingDate: validBookingDate,
          startTime: '10:00',
          notes: 'Created by merchant',
        })
        .expect(201);

      expect(bookingsService.createBookingAtomic).toHaveBeenCalledWith({
        actor: 'merchant',
        tenantId: validTenantId,
        customerUserId: validCustomerId,
        serviceId: validServiceId,
        staffId: undefined,
        courtId: undefined,
        bookingDate: validBookingDate,
        startTime: '10:00',
        bookingHours: undefined,
        customerName: undefined,
        customerPhone: undefined,
        notes: 'Created by merchant',
        paymentMethod: 'cash',
      });
    });

    it('400 VALIDATION_FAILED: merchant create requires customerId', async () => {
      const response = await request(app.getHttpServer())
        .post('/bookings/merchant')
        .set('authorization', 'Bearer supabase-access-token')
        .set('x-tenant-id', validTenantId)
        .send({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
          startTime: '10:00',
        })
        .expect(400);

      expect(response.body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(mockBookingsService.createBookingAtomic).not.toHaveBeenCalled();
    });

    it('409 BOOKING_SLOT_UNAVAILABLE: preserves atomic domain conflicts', async () => {
      mockBookingsService.createBookingAtomic.mockRejectedValueOnce(
        new ConflictException({
          statusCode: 409,
          code: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
          message: 'Selected booking slot is no longer available',
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('authorization', 'Bearer line-id-token')
        .set('x-tenant-id', validTenantId)
        .send({
          serviceId: validServiceId,
          bookingDate: validBookingDate,
          startTime: '10:00',
        })
        .expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        code: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
        message: 'Selected booking slot is no longer available',
        details: null,
      });
    });
  });
});
