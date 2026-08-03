import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import {
  AvailabilityService,
  AvailabilityResult,
} from './availability.service';
import { GetAvailableSlotsQueryDto } from './dto/get-available-slots.dto';
import { ErrorCode } from '../common/constants/error-codes';
import { CustomerTenantGuard } from '../common/guards/customer-tenant.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import {
  BookingResponseDto,
  CreateCustomerBookingDto,
  CreateMerchantBookingDto,
} from './dto';

describe('BookingsController (Unit Tests)', () => {
  let controller: BookingsController;
  let bookingsService: jest.Mocked<BookingsService>;
  let availabilityService: jest.Mocked<AvailabilityService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const serviceId = '11111111-1111-1111-1111-111111111111';
  const staffId = '22222222-2222-2222-2222-222222222222';
  const bookingDate = '2026-08-03';

  const mockAvailabilityResult: AvailabilityResult = {
    tenantId,
    bookingDate,
    timezone: 'Asia/Bangkok',
    slotIntervalMinutes: 30,
    service: {
      id: serviceId,
      name: 'Hair Cut & Styling',
      durationMinutes: 60,
      bufferMinutes: 15,
      price: 500,
    },
    slots: [
      {
        startTime: '10:00',
        endTime: '11:00',
        staffId: staffId,
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

  const mockBookingsService = {
    getAvailableSlots: jest.fn(),
    createBookingAtomic: jest.fn(),
    cancelBookingAsMerchant: jest.fn(),
  };

  const mockAvailabilityService = {
    calculateAvailability: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
      ],
    })
      .overrideGuard(LineIdTokenGuard)
      .useValue({ canActivate: jest.fn() })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: jest.fn() })
      .overrideGuard(TenantAccessGuard)
      .useValue({ canActivate: jest.fn() })
      .compile();

    controller = module.get<BookingsController>(BookingsController);
    bookingsService = module.get(BookingsService);
    availabilityService = module.get(AvailabilityService);
  });

  describe('GET /bookings/available-slots', () => {
    it('should successfully return available slots when valid parameters are provided', async () => {
      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const query: GetAvailableSlotsQueryDto = {
        serviceId,
        bookingDate,
      };

      const result = await controller.getAvailableSlots(tenantId, query);

      expect(result).toEqual(mockAvailabilityResult);
      expect(availabilityService.calculateAvailability).toHaveBeenCalledTimes(
        1,
      );
      expect(availabilityService.calculateAvailability).toHaveBeenCalledWith(
        tenantId,
        bookingDate,
        serviceId,
        undefined,
        { actor: 'customer' },
      );
    });

    it('should pass staffId to AvailabilityService when optional staffId is provided in query', async () => {
      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const query: GetAvailableSlotsQueryDto = {
        serviceId,
        bookingDate,
        staffId,
      };

      const result = await controller.getAvailableSlots(tenantId, query);

      expect(result).toEqual(mockAvailabilityResult);
      expect(availabilityService.calculateAvailability).toHaveBeenCalledWith(
        tenantId,
        bookingDate,
        serviceId,
        staffId,
        { actor: 'customer' },
      );
    });

    it('should strictly source tenantId from @TenantId decorator and NOT from query parameters', async () => {
      availabilityService.calculateAvailability.mockResolvedValueOnce(
        mockAvailabilityResult,
      );

      const query: GetAvailableSlotsQueryDto = {
        serviceId,
        bookingDate,
      };

      // Even if query object contained extraneous keys, controller passes injected tenantId to service
      await controller.getAvailableSlots(tenantId, query);

      expect(availabilityService.calculateAvailability).toHaveBeenCalledWith(
        tenantId, // Must match decorator-injected tenantId
        bookingDate,
        serviceId,
        undefined,
        { actor: 'customer' },
      );
    });

    it('should propagate domain exceptions thrown by AvailabilityService without swallowing or altering', async () => {
      const serviceException = new NotFoundException({
        statusCode: 404,
        code: ErrorCode.SERVICE_NOT_FOUND,
        message: 'Service not found',
      });

      availabilityService.calculateAvailability.mockRejectedValueOnce(
        serviceException,
      );

      const query: GetAvailableSlotsQueryDto = {
        serviceId,
        bookingDate,
      };

      let thrownError: any;
      try {
        await controller.getAvailableSlots(tenantId, query);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBe(serviceException);
      expect(thrownError.getResponse()).toEqual({
        statusCode: 404,
        code: ErrorCode.SERVICE_NOT_FOUND,
        message: 'Service not found',
      });
    });

    it('CustomerTenantGuard: should validate x-tenant-id presence and UUID format', () => {
      const guard = new CustomerTenantGuard();

      // 1) Missing header
      const mockReqMissing = { headers: {} };
      const mockCtxMissing = {
        switchToHttp: () => ({ getRequest: () => mockReqMissing }),
      } as any;

      expect(() => guard.canActivate(mockCtxMissing)).toThrow(
        BadRequestException,
      );

      // 2) Invalid UUID header
      const mockReqInvalid = { headers: { 'x-tenant-id': 'invalid-uuid-123' } };
      const mockCtxInvalid = {
        switchToHttp: () => ({ getRequest: () => mockReqInvalid }),
      } as any;

      expect(() => guard.canActivate(mockCtxInvalid)).toThrow(
        BadRequestException,
      );

      // 3) Valid UUID header
      const mockReqValid: any = { headers: { 'x-tenant-id': tenantId } };
      const mockCtxValid = {
        switchToHttp: () => ({ getRequest: () => mockReqValid }),
      } as any;

      expect(guard.canActivate(mockCtxValid)).toBe(true);
      expect(mockReqValid.tenantId).toBe(tenantId);
    });
  });

  describe('Step 9 create and cancellation endpoints', () => {
    const customerId = '33333333-3333-4333-8333-333333333333';
    const bookingId = '44444444-4444-4444-8444-444444444444';
    const bookingResponse: BookingResponseDto = {
      id: bookingId,
      refNo: 'BK-STEP9-TEST',
      tenantId,
      userId: customerId,
      userName: 'Step 9 Customer',
      userPhone: '0812345678',
      serviceId,
      serviceName: 'Hair Cut & Styling',
      serviceDuration: 60,
      servicePrice: 500,
      staffId,
      staffName: 'Staff One',
      bookingDate,
      startTime: '10:00',
      endTime: '11:00',
      status: 'pending',
      price: 500,
      discountAmount: 0,
      finalPrice: 500,
      depositAmount: 0,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      source: 'line_liff',
      notes: 'Window seat',
      createdAt: '2026-08-02T18:00:00.000Z',
    };

    it('maps authenticated LINE customer data to the atomic customer command', async () => {
      bookingsService.createBookingAtomic.mockResolvedValueOnce(
        bookingResponse,
      );
      const dto: CreateCustomerBookingDto = {
        serviceId,
        staffId,
        bookingDate,
        startTime: '10:00',
        customerName: 'Step 9 Customer',
        customerPhone: '0812345678',
        notes: 'Window seat',
      };

      await expect(
        controller.createCustomerBooking(tenantId, { id: customerId }, dto),
      ).resolves.toEqual(bookingResponse);
      expect(bookingsService.createBookingAtomic).toHaveBeenCalledWith({
        actor: 'customer',
        tenantId,
        customerUserId: customerId,
        serviceId,
        staffId,
        bookingDate,
        startTime: '10:00',
        customerName: 'Step 9 Customer',
        customerPhone: '0812345678',
        notes: 'Window seat',
      });
    });

    it('maps merchant customerId to the atomic merchant command', async () => {
      bookingsService.createBookingAtomic.mockResolvedValueOnce({
        ...bookingResponse,
        source: 'admin',
      });
      const dto: CreateMerchantBookingDto = {
        customerId,
        serviceId,
        bookingDate,
        startTime: '10:00',
      };

      await controller.createMerchantBooking(tenantId, dto);

      expect(bookingsService.createBookingAtomic).toHaveBeenCalledWith({
        actor: 'merchant',
        tenantId,
        customerUserId: customerId,
        serviceId,
        staffId: undefined,
        bookingDate,
        startTime: '10:00',
        customerName: undefined,
        customerPhone: undefined,
        notes: undefined,
      });
    });

    it('uses merchant-only cancellation service without a body or request user ID', async () => {
      bookingsService.cancelBookingAsMerchant.mockResolvedValueOnce({
        id: bookingId,
        status: 'cancelled',
      } as never);

      await controller.cancelMerchantBooking(tenantId, bookingId);

      expect(bookingsService.cancelBookingAsMerchant).toHaveBeenCalledWith(
        tenantId,
        bookingId,
      );
    });

    it('binds the intended authentication and tenant guards to each endpoint', () => {
      const customerGuards = Reflect.getMetadata(
        GUARDS_METADATA,
        BookingsController.prototype.createCustomerBooking,
      ) as unknown[];
      const merchantGuards = Reflect.getMetadata(
        GUARDS_METADATA,
        BookingsController.prototype.createMerchantBooking,
      ) as unknown[];
      const cancellationGuards = Reflect.getMetadata(
        GUARDS_METADATA,
        BookingsController.prototype.cancelMerchantBooking,
      ) as unknown[];

      expect(customerGuards).toEqual([LineIdTokenGuard]);
      expect(merchantGuards).toEqual([SupabaseAuthGuard, TenantAccessGuard]);
      expect(cancellationGuards).toEqual([
        SupabaseAuthGuard,
        TenantAccessGuard,
      ]);
    });
  });
});
