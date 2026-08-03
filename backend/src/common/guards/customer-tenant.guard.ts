import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CustomerTenantGuard — Validates x-tenant-id header for customer/LIFF endpoints.
 * Does not enforce merchant auth or membership, but validates presence and UUID format.
 * Attaches validated tenantId to req.tenantId.
 */
@Injectable()
export class CustomerTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const rawHeader = req.headers['x-tenant-id'];

    if (!rawHeader) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_REQUIRED,
        message: 'x-tenant-id header is required',
      });
    }

    if (Array.isArray(rawHeader)) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_INVALID,
        message: 'Ambiguous multiple x-tenant-id headers provided',
      });
    }

    const tenantId = (rawHeader as string).trim();

    if (!UUID_REGEX.test(tenantId)) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_INVALID,
        message: 'x-tenant-id header must be a valid UUID',
      });
    }

    req.tenantId = tenantId;
    return true;
  }
}
