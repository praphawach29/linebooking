import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.types';

export interface LivenessStatus {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
  env: string;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export interface ReadinessStatus {
  status: 'ok' | 'degraded';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    queue: 'up' | 'down';
  };
  latencyMs: {
    database: number;
    redis: number;
  };
  queueCounts?: {
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  };
  timestamp: string;
  errors?: string[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  getLiveness(): LivenessStatus {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      memoryUsageMb: {
        rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      },
    };
  }

  async getReadiness(): Promise<ReadinessStatus> {
    const errors: string[] = [];
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatencyMs = -1;

    let redisStatus: 'up' | 'down' = 'down';
    let queueStatus: 'up' | 'down' = 'down';
    let redisLatencyMs = -1;
    let queueCounts: ReadinessStatus['queueCounts'] = undefined;

    // 1. PostgreSQL Database Check
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = 'up';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Database health check failed: ${msg}`);
      errors.push(`Database: ${msg}`);
    }

    // 2. Redis & BullMQ Queue Check
    try {
      const redisStart = Date.now();
      const client = (await this.notificationQueue.client) as any;
      if (typeof client.ping === 'function') {
        await client.ping();
      } else if (typeof client.call === 'function') {
        await client.call('PING');
      }
      redisLatencyMs = Date.now() - redisStart;
      redisStatus = 'up';

      const counts = await this.notificationQueue.getJobCounts(
        'waiting',
        'active',
        'failed',
        'completed',
      );
      queueCounts = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        failed: counts.failed || 0,
        completed: counts.completed || 0,
      };
      queueStatus = 'up';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis/Queue health check failed: ${msg}`);
      errors.push(`Redis/Queue: ${msg}`);
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    const result: ReadinessStatus = {
      status: isHealthy ? 'ok' : 'degraded',
      checks: {
        database: dbStatus,
        redis: redisStatus,
        queue: queueStatus,
      },
      latencyMs: {
        database: dbLatencyMs,
        redis: redisLatencyMs,
      },
      queueCounts,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
