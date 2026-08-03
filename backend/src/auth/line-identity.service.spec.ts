import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { LineIdentityService, getLineChannelIdFromTenant } from './line-identity.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';

describe('LineIdentityService', () => {
  let service: LineIdentityService;
  let prisma: any;

  const mockPrismaService = {
    user: {
      upsert: jest.fn(),
    },
    membership: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineIdentityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LineIdentityService>(LineIdentityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getLineChannelIdFromTenant', () => {
    it('should prefer lineChannelId if configured', () => {
      const channelId = getLineChannelIdFromTenant({
        lineChannelId: '2006123456',
        liffId: '2009999999-AbCdEfGh',
      });
      expect(channelId).toBe('2006123456');
    });

    it('should derive channelId from liffId prefix if lineChannelId is missing', () => {
      const channelId = getLineChannelIdFromTenant({
        lineChannelId: null,
        liffId: '2006123456-AbCdEfGh',
      });
      expect(channelId).toBe('2006123456');
    });

    it('should return null if neither is available', () => {
      const channelId = getLineChannelIdFromTenant({
        lineChannelId: null,
        liffId: null,
      });
      expect(channelId).toBeNull();
    });
  });

  describe('verifyIdToken', () => {
    it('should reject forged mock token at runtime', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid Token',
      });

      try {
        await service.verifyIdToken('mock_token_U12345678901234567890123456789012', '1234567890');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.getResponse().code).toBe(ErrorCode.AUTH_INVALID);
      }
    });

    it('should throw TENANT_LINE_NOT_CONFIGURED when channelId is missing', async () => {
      try {
        await service.verifyIdToken('some_valid_token', '');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe(ErrorCode.TENANT_LINE_NOT_CONFIGURED);
      }
    });

    it('should throw AUTH_INVALID when LINE token verification returns 400 (e.g. wrong audience/expired)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid ID token (client_id mismatch)',
      });

      try {
        await service.verifyIdToken('invalid_token', '1234567890');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.getResponse().code).toBe(ErrorCode.AUTH_INVALID);
      }
    });

    it('should throw AUTH_PROVIDER_UNAVAILABLE (503) when request times out or fetch aborts', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      try {
        await service.verifyIdToken('some_token', '1234567890');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        expect(err.getResponse().code).toBe(ErrorCode.AUTH_PROVIDER_UNAVAILABLE);
      }
    });

    it('should throw AUTH_PROVIDER_UNAVAILABLE (503) when LINE API returns 500 or 503', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });

      try {
        await service.verifyIdToken('some_token', '1234567890');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        expect(err.getResponse().code).toBe(ErrorCode.AUTH_PROVIDER_UNAVAILABLE);
      }
    });

    it('should throw AUTH_INVALID if response sub has invalid LINE User ID format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'INVALID_SUB_FORMAT', name: 'Test' }),
      });

      try {
        await service.verifyIdToken('some_token', '1234567890');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.getResponse().code).toBe(ErrorCode.AUTH_INVALID);
      }
    });

    it('should successfully verify token and return verified profile when LINE API responds 200', async () => {
      const validSub = 'U12345678901234567890123456789012';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: validSub, name: 'Alice', picture: 'http://pic.jpg' }),
      });

      const res = await service.verifyIdToken('valid_token', '1234567890');
      expect(res).toEqual({
        lineUserId: validSub,
        name: 'Alice',
        picture: 'http://pic.jpg',
      });
    });
  });

  describe('resolveOrCreateCustomer', () => {
    const validSub = 'U12345678901234567890123456789012';
    const tenantId = '00000000-0000-0000-0000-000000000001';

    it('should create customer without tenant_id on user record and create membership', async () => {
      const mockCreatedUser = {
        id: 'user-uuid-1',
        lineUserId: validSub,
        displayName: 'Alice',
        role: 'customer',
        tenant_id: null,
      };

      prisma.user.upsert.mockResolvedValueOnce(mockCreatedUser);
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'membership-uuid-1' });

      const user = await service.resolveOrCreateCustomer(tenantId, validSub, { name: 'Alice' });

      expect(user.tenant_id).toBeNull();
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { lineUserId: validSub },
        update: { displayName: 'Alice' },
        create: {
          lineUserId: validSub,
          displayName: 'Alice',
          avatarUrl: undefined,
          role: 'customer',
        },
      });

      expect(prisma.membership.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_userId: {
            tenantId,
            userId: 'user-uuid-1',
          },
        },
        update: {},
        create: {
          tenantId,
          userId: 'user-uuid-1',
          tier: 'bronze',
          points: 0,
          totalPointsEarned: 0,
        },
      });
    });

    it('should NOT downgrade role if user is an existing merchant_admin', async () => {
      const mockExistingAdmin = {
        id: 'admin-uuid-1',
        lineUserId: validSub,
        displayName: 'Admin User',
        role: 'merchant_admin',
        tenant_id: tenantId,
      };

      prisma.user.upsert.mockResolvedValueOnce(mockExistingAdmin);
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'mem-1' });

      const user = await service.resolveOrCreateCustomer(tenantId, validSub, { name: 'New Name' });

      expect(user.role).toBe('merchant_admin');
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lineUserId: validSub },
          update: { displayName: 'New Name' },
        }),
      );
      const updateArg = prisma.user.upsert.mock.calls[0][0].update;
      expect(updateArg.role).toBeUndefined();
    });

    it('should handle race-safe concurrent logins safely', async () => {
      const mockUser = { id: 'u-1', lineUserId: validSub, role: 'customer' };
      prisma.user.upsert.mockResolvedValue(mockUser);
      prisma.membership.upsert.mockResolvedValue({ id: 'm-1' });

      const [user1, user2] = await Promise.all([
        service.resolveOrCreateCustomer(tenantId, validSub, { name: 'A' }),
        service.resolveOrCreateCustomer(tenantId, validSub, { name: 'A' }),
      ]);

      expect(user1.id).toBe('u-1');
      expect(user2.id).toBe('u-1');
      expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
