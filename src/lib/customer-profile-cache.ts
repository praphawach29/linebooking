import {
  getCustomerProfileSummary,
  type CustomerProfileSummary,
} from './booking-api';

const CACHE_PREFIX = 'liff_customer_profile_summary_v1';
export const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

interface CacheEnvelope {
  summary: CustomerProfileSummary;
  cachedAt: number;
}

const memoryCache = new Map<string, CacheEnvelope>();
const inFlightRequests = new Map<string, Promise<CustomerProfileSummary>>();

export function getCustomerProfileCacheKey(
  tenantId: string,
  lineUserId: string,
): string {
  return `${CACHE_PREFIX}:${tenantId}:${lineUserId}`;
}

export function readCustomerProfileCache(
  tenantId: string,
  lineUserId: string,
): CustomerProfileSummary | null {
  const key = getCustomerProfileCacheKey(tenantId, lineUserId);
  const now = Date.now();

  // 1. Check memory cache
  const memoryEnvelope = memoryCache.get(key);
  if (memoryEnvelope) {
    if (now - memoryEnvelope.cachedAt <= PROFILE_CACHE_TTL_MS) {
      return memoryEnvelope.summary;
    }
    memoryCache.delete(key);
  }

  // 2. Check localStorage cache
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as CacheEnvelope | CustomerProfileSummary;

    // Handle legacy format without envelope or with envelope
    const isEnveloped = 'cachedAt' in envelope && 'summary' in envelope;
    const cachedAt = isEnveloped ? envelope.cachedAt : 0;
    const summary = isEnveloped ? envelope.summary : (envelope as CustomerProfileSummary);

    // Validate structure
    if (
      !summary?.membership ||
      !summary?.stats ||
      typeof summary.stats.totalBookings !== 'number' ||
      typeof summary.stats.completedVisits !== 'number'
    ) {
      localStorage.removeItem(key);
      return null;
    }

    // Check expiration
    if (isEnveloped && now - cachedAt > PROFILE_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    memoryCache.set(key, { summary, cachedAt: isEnveloped ? cachedAt : now });
    return summary;
  } catch {
    return null;
  }
}

export function writeCustomerProfileCache(
  tenantId: string,
  lineUserId: string,
  summary: CustomerProfileSummary,
): void {
  const key = getCustomerProfileCacheKey(tenantId, lineUserId);
  const envelope: CacheEnvelope = {
    summary,
    cachedAt: Date.now(),
  };

  memoryCache.set(key, envelope);
  try {
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Cache availability must never block the profile.
  }
}

export function invalidateCustomerProfileCache(
  tenantId?: string,
  lineUserId?: string,
): void {
  if (tenantId && lineUserId) {
    const key = getCustomerProfileCacheKey(tenantId, lineUserId);
    memoryCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {}
  } else {
    // Clear all matching profile cache keys
    memoryCache.clear();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }
  inFlightRequests.clear();
}

interface LoadCustomerProfileSummaryOptions {
  tenantId: string;
  lineUserId: string;
  accessToken: string;
  phone?: string;
  forceRefresh?: boolean;
}

export function loadCustomerProfileSummary(
  options: LoadCustomerProfileSummaryOptions,
): Promise<CustomerProfileSummary> {
  const requestKey = [
    getCustomerProfileCacheKey(options.tenantId, options.lineUserId),
    options.phone?.replace(/[\s-]/g, '') || '',
  ].join(':');

  if (options.forceRefresh) {
    invalidateCustomerProfileCache(options.tenantId, options.lineUserId);
  }

  const existing = inFlightRequests.get(requestKey);
  if (existing) return existing;

  const request = getCustomerProfileSummary({
    tenantId: options.tenantId,
    accessToken: options.accessToken,
    phone: options.phone,
  })
    .then((summary) => {
      writeCustomerProfileCache(
        options.tenantId,
        options.lineUserId,
        summary,
      );
      return summary;
    })
    .finally(() => {
      inFlightRequests.delete(requestKey);
    });

  inFlightRequests.set(requestKey, request);
  return request;
}
