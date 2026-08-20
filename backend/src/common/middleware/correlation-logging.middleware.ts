import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CorrelationLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // 1. Extract or generate Request ID (Correlation ID)
    const incomingReqId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string);
    const requestId =
      incomingReqId && typeof incomingReqId === 'string' && incomingReqId.trim()
        ? incomingReqId.trim()
        : crypto.randomUUID();

    // Attach to request and response header
    (req as any).requestId = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    // 2. Hook on response finish to output structured log
    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Extract context IDs safely
      const tenantId =
        (req.headers['x-tenant-id'] as string) ||
        (req.query?.tenant as string) ||
        (req.body?.tenantId as string) ||
        (req as any).appUser?.tenantIds?.[0] ||
        null;

      const bookingId =
        req.params?.id ||
        req.params?.bookingId ||
        req.body?.bookingId ||
        (req.query?.bookingId as string) ||
        null;

      const deliveryId =
        req.params?.deliveryId ||
        req.body?.deliveryId ||
        (req.query?.deliveryId as string) ||
        null;

      const logPayload = {
        reqId: requestId,
        tenantId: tenantId || undefined,
        bookingId: bookingId || undefined,
        deliveryId: deliveryId || undefined,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode,
        durationMs,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const logString = JSON.stringify(logPayload);

      if (statusCode >= 500) {
        this.logger.error(`[HTTP] ${req.method} ${req.originalUrl} ${statusCode} +${durationMs}ms ${logString}`);
      } else if (statusCode >= 400) {
        this.logger.warn(`[HTTP] ${req.method} ${req.originalUrl} ${statusCode} +${durationMs}ms ${logString}`);
      } else {
        this.logger.log(`[HTTP] ${req.method} ${req.originalUrl} ${statusCode} +${durationMs}ms ${logString}`);
      }
    });

    next();
  }
}
