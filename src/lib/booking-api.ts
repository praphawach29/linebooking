export type BookingApiActor = 'customer' | 'merchant';

export type BookingApiErrorKind =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'unprocessable'
  | 'server'
  | 'network'
  | 'unexpected';

export type BookingReauthenticationAction =
  | 'liff_login'
  | 'merchant_login'
  | null;

export interface BookingApiErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  details: unknown;
}

export class BookingApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;
  readonly kind: BookingApiErrorKind;
  readonly actor: BookingApiActor | null;
  readonly reauthenticationAction: BookingReauthenticationAction;

  constructor(
    payload: BookingApiErrorPayload,
    actor: BookingApiActor | null = null,
  ) {
    super(payload.message);
    this.name = 'BookingApiError';
    this.statusCode = payload.statusCode;
    this.code = payload.code;
    this.details = payload.details;
    this.kind = getErrorKind(payload.statusCode);
    this.actor = actor;
    this.reauthenticationAction =
      payload.statusCode === 401
        ? actor === 'customer'
          ? 'liff_login'
          : actor === 'merchant'
            ? 'merchant_login'
            : null
        : null;
  }
}

export interface CreateCustomerBookingInput {
  serviceId: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  courtId?: string;
  courtName?: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  bookingHours?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: string;
  depositPaid?: boolean;
  paymentSlipUrl?: string;
  price?: number;
  finalPrice?: number;
  depositAmount?: number;
}

export interface CreateMerchantBookingInput
  extends CreateCustomerBookingInput {
  customerId: string;
}

export interface BookingApiResponse {
  id: string;
  refNo: string;
  tenantId: string;
  userId: string;
  userName: string;
  userPhone?: string | null;
  userAvatar?: string | null;
  serviceId: string;
  serviceName?: string | null;
  serviceDuration?: number | null;
  servicePrice?: number | null;
  bookingHours?: number | null;
  staffId?: string | null;
  staffName?: string | null;
  courtId?: string | null;
  courtName?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  price: number;
  discountAmount: number;
  finalPrice: number;
  depositAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentSlipUrl?: string | null;
  paymentSlipUploadedAt?: string | null;
  source: string;
  notes?: string | null;
  checkInCode?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  checkedInAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface AvailableSlotApiResponse {
  startTime: string;
  endTime: string;
  staffId: string | null;
  available: boolean;
}

export interface AvailableSlotsApiResponse {
  bookingDate: string;
  timezone: string;
  slotIntervalMinutes: number;
  slots: AvailableSlotApiResponse[];
}

export interface CustomerProfileSummary {
  membership: {
    id: string;
    tenantId: string;
    userId: string;
    points: number;
    totalPointsEarned: number;
    tier: string;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    totalBookings: number;
    completedVisits: number;
  };
  updatedAt: string;
}

interface BookingRequestOptions {
  apiUrl?: string;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

interface AuthenticatedBookingRequestOptions extends BookingRequestOptions {
  tenantId: string;
  accessToken: string;
  phone?: string;
}

const inFlightCreates = new Map<string, Promise<BookingApiResponse>>();

export async function getAvailableSlots(
  tenantId: string,
  query: {
    serviceId: string;
    bookingDate: string;
    staffId?: string;
    courtId?: string;
  },
  options: BookingRequestOptions = {},
): Promise<AvailableSlotsApiResponse> {
  const search = new URLSearchParams({
    serviceId: query.serviceId,
    bookingDate: query.bookingDate,
  });
  if (query.staffId) search.set('staffId', query.staffId);
  if (query.courtId) search.set('courtId', query.courtId);

  // Fast 1500ms timeout for slot querying to avoid UI delay
  let effectiveSignal = options.signal;
  let timeoutId: any = null;
  if (!effectiveSignal && typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 1500);
    effectiveSignal = controller.signal;
  }

  try {
    return await requestJson<AvailableSlotsApiResponse>(
      `/bookings/available-slots?${search.toString()}`,
      {
        method: 'GET',
        headers: { 'x-tenant-id': tenantId },
        signal: effectiveSignal,
      },
      null,
      { ...options, signal: effectiveSignal },
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function createCustomerBooking(
  input: CreateCustomerBookingInput,
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  const body = customerBody(input);
  return createBookingRequest('/bookings', body, 'customer', options);
}

export function getCustomerBookings(
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse[]> {
  return requestJson<BookingApiResponse[]>(
    options.phone ? `/bookings/mine?phone=${encodeURIComponent(options.phone)}` : '/bookings/mine',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
      },
      signal: options.signal,
    },
    'customer',
    options,
  );
}

export function getCustomerMembership(
  options: AuthenticatedBookingRequestOptions,
): Promise<any> {
  return requestJson<any>(
    options.phone ? `/customer/membership?phone=${encodeURIComponent(options.phone)}` : '/customer/membership',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
      },
      signal: options.signal,
    },
    'customer',
    options,
  );
}

export function getCustomerProfileSummary(
  options: AuthenticatedBookingRequestOptions,
): Promise<CustomerProfileSummary> {
  return requestJson<CustomerProfileSummary>(
    options.phone
      ? `/customer/membership/summary?phone=${encodeURIComponent(options.phone)}`
      : '/customer/membership/summary',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
      },
      signal: options.signal,
    },
    'customer',
    options,
  );
}

export function linkCustomerPhone(
  options: AuthenticatedBookingRequestOptions & { phone: string },
): Promise<{ merged: boolean; mergedFromUserId?: string }> {
  return requestJson(
    '/customer/membership/link-phone',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: options.phone }),
      signal: options.signal,
    },
    'customer',
    options,
  );
}

export function exportCustomerData(
  options: AuthenticatedBookingRequestOptions,
): Promise<any> {
  return requestJson(
    '/customer/membership/data-export',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
      },
      signal: options.signal,
    },
    'customer',
    options,
  );
}

export function eraseCustomerData(
  options: AuthenticatedBookingRequestOptions,
): Promise<{ success: boolean; message: string }> {
  return requestJson(
    '/customer/membership/data-erasure',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
        'Content-Type': 'application/json',
      },
      signal: options.signal,
    },
    'customer',
    options,
  );
}

export function createMerchantBooking(
  input: CreateMerchantBookingInput,
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  const body = {
    customerId: input.customerId,
    ...customerBody(input),
  };
  return createBookingRequest('/bookings/merchant', body, 'merchant', options);
}

export function cleanupStalePendingBookings(
  bookingIds: string[],
  options: AuthenticatedBookingRequestOptions,
): Promise<{ deletedCount: number }> {
  return requestJson<{ deletedCount: number }>(
    '/bookings/maintenance/cleanup-stale',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': options.tenantId,
      },
      body: JSON.stringify({ bookingIds }),
      signal: options.signal,
    },
    'merchant',
    options,
  );
}

export function updateMerchantBookingStatus(
  bookingId: string,
  input: { status: string; reason?: string },
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  return requestJson<BookingApiResponse>(
    `/bookings/${bookingId}/status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': options.tenantId,
      },
      body: JSON.stringify(input),
      signal: options.signal,
    },
    'merchant',
    options,
  );
}

export function verifyMerchantBookingPayment(
  bookingId: string,
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  return requestJson<BookingApiResponse>(
    `/bookings/${bookingId}/verify-payment`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'x-tenant-id': options.tenantId,
      },
      signal: options.signal,
    },
    'merchant',
    options,
  );
}

export function checkInMerchantBooking(
  code: string,
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  return requestJson<BookingApiResponse>(
    '/bookings/check-in',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': options.tenantId,
      },
      body: JSON.stringify({ code }),
      signal: options.signal,
    },
    'merchant',
    options,
  );
}

export function rescheduleMerchantBooking(
  bookingId: string,
  input: { bookingDate: string; startTime: string },
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  return requestJson<BookingApiResponse>(
    `/bookings/${bookingId}/reschedule`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': options.tenantId,
      },
      body: JSON.stringify(input),
      signal: options.signal,
    },
    'merchant',
    options,
  );
}

function createBookingRequest(
  path: string,
  body: Record<string, string | number | boolean>,
  actor: BookingApiActor,
  options: AuthenticatedBookingRequestOptions,
): Promise<BookingApiResponse> {
  const requestKey = `${actor}:${options.tenantId}:${JSON.stringify(body)}`;
  const existing = inFlightCreates.get(requestKey);
  if (existing) return existing;

  const request = requestJson<BookingApiResponse>(
    path,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': options.tenantId,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    },
    actor,
    options,
  ).finally(() => {
    inFlightCreates.delete(requestKey);
  });

  inFlightCreates.set(requestKey, request);
  return request;
}

function customerBody(
  input: CreateCustomerBookingInput,
): Record<string, string | number | boolean> {
  const body: Record<string, string | number | boolean> = {
    serviceId: input.serviceId,
    bookingDate: input.bookingDate,
    startTime: input.startTime,
  };

  if (input.staffId) body.staffId = input.staffId;
  if (input.courtId) body.courtId = input.courtId;
  if (input.bookingHours) body.bookingHours = input.bookingHours;
  if (input.customerName) body.customerName = input.customerName;
  if (input.customerPhone) body.customerPhone = input.customerPhone;
  if (input.notes) body.notes = input.notes;
  if (input.paymentMethod) body.paymentMethod = input.paymentMethod;
  if (input.depositPaid) body.depositPaid = input.depositPaid;
  if (input.paymentSlipUrl) body.paymentSlipUrl = input.paymentSlipUrl;
  return body;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  actor: BookingApiActor | null,
  options: BookingRequestOptions,
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  let response: Response;

  // Fast 2.5-second default request timeout to ensure snappy customer UX
  let timeoutId: any = null;
  let effectiveSignal = options.signal;
  if (!effectiveSignal && typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 2500);
    effectiveSignal = controller.signal;
  }

  try {
    response = await fetcher(`${getApiUrl(options.apiUrl)}${path}`, {
      ...init,
      signal: effectiveSignal,
    });
  } catch (error: any) {
    if (error instanceof BookingApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new BookingApiError(
        {
          statusCode: 0,
          code: 'REQUEST_TIMEOUT',
          message: 'The booking service took too long to respond. Please check your connection and try again.',
          details: 'Request timed out after 2500ms',
        },
        actor,
      );
    }
    throw new BookingApiError(
      {
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the booking service',
        details: error instanceof Error ? error.message : null,
      },
      actor,
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw new BookingApiError(normalizeErrorPayload(response.status, payload), actor);
  }

  return payload as T;
}

function getApiUrl(override?: string): string {
  const configured =
    override ??
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_API_URL;
  const normalized = configured?.trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location) {
    const isRemote = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isRemote && (!normalized || normalized.includes('localhost') || normalized.includes('127.0.0.1'))) {
      return `${window.location.origin}/api`;
    }
  }

  if (!normalized) {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/api`;
    }
    return 'http://localhost:3000/api';
  }
  return normalized;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizeErrorPayload(
  statusCode: number,
  payload: unknown,
): BookingApiErrorPayload {
  if (isRecord(payload)) {
    return {
      statusCode,
      code: typeof payload.code === 'string' ? payload.code : fallbackCode(statusCode),
      message:
        typeof payload.message === 'string'
          ? payload.message
          : `Booking request failed with status ${statusCode}`,
      details: payload.details ?? null,
    };
  }

  return {
    statusCode,
    code: fallbackCode(statusCode),
    message: `Booking request failed with status ${statusCode}`,
    details: null,
  };
}

function fallbackCode(statusCode: number): string {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'AUTH_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_FAILED',
      500: 'INTERNAL_SERVER_ERROR',
    } as Record<number, string>
  )[statusCode] ?? 'UNEXPECTED_ERROR';
}

function getErrorKind(statusCode: number): BookingApiErrorKind {
  if (statusCode === 400) return 'validation';
  if (statusCode === 401) return 'authentication';
  if (statusCode === 403) return 'authorization';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 409) return 'conflict';
  if (statusCode === 422) return 'unprocessable';
  if (statusCode >= 500) return 'server';
  if (statusCode === 0) return 'network';
  return 'unexpected';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
