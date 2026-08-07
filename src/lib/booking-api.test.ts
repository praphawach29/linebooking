import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BookingApiError,
  createCustomerBooking,
  createMerchantBooking,
  getCustomerBookings,
  getAvailableSlots,
} from './booking-api';

const apiUrl = 'http://booking-api.test';
const tenantId = '11111111-1111-4111-8111-111111111111';
const serviceId = '22222222-2222-4222-8222-222222222222';

const bookingResponse = {
  id: '33333333-3333-4333-8333-333333333333',
  refNo: 'BK26080201',
  tenantId,
  userId: '44444444-4444-4444-8444-444444444444',
  userName: 'Customer',
  userPhone: '0812345678',
  serviceId,
  serviceName: 'Haircut',
  staffId: null,
  staffName: null,
  bookingDate: '2026-08-10',
  startTime: '10:00',
  endTime: '11:00',
  status: 'pending',
  price: 500,
  discountAmount: 0,
  finalPrice: 500,
  paymentStatus: 'unpaid',
  source: 'line_liff',
  notes: null,
  createdAt: '2026-08-02T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('booking-api', () => {
  it('loads customer history with tenant and LINE authorization headers', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return jsonResponse([]);
    };

    await getCustomerBookings({
      tenantId,
      accessToken: 'line-id-token',
      apiUrl,
      fetcher,
    });

    assert.equal(capturedUrl, `${apiUrl}/bookings/mine`);
    assert.equal(capturedInit?.method, 'GET');
    assert.equal(
      new Headers(capturedInit?.headers).get('Authorization'),
      'Bearer line-id-token',
    );
    assert.equal(new Headers(capturedInit?.headers).get('x-tenant-id'), tenantId);
  });

  it('sends a customer request with the LINE token, tenant header and whitelisted camelCase body', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return jsonResponse(bookingResponse, 201);
    };

    const result = await createCustomerBooking(
      {
        serviceId,
        bookingDate: '2026-08-10',
        startTime: '10:00',
        customerName: 'Customer',
        customerPhone: '0812345678',
        price: 1,
        endTime: '00:01',
        status: 'confirmed',
      } as never,
      { tenantId, accessToken: 'line-id-token', apiUrl, fetcher },
    );

    assert.equal(capturedUrl, `${apiUrl}/bookings`);
    assert.equal(new Headers(capturedInit?.headers).get('Authorization'), 'Bearer line-id-token');
    assert.equal(new Headers(capturedInit?.headers).get('x-tenant-id'), tenantId);
    assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
      serviceId,
      bookingDate: '2026-08-10',
      startTime: '10:00',
      customerName: 'Customer',
      customerPhone: '0812345678',
    });
    assert.deepEqual(result, bookingResponse);
  });

  it('uses the merchant endpoint and includes customerId', async () => {
    let capturedUrl = '';
    let capturedBody: unknown;
    const fetcher: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse({ ...bookingResponse, source: 'admin' }, 201);
    };

    await createMerchantBooking(
      {
        customerId: bookingResponse.userId,
        serviceId,
        staffId: '55555555-5555-4555-8555-555555555555',
        bookingDate: '2026-08-10',
        startTime: '10:00',
      },
      { tenantId, accessToken: 'supabase-access-token', apiUrl, fetcher },
    );

    assert.equal(capturedUrl, `${apiUrl}/bookings/merchant`);
    assert.deepEqual(capturedBody, {
      customerId: bookingResponse.userId,
      serviceId,
      bookingDate: '2026-08-10',
      startTime: '10:00',
      staffId: '55555555-5555-4555-8555-555555555555',
    });
  });

  it('sends the tenant header when fetching availability', async () => {
    let capturedHeaders: Headers | undefined;
    const fetcher: typeof fetch = async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return jsonResponse({
        bookingDate: '2026-08-10',
        timezone: 'Asia/Bangkok',
        slotIntervalMinutes: 30,
        slots: [],
      });
    };

    await getAvailableSlots(
      tenantId,
      { serviceId, bookingDate: '2026-08-10' },
      { apiUrl, fetcher },
    );
    assert.equal(capturedHeaders?.get('x-tenant-id'), tenantId);
  });

  it('returns the same promise and sends one request for duplicate in-flight creates', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });
    };
    const input = {
      serviceId,
      bookingDate: '2026-08-11',
      startTime: '10:00',
    };
    const options = { tenantId, accessToken: 'token', apiUrl, fetcher };

    const first = createCustomerBooking(input, options);
    const second = createCustomerBooking(input, options);
    assert.equal(first, second);
    assert.equal(calls, 1);

    resolveResponse?.(jsonResponse(bookingResponse, 201));
    await Promise.all([first, second]);
  });

  for (const [status, kind] of [
    [400, 'validation'],
    [401, 'authentication'],
    [403, 'authorization'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'unprocessable'],
    [500, 'server'],
  ] as const) {
    it(`classifies HTTP ${status} as ${kind}`, async () => {
      const fetcher: typeof fetch = async () =>
        jsonResponse(
          {
            statusCode: status,
            code: status === 409 ? 'BOOKING_SLOT_UNAVAILABLE' : `ERROR_${status}`,
            message: 'Request failed',
            details: { field: 'value' },
          },
          status,
        );

      await assert.rejects(
        createCustomerBooking(
          {
            serviceId,
            bookingDate: `2026-08-${String(status % 20 + 10).padStart(2, '0')}`,
            startTime: '10:00',
          },
          { tenantId, accessToken: 'token', apiUrl, fetcher },
        ),
        (error: unknown) => {
          assert.ok(error instanceof BookingApiError);
          assert.equal(error.statusCode, status);
          assert.equal(error.kind, kind);
          if (status === 401) {
            assert.equal(error.reauthenticationAction, 'liff_login');
          }
          if (status === 409) {
            assert.equal(error.code, 'BOOKING_SLOT_UNAVAILABLE');
          }
          return true;
        },
      );
    });
  }

  it('marks merchant 401 errors for merchant reauthentication', async () => {
    const fetcher: typeof fetch = async () =>
      jsonResponse({ code: 'AUTH_REQUIRED', message: 'Sign in' }, 401);

    await assert.rejects(
      createMerchantBooking(
        {
          customerId: bookingResponse.userId,
          serviceId,
          bookingDate: '2026-08-29',
          startTime: '10:00',
        },
        { tenantId, accessToken: 'expired', apiUrl, fetcher },
      ),
      (error: unknown) => {
        assert.ok(error instanceof BookingApiError);
        assert.equal(error.reauthenticationAction, 'merchant_login');
        return true;
      },
    );
  });
});
