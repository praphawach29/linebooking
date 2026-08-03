/**
 * Payment Slips — อัปโหลดสลิปโอนเงิน PromptPay และติดตามผลการตรวจสอบ
 *
 * ขั้นตอน:
 *   1. อัปโหลดรูปขึ้น Supabase Storage (bucket: payment-slips, private)
 *   2. ส่ง path + base64 ไปที่ Backend เพื่อตรวจสอบ
 *   3. ถ้าไม่มี Backend → บันทึกลงตารางตรงจาก client แล้วเข้าคิวให้เจ้าหน้าที่ตรวจ
 */

import { supabase } from './supabase';
import { authHeader } from './subscriptions';

const API_URL = import.meta.env.VITE_API_URL || '';
const BUCKET = 'payment-slips';

export type SlipStatus = 'pending' | 'auto_verified' | 'auto_rejected' | 'manual_approved' | 'manual_rejected';

export interface SlipCheck {
  pass: boolean;
  label: string;
  detail: string;
}

export interface SlipChecks {
  amountMatch?: SlipCheck;
  receiverMatch?: SlipCheck;
  timeValid?: SlipCheck;
  refUnique?: SlipCheck;
}

export interface PaymentSlip {
  id: string;
  tenantId: string;
  tenantName?: string;
  tenantLogo?: string;
  invoiceId: string;
  invoiceNo?: string;
  plan?: string;
  billingCycle?: string;
  amountClaimed: number;
  amountVerified?: number;
  storagePath: string;
  verificationStatus: SlipStatus;
  verifyProvider: string;
  transRef?: string;
  senderName?: string;
  senderBank?: string;
  receiverName?: string;
  transferredAt?: string;
  checks?: SlipChecks;
  rejectReason?: string;
  note?: string;
  createdAt: string;
}

const rowToSlip = (r: any): PaymentSlip => ({
  id: r.id,
  tenantId: r.tenant_id,
  tenantName: r.tenant_name,
  tenantLogo: r.tenant_logo,
  invoiceId: r.invoice_id,
  invoiceNo: r.invoice_no,
  plan: r.plan,
  billingCycle: r.billing_cycle,
  amountClaimed: Number(r.amount_claimed),
  amountVerified: r.amount_verified != null ? Number(r.amount_verified) : undefined,
  storagePath: r.storage_path,
  verificationStatus: r.verification_status,
  verifyProvider: r.verify_provider,
  transRef: r.trans_ref || undefined,
  senderName: r.sender_name || undefined,
  senderBank: r.sender_bank || undefined,
  receiverName: r.receiver_name || undefined,
  transferredAt: r.transferred_at || undefined,
  checks: r.checks || undefined,
  rejectReason: r.reject_reason || undefined,
  note: r.note || undefined,
  createdAt: r.created_at,
});

/** อ่านไฟล์เป็น base64 (ตัด data URI prefix ออก) สำหรับส่งให้ API ตรวจสลิป */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });

export const MAX_SLIP_SIZE = 5 * 1024 * 1024; // 5 MB — ตรงกับ limit ของ bucket

export interface SubmitSlipResult {
  slipId: string;
  status: SlipStatus;
  autoApproved: boolean;
  checks?: SlipChecks;
  message: string;
}

/**
 * อัปโหลดสลิป + ส่งตรวจสอบ
 */
export const submitSlip = async (input: {
  tenantId: string;
  invoiceId: string;
  file: File;
  uploadedBy?: string;
  note?: string;
}): Promise<SubmitSlipResult> => {
  if (input.file.size > MAX_SLIP_SIZE) {
    throw new Error('ไฟล์ใหญ่เกิน 5 MB กรุณาย่อรูปก่อนอัปโหลด');
  }

  const ext = input.file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${input.tenantId}/${input.invoiceId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, input.file, {
    contentType: input.file.type,
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`อัปโหลดสลิปไม่สำเร็จ: ${uploadError.message}`);
  }

  // มี Backend → ให้ Backend ตรวจ (API key ของบริการตรวจสลิปอยู่ฝั่งเซิร์ฟเวอร์)
  if (API_URL) {
    const imageBase64 = await fileToBase64(input.file);
    const res = await fetch(`${API_URL}/billing/slips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        storagePath: path,
        note: input.note,
        imageBase64,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as any).message || 'ส่งสลิปไม่สำเร็จ');
    return json as SubmitSlipResult;
  }

  // ไม่มี Backend → บันทึกเข้าคิวให้เจ้าหน้าที่ตรวจด้วยมือ
  const { data, error } = await supabase
    .from('payment_slips')
    .insert([
      {
        tenant_id: input.tenantId,
        invoice_id: input.invoiceId,
        uploaded_by: input.uploadedBy || null,
        storage_path: path,
        amount_claimed: 0, // Backend จะเติมจากใบแจ้งหนี้ — โหมดนี้ให้เจ้าหน้าที่ดูจากใบแจ้งหนี้แทน
        verification_status: 'pending',
        verify_provider: 'manual',
        note: input.note || null,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`บันทึกสลิปไม่สำเร็จ: ${error.message}`);

  await supabase.from('subscription_invoices').update({ status: 'awaiting_review' }).eq('id', input.invoiceId);

  return {
    slipId: (data as any).id,
    status: 'pending',
    autoApproved: false,
    message: 'ส่งสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ',
  };
};

/** ขอ signed URL สำหรับดูรูปสลิป (bucket เป็น private) */
export const getSlipImageUrl = async (storagePath: string, expiresInSec = 300): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSec);
  if (error) {
    console.error('[slips] ขอ signed URL ไม่สำเร็จ:', error.message);
    return null;
  }
  return data.signedUrl;
};

/** รายการสลิป — ใช้ view pending_slip_reviews ที่ join ข้อมูลร้านค้า/ใบแจ้งหนี้มาให้แล้ว */
export const fetchSlips = async (filter: { tenantId?: string; onlyPending?: boolean } = {}): Promise<PaymentSlip[]> => {
  let query = supabase.from('pending_slip_reviews').select('*').limit(100);
  if (filter.tenantId) query = query.eq('tenant_id', filter.tenantId);
  if (filter.onlyPending) {
    query = query.in('verification_status', ['pending', 'auto_rejected', 'auto_verified']);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[slips] อ่านรายการสลิปไม่สำเร็จ:', error.message);
    return [];
  }
  return (data || []).map(rowToSlip);
};

export const countPendingSlips = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('payment_slips')
    .select('id', { count: 'exact', head: true })
    .in('verification_status', ['pending', 'auto_rejected', 'auto_verified']);
  return error ? 0 : count || 0;
};

// ---------------------------------------------------------------
// อนุมัติ / ปฏิเสธ (เจ้าหน้าที่)
// ---------------------------------------------------------------

/**
 * ผู้อนุมัติ (reviewerId) ไม่ได้ส่งจากที่นี่ — Backend ดึงจาก token เอง
 * เพื่อไม่ให้ปลอมชื่อผู้อนุมัติได้
 */
const review = async (slipId: string, action: 'approve' | 'reject', body: any) => {
  if (!API_URL) {
    throw new Error('การอนุมัติต้องทำผ่าน Backend — กรุณาตั้งค่า VITE_API_URL');
  }
  const res = await fetch(`${API_URL}/billing/slips/${slipId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403) throw new Error('ต้องเป็นผู้ดูแลระบบเท่านั้นจึงจะอนุมัติสลิปได้');
    throw new Error((json as any).message || 'ดำเนินการไม่สำเร็จ');
  }
  return json;
};

export const approveSlip = (slipId: string) => review(slipId, 'approve', {});

export const rejectSlip = (slipId: string, reason: string) => review(slipId, 'reject', { reason });

export const slipStatusLabel = (
  status: SlipStatus
): { text: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } => {
  switch (status) {
    case 'auto_verified':
      return { text: 'ตรวจอัตโนมัติผ่าน', tone: 'success' };
    case 'manual_approved':
      return { text: 'อนุมัติแล้ว', tone: 'success' };
    case 'auto_rejected':
      return { text: 'ตรวจอัตโนมัติไม่ผ่าน', tone: 'danger' };
    case 'manual_rejected':
      return { text: 'ถูกปฏิเสธ', tone: 'danger' };
    default:
      return { text: 'รอตรวจสอบ', tone: 'warning' };
  }
};
