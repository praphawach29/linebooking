import { Test, TestingModule } from '@nestjs/testing';
import { PilotMetricsService } from './pilot-metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.types';

describe('PilotMetricsService', () => {
  let service: PilotMetricsService;

  const mockPrismaService = {
    tenant: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: '10000000-0000-0000-0000-000000000001',
          name: 'Badminton Grand Arena',
          slug: 'badminton-arena',
          businessType: 'service_court_time',
          plan: 'pro',
        },
      ]),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'b1',
          tenantId: '10000000-0000-0000-0000-000000000001',
          status: 'confirmed',
          paymentStatus: 'paid',
          finalPrice: 500,
          court_id: 'c1',
          staffId: null,
          bookingDate: new Date('2026-08-20'),
          startTime: new Date('2026-08-20T10:00:00.000Z'),
          endTime: new Date('2026-08-20T11:00:00.000Z'),
          checkedInAt: new Date('2026-08-20T09:55:00.000Z'),
        },
        {
          id: 'b2',
          tenantId: '10000000-0000-0000-0000-000000000001',
          status: 'completed',
          paymentStatus: 'paid',
          finalPrice: 500,
          court_id: 'c1',
          staffId: null,
          bookingDate: new Date('2026-08-20'),
          startTime: new Date('2026-08-20T11:00:00.000Z'),
          endTime: new Date('2026-08-20T12:00:00.000Z'),
          checkedInAt: new Date('2026-08-20T10:55:00.000Z'),
        },
      ]),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p1', status: 'paid', amount: 500, tenantId: '10000000-0000-0000-0000-000000000001' },
      ]),
    },
    payment_slips: {
      findMany: jest.fn().mockResolvedValue([
        { id: 's1', verification_status: 'verified', tenant_id: '10000000-0000-0000-0000-000000000001' },
      ]),
    },
    lineMessageDelivery: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'd1', status: 'completed', tenantId: '10000000-0000-0000-0000-000000000001', attempts: 1 },
      ]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a1', action: 'booking_created', tenantId: '10000000-0000-0000-0000-000000000001' },
      ]),
    },
  };

  const mockNotificationQueue = {
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PilotMetricsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE), useValue: mockNotificationQueue },
      ],
    }).compile();

    service = module.get<PilotMetricsService>(PilotMetricsService);
  });

  it('should generate accurate pilot validation metrics', async () => {
    const report = await service.getPilotValidationReport();

    expect(report.overallStatus).toBe('READY_FOR_LAUNCH');
    expect(report.slas).toBeDefined();
    expect(report.slas.length).toBe(6);

    const bookingSla = report.slas.find((s) => s.key === 'booking_success_rate');
    expect(bookingSla?.currentValue).toBe(100);
    expect(bookingSla?.status).toBe('pass');

    const doubleBookingSla = report.slas.find((s) => s.key === 'double_booking_count');
    expect(doubleBookingSla?.currentValue).toBe(0);
    expect(doubleBookingSla?.status).toBe('pass');

    expect(report.tenants.length).toBe(1);
    expect(report.tenants[0].name).toBe('Badminton Grand Arena');
    expect(report.tenants[0].totalRevenue).toBe(1000);
  });

  it('should flag double booking conflict when overlapping times occur', async () => {
    mockPrismaService.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b1',
        tenantId: '10000000-0000-0000-0000-000000000001',
        status: 'confirmed',
        paymentStatus: 'paid',
        finalPrice: 500,
        court_id: 'c1',
        staffId: null,
        bookingDate: new Date('2026-08-20'),
        startTime: new Date('2026-08-20T10:00:00.000Z'),
        endTime: new Date('2026-08-20T11:00:00.000Z'),
        checkedInAt: null,
      },
      {
        id: 'b2',
        tenantId: '10000000-0000-0000-0000-000000000001',
        status: 'confirmed',
        paymentStatus: 'paid',
        finalPrice: 500,
        court_id: 'c1',
        staffId: null,
        bookingDate: new Date('2026-08-20'),
        startTime: new Date('2026-08-20T10:30:00.000Z'),
        endTime: new Date('2026-08-20T11:30:00.000Z'),
        checkedInAt: null,
      },
    ]);

    const report = await service.getPilotValidationReport();
    const doubleBookingSla = report.slas.find((s) => s.key === 'double_booking_count');
    expect(doubleBookingSla?.currentValue).toBe(1);
    expect(doubleBookingSla?.status).toBe('fail');
    expect(report.overallStatus).toBe('ACTION_REQUIRED');
  });
});
