import {
  createCustomerBooking,
  createMerchantBooking,
  getCustomerBookings,
  rescheduleMerchantBooking,
  updateMerchantBookingStatus,
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
  return createCustomerBooking(input, {
    tenantId: options.tenantId,
    accessToken,
    apiUrl: options.apiUrl,
    fetcher: options.fetcher,
    signal: options.signal,
  });
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
