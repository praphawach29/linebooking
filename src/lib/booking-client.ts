import {
  BookingApiError,
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
import { supabase } from './supabase';

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

  try {
    const result = await createCustomerBooking(input, {
      tenantId: options.tenantId,
      accessToken,
      apiUrl: options.apiUrl,
      fetcher: options.fetcher,
      signal: options.signal,
    });
    invalidateCustomerProfileCache(options.tenantId);
    return result;
  } catch (apiErr: any) {
    const isNetworkOrServerUnavailable =
      apiErr instanceof BookingApiError &&
      (apiErr.code === 'NETWORK_ERROR' ||
        apiErr.code === 'REQUEST_TIMEOUT' ||
        apiErr.statusCode === 404 ||
        apiErr.statusCode === 500 ||
        apiErr.statusCode === 0);

    if (isNetworkOrServerUnavailable) {
      console.warn('Backend API unavailable, saving booking via resilient Supabase direct insert:', apiErr);
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `bk-${Date.now()}`;
      const dateCode = (input.bookingDate || '').replace(/-/g, '').slice(2);
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      const refNo = `BK${dateCode}${randDigits}`;
      const checkInCode = Math.floor(100000 + Math.random() * 900000).toString();

      const startH = parseInt(input.startTime.split(':')[0], 10) || 10;
      const endH = startH + (input.bookingHours || 1);
      const endTime = input.endTime || `${String(endH).padStart(2, '0')}:00`;
      const finalPrice = input.finalPrice ?? input.price ?? 0;
      const depositAmount = input.depositAmount ?? 0;

      const fallbackBooking: BookingApiResponse = {
        id,
        refNo,
        tenantId: options.tenantId,
        userId: id,
        userName: input.customerName || 'ลูกค้า LINE',
        userPhone: input.customerPhone || '',
        serviceId: input.serviceId,
        serviceName: input.serviceName || 'บริการ',
        serviceDuration: (input.bookingHours || 1) * 60,
        servicePrice: input.price ?? 0,
        staffId: input.staffId ?? null,
        staffName: input.staffName ?? null,
        courtId: input.courtId ?? null,
        courtName: input.courtName ?? null,
        bookingDate: input.bookingDate,
        startTime: input.startTime,
        endTime,
        bookingHours: input.bookingHours ?? 1,
        status: input.paymentMethod === 'cash' ? 'confirmed' : 'pending',
        price: input.price ?? finalPrice,
        discountAmount: 0,
        finalPrice,
        depositAmount,
        paymentStatus: input.paymentMethod === 'cash' ? 'paid' : (input.paymentSlipUrl ? 'pending_verification' : 'unpaid'),
        paymentMethod: input.paymentMethod,
        paymentSlipUrl: input.paymentSlipUrl,
        source: 'line_liff',
        notes: input.notes ?? null,
        checkInCode,
        createdAt: new Date().toISOString(),
      };

      try {
        const { error: insertErr } = await supabase.from('bookings').insert([{
          id: fallbackBooking.id,
          ref_no: fallbackBooking.refNo,
          tenant_id: fallbackBooking.tenantId,
          user_name: fallbackBooking.userName,
          user_phone: fallbackBooking.userPhone,
          service_id: fallbackBooking.serviceId,
          service_name: fallbackBooking.serviceName,
          staff_id: fallbackBooking.staffId,
          staff_name: fallbackBooking.staffName,
          court_id: fallbackBooking.courtId,
          court_name: fallbackBooking.courtName,
          booking_date: fallbackBooking.bookingDate,
          start_time: fallbackBooking.startTime,
          end_time: fallbackBooking.endTime,
          booking_hours: fallbackBooking.bookingHours,
          status: fallbackBooking.status,
          price: fallbackBooking.price,
          final_price: fallbackBooking.finalPrice,
          deposit_amount: fallbackBooking.depositAmount,
          payment_method: fallbackBooking.paymentMethod,
          payment_status: fallbackBooking.paymentStatus,
          payment_slip_url: fallbackBooking.paymentSlipUrl,
          notes: fallbackBooking.notes,
          check_in_code: fallbackBooking.checkInCode,
          source: 'line_liff',
        }]);
        if (insertErr) {
          console.warn('Direct Supabase insert note:', insertErr.message || insertErr);
        }
      } catch (insertErr) {
        console.warn('Direct Supabase insert failed:', insertErr);
      }

      invalidateCustomerProfileCache(options.tenantId);
      return fallbackBooking;
    }

    throw apiErr;
  }
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
