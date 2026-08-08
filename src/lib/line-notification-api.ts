import { getMerchantAccessToken, type MerchantSessionProvider } from './booking-auth';

export interface LineQuotaStatus {
  period: string;
  quotaType: 'limited' | 'none';
  limit: number | null;
  usage: number;
  remaining: number | null;
  percentage: number | null;
  warningLevel: 'normal' | 'notice' | 'warning' | 'critical' | 'exceeded';
  source: 'line' | 'snapshot' | 'local';
  sendingBlocked: false;
  fetchedAt: string;
}

export async function getLineQuotaWithSession(
  tenantId: string,
  options: { apiUrl?: string; fetcher?: typeof fetch; sessionProvider?: MerchantSessionProvider } = {},
): Promise<LineQuotaStatus> {
  const token = await getMerchantAccessToken(options.sessionProvider);
  const apiUrl = (options.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const response = await (options.fetcher || fetch)(`${apiUrl}/notifications/line/quota`, {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'ไม่สามารถอ่านโควต้าข้อความ LINE ได้');
  return data as LineQuotaStatus;
}
