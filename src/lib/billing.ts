/**
 * Platform Billing — ชั้นเข้าถึงข้อมูลการรับชำระค่าแพ็กเกจ SaaS
 *
 * ที่มาของการตั้งค่า (เรียงตามลำดับความสำคัญ):
 *   1. ตาราง platform_settings ใน Supabase (แก้จากหน้า Super Admin)
 *   2. localStorage (fallback ตอน dev / ยังไม่ได้รัน migration 0004)
 *   3. ค่า default ในไฟล์นี้
 */

import { supabase } from './supabase';
import { authHeader } from './subscriptions';
import {
  BillingCycle,
  PlatformBillingPublic,
  PlatformBillingSettings,
  SubscriptionInvoice,
  TenantPlan,
} from '../types';

const LS_KEY = 'PLATFORM_BILLING_SETTINGS';

export const DEFAULT_BILLING_SETTINGS: PlatformBillingSettings = {
  activeProvider: 'promptpay',
  promptpayNumber: '',
  promptpayName: '',
  omiseEnabled: false,
  omisePublicKey: '',
  omiseSecretKey: '',
  omiseTestMode: true,
  pricePro: { monthly: 990, yearly: 9900 },
  priceEnterprise: { monthly: 2990, yearly: 29900 },
  currency: 'THB',
  autoRenewOnPayment: true,
  slipVerifyProvider: 'manual',
  slipVerifyApiKey: '',
  slipVerifyBranchId: '',
  slipAutoApprove: true,
  expectedReceiverName: '',
  expectedReceiverAccount: '',
  slipTimeWindowHours: 72,
  slipAmountTolerance: 0,
  renewalReminderDays: [7, 3, 1],
};

// ---------------------------------------------------------------
// Mapping ระหว่าง row ใน DB (snake_case แบน) กับ type ฝั่ง frontend
// ---------------------------------------------------------------
const rowToSettings = (row: any): PlatformBillingSettings => ({
  activeProvider: row.active_provider ?? 'promptpay',
  promptpayNumber: row.promptpay_number ?? '',
  promptpayName: row.promptpay_name ?? '',
  omiseEnabled: !!row.omise_enabled,
  omisePublicKey: row.omise_public_key ?? '',
  omiseSecretKey: row.omise_secret_key ?? '',
  omiseTestMode: row.omise_test_mode ?? true,
  pricePro: {
    monthly: Number(row.price_pro_monthly ?? 990),
    yearly: Number(row.price_pro_yearly ?? 9900),
  },
  priceEnterprise: {
    monthly: Number(row.price_enterprise_monthly ?? 2990),
    yearly: Number(row.price_enterprise_yearly ?? 29900),
  },
  currency: row.currency ?? 'THB',
  autoRenewOnPayment: row.auto_renew_on_payment ?? true,
  slipVerifyProvider: row.slip_verify_provider ?? 'manual',
  slipVerifyApiKey: row.slip_verify_api_key ?? '',
  slipVerifyBranchId: row.slip_verify_branch_id ?? '',
  slipAutoApprove: row.slip_auto_approve ?? true,
  expectedReceiverName: row.expected_receiver_name ?? '',
  expectedReceiverAccount: row.expected_receiver_account ?? '',
  slipTimeWindowHours: Number(row.slip_time_window_hours ?? 72),
  slipAmountTolerance: Number(row.slip_amount_tolerance ?? 0),
  renewalReminderDays: row.renewal_reminder_days ?? [7, 3, 1],
  updatedAt: row.updated_at,
});

const settingsToRow = (s: PlatformBillingSettings) => ({
  id: 1,
  active_provider: s.activeProvider,
  promptpay_number: s.promptpayNumber || null,
  promptpay_name: s.promptpayName || null,
  omise_enabled: s.omiseEnabled,
  omise_public_key: s.omisePublicKey || null,
  omise_secret_key: s.omiseSecretKey || null,
  omise_test_mode: s.omiseTestMode,
  price_pro_monthly: s.pricePro.monthly,
  price_pro_yearly: s.pricePro.yearly,
  price_enterprise_monthly: s.priceEnterprise.monthly,
  price_enterprise_yearly: s.priceEnterprise.yearly,
  currency: s.currency,
  auto_renew_on_payment: s.autoRenewOnPayment,
  slip_verify_provider: s.slipVerifyProvider,
  slip_verify_api_key: s.slipVerifyApiKey || null,
  slip_verify_branch_id: s.slipVerifyBranchId || null,
  slip_auto_approve: s.slipAutoApprove,
  expected_receiver_name: s.expectedReceiverName || null,
  expected_receiver_account: s.expectedReceiverAccount || null,
  slip_time_window_hours: s.slipTimeWindowHours,
  slip_amount_tolerance: s.slipAmountTolerance,
  renewal_reminder_days: s.renewalReminderDays,
  updated_at: new Date().toISOString(),
});

const readLocal = (): PlatformBillingSettings | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_BILLING_SETTINGS, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
};

const writeLocal = (s: PlatformBillingSettings) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* โหมด private browsing — ข้ามไป */
  }
};

// ---------------------------------------------------------------
// อ่านการตั้งค่า
// ---------------------------------------------------------------

/** สำหรับหน้า Super Admin — อ่านทั้งแถวรวม secret key (ต้องล็อกอินเป็น platform_admin) */
export const fetchPlatformBillingSettings = async (): Promise<PlatformBillingSettings> => {
  const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();

  if (error || !data) {
    if (error) console.warn('[billing] อ่าน platform_settings ไม่สำเร็จ, ใช้ค่าใน localStorage แทน:', error.message);
    return readLocal() || DEFAULT_BILLING_SETTINGS;
  }
  return rowToSettings(data);
};

/** สำหรับหน้าร้านค้า — อ่านผ่าน view ที่ไม่มี secret key */
export const fetchPublicBillingSettings = async (): Promise<PlatformBillingPublic> => {
  const { data, error } = await supabase.from('platform_billing_public').select('*').maybeSingle();

  if (error || !data) {
    if (error) console.warn('[billing] อ่าน platform_billing_public ไม่สำเร็จ:', error.message);
    const local = readLocal() || DEFAULT_BILLING_SETTINGS;
    const { omiseSecretKey: _omit, ...pub } = local;
    return pub;
  }
  const { omiseSecretKey: _omit, ...pub } = rowToSettings(data);
  return pub;
};

/** บันทึกการตั้งค่า (เขียนลง DB และ mirror ไว้ที่ localStorage เผื่อ offline) */
export const savePlatformBillingSettings = async (
  settings: PlatformBillingSettings
): Promise<{ ok: boolean; error?: string }> => {
  writeLocal(settings);

  const { error } = await supabase.from('platform_settings').upsert(settingsToRow(settings), { onConflict: 'id' });

  if (error) {
    console.error('[billing] บันทึก platform_settings ไม่สำเร็จ:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

// ---------------------------------------------------------------
// ราคา & รอบบิล
// ---------------------------------------------------------------
export const getPlanPrice = (
  settings: PlatformBillingPublic,
  plan: TenantPlan,
  cycle: BillingCycle
): number => {
  if (plan === 'free') return 0;
  const table = plan === 'enterprise' ? settings.priceEnterprise : settings.pricePro;
  return cycle === 'yearly' ? table.yearly : table.monthly;
};

/** วันหมดอายุใหม่ — ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด มิฉะนั้นนับจากวันนี้ */
export const calcNextExpiry = (currentExpiry: string | undefined, cycle: BillingCycle): Date => {
  const now = new Date();
  const base = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now;
  const next = new Date(base);
  if (cycle === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

// ---------------------------------------------------------------
// ใบแจ้งหนี้
// ---------------------------------------------------------------
const genInvoiceNo = () =>
  `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

export const createSubscriptionInvoice = async (input: {
  tenantId: string;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  amount: number;
  currency?: string;
  method: 'promptpay' | 'credit_card';
  provider: 'manual' | 'promptpay' | 'omise';
  qrPayload?: string;
  currentExpiry?: string;
}): Promise<SubscriptionInvoice | null> => {
  const periodStart = new Date();
  const periodEnd = calcNextExpiry(input.currentExpiry, input.billingCycle);

  const row = {
    invoice_no: genInvoiceNo(),
    tenant_id: input.tenantId,
    plan: input.plan,
    billing_cycle: input.billingCycle,
    amount: input.amount,
    currency: input.currency || 'THB',
    method: input.method,
    provider: input.provider,
    status: 'pending',
    qr_payload: input.qrPayload || null,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };

  const { data, error } = await supabase.from('subscription_invoices').insert([row]).select().single();

  if (error) {
    console.error('[billing] สร้างใบแจ้งหนี้ไม่สำเร็จ:', error.message);
    // ยังคืน object ในหน่วยความจำให้ UI ทำงานต่อได้ แม้ยังไม่ได้รัน migration
    return {
      id: `local-${Date.now()}`,
      invoiceNo: row.invoice_no,
      tenantId: row.tenant_id,
      plan: row.plan,
      billingCycle: row.billing_cycle,
      amount: row.amount,
      currency: row.currency,
      method: row.method,
      provider: row.provider,
      status: 'pending',
      qrPayload: row.qr_payload || undefined,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      createdAt: new Date().toISOString(),
    };
  }

  return invoiceRowToType(data);
};

export const markInvoicePaid = async (
  invoiceId: string,
  providerRef?: string
): Promise<void> => {
  if (invoiceId.startsWith('local-')) return;
  const { error } = await supabase
    .from('subscription_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString(), provider_ref: providerRef || null })
    .eq('id', invoiceId);
  if (error) console.error('[billing] อัปเดตสถานะใบแจ้งหนี้ไม่สำเร็จ:', error.message);
};

export const markInvoiceFailed = async (invoiceId: string, reason: string): Promise<void> => {
  if (invoiceId.startsWith('local-')) return;
  await supabase
    .from('subscription_invoices')
    .update({ status: 'failed', failure_reason: reason })
    .eq('id', invoiceId);
};

export const fetchInvoices = async (tenantId?: string): Promise<SubscriptionInvoice[]> => {
  let query = supabase
    .from('subscription_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(invoiceRowToType);
};

const invoiceRowToType = (row: any): SubscriptionInvoice => ({
  id: row.id,
  invoiceNo: row.invoice_no,
  tenantId: row.tenant_id,
  plan: row.plan,
  billingCycle: row.billing_cycle,
  amount: Number(row.amount),
  currency: row.currency,
  method: row.method,
  provider: row.provider,
  providerRef: row.provider_ref || undefined,
  status: row.status,
  qrPayload: row.qr_payload || undefined,
  periodStart: row.period_start || undefined,
  periodEnd: row.period_end || undefined,
  paidAt: row.paid_at || undefined,
  failureReason: row.failure_reason || undefined,
  createdAt: row.created_at,
});

// ---------------------------------------------------------------
// Omise — เรียกผ่าน Backend เท่านั้น (ห้ามใช้ secret key ในเบราว์เซอร์)
// ---------------------------------------------------------------
const API_URL = import.meta.env.VITE_API_URL || '';

export const isOmiseBackendConfigured = () => !!API_URL;

/**
 * สร้าง token บัตรผ่าน Omise Vault API (ใช้ public key เท่านั้น — ปลอดภัยฝั่ง client)
 * เลขบัตรจริงจะถูกส่งตรงไปที่ Omise ไม่ผ่านเซิร์ฟเวอร์ของเรา
 */
export const createOmiseCardToken = async (
  publicKey: string,
  card: { name: string; number: string; expirationMonth: number; expirationYear: number; securityCode: string }
): Promise<{ ok: boolean; token?: string; error?: string }> => {
  try {
    const res = await fetch('https://vault.omise.co/tokens', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${publicKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ card }),
    });
    const json = await res.json();
    if (!res.ok || json.object === 'error') {
      return { ok: false, error: json.message || 'สร้าง token บัตรไม่สำเร็จ' };
    }
    return { ok: true, token: json.id };
  } catch (err: any) {
    return { ok: false, error: err.message || 'เชื่อมต่อ Omise ไม่ได้' };
  }
};

/** ส่ง token ไปตัดเงินที่ Backend (backend เท่านั้นที่ถือ secret key) */
export const chargeSubscriptionViaBackend = async (payload: {
  invoiceId: string;
  tenantId: string;
  amount: number;
  currency: string;
  token?: string;
  source?: 'promptpay';
  description: string;
}): Promise<{ ok: boolean; chargeId?: string; qrImageUrl?: string; error?: string }> => {
  if (!API_URL) {
    return { ok: false, error: 'ยังไม่ได้ตั้งค่า VITE_API_URL — ตัดบัตรผ่าน Omise ต้องทำงานผ่าน Backend' };
  }
  try {
    const res = await fetch(`${API_URL}/billing/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeader()),
        'x-tenant-id': payload.tenantId,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      return { ok: false, error: json.message || 'ตัดเงินไม่สำเร็จ' };
    }
    return { ok: true, chargeId: json.chargeId, qrImageUrl: json.qrImageUrl };
  } catch (err: any) {
    return { ok: false, error: err.message || 'เชื่อมต่อ Backend ไม่ได้' };
  }
};

/**
 * Super Admin: ดึงรายงานตรวจสอบกระทบยอดระหว่าง Omise และ Database (Reconciliation)
 */
export const fetchOmiseReconciliation = async (): Promise<{
  ok: boolean;
  data?: {
    totalChargesChecked: number;
    totalInvoicesChecked: number;
    discrepancyCount: number;
    discrepancies: Array<{
      type: string;
      description: string;
      invoiceId?: string;
      chargeId?: string;
      dbStatus?: string;
      omiseStatus?: string;
      dbAmount?: number;
      omiseAmount?: number;
      chargeCreatedAt?: string;
      invoiceCreatedAt?: string;
    }>;
  };
  error?: string;
}> => {
  if (!API_URL) return { ok: false, error: 'API_URL not configured' };
  try {
    const res = await fetch(`${API_URL}/billing/reconciliation`, {
      method: 'GET',
      headers: {
        ...(await authHeader()),
      },
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.message || 'Failed to fetch reconciliation' };
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Connection error' };
  }
};

/**
 * Super Admin: ซิงค์สถานะใบแจ้งหนี้ให้ตรงกับ Omise Charge จริง
 */
export const syncInvoiceWithOmise = async (
  invoiceId: string,
): Promise<{ ok: boolean; invoice?: any; error?: string }> => {
  if (!API_URL) return { ok: false, error: 'API_URL not configured' };
  try {
    const res = await fetch(`${API_URL}/billing/reconciliation/sync/${invoiceId}`, {
      method: 'POST',
      headers: {
        ...(await authHeader()),
      },
    });
    const json = await res.json();
    if (!res.ok || !json.success) return { ok: false, error: json.message || 'Sync failed' };
    return { ok: true, invoice: json.invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Connection error' };
  }
};

/**
 * Super Admin: ขอคืนเงิน Subscription Invoice ผ่าน Omise Refund API
 */
export const refundInvoiceViaBackend = async (
  invoiceId: string,
  reason: string,
): Promise<{ ok: boolean; refund?: any; error?: string }> => {
  if (!API_URL) return { ok: false, error: 'API_URL not configured' };
  try {
    const res = await fetch(`${API_URL}/billing/invoices/${invoiceId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeader()),
      },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return { ok: false, error: json.message || 'Refund failed' };
    return { ok: true, refund: json.refund };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Connection error' };
  }
};

