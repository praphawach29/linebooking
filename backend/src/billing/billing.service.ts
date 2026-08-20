import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { OmiseService } from './omise.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { SubscriptionsService } from './subscriptions.service';

export interface ReconciliationDiscrepancy {
  invoiceId: string;
  invoiceNo?: string;
  tenantId?: string;
  omiseChargeId: string;
  omiseStatus: string;
  dbStatus: string;
  omiseAmount: number;
  dbAmount: number;
  type: 'status_mismatch' | 'amount_mismatch' | 'unrecorded_refund' | 'missing_in_db';
}

export interface ReconciliationResult {
  reconciledAt: string;
  totalOmiseCharges: number;
  matchedCount: number;
  discrepancyCount: number;
  discrepancies: ReconciliationDiscrepancy[];
}

/**
 * BillingService — การชำระเงินแบบครั้งเดียว (one-time) + รับ Webhook จาก Omise + Reconciliation
 *
 * การตัดเงินรอบต่ออายุอัตโนมัติอยู่ที่ SubscriptionsService
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly omise: OmiseService,
    private readonly db: SupabaseService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * ตัดเงินครั้งเดียวจาก token บัตร (ไม่ผูกบัตรไว้ ไม่ต่ออายุอัตโนมัติ)
   * ใช้กับปุ่ม "จ่ายรอบนี้ครั้งเดียว" ในหน้า Merchant
   */
  async createCharge(input: {
    invoiceId: string;
    tenantId: string;
    amount: number;
    currency?: string;
    token?: string;
    source?: 'promptpay';
    description: string;
  }) {
    if (!input.token && !input.source) {
      throw new BadRequestException('ต้องระบุ token บัตร หรือ source อย่างใดอย่างหนึ่ง');
    }

    let charge: any;

    if (input.token) {
      charge = await this.omise.createCharge({
        amountBaht: input.amount,
        currency: input.currency,
        description: input.description,
        token: input.token,
        returnUri: process.env.BILLING_RETURN_URI,
        metadata: { invoice_id: input.invoiceId, tenant_id: input.tenantId },
        idempotencyKey: `once_${input.invoiceId}`,
      });
    } else {
      // PromptPay ผ่าน Omise — ได้ QR ที่ยืนยันผลอัตโนมัติผ่าน webhook
      const src = await this.omise.createPromptPaySource(input.amount, input.currency);
      charge = await this.omise.createChargeFromSource({
        sourceId: src.id,
        amountBaht: input.amount,
        currency: input.currency,
        description: input.description,
        metadata: { invoice_id: input.invoiceId, tenant_id: input.tenantId },
        idempotencyKey: `once_${input.invoiceId}`,
      });
    }

    const paid = charge.status === 'successful' || charge.paid === true;

    if (paid) {
      await this.markInvoicePaid(input.invoiceId, charge.id);
      await this.extendTenantPlan(input.invoiceId, input.tenantId);
    } else if (charge.status === 'failed') {
      await this.markInvoiceFailed(input.invoiceId, charge.failure_message || charge.failure_code);
      throw new BadRequestException(charge.failure_message || 'ตัดบัตรไม่สำเร็จ');
    }

    return {
      success: true,
      chargeId: charge.id,
      status: charge.status,
      // PromptPay ผ่าน Omise จะมี QR ให้สแกน
      qrImageUrl: charge.source?.scannable_code?.image?.download_uri,
      authorizeUri: charge.authorize_uri, // กรณีต้องทำ 3DS
    };
  }

  /**
   * Webhook จาก Omise — แหล่งความจริงของสถานะการชำระเงิน พร้อม Idempotency Guard
   * ตั้งที่ Omise Dashboard → Webhooks: https://<backend>/billing/webhook
   */
  async handleWebhook(event: any) {
    const type = event?.key || event?.type;
    const charge = event?.data;
    if (!charge?.id) return { received: true };

    const invoiceId = charge.metadata?.invoice_id;
    const tenantId = charge.metadata?.tenant_id;

    if (!invoiceId) {
      this.logger.warn(`Webhook ${type} ไม่มี metadata.invoice_id — ข้าม (charge=${charge.id})`);
      return { received: true };
    }

    // ยืนยันกับ Omise อีกครั้งเพื่อกัน webhook ปลอม
    let verified = charge;
    try {
      verified = await this.omise.retrieveCharge(charge.id);
    } catch (err: any) {
      this.logger.error(`ตรวจสอบ charge ${charge.id} กับ Omise ไม่สำเร็จ: ${err.message}`);
      return { received: true };
    }

    // ตรวจสอบสถานะปัจจุบันของ Invoice ใน DB เพื่อป้องกันการประมวลผลซ้ำ (Idempotency)
    const currentInvoice = await this.db.selectOne<{ id: string; status: string; amount: number }>(
      `subscription_invoices?id=eq.${invoiceId}&select=id,status,amount`,
    );

    if (!currentInvoice) {
      this.logger.warn(`Webhook ${type} อ้างอิง invoice ${invoiceId} ที่ไม่มีอยู่ในระบบ`);
      return { received: true, error: 'invoice_not_found' };
    }

    // กรณีคืนเงิน (Refunded)
    const isRefunded = verified.refunded === true || (verified.refunds && verified.refunds.total > 0);
    if (isRefunded) {
      if (currentInvoice.status === 'refunded') {
        this.logger.log(`Invoice ${invoiceId} เป็นสถานะ refunded อยู่แล้ว (Idempotent Webhook)`);
        return { received: true, idempotent: true };
      }
      await this.markInvoiceRefunded(invoiceId, verified.id);
      this.logger.log(`บันทึกการคืนเงินสำเร็จ (webhook) invoice=${invoiceId} charge=${verified.id}`);
      return { received: true, status: 'refunded' };
    }

    // กรณีชำระเงินสำเร็จ (Successful / Paid)
    if (verified.status === 'successful' || verified.paid === true) {
      if (currentInvoice.status === 'paid') {
        this.logger.log(`Invoice ${invoiceId} เป็นสถานะ paid อยู่แล้ว (Idempotent Webhook)`);
        return { received: true, idempotent: true };
      }

      await this.markInvoicePaid(invoiceId, verified.id);
      if (tenantId) await this.extendTenantPlan(invoiceId, tenantId);
      // ถ้าใบนี้ผูกกับ subscription ให้ขยายรอบบิลด้วย
      await this.subscriptions.syncFromPaidInvoice(invoiceId);
      this.logger.log(`ชำระเงินสำเร็จ (webhook) invoice=${invoiceId} charge=${verified.id}`);
      return { received: true, status: 'paid' };
    }

    // กรณีชำระเงินล้มเหลว (Failed / Expired)
    if (verified.status === 'failed' || verified.status === 'expired') {
      if (currentInvoice.status === 'failed') {
        return { received: true, idempotent: true };
      }
      await this.markInvoiceFailed(invoiceId, verified.failure_message || verified.status);
      return { received: true, status: 'failed' };
    }

    return { received: true };
  }

  /**
   * กระทบยอดธุรกรรมระหว่าง Omise Payment Gateway กับฐานข้อมูล (Reconciliation)
   */
  async reconcileWithOmise(limit = 50): Promise<ReconciliationResult> {
    if (!this.omise.isConfigured) {
      throw new BadRequestException('Omise API ยังไม่ได้ตั้งค่า OMISE_SECRET_KEY');
    }

    const omiseChargesResponse = await this.omise.listCharges(limit);
    const omiseCharges: any[] = omiseChargesResponse?.data || [];

    const invoices = (await this.db.select<any>(
      `subscription_invoices?order=created_at.desc&limit=${limit * 2}`,
    )) || [];

    const invoiceMap = new Map<string, any>();
    const invoiceByRefMap = new Map<string, any>();
    for (const inv of invoices) {
      invoiceMap.set(inv.id, inv);
      if (inv.provider_ref) {
        invoiceByRefMap.set(inv.provider_ref, inv);
      }
    }

    let matchedCount = 0;
    const discrepancies: ReconciliationDiscrepancy[] = [];

    for (const ch of omiseCharges) {
      const invoiceId = ch.metadata?.invoice_id;
      const omiseStatus = ch.refunded ? 'refunded' : ch.paid || ch.status === 'successful' ? 'paid' : ch.status;
      const omiseAmount = ch.amount ? ch.amount / 100 : 0;

      const dbInvoice = (invoiceId ? invoiceMap.get(invoiceId) : null) || invoiceByRefMap.get(ch.id);

      if (!dbInvoice) {
        if (invoiceId) {
          discrepancies.push({
            invoiceId,
            omiseChargeId: ch.id,
            omiseStatus,
            dbStatus: 'not_found',
            omiseAmount,
            dbAmount: 0,
            type: 'missing_in_db',
          });
        }
        continue;
      }

      const dbStatus = dbInvoice.status;
      const dbAmount = Number(dbInvoice.amount || 0);

      const statusMatch = (omiseStatus === 'paid' && dbStatus === 'paid') ||
                          (omiseStatus === 'refunded' && dbStatus === 'refunded') ||
                          (omiseStatus === 'failed' && dbStatus === 'failed');
      const amountMatch = Math.abs(omiseAmount - dbAmount) < 0.01;

      if (statusMatch && amountMatch) {
        matchedCount++;
      } else {
        let type: ReconciliationDiscrepancy['type'] = 'status_mismatch';
        if (!amountMatch) type = 'amount_mismatch';
        if (omiseStatus === 'refunded' && dbStatus !== 'refunded') type = 'unrecorded_refund';

        discrepancies.push({
          invoiceId: dbInvoice.id,
          invoiceNo: dbInvoice.invoice_no,
          tenantId: dbInvoice.tenant_id,
          omiseChargeId: ch.id,
          omiseStatus,
          dbStatus,
          omiseAmount,
          dbAmount,
          type,
        });
      }
    }

    return {
      reconciledAt: new Date().toISOString(),
      totalOmiseCharges: omiseCharges.length,
      matchedCount,
      discrepancyCount: discrepancies.length,
      discrepancies,
    };
  }

  /**
   * สั่ง Sync บังคับแก้ไข Invoice ที่มีสถานะไม่ตรงกับ Omise จากผลการ Reconciliation
   */
  async syncInvoiceFromOmise(invoiceId: string): Promise<{ success: boolean; updatedStatus: string }> {
    const invoice = await this.db.selectOne<any>(`subscription_invoices?id=eq.${invoiceId}`);
    if (!invoice) throw new NotFoundException('ไม่พบใบแจ้งหนี้นี้');

    if (!invoice.provider_ref) {
      throw new BadRequestException('ใบแจ้งหนี้นี้ยังไม่มีการผูก Charge ID ของ Omise');
    }

    const verified = await this.omise.retrieveCharge(invoice.provider_ref);
    if (!verified) throw new NotFoundException('ไม่พบข้อมูล Charge ใน Omise');

    if (verified.refunded) {
      await this.markInvoiceRefunded(invoiceId, verified.id);
      return { success: true, updatedStatus: 'refunded' };
    } else if (verified.paid || verified.status === 'successful') {
      await this.markInvoicePaid(invoiceId, verified.id);
      await this.extendTenantPlan(invoiceId, invoice.tenant_id);
      await this.subscriptions.syncFromPaidInvoice(invoiceId);
      return { success: true, updatedStatus: 'paid' };
    } else if (verified.status === 'failed') {
      await this.markInvoiceFailed(invoiceId, verified.failure_message || 'Omise marked failed');
      return { success: true, updatedStatus: 'failed' };
    }

    return { success: true, updatedStatus: invoice.status };
  }

  // ---------------------------------------------------------------
  private async markInvoicePaid(invoiceId: string, chargeId: string) {
    await this.db.update(`subscription_invoices?id=eq.${invoiceId}`, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      provider_ref: chargeId,
    });
  }

  private async markInvoiceRefunded(invoiceId: string, chargeId: string) {
    await this.db.update(`subscription_invoices?id=eq.${invoiceId}`, {
      status: 'refunded',
      provider_ref: chargeId,
    });
  }

  private async markInvoiceFailed(invoiceId: string, reason: string) {
    await this.db.update(`subscription_invoices?id=eq.${invoiceId}`, {
      status: 'failed',
      failure_reason: reason,
    });
  }

  /** ต่ออายุแพ็กเกจร้านค้าตาม period_end ที่ระบุไว้ในใบแจ้งหนี้ */
  private async extendTenantPlan(invoiceId: string, tenantId: string) {
    const invoice = await this.db.selectOne<{ plan: string; period_end: string }>(
      `subscription_invoices?id=eq.${invoiceId}&select=plan,period_end`,
    );
    if (!invoice) return;

    await this.db.update(`tenants?id=eq.${tenantId}`, {
      plan: invoice.plan,
      plan_expires_at: invoice.period_end,
    });
  }
}
