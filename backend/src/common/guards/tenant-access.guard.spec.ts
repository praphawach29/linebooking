import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantAccessGuard } from './tenant-access.guard';
import { ErrorCode } from '../constants/error-codes';

describe('TenantAccessGuard', () => {
  let guard: TenantAccessGuard;
  const validTenantId = '00000000-0000-0000-0000-000000000001';

  const createMockContext = (headers: Record<string, any>, appUser?: any): any => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        appUser,
      }),
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantAccessGuard],
    }).compile();

    guard = module.get<TenantAccessGuard>(TenantAccessGuard);
  });

  it('should throw TENANT_ID_REQUIRED if x-tenant-id header is missing', () => {
    const context = createMockContext({});
    let error: any;
    try {
      guard.canActivate(context);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse().code).toBe(ErrorCode.TENANT_ID_REQUIRED);
  });

  it('should throw AUTH_REQUIRED if appUser is missing', () => {
    const context = createMockContext({ 'x-tenant-id': validTenantId }, undefined);
    let error: any;
    try {
      guard.canActivate(context);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.getResponse().code).toBe(ErrorCode.AUTH_REQUIRED);
  });

  it('should reject customer role with TENANT_ACCESS_DENIED', () => {
    const context = createMockContext({ 'x-tenant-id': validTenantId }, {
      role: 'customer',
      tenantIds: [validTenantId],
    });
    let error: any;
    try {
      guard.canActivate(context);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse().code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
  });

  it('should reject staff role from merchant administration with TENANT_ACCESS_DENIED', () => {
    const context = createMockContext({ 'x-tenant-id': validTenantId }, {
      role: 'staff',
      tenantIds: [validTenantId],
    });
    let error: any;
    try {
      guard.canActivate(context);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse().code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
  });

  it('should allow merchant_admin who owns/belongs to tenant', () => {
    const context = createMockContext({ 'x-tenant-id': validTenantId }, {
      role: 'merchant_admin',
      tenantIds: [validTenantId],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow platform_admin for any valid x-tenant-id header', () => {
    const context = createMockContext({ 'x-tenant-id': validTenantId }, {
      role: 'platform_admin',
      tenantIds: [],
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
