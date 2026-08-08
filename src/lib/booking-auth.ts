import type { Liff } from '@line/liff';

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

type BookingLiffClient = Pick<
  Liff,
  | 'init'
  | 'isLoggedIn'
  | 'login'
  | 'logout'
  | 'getIDToken'
  | 'getDecodedIDToken'
  | 'getProfile'
>;

export interface LineTokenOptions {
  client?: BookingLiffClient;
  redirectUri?: string;
}

export interface MerchantSessionResult {
  data: {
    session: { access_token: string } | null;
  };
  error?: { message: string } | null;
}

export type MerchantSessionProvider = () => Promise<MerchantSessionResult>;

export class BookingAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly reauthenticationAction: 'liff_login' | 'merchant_login' | null,
  ) {
    super(message);
    this.name = 'BookingAuthError';
  }
}

const initializedLiffIds = new Set<string>();

const LINE_CALLBACK_PARAMS = [
  'code',
  'state',
  'liffClientId',
  'liffRedirectUri',
  'error',
  'error_description',
];

export function getCleanLiffRedirectUri(href: string): string {
  const url = new URL(href);
  LINE_CALLBACK_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
}

export function isLineIdTokenSessionValid(
  liffId: string,
  decodedToken: { aud?: string; exp?: number } | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!decodedToken?.aud || !decodedToken.exp) return false;
  const expectedAudience = liffId.trim().split('-')[0];
  return (
    decodedToken.aud === expectedAudience &&
    decodedToken.exp > nowSeconds + 30
  );
}

function getDefaultRedirectUri(): string | undefined {
  return typeof window === 'undefined'
    ? undefined
    : getCleanLiffRedirectUri(window.location.href);
}

function startLiffLogin(
  client: BookingLiffClient,
  redirectUri?: string,
): never {
  client.login({ redirectUri: redirectUri ?? getDefaultRedirectUri() });
  throw new BookingAuthError(
    'LIFF_LOGIN_REDIRECT_STARTED',
    'LINE login is required before creating a booking',
    'liff_login',
  );
}

export async function getLineIdToken(
  liffId: string,
  options: LineTokenOptions = {},
): Promise<string> {
  const normalizedLiffId = liffId.trim();
  if (!normalizedLiffId) {
    throw new BookingAuthError(
      'LIFF_ID_NOT_CONFIGURED',
      'LIFF ID is not configured for this tenant',
      null,
    );
  }

  const client = options.client ?? (await loadLiffClient());
  if (!initializedLiffIds.has(normalizedLiffId)) {
    await client.init({ liffId: normalizedLiffId });
    initializedLiffIds.add(normalizedLiffId);
  }

  if (!client.isLoggedIn()) {
    return startLiffLogin(client, options.redirectUri);
  }

  const token = client.getIDToken();
  if (!token) {
    throw new BookingAuthError(
      'LINE_ID_TOKEN_UNAVAILABLE',
      'LINE ID token is unavailable',
      'liff_login',
    );
  }
  if (!isLineIdTokenSessionValid(normalizedLiffId, client.getDecodedIDToken())) {
    client.logout();
    return startLiffLogin(client, options.redirectUri);
  }
  return token;
}

export async function getLiffProfile(
  liffId: string,
  options: LineTokenOptions = {},
): Promise<LiffProfile> {
  const normalizedLiffId = liffId.trim();
  if (!normalizedLiffId) {
    throw new BookingAuthError(
      'LIFF_ID_NOT_CONFIGURED',
      'LIFF ID is not configured for this tenant',
      null,
    );
  }

  const client = options.client ?? (await loadLiffClient());
  if (!initializedLiffIds.has(normalizedLiffId)) {
    await client.init({ liffId: normalizedLiffId });
    initializedLiffIds.add(normalizedLiffId);
  }

  if (!client.isLoggedIn()) {
    return startLiffLogin(client, options.redirectUri);
  }

  if (!isLineIdTokenSessionValid(normalizedLiffId, client.getDecodedIDToken())) {
    client.logout();
    return startLiffLogin(client, options.redirectUri);
  }

  const profile = await client.getProfile();
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
  };
}

export async function getMerchantAccessToken(
  sessionProvider?: MerchantSessionProvider,
): Promise<string> {
  const provider = sessionProvider ?? defaultMerchantSessionProvider;
  const { data, error } = await provider();

  if (error) {
    throw new BookingAuthError(
      'MERCHANT_SESSION_INVALID',
      error.message,
      'merchant_login',
    );
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new BookingAuthError(
      'MERCHANT_AUTH_REQUIRED',
      'Merchant sign-in is required before creating a booking',
      'merchant_login',
    );
  }
  return token;
}

async function loadLiffClient(): Promise<BookingLiffClient> {
  const { liff } = await import('@line/liff');
  return liff;
}

async function defaultMerchantSessionProvider(): Promise<MerchantSessionResult> {
  const { supabase } = await import('./supabase');
  return supabase.auth.getSession();
}

export function resetBookingAuthStateForTests(): void {
  initializedLiffIds.clear();
}
