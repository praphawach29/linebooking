import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import type { Service } from '../types';
import type { BookingApiResponse } from './booking-api';
import { mapBookingApiResponse } from './booking-mapper';

describe('Step 11 booking cutover', () => {
  it('maps backend-owned booking values into frontend state', () => {
    const response: BookingApiResponse = {
      id: '33333333-3333-4333-8333-333333333333',
      refNo: 'BK26080201',
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: '44444444-4444-4444-8444-444444444444',
      userName: 'Customer',
      userPhone: '0812345678',
      serviceId: '22222222-2222-4222-8222-222222222222',
      serviceName: 'Backend service snapshot',
      serviceDuration: 75,
      servicePrice: 650,
      staffId: null,
      staffName: null,
      bookingDate: '2026-08-10',
      startTime: '10:00',
      endTime: '11:15',
      status: 'pending',
      price: 650,
      discountAmount: 0,
      finalPrice: 650,
      depositAmount: 0,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      source: 'line_liff',
      notes: null,
      createdAt: '2026-08-02T00:00:00.000Z',
    };
    const service = {
      id: response.serviceId,
      name: 'Stale client service',
      durationMinutes: 30,
      price: 1,
    } as Service;

    const booking = mapBookingApiResponse(response, service);

    assert.equal(booking.serviceName, 'Backend service snapshot');
    assert.equal(booking.serviceDuration, 75);
    assert.equal(booking.servicePrice, 650);
    assert.equal(booking.endTime, '11:15');
    assert.equal(booking.price, 650);
    assert.equal(booking.paymentStatus, 'unpaid');
    assert.equal(booking.paymentMethod, undefined);
  });

  it('contains no direct Supabase booking insert in SaaSContext', async () => {
    const source = await readFile(
      new URL('../context/SaaSContext.tsx', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(source, /from\(['"]bookings['"]\)\s*\.insert/s);
    assert.match(source, /createCustomerBookingWithLiff/);
    assert.match(source, /createMerchantBookingWithSession/);
    assert.match(source, /getAvailableSlotsFromApi/);
  });
});
