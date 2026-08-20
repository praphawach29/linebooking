import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId =
      (request as any)?.requestId ||
      (request.headers?.['x-request-id'] as string) ||
      null;

    const tenantId =
      (request.headers?.['x-tenant-id'] as string) ||
      (request.query?.tenant as string) ||
      (request as any)?.appUser?.tenantIds?.[0] ||
      null;

    const bookingId =
      request.params?.id ||
      request.params?.bookingId ||
      request.body?.bookingId ||
      null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.mapStatusToErrorCode(status, null);
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = exceptionResponse.message || message;
        code =
          exceptionResponse.code ||
          this.mapStatusToErrorCode(status, exceptionResponse);
        details =
          exceptionResponse.details ||
          (Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message
            : null);

        if (Array.isArray(exceptionResponse.message)) {
          message = 'Validation failed';
          code = ErrorCode.VALIDATION_FAILED;
        }
      }
    } else {
      const errorObj = exception instanceof Error ? exception : new Error(String(exception));
      const structuredError = {
        reqId: requestId,
        tenantId,
        bookingId,
        url: request.originalUrl || request.url,
        method: request.method,
        error: errorObj.message,
        stack: errorObj.stack,
      };
      this.logger.error(
        `[500_UNHANDLED_EXCEPTION] ${JSON.stringify(structuredError)}`,
        errorObj.stack,
      );

      // Report to Sentry if global Sentry is initialized
      const globalSentry = (global as any).__SENTRY__;
      if (globalSentry?.hub) {
        try {
          const Sentry = require('@sentry/node');
          Sentry.withScope((scope: any) => {
            if (requestId) scope.setTag('requestId', requestId);
            if (tenantId) scope.setTag('tenantId', tenantId);
            if (bookingId) scope.setTag('bookingId', bookingId);
            Sentry.captureException(errorObj);
          });
        } catch {
          // Graceful fallback if @sentry/node is not installed or initialized
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      details,
      requestId: requestId || undefined,
      timestamp: new Date().toISOString(),
    });
  }

  private mapStatusToErrorCode(
    status: number,
    exceptionResponse: any,
  ): string {
    if (exceptionResponse?.code) return exceptionResponse.code;
    const statusCodeMap: Partial<Record<number, string>> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_REQUIRED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
    };
    return statusCodeMap[status] || ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
