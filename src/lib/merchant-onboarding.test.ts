import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { onboardMerchant } from './merchant-onboarding';

describe('merchant onboarding cutover', () => {
  it('sends the Supabase token and only onboarding profile fields', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          user: {
            id: 'auth-id',
            dbUserId: 'db-id',
            email: 'owner@example.com',
            displayName: 'Owner',
            role: 'merchant_admin',
            tenantId: 'tenant-id',
          },
          tenant: {
            id: 'tenant-id',
            name: 'Shop',
            slug: 'shop-1',
            businessType: 'spa',
          },
        }),
        { status: 200 },
      );
    };

    await onboardMerchant(
      'access-token',
      {
        displayName: 'Owner',
        shopName: 'Shop',
        businessType: 'spa',
        phone: '0812345678',
      },
      { apiUrl: 'https://api.example.com', fetcher },
    );

    assert.equal(capturedUrl, 'https://api.example.com/auth/merchant/onboard');
    assert.equal(
      new Headers(capturedInit?.headers).get('Authorization'),
      'Bearer access-token',
    );
    assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
      displayName: 'Owner',
      shopName: 'Shop',
      businessType: 'spa',
      phone: '0812345678',
    });
  });

  it('contains no direct tenant or user mutations in AuthContext', async () => {
    const source = await readFile(
      new URL('../context/AuthContext.tsx', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(
      source,
      /from\((?:'|\x22)(?:tenants|users)(?:'|\x22)\)[\s\S]{0,180}?\.(?:insert|update|upsert|delete)\s*\(/,
    );
    assert.match(source, /onboardMerchant/);
  });

  it('closes authenticated browser onboarding writes in migration 0020', async () => {
    const sql = await readFile(
      new URL('../../supabase/migrations/0020_close_browser_onboarding_writes.sql', import.meta.url),
      'utf8',
    );

    assert.match(sql, /REVOKE INSERT ON TABLE public\.tenants FROM authenticated/i);
    assert.match(
      sql,
      /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.users FROM authenticated/i,
    );
  });
});
