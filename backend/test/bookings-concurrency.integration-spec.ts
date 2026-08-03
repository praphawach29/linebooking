import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import { BookingsService } from '../src/bookings/bookings.service';
import { AvailabilityService } from '../src/bookings/availability.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreateBookingCommand } from '../src/bookings/dto/create-booking-command.dto';

describe('Real PostgreSQL Concurrency Integration Tests (Step 8)', () => {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  const prodDbUrl = process.env.DATABASE_URL;
  const isAcknowledged = process.env.TEST_DATABASE_ACKNOWLEDGED === 'true';

  // SAFETY GATE: URL Normalization & Validation
  const normalizeUrl = (urlStr?: string): string => {
    if (!urlStr) return '';
    try {
      const parsed = new URL(urlStr);
      return `${parsed.protocol}//${parsed.hostname}:${parsed.port}${parsed.pathname}`;
    } catch {
      return urlStr.trim();
    }
  };

  const normalizedTestUrl = normalizeUrl(testDbUrl);
  const normalizedProdUrl = normalizeUrl(prodDbUrl);

  const isSupabaseDatabase = (urlStr?: string): boolean => {
    if (!urlStr) return false;
    try {
      const hostname = new URL(urlStr).hostname.toLowerCase();
      return (
        hostname === 'supabase.co' ||
        hostname.endsWith('.supabase.co') ||
        hostname === 'supabase.com' ||
        hostname.endsWith('.supabase.com')
      );
    } catch {
      return true;
    }
  };

  const isTestDbConfigured = Boolean(
    testDbUrl &&
    testDbUrl.trim() !== '' &&
    normalizedTestUrl !== normalizedProdUrl &&
    !isSupabaseDatabase(testDbUrl),
  );

  if (!isTestDbConfigured) {
    it('REAL POSTGRESQL CONCURRENCY TESTS: BLOCKED BY SAFETY GATE', () => {
      const errorMsg =
        '\n=========================================================================\n' +
        '❌ REAL POSTGRESQL INTEGRATION TESTS BLOCKED BY SAFETY GATE\n' +
        'Reason: TEST_DATABASE_URL environment variable is missing, empty, or equal\n' +
        'to production DATABASE_URL.\n' +
        'Per Step 8 Safety Policy, real concurrency tests MUST ONLY run against a\n' +
        'dedicated local or test PostgreSQL instance, NEVER against production Supabase.\n' +
        'Step 8 CANNOT be marked COMPLETE until TEST_DATABASE_URL is set and tests run.\n' +
        '=========================================================================\n';
      console.error(errorMsg);
      throw new Error(
        'TEST_DATABASE_URL_NOT_CONFIGURED: Concurrency tests BLOCKED by Safety Gate',
      );
    });
    return;
  }

  // --- Real PostgreSQL Concurrency Test Suite ---
  let prismaClient: PrismaClient;
  let prismaServiceAdapter: PrismaService;
  let availabilityService: AvailabilityService;
  let bookingsService: BookingsService;

  // Run-specific dynamic UUIDs
  const staffTenantId = crypto.randomUUID();
  const resourceTenantId = crypto.randomUUID();

  const testUserId1 = crypto.randomUUID();
  const testUserId2 = crypto.randomUUID();
  const testUserId3 = crypto.randomUUID();

  const testServiceIdCap1 = crypto.randomUUID();
  const resourceServiceIdCapN = crypto.randomUUID();

  const testStaffId1 = crypto.randomUUID();
  const testStaffId2 = crypto.randomUUID();

  // Dynamic Future UTC Date Calculation (14 days in future on a Monday)
  const calculateFutureMondayUTC = (): {
    dateStr: string;
    dayOfWeek: number;
  } => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 14);
    const currentDay = future.getUTCDay(); // 0 = Sun, 1 = Mon ...
    const distance = (1 + 7 - currentDay) % 7;
    future.setUTCDate(future.getUTCDate() + distance);
    const year = future.getUTCFullYear();
    const month = String(future.getUTCMonth() + 1).padStart(2, '0');
    const day = String(future.getUTCDate()).padStart(2, '0');
    return { dateStr: `${year}-${month}-${day}`, dayOfWeek: 1 };
  };

  const { dateStr: testDate, dayOfWeek: testDayOfWeek } =
    calculateFutureMondayUTC();

  beforeAll(async () => {
    // 1. Real PrismaClient instantiation with TEST_DATABASE_URL
    prismaClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testDbUrl! }),
    });

    await prismaClient.$connect();

    // 2. Preflight verification query
    const preflight = await prismaClient.$queryRaw<
      Array<{ current_database: string; current_user: string }>
    >`
      SELECT current_database(), current_user;
    `;

    const dbName = preflight?.[0]?.current_database || '';
    const isSafeDbName =
      dbName.toLowerCase().includes('test') ||
      dbName.toLowerCase().includes('local') ||
      isAcknowledged;

    if (!isSafeDbName) {
      await prismaClient.$disconnect();
      throw new Error(
        `PREFLIGHT_VERIFICATION_FAILED: Database '${dbName}' is not explicitly named test/local and TEST_DATABASE_ACKNOWLEDGED is not true.`,
      );
    }

    prismaServiceAdapter = prismaClient as unknown as PrismaService;
    availabilityService = new AvailabilityService(prismaServiceAdapter);
    bookingsService = new BookingsService(
      prismaServiceAdapter,
      availabilityService,
    );

    // 3. Seed Staff Tenant
    await prismaClient.tenant.create({
      data: {
        id: staffTenantId,
        name: 'Integ Staff Tenant',
        slug: `staff-tenant-${staffTenantId.substring(0, 8)}`,
        businessType: 'service_staff_time',
        settings: {
          timezone: 'Asia/Bangkok',
          bookingFlowMode: 'service_staff_time',
        },
        isActive: true,
      },
    });

    // 4. Seed Dedicated Resource Tenant (bookingFlowMode: service_time_only)
    await prismaClient.tenant.create({
      data: {
        id: resourceTenantId,
        name: 'Integ Resource Tenant',
        slug: `res-tenant-${resourceTenantId.substring(0, 8)}`,
        businessType: 'service_time_only',
        settings: {
          timezone: 'Asia/Bangkok',
          bookingFlowMode: 'service_time_only',
        },
        isActive: true,
      },
    });

    // Seed Users
    await prismaClient.user.createMany({
      data: [
        {
          id: testUserId1,
          displayName: 'Integ Customer 1',
          email: `c1_${testUserId1.substring(0, 6)}@test.com`,
        },
        {
          id: testUserId2,
          displayName: 'Integ Customer 2',
          email: `c2_${testUserId2.substring(0, 6)}@test.com`,
        },
        {
          id: testUserId3,
          displayName: 'Integ Customer 3',
          email: `c3_${testUserId3.substring(0, 6)}@test.com`,
        },
      ],
    });

    // Seed Memberships for both tenants
    await prismaClient.membership.createMany({
      data: [
        { tenantId: staffTenantId, userId: testUserId1 },
        { tenantId: staffTenantId, userId: testUserId2 },
        { tenantId: staffTenantId, userId: testUserId3 },
        { tenantId: resourceTenantId, userId: testUserId1 },
        { tenantId: resourceTenantId, userId: testUserId2 },
        { tenantId: resourceTenantId, userId: testUserId3 },
      ],
    });

    // Services
    await prismaClient.service.create({
      data: {
        id: testServiceIdCap1,
        tenantId: staffTenantId,
        name: 'Integ Haircut Cap1',
        durationMinutes: 60,
        price: new Prisma.Decimal(500),
        maxCapacity: 1,
        bufferMinutes: 0,
      },
    });

    await prismaClient.service.create({
      data: {
        id: resourceServiceIdCapN,
        tenantId: resourceTenantId,
        name: 'Integ Group Class Cap2',
        durationMinutes: 60,
        price: new Prisma.Decimal(300),
        maxCapacity: 2,
        bufferMinutes: 0,
      },
    });

    // Staff
    await prismaClient.staff.createMany({
      data: [
        { id: testStaffId1, tenant_id: staffTenantId, name: 'Integ Staff 1' },
        { id: testStaffId2, tenant_id: staffTenantId, name: 'Integ Staff 2' },
      ],
    });

    await prismaClient.staffService.createMany({
      data: [
        { staffId: testStaffId1, serviceId: testServiceIdCap1 },
        { staffId: testStaffId2, serviceId: testServiceIdCap1 },
      ],
    });

    // Business Hours
    await prismaClient.businessHours.createMany({
      data: [
        {
          tenantId: staffTenantId,
          dayOfWeek: testDayOfWeek,
          openTime: new Date('1970-01-01T09:00:00Z'),
          closeTime: new Date('1970-01-01T18:00:00Z'),
          isOpen: true,
        },
        {
          tenantId: resourceTenantId,
          dayOfWeek: testDayOfWeek,
          openTime: new Date('1970-01-01T09:00:00Z'),
          closeTime: new Date('1970-01-01T18:00:00Z'),
          isOpen: true,
        },
      ],
    });

    // Staff Schedule (tenantId explicitly set)
    await prismaClient.staffSchedule.createMany({
      data: [
        {
          tenantId: staffTenantId,
          staffId: testStaffId1,
          dayOfWeek: testDayOfWeek,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T18:00:00Z'),
          isAvailable: true,
        },
        {
          tenantId: staffTenantId,
          staffId: testStaffId2,
          dayOfWeek: testDayOfWeek,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T18:00:00Z'),
          isAvailable: true,
        },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup run-specific IDs with try/finally
    try {
      if (prismaClient) {
        await prismaClient.booking.deleteMany({
          where: { tenantId: { in: [staffTenantId, resourceTenantId] } },
        });
        await prismaClient.membership.deleteMany({
          where: { tenantId: { in: [staffTenantId, resourceTenantId] } },
        });
        await prismaClient.staffSchedule.deleteMany({
          where: { tenantId: { in: [staffTenantId, resourceTenantId] } },
        });
        await prismaClient.staffService.deleteMany({
          where: { staff: { tenant_id: staffTenantId } },
        });
        await prismaClient.staff.deleteMany({
          where: { tenant_id: staffTenantId },
        });
        await prismaClient.service.deleteMany({
          where: { tenantId: { in: [staffTenantId, resourceTenantId] } },
        });
        await prismaClient.businessHours.deleteMany({
          where: { tenantId: { in: [staffTenantId, resourceTenantId] } },
        });
        await prismaClient.tenant.deleteMany({
          where: { id: { in: [staffTenantId, resourceTenantId] } },
        });
        await prismaClient.user.deleteMany({
          where: { id: { in: [testUserId1, testUserId2, testUserId3] } },
        });
      }
    } finally {
      if (prismaClient) {
        await prismaClient.$disconnect();
      }
    }
  });

  it('1. capacity=1: 2 concurrent requests for same staff slot should result in fulfilled === 1, rejected === 1, and exactly 1 persisted row', async () => {
    const transactionSpy = jest.spyOn(prismaClient, '$transaction');
    const cmd1: CreateBookingCommand = {
      actor: 'customer',
      tenantId: staffTenantId,
      customerUserId: testUserId1,
      serviceId: testServiceIdCap1,
      staffId: testStaffId1,
      bookingDate: testDate,
      startTime: '10:00',
    };
    const cmd2: CreateBookingCommand = {
      actor: 'customer',
      tenantId: staffTenantId,
      customerUserId: testUserId2,
      serviceId: testServiceIdCap1,
      staffId: testStaffId1,
      bookingDate: testDate,
      startTime: '10:00',
    };

    const results = await Promise.allSettled([
      bookingsService.createBookingAtomic(cmd1),
      bookingsService.createBookingAtomic(cmd2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    const transactionCallCount = transactionSpy.mock.calls.length;
    transactionSpy.mockRestore();

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(transactionCallCount).toBeGreaterThanOrEqual(3);
    expect(transactionCallCount).toBeLessThanOrEqual(6);

    const persistedCount = await prismaClient.booking.count({
      where: {
        tenantId: staffTenantId,
        serviceId: testServiceIdCap1,
        staffId: testStaffId1,
        bookingDate: new Date(`${testDate}T00:00:00Z`),
        startTime: new Date('1970-01-01T10:00:00Z'),
      },
    });
    expect(persistedCount).toBe(1);
  });

  it('2. capacity=N (N=2): 3 concurrent requests for resource service should result in fulfilled === 2 and rejected === 1', async () => {
    const cmd1: CreateBookingCommand = {
      actor: 'customer',
      tenantId: resourceTenantId,
      customerUserId: testUserId1,
      serviceId: resourceServiceIdCapN,
      bookingDate: testDate,
      startTime: '11:00',
    };
    const cmd2: CreateBookingCommand = {
      actor: 'customer',
      tenantId: resourceTenantId,
      customerUserId: testUserId2,
      serviceId: resourceServiceIdCapN,
      bookingDate: testDate,
      startTime: '11:00',
    };
    const cmd3: CreateBookingCommand = {
      actor: 'customer',
      tenantId: resourceTenantId,
      customerUserId: testUserId3,
      serviceId: resourceServiceIdCapN,
      bookingDate: testDate,
      startTime: '11:00',
    };

    const results = await Promise.allSettled([
      bookingsService.createBookingAtomic(cmd1),
      bookingsService.createBookingAtomic(cmd2),
      bookingsService.createBookingAtomic(cmd3),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(1);
  });

  it('3. independent staff: 2 concurrent requests for different staff at same time should both succeed', async () => {
    const cmd1: CreateBookingCommand = {
      actor: 'customer',
      tenantId: staffTenantId,
      customerUserId: testUserId1,
      serviceId: testServiceIdCap1,
      staffId: testStaffId1,
      bookingDate: testDate,
      startTime: '14:00',
    };
    const cmd2: CreateBookingCommand = {
      actor: 'customer',
      tenantId: staffTenantId,
      customerUserId: testUserId2,
      serviceId: testServiceIdCap1,
      staffId: testStaffId2,
      bookingDate: testDate,
      startTime: '14:00',
    };

    const results = await Promise.allSettled([
      bookingsService.createBookingAtomic(cmd1),
      bookingsService.createBookingAtomic(cmd2),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        const reason: unknown = result.reason;
        if (reason instanceof Error) throw reason;
        throw new Error(
          `Independent staff booking rejected: ${String(reason)}`,
        );
      }
    }

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(2);
  });

  it('4. status check: cancelled/completed/no_show do NOT block slot, while pending/confirmed/checked_in DO block', async () => {
    const nonBlockingCases = [
      { status: 'cancelled' as const, startTime: '09:00' },
      { status: 'completed' as const, startTime: '11:00' },
      { status: 'no_show' as const, startTime: '12:00' },
    ];
    const blockingCases = [
      { status: 'pending' as const, startTime: '13:00' },
      { status: 'confirmed' as const, startTime: '15:00' },
      { status: 'checked_in' as const, startTime: '16:00' },
    ];

    const seedBookingWithStatus = async (
      status:
        | 'cancelled'
        | 'completed'
        | 'no_show'
        | 'pending'
        | 'confirmed'
        | 'checked_in',
      startTime: string,
    ) => {
      const startHour = Number(startTime.slice(0, 2));
      const startMinute = Number(startTime.slice(3, 5));
      const endTotalMinutes = startHour * 60 + startMinute + 60;
      const endTime = `${String(Math.floor(endTotalMinutes / 60)).padStart(2, '0')}:${String(endTotalMinutes % 60).padStart(2, '0')}`;

      await prismaClient.booking.create({
        data: {
          ref_no: `BK-${status.toUpperCase()}-${crypto.randomBytes(3).toString('hex')}`,
          tenantId: staffTenantId,
          userId: testUserId1,
          user_name: 'Status fixture',
          serviceId: testServiceIdCap1,
          staffId: testStaffId1,
          bookingDate: new Date(`${testDate}T00:00:00Z`),
          startTime: new Date(`1970-01-01T${startTime}:00Z`),
          endTime: new Date(`1970-01-01T${endTime}:00Z`),
          status,
          price: new Prisma.Decimal(500),
          finalPrice: new Prisma.Decimal(500),
        },
      });
    };

    for (const testCase of nonBlockingCases) {
      await seedBookingWithStatus(testCase.status, testCase.startTime);
      await expect(
        bookingsService.createBookingAtomic({
          actor: 'customer',
          tenantId: staffTenantId,
          customerUserId: testUserId2,
          serviceId: testServiceIdCap1,
          staffId: testStaffId1,
          bookingDate: testDate,
          startTime: testCase.startTime,
        }),
      ).resolves.toMatchObject({
        startTime: testCase.startTime,
        status: 'pending',
      });
    }

    for (const testCase of blockingCases) {
      await seedBookingWithStatus(testCase.status, testCase.startTime);
      let rejection: unknown;
      try {
        await bookingsService.createBookingAtomic({
          actor: 'customer',
          tenantId: staffTenantId,
          customerUserId: testUserId3,
          serviceId: testServiceIdCap1,
          staffId: testStaffId1,
          bookingDate: testDate,
          startTime: testCase.startTime,
        });
      } catch (error: unknown) {
        rejection = error;
      }

      expect(rejection).toMatchObject({
        response: { code: 'BOOKING_SLOT_UNAVAILABLE' },
      });
    }
  });

  it('5. rollback check: a failure after insert leaves no partial booking row in DB', async () => {
    const rollbackRef = `BK-ROLLBACK-${crypto.randomBytes(4).toString('hex')}`;

    await expect(
      prismaClient.$transaction(
        async (tx) => {
          await tx.booking.create({
            data: {
              ref_no: rollbackRef,
              tenantId: resourceTenantId,
              userId: testUserId1,
              user_name: 'Rollback fixture',
              serviceId: resourceServiceIdCapN,
              bookingDate: new Date(`${testDate}T00:00:00Z`),
              startTime: new Date('1970-01-01T13:30:00Z'),
              endTime: new Date('1970-01-01T14:30:00Z'),
              status: 'pending',
              price: new Prisma.Decimal(300),
              finalPrice: new Prisma.Decimal(300),
            },
          });

          throw new Error('FORCED_ROLLBACK_AFTER_INSERT');
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    ).rejects.toThrow('FORCED_ROLLBACK_AFTER_INSERT');

    await expect(
      prismaClient.booking.findUnique({ where: { ref_no: rollbackRef } }),
    ).resolves.toBeNull();
  });

  it('6. ref_no uniqueness & persisted fields check: all concurrent bookings have distinct ref_no and DB endTime matches', async () => {
    const cmd1: CreateBookingCommand = {
      actor: 'customer',
      tenantId: staffTenantId,
      customerUserId: testUserId1,
      serviceId: testServiceIdCap1,
      staffId: testStaffId1,
      bookingDate: testDate,
      startTime: '17:00',
    };
    const cmd2: CreateBookingCommand = {
      actor: 'customer',
      tenantId: staffTenantId,
      customerUserId: testUserId2,
      serviceId: testServiceIdCap1,
      staffId: testStaffId2,
      bookingDate: testDate,
      startTime: '17:00',
    };

    const results = await Promise.all([
      bookingsService.createBookingAtomic(cmd1),
      bookingsService.createBookingAtomic(cmd2),
    ]);

    expect(results[0].refNo).not.toBe(results[1].refNo);

    const dbRecord = await prismaClient.booking.findUnique({
      where: { id: results[0].id },
    });
    expect(dbRecord).toBeDefined();
    expect(Number(dbRecord!.price)).toBe(500);
    expect(dbRecord!.endTime.getUTCHours()).toBe(18);
    expect(dbRecord!.endTime.getUTCMinutes()).toBe(0);
    expect(dbRecord!.status).toBe('pending');
    expect(dbRecord!.source).toBe('line_liff');
  });
});
