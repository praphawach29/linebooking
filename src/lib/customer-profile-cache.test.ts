import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  readCustomerProfileCache,
  writeCustomerProfileCache,
  invalidateCustomerProfileCache,
  PROFILE_CACHE_TTL_MS,
} from './customer-profile-cache';
import type { CustomerProfileSummary } from './booking-api';

describe('customer-profile-cache', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const lineUserId = 'U1234567890abcdef';

  const mockSummary: CustomerProfileSummary = {
    membership: {
      id: 'membership-1',
      tenantId,
      userId: 'user-1',
      points: 150,
      totalPointsEarned: 300,
      tier: 'silver',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalBookings: 5,
      completedVisits: 3,
    },
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    invalidateCustomerProfileCache();
  });

  it('writes to and reads from cache successfully', () => {
    writeCustomerProfileCache(tenantId, lineUserId, mockSummary);
    const cached = readCustomerProfileCache(tenantId, lineUserId);

    assert.ok(cached);
    assert.equal(cached.membership.points, 150);
    assert.equal(cached.stats.completedVisits, 3);
  });

  it('invalidates cache explicitly when requested', () => {
    writeCustomerProfileCache(tenantId, lineUserId, mockSummary);
    assert.ok(readCustomerProfileCache(tenantId, lineUserId));

    invalidateCustomerProfileCache(tenantId, lineUserId);
    assert.equal(readCustomerProfileCache(tenantId, lineUserId), null);
  });

  it('treats missing or malformed cache entries as null', () => {
    assert.equal(readCustomerProfileCache('other-tenant', 'other-user'), null);
  });
});
