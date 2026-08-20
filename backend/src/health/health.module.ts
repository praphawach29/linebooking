import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PilotMetricsController } from './pilot-metrics.controller';
import { PilotMetricsService } from './pilot-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.types';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  controllers: [HealthController, PilotMetricsController],
  providers: [HealthService, PilotMetricsService],
  exports: [HealthService, PilotMetricsService],
})
export class HealthModule {}
