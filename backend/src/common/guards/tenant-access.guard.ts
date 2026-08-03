import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppUser } from './supabase-auth.guard';
import { ErrorCode } from '../constants/error-codes';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TenantAccessGuard — Validates x-tenant-id header and verifies merchant user ownership/membership.
 * Attaches validated tenantId to req.tenantId.
 * Rejects customer and staff roles for merchant administration/billing. Only merchant_admin and platform_admin permitted.
 * Must be used after SupabaseAuthGuard.
 */
@Injectable()
export class TenantAccessGuard implements CanActivate {
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

    const user: AppUser | undefined = req.appUser;
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_REQUIRED,
        message: 'Authentication required before tenant access check',
      });
    }

    // Strictly reject customer and staff roles from merchant administration & billing
    if (user.role === 'customer' || user.role === 'staff') {
      throw new ForbiddenException({
        statusCode: 403,
        code: ErrorCode.TENANT_ACCESS_DENIED,
        message: 'Only merchant admins or platform admins are permitted to access merchant administration',
      });
    }

    if (user.role !== 'platform_admin') {
      if (!user.tenantIds || !user.tenantIds.includes(tenantId)) {
        throw new ForbiddenException({
          statusCode: 403,
          code: ErrorCode.TENANT_ACCESS_DENIED,
          message: 'Access denied for the specified tenant',
        });
      }
    }

    req.tenantId = tenantId;
    return true;
  }
}
