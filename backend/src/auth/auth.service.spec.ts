import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService merchant onboarding', () => {
  const authUserId = '11111111-1111-4111-8111-111111111111';
  const tenantId = '22222222-2222-4222-8222-222222222222';
  const originalFetch = global.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalAnonKey = process.env.SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: authUserId, email: 'owner@example.com' }),
        { status: 200 },
      ),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_ANON_KEY = originalAnonKey;
    jest.restoreAllMocks();
  });

  it('creates the user, tenant, and owner link in one transaction', async () => {
    const createdUser = {
      id: authUserId,
      auth_user_id: authUserId,
      tenant_id: null,
      displayName: 'Owner',
      email: 'owner@example.com',
      phone: '0812345678',
      role: 'merchant_admin',
    };
    const linkedUser = { ...createdUser, tenant_id: tenantId };
    const tenant = {
      id: tenantId,
      name: 'Booking Shop',
      slug: 'booking-shop-test',
      businessType: 'spa',
    };
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdUser),
        update: jest.fn().mockResolvedValue(linkedUser),
      },
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(tenant),
      },
      businessHours: {
        createMany: jest.fn().mockResolvedValue({ count: 7 }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new AuthService(prisma as never, {} as never, {} as never);

    const result = await service.onboardMerchant('Bearer valid-token', {
      displayName: 'Owner',
      shopName: 'Booking Shop',
      businessType: 'spa',
      phone: '0812345678',
    });

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: authUserId,
        auth_user_id: authUserId,
        email: 'owner@example.com',
        role: 'merchant_admin',
      }),
    });
    expect(tx.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ owner_user_id: authUserId }),
      }),
    );
    expect(tx.businessHours.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          tenantId,
          dayOfWeek: 6,
          isOpen: true,
        }),
      ]),
    });
    expect(tx.businessHours.createMany.mock.calls[0][0].data).toHaveLength(7);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: authUserId },
      data: { tenant_id: tenantId },
    });
    expect(result.user).toMatchObject({
      id: authUserId,
      role: 'merchant_admin',
      tenantId,
    });
  });

  it('enables court selection by default for a "sports" business type', async () => {
    const createdUser = {
      id: authUserId,
      auth_user_id: authUserId,
      tenant_id: null,
      displayName: 'Owner',
      email: 'owner@example.com',
      role: 'merchant_admin',
    };
    const linkedUser = { ...createdUser, tenant_id: tenantId };
    const tenant = {
      id: tenantId,
      name: 'JackSports',
      slug: 'jacksports',
      businessType: 'sports',
    };
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdUser),
        update: jest.fn().mockResolvedValue(linkedUser),
      },
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(tenant),
      },
      businessHours: {
        createMany: jest.fn().mockResolvedValue({ count: 7 }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new AuthService(prisma as never, {} as never, {} as never);

    await service.onboardMerchant('Bearer valid-token', {
      displayName: 'Owner',
      shopName: 'JackSports',
      businessType: 'sports',
      phone: '0812345678',
    });

    expect(tx.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          settings: expect.objectContaining({ enableCourtSelection: true }),
        }),
      }),
    );
  });

  it('does not enable court selection for a non-venue business type', async () => {
    const createdUser = {
      id: authUserId,
      auth_user_id: authUserId,
      tenant_id: null,
      displayName: 'Owner',
      email: 'owner@example.com',
      role: 'merchant_admin',
    };
    const linkedUser = { ...createdUser, tenant_id: tenantId };
    const tenant = {
      id: tenantId,
      name: 'Booking Shop',
      slug: 'booking-shop-test',
      businessType: 'spa',
    };
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdUser),
        update: jest.fn().mockResolvedValue(linkedUser),
      },
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(tenant),
      },
      businessHours: {
        createMany: jest.fn().mockResolvedValue({ count: 7 }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new AuthService(prisma as never, {} as never, {} as never);

    await service.onboardMerchant('Bearer valid-token', {
      displayName: 'Owner',
      shopName: 'Booking Shop',
      businessType: 'spa',
      phone: '0812345678',
    });

    const settingsArg = tx.tenant.create.mock.calls[0][0].data.settings;
    expect(settingsArg.enableCourtSelection).toBeUndefined();
  });

  it('returns the existing tenant without creating a second shop', async () => {
    const user = {
      id: authUserId,
      auth_user_id: authUserId,
      tenant_id: tenantId,
      displayName: 'Owner',
      email: 'owner@example.com',
      role: 'merchant_admin',
    };
    const tenant = {
      id: tenantId,
      name: 'Existing Shop',
      slug: 'existing-shop',
      businessType: 'spa',
    };
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(user),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue(tenant),
        create: jest.fn(),
      },
      businessHours: { createMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new AuthService(prisma as never, {} as never, {} as never);

    const result = await service.onboardMerchant('Bearer valid-token', {
      displayName: 'Changed Name',
      shopName: 'Another Shop',
      businessType: 'other',
    });

    expect(result.tenant.id).toBe(tenantId);
    expect(tx.tenant.create).not.toHaveBeenCalled();
    expect(tx.businessHours.createMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects a request without a Supabase access token', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new AuthService(prisma as never, {} as never, {} as never);

    await expect(
      service.onboardMerchant('', {
        displayName: 'Owner',
        shopName: 'Shop',
        businessType: 'spa',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
