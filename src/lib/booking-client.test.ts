import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  createCustomerBookingWithLiff,
  createMerchantBookingWithSession,
} from './booking-client';
import { resetBookingAuthStateForTests } from './booking-auth';

const apiUrl = 'http://booking-api.test';
const tenantId = '11111111-1111-4111-8111-111111111111';
const serviceId = '22222222-2222-4222-8222-222222222222';

function response(source: string): Response {
  return new Response(
    JSON.stringify({
      id: '33333333-3333-4333-8333-333333333333',
      refNo: 'BK26080201',
      tenantId,
      userId: '44444444-4444-4444-8444-444444444444',
      userName: 'Customer',
      serviceId,
      bookingDate: '2026-08-10',
      startTime: '10:00',
      endTime: '11:00',
      status: 'pending',
      price: 500,
      discountAmount: 0,
      finalPrice: 500,
      paymentStatus: 'unpaid',
      source,
      createdAt: '2026-08-02T00:00:00.000Z',
    }),
    { status: 201 },
  );
}

describe('booking-client actor integration', () => {
  beforeEach(() => resetBookingAuthStateForTests());

  it('uses a LINE ID token for the customer endpoint', async () => {
    let path = '';
    let authorization = '';
    const fetcher: typeof fetch = async (url, init) => {
      path = new URL(String(url)).pathname;
      authorization = new Headers(init?.headers).get('Authorization') ?? '';
      return response('line_liff');
    };
    const liffClient = {
      init: async () => undefined,
      isLoggedIn: () => true,
      login: () => undefined,
      getIDToken: () => 'verified-line-id-token',
    };

    await createCustomerBookingWithLiff(
      { serviceId, bookingDate: '2026-08-10', startTime: '10:00' },
      {
        tenantId,
        liffId: '2001234567-AbCdEfGh',
        lineTokenOptions: { client: liffClient as never },
        apiUrl,
        fetcher,
      },
    );

    assert.equal(path, '/bookings');
    assert.equal(authorization, 'Bearer verified-line-id-token');
  });

  it('uses a Supabase access token for the merchant endpoint', async () => {
    let path = '';
    let authorization = '';
    const fetcher: typeof fetch = async (url, init) => {
      path = new URL(String(url)).pathname;
      authorization = new Headers(init?.headers).get('Authorization') ?? '';
      return response('admin');
    };

    await createMerchantBookingWithSession(
      {
        customerId: '44444444-4444-4444-8444-444444444444',
        serviceId,
        bookingDate: '2026-08-10',
        startTime: '10:00',
      },
      {
        tenantId,
        sessionProvider: async () => ({
          data: { session: { access_token: 'supabase-access-token' } },
          error: null,
        }),
        apiUrl,
        fetcher,
      },
    );

    assert.equal(path, '/bookings/merchant');
    assert.equal(authorization, 'Bearer supabase-access-token');
  });
});
