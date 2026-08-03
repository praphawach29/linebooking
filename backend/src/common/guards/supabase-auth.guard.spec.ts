import { ExecutionContext } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { ErrorCode } from '../constants/error-codes';

describe('SupabaseAuthGuard', () => {
  const assignedTenantId = '00000000-0000-4000-8000-000000000001';
  const ownedTenantId = '00000000-0000-4000-8000-000000000002';
  const request: {
    headers: Record<string, string>;
    appUser?: unknown;
  } = { headers: {} };
  const db = {
    selectOne: jest.fn(),
    select: jest.fn(),
  };
  const originalFetch = global.fetch;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalAnonKey = process.env.SUPABASE_ANON_KEY;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    request.headers = {};
    delete request.appUser;
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    guard = new SupabaseAuthGuard(db as unknown as SupabaseService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_ANON_KEY = originalAnonKey;
  });

  it('rejects requests without a Supabase access token', async () => {
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: ErrorCode.AUTH_REQUIRED,
      },
    });
  });

  it('rejects invalid or expired Supabase access tokens', async () => {
    request.headers.authorization = 'Bearer invalid-token';
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: ErrorCode.AUTH_INVALID,
      },
    });
  });

  it('rejects valid auth users that are not linked to an application user', async () => {
    request.headers.authorization = 'Bearer valid-unlinked-token';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'auth-user-id',
        email: 'merchant@example.com',
      }),
    });
    db.selectOne.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: ErrorCode.AUTH_USER_NOT_LINKED,
      },
    });
  });

  it('attaches a verified merchant and all accessible tenant IDs', async () => {
    request.headers.authorization = 'Bearer valid-merchant-token';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'auth-user-id',
        email: 'merchant@example.com',
      }),
    });
    db.selectOne.mockResolvedValue({
      id: 'db-user-id',
      role: 'merchant_admin',
      tenant_id: assignedTenantId,
      email: 'merchant@example.com',
    });
    db.select.mockResolvedValue([{ id: ownedTenantId }]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.appUser).toEqual({
      authUserId: 'auth-user-id',
      dbUserId: 'db-user-id',
      email: 'merchant@example.com',
      role: 'merchant_admin',
      tenantIds: [assignedTenantId, ownedTenantId],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://project-ref.supabase.co/auth/v1/user',
      {
        headers: {
          Authorization: 'Bearer valid-merchant-token',
          apikey: 'test-anon-key',
        },
      },
    );
  });
});
