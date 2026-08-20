import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import type { LivenessStatus, ReadinessStatus } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  getHealth(): LivenessStatus {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getReady(): Promise<ReadinessStatus> {
    return this.healthService.getReadiness();
  }
}
