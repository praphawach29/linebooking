import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PilotMetricsService, PilotValidationReport } from './pilot-metrics.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('admin/pilot-metrics')
@UseGuards(SupabaseAuthGuard)
export class PilotMetricsController {
  constructor(private readonly pilotMetricsService: PilotMetricsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getPilotMetrics(): Promise<PilotValidationReport> {
    return this.pilotMetricsService.getPilotValidationReport();
  }
}
