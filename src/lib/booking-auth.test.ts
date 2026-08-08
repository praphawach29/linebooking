import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  BookingAuthError,
  getCleanLiffRedirectUri,
  getLiffProfile,
  getLineIdToken,
  getMerchantAccessToken,
  isLineIdTokenSessionValid,
  resetBookingAuthStateForTests,
} from './booking-auth';

describe('booking-auth', () => {
  beforeEach(() => resetBookingAuthStateForTests());

  it('initializes LIFF and returns its ID token', async () => {
    let initCalls = 0;
    const client = {
      init: async ({ liffId }: { liffId: string }) => {
        initCalls += 1;
        assert.equal(liffId, '2001234567-AbCdEfGh');
      },
      isLoggedIn: () => true,
      login: () => undefined,
      logout: () => undefined,
      getIDToken: () => 'line-id-token',
      getDecodedIDToken: () => ({
        aud: '2001234567',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    const first = await getLineIdToken('2001234567-AbCdEfGh', {
      client: client as never,
    });
    const second = await getLineIdToken('2001234567-AbCdEfGh', {
      client: client as never,
    });

    assert.equal(first, 'line-id-token');
    assert.equal(second, 'line-id-token');
    assert.equal(initCalls, 1);
  });

  it('starts LIFF login without using the merchant login path', async () => {
    let redirectUri = '';
    const client = {
      init: async () => undefined,
      isLoggedIn: () => false,
      login: (options: { redirectUri?: string }) => {
        redirectUri = options.redirectUri ?? '';
      },
      logout: () => undefined,
      getIDToken: () => null,
      getDecodedIDToken: () => null,
    };

    await assert.rejects(
      getLineIdToken('2001234567-AbCdEfGh', {
        client: client as never,
        redirectUri: 'https://liff.example.test/booking',
      }),
      (error: unknown) => {
        assert.ok(error instanceof BookingAuthError);
        assert.equal(error.code, 'LIFF_LOGIN_REDIRECT_STARTED');
        assert.equal(error.reauthenticationAction, 'liff_login');
        return true;
      },
    );
    assert.equal(redirectUri, 'https://liff.example.test/booking');
  });

  it('rejects a logged-in LIFF session without an ID token', async () => {
    const client = {
      init: async () => undefined,
      isLoggedIn: () => true,
      login: () => undefined,
      logout: () => undefined,
      getIDToken: () => null,
      getDecodedIDToken: () => null,
      getProfile: async () => ({ userId: 'U123', displayName: 'Test' }),
    };

    await assert.rejects(
      getLineIdToken('2001234567-AbCdEfGh', { client: client as never }),
      (error: unknown) => {
        assert.ok(error instanceof BookingAuthError);
        assert.equal(error.code, 'LINE_ID_TOKEN_UNAVAILABLE');
        return true;
      },
    );
  });

  it('fetches LIFF profile when logged in', async () => {
    const client = {
      init: async () => undefined,
      isLoggedIn: () => true,
      login: () => undefined,
      logout: () => undefined,
      getIDToken: () => 'token',
      getDecodedIDToken: () => ({
        aud: '2001234567',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      getProfile: async () => ({
        userId: 'U123456789',
        displayName: 'Jack Sports User',
        pictureUrl: 'https://example.com/avatar.jpg',
        statusMessage: 'Ready to play',
      }),
    };

    const profile = await getLiffProfile('2001234567-AbCdEfGh', {
      client: client as never,
    });
    assert.equal(profile.userId, 'U123456789');
    assert.equal(profile.displayName, 'Jack Sports User');
    assert.equal(profile.pictureUrl, 'https://example.com/avatar.jpg');
  });

  it('removes LINE OAuth callback parameters from the login redirect', () => {
    assert.equal(
      getCleanLiffRedirectUri(
        'https://booking.example/liff?shop=jack&code=old&state=stale&liffClientId=2001234567&liffRedirectUri=old',
      ),
      'https://booking.example/liff?shop=jack',
    );
  });

  it('rejects expired tokens and tokens issued for another LIFF channel', () => {
    assert.equal(
      isLineIdTokenSessionValid(
        '2001234567-AbCdEfGh',
        { aud: '2001234567', exp: 2000 },
        1000,
      ),
      true,
    );
    assert.equal(
      isLineIdTokenSessionValid(
        '2001234567-AbCdEfGh',
        { aud: '9999999999', exp: 2000 },
        1000,
      ),
      false,
    );
    assert.equal(
      isLineIdTokenSessionValid(
        '2001234567-AbCdEfGh',
        { aud: '2001234567', exp: 1020 },
        1000,
      ),
      false,
    );
  });

  it('logs out and starts a clean login when the token is stale', async () => {
    let logoutCalls = 0;
    let loginCalls = 0;
    const client = {
      init: async () => undefined,
      isLoggedIn: () => true,
      login: () => {
        loginCalls += 1;
      },
      logout: () => {
        logoutCalls += 1;
      },
      getIDToken: () => 'expired-token',
      getDecodedIDToken: () => ({ aud: '2001234567', exp: 1 }),
    };

    await assert.rejects(
      getLineIdToken('2001234567-AbCdEfGh', { client: client as never }),
      (error: unknown) => {
        assert.ok(error instanceof BookingAuthError);
        assert.equal(error.code, 'LIFF_LOGIN_REDIRECT_STARTED');
        return true;
      },
    );
    assert.equal(logoutCalls, 1);
    assert.equal(loginCalls, 1);
  });

  it('returns the Supabase merchant session access token', async () => {
    const token = await getMerchantAccessToken(async () => ({
      data: { session: { access_token: 'supabase-access-token' } },
      error: null,
    }));
    assert.equal(token, 'supabase-access-token');
  });

  it('requires merchant sign-in when the Supabase session is absent', async () => {
    await assert.rejects(
      getMerchantAccessToken(async () => ({
        data: { session: null },
        error: null,
      })),
      (error: unknown) => {
        assert.ok(error instanceof BookingAuthError);
        assert.equal(error.code, 'MERCHANT_AUTH_REQUIRED');
        assert.equal(error.reauthenticationAction, 'merchant_login');
        return true;
      },
    );
  });
});
