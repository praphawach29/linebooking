export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, messages, channelAccessToken } = req.body;

    if (!to || !messages || !channelAccessToken) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to,
        messages
      })
    });

    // Check if response has body (LINE sometimes returns 200 with empty body)
    let data = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (text) data = { message: text };
    }

    if (!response.ok) {
      console.error('LINE API Error:', data);
      return res.status(response.status).json({ error: 'Failed to send LINE message', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
