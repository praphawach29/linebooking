import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '../constants/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = exceptionResponse.message || message;
        code = exceptionResponse.code || this.mapStatusToErrorCode(status, exceptionResponse);
        details = exceptionResponse.details || (Array.isArray(exceptionResponse.message) ? exceptionResponse.message : null);

        if (Array.isArray(exceptionResponse.message)) {
          message = 'Validation failed';
          code = ErrorCode.VALIDATION_FAILED;
        }
      }
    } else {
      this.logger.error('Unhandled Exception:', exception);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      details,
    });
  }

  private mapStatusToErrorCode(status: number, exceptionResponse: any): string {
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
