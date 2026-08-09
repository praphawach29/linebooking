/**
 * Subscriptions API client — คุยกับ Backend billing module
 *
 * ข้อมูลบัตรจริงไม่เคยผ่านไฟล์นี้: หน้าเว็บสร้าง token ที่ Omise Vault ก่อน
 * (ดู createOmiseCardToken ใน ./billing) แล้วส่งเฉพาะ token มาที่นี่
 */

import { BillingCycle, TenantPlan } from '../types';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Backend ตรวจสิทธิ์ด้วย access token ของ Supabase Auth
 * ทุก request จึงต้องแนบ Authorization header
 */
export const authHeader = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  return { Authorization: `Bearer ${token}` };
};

export const isBillingBackendConfigured = () => !!API_URL;

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled';

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  isExpiring: boolean;
}

export interface SubscriptionState {
  id: string;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  defaultPaymentMethodId: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  pendingPlan: TenantPlan | null;
  pendingBillingCycle: BillingCycle | null;
}

export interface SubscriptionSummary {
  subscription: SubscriptionState | null;
  paymentMethods: SavedCard[];
}

export interface ProrationPreview {
  isUpgrade: boolean;
  effective: 'immediate' | 'period_end';
  effectiveAt?: string;
  amountDue: number;
  credit: number;
  newPortion?: number;
  remainingDays?: number;
  totalDays?: number;
}

class BillingApiError extends Error {}

const api = async <T>(path: string, init?: RequestInit, tenantId?: string): Promise<T> => {
  if (!API_URL) {
    throw new BillingApiError('ยังไม่ได้ตั้งค่า VITE_API_URL — ระบบตัดบัตรอัตโนมัติต้องทำงานผ่าน Backend');
  }

  const res = await fetch(`${API_URL}/billing${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
      // TenantAccessGuard on the backend reads tenant scoping from this
      // header — passing tenantId only as a query param (which every
      // endpoint below also does, for the guard's Query decorator) is not
      // enough on its own.
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      ...(init?.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new BillingApiError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    if (res.status === 403) throw new BillingApiError('ไม่มีสิทธิ์ดำเนินการนี้');
    throw new BillingApiError((json as any).message || `เรียก API ไม่สำเร็จ (${res.status})`);
  }
  return json as T;
};

// ---------------------------------------------------------------
// บัตรที่ผูกไว้
// ---------------------------------------------------------------

export const MANDATE_TEXT =
  'ข้าพเจ้ายินยอมให้ระบบเรียกเก็บค่าบริการแพ็กเกจจากบัตรใบนี้โดยอัตโนมัติทุกรอบบิล ' +
  'จนกว่าจะยกเลิกการต่ออายุอัตโนมัติ และรับทราบว่าสามารถยกเลิกได้ตลอดเวลาจากหน้าตั้งค่าการชำระเงิน';

export const attachCard = (input: {
  tenantId: string;
  token: string;
  email?: string;
  mandateAccepted: boolean;
}) =>
  api<SavedCard>('/payment-methods', {
    method: 'POST',
    body: JSON.stringify({ ...input, mandateText: MANDATE_TEXT }),
  }, input.tenantId);

export const listCards = (tenantId: string) =>
  api<SavedCard[]>(`/payment-methods?tenantId=${encodeURIComponent(tenantId)}`, undefined, tenantId);

export const removeCard = (tenantId: string, cardId: string) =>
  api<{ success: boolean }>(`/payment-methods/${cardId}?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'DELETE',
  }, tenantId);

// ---------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------

export const getSubscription = (tenantId: string) =>
  api<SubscriptionSummary>(`/subscription?tenantId=${encodeURIComponent(tenantId)}`, undefined, tenantId);

export const subscribe = (input: {
  tenantId: string;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
}) =>
  api<{ success: boolean; chargeId: string; subscription: SubscriptionSummary }>('/subscribe', {
    method: 'POST',
    body: JSON.stringify(input),
  }, input.tenantId);

export const previewPlanChange = (tenantId: string, plan: TenantPlan, billingCycle: BillingCycle) =>
  api<ProrationPreview>(
    `/plan-change-preview?tenantId=${encodeURIComponent(tenantId)}&plan=${plan}&billingCycle=${billingCycle}`,
    undefined,
    tenantId
  );

export const changePlan = (input: { tenantId: string; plan: TenantPlan; billingCycle: BillingCycle }) =>
  api<{ success: boolean; effective: string; amountCharged: number; subscription: SubscriptionSummary }>(
    '/change-plan',
    { method: 'POST', body: JSON.stringify(input) },
    input.tenantId
  );

export const cancelSubscription = (tenantId: string, immediately = false) =>
  api<SubscriptionSummary>('/cancel', {
    method: 'POST',
    body: JSON.stringify({ tenantId, immediately }),
  }, tenantId);

export const resumeSubscription = (tenantId: string) =>
  api<SubscriptionSummary>('/resume', { method: 'POST', body: JSON.stringify({ tenantId }) }, tenantId);

// ---------------------------------------------------------------
// ป้ายสถานะสำหรับ UI
// ---------------------------------------------------------------
export const statusLabel = (
  status: SubscriptionStatus,
  cancelAtPeriodEnd: boolean
): { text: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } => {
  if (cancelAtPeriodEnd && status === 'active') {
    return { text: 'จะสิ้นสุดเมื่อจบรอบ', tone: 'warning' };
  }
  switch (status) {
    case 'active':
      return { text: 'ต่ออายุอัตโนมัติ', tone: 'success' };
    case 'trialing':
      return { text: 'ทดลองใช้งาน', tone: 'success' };
    case 'past_due':
      return { text: 'ตัดบัตรไม่ผ่าน — กำลังลองใหม่', tone: 'danger' };
    case 'unpaid':
      return { text: 'ค้างชำระ — ถูกลดเป็น Free', tone: 'danger' };
    case 'canceled':
      return { text: 'ยกเลิกแล้ว', tone: 'neutral' };
    default:
      return { text: status, tone: 'neutral' };
  }
};
