const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kpodudqwcmsxhzjymldj.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwb2R1ZHF3Y21zeGh6anltbGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzMyMzMsImV4cCI6MjEwMTE0OTIzM30.U14boGpm_MJmTk1zKlVsgKo4fiFjQwGjoRK1DY4Onm4';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    let { token, tenantId, to, messages } = body;

    if (!to || !messages) {
      return res.status(400).json({ success: false, message: 'Missing recipient (to) or messages payload' });
    }

    // If token is not passed directly, lookup from Supabase by tenantId
    if (!token && tenantId) {
      try {
        const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}&select=line_channel_access_token`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });
        const tenants = await tenantRes.json().catch(() => []);
        if (tenants && tenants[0] && tenants[0].line_channel_access_token) {
          token = tenants[0].line_channel_access_token;
        }
      } catch (err) {
        console.warn('Could not fetch tenant token:', err);
      }
    }

    if (!token) {
      return res.status(400).json({ success: false, message: 'No LINE Channel Access Token available for this tenant' });
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({ to: to.trim(), messages }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn('LINE Messaging API error:', response.status, data);
      return res.status(response.status).json({
        success: false,
        message: data?.message || 'Failed to send LINE push notification',
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Serverless push error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Internal server error' });
  }
}
