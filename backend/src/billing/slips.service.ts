import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

/**
 * SlipsService — ตรวจสอบสลิปโอนเงิน PromptPay
 *
 * ทำไมต้องมี: PromptPay เป็น push payment (ร้านค้าเป็นคนกดโอน) ระบบเราไม่มีทางรู้เองว่าเงินเข้าแล้ว
 * จึงต้องให้แนบสลิปแล้วตรวจ — และ "ตรวจว่าสลิปจริง" อย่างเดียวไม่พอ ต้องครบ 4 ข้อ:
 *
 *   1. amountMatch   ยอดตรงกับใบแจ้งหนี้        กัน: โอน 10 บาทแล้วอ้างว่าจ่าย 990
 *   2. receiverMatch โอนเข้าบัญชีของเราจริง      กัน: เอาสลิปที่โอนหาคนอื่นมาใช้
 *   3. timeValid     เวลาโอนอยู่หลังออกใบแจ้งหนี้ กัน: เอาสลิปเก่ามาใช้
 *   4. refUnique     เลขอ้างอิงไม่เคยถูกใช้       กัน: สลิปใบเดียวใช้ซ้ำหลายรอบ  ← สำคัญที่สุด
 *
 * รองรับผู้ให้บริการตรวจสลิปที่สมัครแบบบุคคลธรรมดาได้ (SlipOK / EasySlip)
 * ถ้าไม่ได้ตั้งค่า API ไว้ ระบบจะเข้าโหมด manual — เข้าคิวให้เจ้าหน้าที่ตรวจเอง
 */

interface SlipVerifyResult {
  ok: boolean;
  transRef?: string;
  senderName?: string;
  senderBank?: string;
  receiverName?: string;
  receiverAccount?: string;
  amount?: number;
  transferredAt?: string;
  raw?: any;
  error?: string;
}

interface SlipSettings {
  slip_verify_provider: 'manual' | 'slipok' | 'easyslip';
  slip_verify_api_key?: string;
  slip_verify_branch_id?: string;
  slip_auto_approve: boolean;
  expected_receiver_name?: string;
  expected_receiver_account?: string;
  slip_time_window_hours: number;
  slip_amount_tolerance: number;
  promptpay_number?: string;
  promptpay_name?: string;
}

@Injectable()
export class SlipsService {
  private readonly logger = new Logger(SlipsService.name);

  constructor(private readonly db: SupabaseService) {}

  // ===============================================================
  // เข้าคิว / ตรวจสลิป
  // ===============================================================

  /**
   * ร้านค้าส่งสลิปเข้ามา (อัปโหลดไฟล์ขึ้น Storage จากฝั่ง frontend แล้วส่ง path มา)
   * ระบบจะพยายามตรวจอัตโนมัติก่อน ถ้าไม่ได้/ไม่ผ่าน จึงเข้าคิวให้คนตรวจ
   */
  async submitSlip(input: {
    tenantId: string;
    invoiceId: string;
    storagePath: string;
    uploadedBy?: string;
    note?: string;
    /** base64 ของรูป (ถ้าส่งมาจะใช้ตรวจกับ API ได้เลย) */
    imageBase64?: string;
  }) {
    const invoice = await this.db.selectOne<any>(`subscription_invoices?id=eq.${input.invoiceId}`);
    if (!invoice) throw new NotFoundException('ไม่พบใบแจ้งหนี้');
    if (invoice.tenant_id !== input.tenantId) throw new BadRequestException('ใบแจ้งหนี้ไม่ตรงกับร้านค้า');
    if (invoice.status === 'paid') throw new BadRequestException('ใบแจ้งหนี้นี้ชำระเรียบร้อยแล้ว');

    const settings = await this.getSlipSettings();

    // สร้างเรคอร์ดสลิปก่อน (กันกรณี API ล่ม ก็ยังมีของให้คนตรวจ)
    const slip = await this.db.insert<any>('payment_slips', {
      tenant_id: input.tenantId,
      invoice_id: input.invoiceId,
      uploaded_by: input.uploadedBy || null,
      storage_path: input.storagePath,
      amount_claimed: invoice.amount,
      verification_status: 'pending',
      verify_provider: settings.slip_verify_provider,
      note: input.note || null,
    });

    // โหมด manual — ไม่ต่อ API ตรวจสลิป
    if (settings.slip_verify_provider === 'manual' || !settings.slip_verify_api_key) {
      await this.db.update(`subscription_invoices?id=eq.${input.invoiceId}`, { status: 'awaiting_review' });
      this.logger.log(`รับสลิป (โหมดตรวจด้วยคน) invoice=${invoice.invoice_no}`);
      return { slipId: slip.id, status: 'pending', autoApproved: false, message: 'ส่งสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ' };
    }

    // ตรวจอัตโนมัติ
    let verify: SlipVerifyResult;
    try {
      verify = await this.verifyWithProvider(settings, { imageBase64: input.imageBase64, storagePath: input.storagePath });
    } catch (err: any) {
      this.logger.error(`เรียก API ตรวจสลิปไม่สำเร็จ: ${err.message}`);
      verify = { ok: false, error: err.message };
    }

    const checks = await this.runChecks(verify, invoice, settings, slip.id);
    const allPassed = verify.ok && Object.values(checks).every((c: any) => c.pass);

    await this.db.update(`payment_slips?id=eq.${slip.id}`, {
      verification_status: allPassed ? 'auto_verified' : 'auto_rejected',
      trans_ref: verify.transRef || null,
      sender_name: verify.senderName || null,
      sender_bank: verify.senderBank || null,
      receiver_name: verify.receiverName || null,
      receiver_account: verify.receiverAccount || null,
      amount_verified: verify.amount ?? null,
      transferred_at: verify.transferredAt || null,
      checks,
      raw_response: verify.raw || { error: verify.error },
      reject_reason: allPassed ? null : this.summarizeFailures(checks, verify.error),
    });

    // ผ่านครบ + เปิดอนุมัติอัตโนมัติ → ต่ออายุให้เลย
    if (allPassed && settings.slip_auto_approve) {
      await this.approveInvoice(invoice, slip.id);
      this.logger.log(`อนุมัติอัตโนมัติ invoice=${invoice.invoice_no} ref=${verify.transRef}`);
      return { slipId: slip.id, status: 'auto_verified', autoApproved: true, checks, message: 'ตรวจสอบผ่าน ต่ออายุแพ็กเกจเรียบร้อย' };
    }

    await this.db.update(`subscription_invoices?id=eq.${input.invoiceId}`, { status: 'awaiting_review' });
    return {
      slipId: slip.id,
      status: allPassed ? 'auto_verified' : 'auto_rejected',
      autoApproved: false,
      checks,
      message: allPassed
        ? 'ตรวจสอบผ่าน รอเจ้าหน้าที่กดยืนยันขั้นสุดท้าย'
        : `ตรวจสอบไม่ผ่าน: ${this.summarizeFailures(checks, verify.error)} — ส่งให้เจ้าหน้าที่ตรวจสอบแล้ว`,
    };
  }

  /**
   * ตรวจ 4 ข้อ
   * แยกออกมาเป็นเมธอดเดียวเพื่อให้ทั้ง auto และ manual ใช้ผลชุดเดียวกัน
   */
  private async runChecks(verify: SlipVerifyResult, invoice: any, settings: SlipSettings, slipId: string) {
    // 1. ยอดเงินตรง (ยอมให้คลาดเคลื่อนได้ตาม tolerance)
    const tolerance = Number(settings.slip_amount_tolerance || 0);
    const expected = Number(invoice.amount);
    const actual = Number(verify.amount ?? 0);
    const amountMatch = {
      pass: verify.ok && Math.abs(actual - expected) <= tolerance,
      label: 'ยอดเงินตรงกับใบแจ้งหนี้',
      detail: `สลิป ฿${actual.toLocaleString()} / ต้องจ่าย ฿${expected.toLocaleString()}`,
    };

    // 2. บัญชีปลายทางเป็นของเราจริง — เทียบ 4 ตัวท้ายของเลขบัญชี หรือชื่อผู้รับ
    const expectedAcct = (settings.expected_receiver_account || settings.promptpay_number || '').replace(/\D/g, '');
    const gotAcct = (verify.receiverAccount || '').replace(/\D/g, '');
    const acctMatch = expectedAcct && gotAcct ? gotAcct.slice(-4) === expectedAcct.slice(-4) : false;
    const nameMatch = this.looseNameMatch(verify.receiverName, settings.expected_receiver_name || settings.promptpay_name);
    const receiverMatch = {
      pass: verify.ok && (acctMatch || nameMatch),
      label: 'โอนเข้าบัญชีของแพลตฟอร์ม',
      detail: verify.receiverName || verify.receiverAccount || 'ไม่พบข้อมูลผู้รับในสลิป',
    };

    // 3. เวลาโอนต้องอยู่หลังออกใบแจ้งหนี้ และไม่เกินกรอบเวลาที่กำหนด
    const invoiceAt = new Date(invoice.created_at).getTime();
    const transferAt = verify.transferredAt ? new Date(verify.transferredAt).getTime() : 0;
    const windowMs = (settings.slip_time_window_hours || 72) * 3600_000;
    const timeValid = {
      pass: verify.ok && transferAt > 0 && transferAt >= invoiceAt - 3600_000 && transferAt <= invoiceAt + windowMs,
      label: 'เวลาโอนอยู่ในช่วงที่ถูกต้อง',
      detail: verify.transferredAt
        ? new Date(verify.transferredAt).toLocaleString('th-TH')
        : 'ไม่พบเวลาโอนในสลิป',
    };

    // 4. เลขอ้างอิงไม่เคยถูกใช้ — กันสลิปซ้ำ (ข้อสำคัญที่สุด)
    let refUniquePass = false;
    if (verify.transRef) {
      const dup = await this.db.select<any>(
        `payment_slips?trans_ref=eq.${encodeURIComponent(verify.transRef)}&id=neq.${slipId}&select=id,tenant_id,created_at`,
      );
      refUniquePass = !dup || dup.length === 0;
    }
    const refUnique = {
      pass: refUniquePass,
      label: 'เลขอ้างอิงรายการไม่ซ้ำ',
      detail: verify.transRef ? (refUniquePass ? verify.transRef : `⚠️ สลิปนี้เคยถูกใช้แล้ว (${verify.transRef})`) : 'ไม่พบเลขอ้างอิง',
    };

    return { amountMatch, receiverMatch, timeValid, refUnique };
  }

  private summarizeFailures(checks: any, apiError?: string): string {
    if (apiError) return apiError;
    const failed = Object.values(checks)
      .filter((c: any) => !c.pass)
      .map((c: any) => c.label);
    return failed.length ? failed.join(', ') : 'ไม่ทราบสาเหตุ';
  }

  /** เทียบชื่อแบบหลวม ๆ (สลิปมักปิดบางส่วนเป็น x หรือย่อชื่อ) */
  private looseNameMatch(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    const norm = (s: string) =>
      s.replace(/นาย|นาง|นางสาว|น\.ส\.|บริษัท|จำกัด|MR|MRS|MS|\.|\s|x|X|\*/g, '').toLowerCase();
    const na = norm(a);
    const nb = norm(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
  }

  // ===============================================================
  // Provider adapters
  // ===============================================================

  private async verifyWithProvider(
    settings: SlipSettings,
    payload: { imageBase64?: string; storagePath?: string },
  ): Promise<SlipVerifyResult> {
    switch (settings.slip_verify_provider) {
      case 'slipok':
        return this.verifyWithSlipOk(settings, payload);
      case 'easyslip':
        return this.verifyWithEasySlip(settings, payload);
      default:
        return { ok: false, error: 'ยังไม่ได้ตั้งค่าบริการตรวจสลิป' };
    }
  }

  /**
   * SlipOK — https://slipok.com
   * ส่งรูปสลิปไปที่ /api/line/apikey/{branchId} พร้อม header x-authorization: {apiKey}
   */
  private async verifyWithSlipOk(settings: SlipSettings, payload: { imageBase64?: string }): Promise<SlipVerifyResult> {
    if (!payload.imageBase64) return { ok: false, error: 'ไม่มีไฟล์รูปสลิปสำหรับตรวจสอบ' };

    const res = await fetch(`https://api.slipok.com/api/line/apikey/${settings.slip_verify_branch_id}`, {
      method: 'POST',
      headers: {
        'x-authorization': settings.slip_verify_api_key as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: payload.imageBase64, log: true }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      return { ok: false, error: json.message || `ตรวจสลิปไม่สำเร็จ (${res.status})`, raw: json };
    }

    const d = json.data || {};
    return {
      ok: true,
      transRef: d.transRef,
      senderName: d.sender?.displayName || d.sender?.name,
      senderBank: d.sendingBank,
      receiverName: d.receiver?.displayName || d.receiver?.name,
      receiverAccount: d.receiver?.account?.value || d.receiver?.proxy?.value,
      amount: Number(d.amount),
      transferredAt: d.transTimestamp || (d.transDate && d.transTime ? `${d.transDate}T${d.transTime}` : undefined),
      raw: json,
    };
  }

  /**
   * EasySlip — https://easyslip.com
   * ส่ง base64 ไปที่ /api/v1/verify พร้อม Bearer token
   */
  private async verifyWithEasySlip(settings: SlipSettings, payload: { imageBase64?: string }): Promise<SlipVerifyResult> {
    if (!payload.imageBase64) return { ok: false, error: 'ไม่มีไฟล์รูปสลิปสำหรับตรวจสอบ' };

    const res = await fetch('https://developer.easyslip.com/api/v1/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.slip_verify_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: payload.imageBase64 }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== 200) {
      return { ok: false, error: json.message || `ตรวจสลิปไม่สำเร็จ (${res.status})`, raw: json };
    }

    const d = json.data || {};
    return {
      ok: true,
      transRef: d.transRef || d.ref1,
      senderName: d.sender?.account?.name?.th || d.sender?.account?.name?.en,
      senderBank: d.sender?.bank?.name,
      receiverName: d.receiver?.account?.name?.th || d.receiver?.account?.name?.en,
      receiverAccount: d.receiver?.account?.bank?.account || d.receiver?.account?.proxy?.account,
      amount: Number(d.amount?.amount ?? d.amount),
      transferredAt: d.date,
      raw: json,
    };
  }

  // ===============================================================
  // อนุมัติ / ปฏิเสธ (เจ้าหน้าที่)
  // ===============================================================

  async listSlips(filter: { status?: string; tenantId?: string } = {}) {
    const conditions: string[] = [];
    if (filter.tenantId) conditions.push(`tenant_id=eq.${filter.tenantId}`);
    if (filter.status === 'pending') {
      // คิวที่ต้องตรวจ = ยังไม่ได้ตัดสินโดยคน
      conditions.push(`verification_status=in.(pending,auto_rejected,auto_verified)`);
    } else if (filter.status) {
      conditions.push(`verification_status=eq.${filter.status}`);
    }

    const query = ['order=created_at.desc', 'limit=100', ...conditions].join('&');
    return (await this.db.select<any>(`pending_slip_reviews?${query}`)) || [];
  }

  /** เจ้าหน้าที่อนุมัติสลิป → ต่ออายุแพ็กเกจให้ร้านค้า */
  async approveSlip(slipId: string, reviewerId?: string) {
    const slip = await this.db.selectOne<any>(`payment_slips?id=eq.${slipId}`);
    if (!slip) throw new NotFoundException('ไม่พบสลิป');

    const invoice = await this.db.selectOne<any>(`subscription_invoices?id=eq.${slip.invoice_id}`);
    if (!invoice) throw new NotFoundException('ไม่พบใบแจ้งหนี้ของสลิปนี้');
    if (invoice.status === 'paid') throw new BadRequestException('ใบแจ้งหนี้นี้ถูกอนุมัติไปแล้ว');

    await this.db.update(`payment_slips?id=eq.${slipId}`, {
      verification_status: 'manual_approved',
      reviewed_by: reviewerId || null,
      reviewed_at: new Date().toISOString(),
      reject_reason: null,
    });

    await this.approveInvoice(invoice, slipId);
    this.logger.log(`อนุมัติสลิปด้วยเจ้าหน้าที่ invoice=${invoice.invoice_no} โดย=${reviewerId || 'unknown'}`);
    return { success: true };
  }

  async rejectSlip(slipId: string, reason: string, reviewerId?: string) {
    const slip = await this.db.selectOne<any>(`payment_slips?id=eq.${slipId}`);
    if (!slip) throw new NotFoundException('ไม่พบสลิป');

    await this.db.update(`payment_slips?id=eq.${slipId}`, {
      verification_status: 'manual_rejected',
      reviewed_by: reviewerId || null,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    });

    // ใบแจ้งหนี้กลับไปสถานะรอชำระ ให้ร้านค้าส่งสลิปใหม่ได้
    await this.db.update(`subscription_invoices?id=eq.${slip.invoice_id}`, {
      status: 'pending',
      failure_reason: reason,
    });

    this.logger.log(`ปฏิเสธสลิป slip=${slipId} เหตุผล=${reason}`);
    return { success: true };
  }

  /**
   * อนุมัติใบแจ้งหนี้ → mark paid + ต่ออายุแพ็กเกจ + ขยายรอบ subscription (ถ้ามี)
   */
  private async approveInvoice(invoice: any, slipId: string) {
    await this.db.update(`subscription_invoices?id=eq.${invoice.id}`, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      provider_ref: `slip:${slipId}`,
      failure_reason: null,
    });

    await this.db.update(`tenants?id=eq.${invoice.tenant_id}`, {
      plan: invoice.plan,
      plan_expires_at: invoice.period_end,
    });

    if (invoice.subscription_id) {
      await this.db.update(`subscriptions?id=eq.${invoice.subscription_id}`, {
        plan: invoice.plan,
        billing_cycle: invoice.billing_cycle,
        status: 'active',
        current_period_start: invoice.period_start,
        current_period_end: invoice.period_end,
        retry_count: 0,
        next_retry_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // ===============================================================
  // แจ้งเตือนก่อนหมดอายุ (PromptPay ต่ออายุเองไม่ได้ จึงต้องเตือน)
  // ===============================================================

  async sendRenewalReminders(): Promise<number> {
    if (!this.db.isConfigured) return 0;

    const settings = await this.db.selectOne<any>('platform_settings?id=eq.1&select=renewal_reminder_days');
    const days: number[] = settings?.renewal_reminder_days?.length ? settings.renewal_reminder_days : [7, 3, 1];

    let sent = 0;
    for (const d of days) {
      const from = new Date(Date.now() + d * 864e5);
      const to = new Date(from.getTime() + 864e5);

      const tenants =
        (await this.db.select<any>(
          `tenants?plan=neq.free&plan_expires_at=gte.${from.toISOString()}&plan_expires_at=lt.${to.toISOString()}&select=id,name,plan,plan_expires_at`,
        )) || [];

      for (const t of tenants) {
        this.logger.log(
          `[แจ้งเตือน tenant=${t.id}] แพ็กเกจ ${t.plan.toUpperCase()} จะหมดอายุในอีก ${d} วัน (${new Date(
            t.plan_expires_at,
          ).toLocaleDateString('th-TH')}) — กรุณาต่ออายุ`,
        );
        sent++;
      }
    }

    if (sent) this.logger.log(`ส่งการแจ้งเตือนก่อนหมดอายุ ${sent} ร้าน`);
    return sent;
  }

  // ===============================================================
  private async getSlipSettings(): Promise<SlipSettings> {
    const row = await this.db.selectOne<SlipSettings>('platform_settings?id=eq.1');
    return (
      row || {
        slip_verify_provider: 'manual',
        slip_auto_approve: true,
        slip_time_window_hours: 72,
        slip_amount_tolerance: 0,
      }
    );
  }
}
