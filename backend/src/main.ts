import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Frontend คุยข้ามพอร์ต (Vite 3005/4000 → Nest 3000) จึงต้องเปิด CORS
  // ตั้ง CORS_ORIGINS ใน .env เป็นรายการโดเมนคั่นด้วย comma ตอนขึ้น production
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3005,http://localhost:4000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  // DTO ทุกตัวใช้ class-validator อยู่แล้ว แต่จะทำงานก็ต่อเมื่อมี pipe ตัวนี้
  //   whitelist            = ตัด field ที่ไม่ได้ประกาศใน DTO ทิ้ง (กันยัด field แปลกปลอม)
  //   forbidNonWhitelisted = เจอ field แปลกปลอมให้ตอบ error ไปเลย
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
  new Logger('Bootstrap').log(`Backend พร้อมใช้งานที่ port ${port} — CORS: ${origins.join(', ')}`);
}
bootstrap();
