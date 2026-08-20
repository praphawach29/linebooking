import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { BookingsModule } from './bookings/bookings.module';
import { MerchantModule } from './merchant/merchant.module';
import { MembershipsModule } from './memberships/memberships.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BillingModule } from './billing/billing.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuditModule } from './common/audit/audit.module';
import { HealthModule } from './health/health.module';
import { CorrelationLoggingMiddleware } from './common/middleware/correlation-logging.middleware';

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '') || 6379,
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 60,  // 60 requests per minute default
      },
    ]),
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    AuditModule,
    AuthModule,
    PrismaModule,
    ServicesModule,
    BookingsModule,
    MerchantModule,
    MembershipsModule,
    WebhooksModule,
    NotificationsModule,
    SupabaseModule,
    BillingModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationLoggingMiddleware).forRoutes('*');
  }
}
