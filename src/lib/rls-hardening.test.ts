import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/0019_restore_production_rls.sql',
  import.meta.url,
);
const contextUrl = new URL('../context/SaaSContext.tsx', import.meta.url);

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

    assert.doesNotMatch(
      sql,
      /CREATE\s+POLICY[\s\S]+(?:TO\s+anon|USING\s*\(\s*true\s*\))/i,
    );
  });

  it('disables the unauthenticated booking-history RPC', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(
      sql,
      /REVOKE ALL PRIVILEGES ON FUNCTION public\.get_my_bookings\(TEXT\) FROM PUBLIC/i,
    );
    assert.match(
      sql,
      /REVOKE ALL PRIVILEGES ON FUNCTION public\.get_my_bookings\(TEXT\) FROM anon/i,
    );
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
