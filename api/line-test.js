export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { token } = body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing token' });
    }

    const response = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data?.message || 'Authentication failed. Please check your token.',
      });
    }

    return res.status(200).json({ success: true, bot: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || 'Internal server error' });
  }
}
