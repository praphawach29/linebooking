import {
  getCustomerProfileSummary,
  type CustomerProfileSummary,
} from './booking-api';

const CACHE_PREFIX = 'liff_customer_profile_summary_v1';
const memoryCache = new Map<string, CustomerProfileSummary>();
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
  const memoryValue = memoryCache.get(key);
  if (memoryValue) return memoryValue;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const value = JSON.parse(raw) as CustomerProfileSummary;
    if (
      !value?.membership ||
      !value?.stats ||
      typeof value.stats.totalBookings !== 'number' ||
      typeof value.stats.completedVisits !== 'number'
    ) {
      return null;
    }
    memoryCache.set(key, value);
    return value;
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
  memoryCache.set(key, summary);
  try {
    localStorage.setItem(key, JSON.stringify(summary));
  } catch {
    // Cache availability must never block the profile.
  }
}

interface LoadCustomerProfileSummaryOptions {
  tenantId: string;
  lineUserId: string;
  accessToken: string;
  phone?: string;
}

export function loadCustomerProfileSummary(
  options: LoadCustomerProfileSummaryOptions,
): Promise<CustomerProfileSummary> {
  const requestKey = [
    getCustomerProfileCacheKey(options.tenantId, options.lineUserId),
    options.phone?.replace(/[\s-]/g, '') || '',
  ].join(':');
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
