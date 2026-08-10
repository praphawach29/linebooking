import type { CustomerProfileSummary } from './booking-api';

const CACHE_PREFIX = 'liff_customer_profile_summary_v1';

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
  try {
    const raw = localStorage.getItem(
      getCustomerProfileCacheKey(tenantId, lineUserId),
    );
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
  try {
    localStorage.setItem(
      getCustomerProfileCacheKey(tenantId, lineUserId),
      JSON.stringify(summary),
    );
  } catch {
    // Cache availability must never block the profile.
  }
}
