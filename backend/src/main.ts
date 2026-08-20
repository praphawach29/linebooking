import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './common/config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // 1. Fail-Fast Environment Schema Validation
  try {
    validateEnv(process.env as Record<string, unknown>);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 1.1 Body Parser Limit for Slip Uploads
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // 2. Helmet Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:'],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // 3. Strict CORS configuration
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3005,http://localhost:4000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, LINE webhooks, or server-to-server requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-line-signature'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  // 4. Global DTO Validation Pipe with Whitelist and Strict Type Conversion
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Backend is securely running on port ${port} — CORS Origins: ${allowedOrigins.join(', ')}`);
}
void bootstrap();
