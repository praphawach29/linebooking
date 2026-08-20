import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.types';

describe('HealthService (Unit Tests)', () => {
  let service: HealthService;
  let mockPrisma: any;
  let mockQueue: any;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    mockRedisClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    mockQueue = {
      client: Promise.resolve(mockRedisClient),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 2,
        active: 1,
        failed: 0,
        completed: 100,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('returns liveness status with uptime and memory metrics', () => {
    const liveness = service.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(typeof liveness.uptimeSeconds).toBe('number');
    expect(liveness.memoryUsageMb.heapUsed).toBeGreaterThan(0);
  });

  it('returns readiness status ok when both database and redis are healthy', async () => {
    const readiness = await service.getReadiness();
    expect(readiness.status).toBe('ok');
    expect(readiness.checks.database).toBe('up');
    expect(readiness.checks.redis).toBe('up');
    expect(readiness.checks.queue).toBe('up');
    expect(readiness.queueCounts?.waiting).toBe(2);
    expect(readiness.latencyMs.database).toBeGreaterThanOrEqual(0);
  });

  it('throws ServiceUnavailableException (503) when database check fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection terminated'));

    await expect(service.getReadiness()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException (503) when redis check fails', async () => {
    mockRedisClient.ping.mockRejectedValueOnce(new Error('Redis connection refused'));

    await expect(service.getReadiness()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
