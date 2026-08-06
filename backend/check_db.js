const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.kpodudqwcmsxhzjymldj:Praphawach291625@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  const JACK_LINE_USER_ID = 'U9979a81f3b985ddb72e87de9f47a0fb2';

  // Test get_my_bookings - what does it return?
  const rpcResult = await client.query(
    "SELECT id, ref_no, user_id, user_name, booking_date, tenant_id FROM get_my_bookings($1)",
    [JACK_LINE_USER_ID]
  );
  console.log('get_my_bookings returns', rpcResult.rows.length, 'rows:');
  rpcResult.rows.forEach(r => console.log(' -', r.ref_no, '| user_id:', r.user_id?.substring(0, 8), '| tenant:', r.tenant_id?.substring(0, 8)));

  // Check if any booking with user_name='แจ๊ค' has null user_id (Case 2 trigger)
  const nullUserBookings = await client.query(
    "SELECT id, ref_no, user_name, user_id, tenant_id FROM bookings WHERE user_name = 'แจ๊ค' ORDER BY created_at"
  );
  console.log('\nAll bookings with user_name=แจ๊ค:');
  nullUserBookings.rows.forEach(r => console.log(' -', r.ref_no, '| user_id:', r.user_id?.substring(0, 8) || 'NULL', '| tenant:', r.tenant_id?.substring(0, 8)));

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
