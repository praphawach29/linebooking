import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/0033_restore_sensitive_table_boundary.sql',
  import.meta.url,
);
const contextUrl = new URL('../context/SaaSContext.tsx', import.meta.url);
const bookingClientUrl = new URL('./booking-client.ts', import.meta.url);

describe('production RLS hardening', () => {
  it('removes anon policies and table grants from sensitive tables', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    for (const table of ['tenants', 'users', 'bookings']) {
      assert.match(
        sql,
        new RegExp(`REVOKE ALL PRIVILEGES ON TABLE public\\.${table} FROM anon`, 'i'),
      );
    }

    for (const policy of [
      'tenants_public_read',
      'users_public_select',
      'users_public_insert',
      'users_public_update',
      'bookings_public_select',
      'bookings_public_insert',
      'bookings_public_update',
    ]) {
      assert.match(
        sql,
        new RegExp(`DROP POLICY IF EXISTS\\s+${policy}\\s+ON`, 'i'),
      );
    }

    const policyStatements = sql.match(/CREATE\s+POLICY[\s\S]*?;/gi) ?? [];
    assert.ok(policyStatements.length > 0);
    for (const statement of policyStatements) {
      assert.doesNotMatch(statement, /TO\s+(?:PUBLIC|anon)\b/i);
      assert.doesNotMatch(statement, /USING\s*\(\s*true\s*\)/i);
      assert.doesNotMatch(statement, /WITH\s+CHECK\s*\(\s*true\s*\)/i);
    }
  });

  it('disables browser execution of stale-booking cleanup', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(
      sql,
      /REVOKE ALL PRIVILEGES ON FUNCTION public\.cleanup_stale_pending_bookings\(uuid, integer\) FROM PUBLIC/i,
    );
    assert.match(
      sql,
      /REVOKE ALL PRIVILEGES ON FUNCTION public\.cleanup_stale_pending_bookings\(uuid, integer\) FROM anon/i,
    );
  });

  it('routes stale-booking cleanup through the authenticated backend', async () => {
    const source = await readFile(bookingClientUrl, 'utf8');

    assert.match(source, /cleanupStalePendingBookings\(staleIds,/);
    assert.match(source, /getMerchantAccessToken\(options\.sessionProvider\)/);
    assert.doesNotMatch(source, /\.rpc\(['"]cleanup_stale_pending_bookings/);
  });

  it('keeps merchant policies tenant scoped and customer mutations closed', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(sql, /CREATE POLICY tenants_owner_read[\s\S]*my_tenant_ids/i);
    assert.match(sql, /CREATE POLICY bookings_tenant_read[\s\S]*my_tenant_ids/i);
    assert.match(sql, /GRANT SELECT ON TABLE public\.users TO authenticated/i);
    assert.match(sql, /GRANT SELECT ON TABLE public\.bookings TO authenticated/i);
    assert.doesNotMatch(sql, /GRANT[^;]*INSERT[^;]*public\.(?:users|bookings)/i);
  });

  it('retains only filtered public booking views', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(sql, /CREATE VIEW public\.public_tenants/i);
    assert.match(sql, /CREATE VIEW public\.public_busy_slots/i);
    assert.match(sql, /to_jsonb\(t\)->>'plan'/i);
    assert.match(sql, /GRANT SELECT ON TABLE public\.public_tenants TO anon/i);
    assert.match(sql, /GRANT SELECT ON TABLE public\.public_busy_slots TO anon/i);
  });

  it('loads guest tenant data from the filtered public view', async () => {
    const source = await readFile(contextUrl, 'utf8');

    assert.match(source, /from\('public_tenants'\)\.select\('\*'\)/);
    assert.match(source, /Promise\.resolve\(\{ data: \[\] \}\)/);
  });
});
