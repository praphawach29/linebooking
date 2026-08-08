import assert from 'node:assert/strict';
import test from 'node:test';
import { BookingApiError } from './booking-api';
import { BookingAuthError } from './booking-auth';
import { getBookingSubmitErrorMessage } from './booking-error-message';

test('explains an unavailable slot with its backend error code', () => {
  const error = new BookingApiError({
    statusCode: 409,
    code: 'BOOKING_SLOT_UNAVAILABLE',
    message: 'Slot unavailable',
    details: null,
  });

  const message = getBookingSubmitErrorMessage(error);
  assert.match(message, /ช่วงเวลาที่เลือกไม่ว่างแล้ว/);
  assert.match(message, /BOOKING_SLOT_UNAVAILABLE/);
});

test('asks the customer to reopen LIFF when the LINE token is invalid', () => {
  const error = new BookingAuthError(
    'LINE_ID_TOKEN_UNAVAILABLE',
    'LINE ID token is unavailable',
    'liff_login',
  );

  const message = getBookingSubmitErrorMessage(error);
  assert.match(message, /เปิด LIFF จาก LINE ใหม่/);
  assert.match(message, /LINE_ID_TOKEN_UNAVAILABLE/);
});

test('does not expose an unexpected internal error message', () => {
  const message = getBookingSubmitErrorMessage(new Error('database password leaked'));
  assert.doesNotMatch(message, /database password/);
  assert.match(message, /UNKNOWN_ERROR/);
});
