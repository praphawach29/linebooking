import {
  checkInMerchantBooking,
  createCustomerBooking,
  createMerchantBooking,
  getCustomerBookings,
  exportCustomerData,
  eraseCustomerData,
  rescheduleMerchantBooking,
  updateMerchantBookingStatus,
  verifyMerchantBookingPayment,
  type BookingApiResponse,
  type CreateCustomerBookingInput,
  type CreateMerchantBookingInput,
} from './booking-api';
import {
  getLineIdToken,
  getMerchantAccessToken,
  type LineTokenOptions,
  type MerchantSessionProvider,
} from './booking-auth';
import { invalidateCustomerProfileCache } from './customer-profile-cache';

interface BookingClientOptions {
  apiUrl?: string;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

interface CustomerBookingClientOptions extends BookingClientOptions {
  tenantId: string;
  liffId: string;
  lineTokenOptions?: LineTokenOptions;
}

interface MerchantBookingClientOptions extends BookingClientOptions {
  tenantId: string;
  sessionProvider?: MerchantSessionProvider;
}

export async function createCustomerBookingWithLiff(
  input: CreateCustomerBookingInput,
  options: CustomerBookingClientOptions,
): Promise<BookingApiResponse> {
  const accessToken = await getLineIdToken(
    options.liffId,
    options.lineTokenOptions,
  );
  const result = await createCustomerBooking(input, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
  invalidateCustomerProfileCache(options.tenantId);
  return result;
}

export async function getCustomerBookingsWithLiff(
  options: CustomerBookingClientOptions,
): Promise<BookingApiResponse[]> {
  const accessToken = await getLineIdToken(
    options.liffId,
    options.lineTokenOptions,
  );
  return getCustomerBookings({
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}

export async function exportCustomerDataWithLiff(
  options: CustomerBookingClientOptions,
): Promise<any> {
  const accessToken = await getLineIdToken(
    options.liffId,
    options.lineTokenOptions,
  );
  return exportCustomerData({
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}

export async function eraseCustomerDataWithLiff(
  options: CustomerBookingClientOptions,
): Promise<{ success: boolean; message: string }> {
  const accessToken = await getLineIdToken(
    options.liffId,
    options.lineTokenOptions,
  );
  const result = await eraseCustomerData({
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
  invalidateCustomerProfileCache(options.tenantId);
  return result;
}

export async function createMerchantBookingWithSession(
  input: CreateMerchantBookingInput,
  options: MerchantBookingClientOptions,
): Promise<BookingApiResponse> {
  const accessToken = await getMerchantAccessToken(options.sessionProvider);
  return createMerchantBooking(input, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}

export async function updateMerchantBookingStatusWithSession(
  bookingId: string,
  input: { status: string; reason?: string },
  options: MerchantBookingClientOptions,
): Promise<BookingApiResponse> {
  const accessToken = await getMerchantAccessToken(options.sessionProvider);
  return updateMerchantBookingStatus(bookingId, input, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}

export async function verifyMerchantBookingPaymentWithSession(
  bookingId: string,
  options: MerchantBookingClientOptions,
): Promise<BookingApiResponse> {
  const accessToken = await getMerchantAccessToken(options.sessionProvider);
  return verifyMerchantBookingPayment(bookingId, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}

export async function checkInMerchantBookingWithSession(
  code: string,
  options: MerchantBookingClientOptions,
): Promise<BookingApiResponse> {
  const accessToken = await getMerchantAccessToken(options.sessionProvider);
  return checkInMerchantBooking(code, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}

export async function rescheduleMerchantBookingWithSession(
  bookingId: string,
  input: { bookingDate: string; startTime: string },
  options: MerchantBookingClientOptions,
): Promise<BookingApiResponse> {
  const accessToken = await getMerchantAccessToken(options.sessionProvider);
  return rescheduleMerchantBooking(bookingId, input, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
}
