import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_REQUIRED,
        message: 'x-tenant-id is missing from request',
      });
    }

    return tenantId;
  },
);
