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
  staffId?: string;
  courtId?: string;
  bookingDate: string;
  startTime: string;
  bookingHours?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
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
  serviceId: string;
  serviceName?: string | null;
  serviceDuration?: number | null;
  servicePrice?: number | null;
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
  source: string;
  notes?: string | null;
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

interface BookingRequestOptions {
  apiUrl?: string;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

interface AuthenticatedBookingRequestOptions extends BookingRequestOptions {
  tenantId: string;
  accessToken: string;
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

  return requestJson<AvailableSlotsApiResponse>(
    `/bookings/available-slots?${search.toString()}`,
    {
      method: 'GET',
      headers: { 'x-tenant-id': tenantId },
      signal: options.signal,
    },
    null,
    options,
  );
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
    '/bookings/mine',
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
  body: Record<string, string | number>,
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
): Record<string, string | number> {
  const body: Record<string, string | number> = {
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

  try {
    response = await fetcher(`${getApiUrl(options.apiUrl)}${path}`, init);
  } catch (error) {
    if (error instanceof BookingApiError) throw error;
    throw new BookingApiError(
      {
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the booking service',
        details: error instanceof Error ? error.message : null,
      },
      actor,
    );
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
