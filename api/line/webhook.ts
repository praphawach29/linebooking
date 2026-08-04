// api/line/webhook.ts
// Vercel Serverless Function to handle LINE Messaging API Webhooks and Verification Pings

export default function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-line-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle LINE POST webhook & verification ping
  if (req.method === 'POST') {
    console.log('LINE Webhook Received Body:', JSON.stringify(req.body));
    return res.status(200).json({
      status: 'success',
      message: 'LINE Webhook verified successfully',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle GET request for browser testing
  return res.status(200).json({
    status: 'online',
    message: 'LINE OA Booking SaaS Webhook Endpoint is Running',
  });
}
