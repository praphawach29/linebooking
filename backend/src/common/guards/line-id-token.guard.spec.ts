import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LineIdTokenGuard } from './line-id-token.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { LineIdentityService } from '../../auth/line-identity.service';
import { ErrorCode } from '../constants/error-codes';

describe('LineIdTokenGuard', () => {
  let guard: LineIdTokenGuard;
  let prisma: any;
  let lineIdentityService: any;

  const validTenantId = '00000000-0000-0000-0000-000000000001';
  const validSub = 'U12345678901234567890123456789012';

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockLineIdentityService = {
    verifyIdToken: jest.fn(),
    resolveOrCreateCustomer: jest.fn(),
  };

  const createMockContext = (headers: Record<string, any>): any => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineIdTokenGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LineIdentityService, useValue: mockLineIdentityService },
      ],
    }).compile();

    guard = module.get<LineIdTokenGuard>(LineIdTokenGuard);
    prisma = module.get<PrismaService>(PrismaService);
    lineIdentityService = module.get<LineIdentityService>(LineIdentityService);
  });

  it('should throw TENANT_ID_REQUIRED if x-tenant-id header is missing', async () => {
    const context = createMockContext({});
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getResponse().code).toBe(ErrorCode.TENANT_ID_REQUIRED);
    }
  });

  it('should throw TENANT_ID_INVALID if x-tenant-id is not a valid UUID', async () => {
    const context = createMockContext({ 'x-tenant-id': 'not-a-uuid' });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getResponse().code).toBe(ErrorCode.TENANT_ID_INVALID);
    }
  });

  it('should throw TENANT_NOT_FOUND if tenant does not exist in DB', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce(null);
    const context = createMockContext({ 'x-tenant-id': validTenantId });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.getResponse().code).toBe(ErrorCode.TENANT_NOT_FOUND);
    }
  });

  it('should throw TENANT_INACTIVE if tenant isActive is false', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: validTenantId,
      isActive: false,
      lineChannelId: '123456',
    });
    const context = createMockContext({ 'x-tenant-id': validTenantId });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(ErrorCode.TENANT_INACTIVE);
    }
  });

  it('should throw TENANT_INACTIVE if tenant isActive is null', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: validTenantId,
      isActive: null,
      lineChannelId: '123456',
    });
    const context = createMockContext({ 'x-tenant-id': validTenantId });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(ErrorCode.TENANT_INACTIVE);
    }
  });

  it('should throw TENANT_LINE_NOT_CONFIGURED if tenant has no lineChannelId and no liffId', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: validTenantId,
      isActive: true,
      lineChannelId: null,
      liffId: null,
    });
    const context = createMockContext({ 'x-tenant-id': validTenantId });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getResponse().code).toBe(ErrorCode.TENANT_LINE_NOT_CONFIGURED);
    }
  });

  it('should derive channelId from liffId prefix if lineChannelId is null', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: validTenantId,
      isActive: true,
      lineChannelId: null,
      liffId: '2006123456-AbCdEfGh',
    });

    mockLineIdentityService.verifyIdToken.mockResolvedValueOnce({
      lineUserId: validSub,
      name: 'Derived User',
    });
    mockLineIdentityService.resolveOrCreateCustomer.mockResolvedValueOnce({ id: 'u-derived' });

    const req: any = {
      headers: {
        'x-tenant-id': validTenantId,
        authorization: 'Bearer valid_token',
      },
    };
    const context = { switchToHttp: () => ({ getRequest: () => req }) };

    const res = await guard.canActivate(context as any);
    expect(res).toBe(true);
    expect(mockLineIdentityService.verifyIdToken).toHaveBeenCalledWith('valid_token', '2006123456');
  });

  it('should throw AUTH_REQUIRED if Authorization Bearer token is missing', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: validTenantId,
      isActive: true,
      lineChannelId: '1234567890',
    });
    const context = createMockContext({ 'x-tenant-id': validTenantId });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.getResponse().code).toBe(ErrorCode.AUTH_REQUIRED);
    }
  });

  it('should verify token with tenant lineChannelId and attach customerUser to request', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({
      id: validTenantId,
      isActive: true,
      lineChannelId: '1234567890',
    });

    mockLineIdentityService.verifyIdToken.mockResolvedValueOnce({
      lineUserId: validSub,
      name: 'Bob',
    });

    const mockCustomerUser = { id: 'usr-1', lineUserId: validSub, role: 'customer' };
    mockLineIdentityService.resolveOrCreateCustomer.mockResolvedValueOnce(mockCustomerUser);

    const req: any = {
      headers: {
        'x-tenant-id': validTenantId,
        authorization: 'Bearer valid_id_token',
      },
    };

    const context: any = {
      switchToHttp: () => ({ getRequest: () => req }),
    };

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockLineIdentityService.verifyIdToken).toHaveBeenCalledWith(
      'valid_id_token',
      '1234567890',
    );
    expect(mockLineIdentityService.resolveOrCreateCustomer).toHaveBeenCalledWith(
      validTenantId,
      validSub,
      { lineUserId: validSub, name: 'Bob' },
    );
    expect(req.tenantId).toBe(validTenantId);
    expect(req.customerUser).toBe(mockCustomerUser);
    expect(req.lineUserId).toBe(validSub);
  });
});
