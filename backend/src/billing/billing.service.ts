import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OmiseService } from './omise.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { SubscriptionsService } from './subscriptions.service';

/**
 * BillingService — การชำระเงินแบบครั้งเดียว (one-time) + รับ Webhook จาก Omise
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
   * Webhook จาก Omise — แหล่งความจริงของสถานะการชำระเงิน
   * ตั้งที่ Omise Dashboard → Webhooks: https://<backend>/billing/webhook
   *
   * อย่าเชื่อผลลัพธ์จาก HTTP response ตอน charge อย่างเดียว เพราะอาจ timeout ทั้งที่เงินตัดไปแล้ว
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

    if (verified.status === 'successful' || verified.paid === true) {
      await this.markInvoicePaid(invoiceId, verified.id);
      if (tenantId) await this.extendTenantPlan(invoiceId, tenantId);
      // ถ้าใบนี้ผูกกับ subscription ให้ขยายรอบบิลด้วย
      await this.subscriptions.syncFromPaidInvoice(invoiceId);
      this.logger.log(`ชำระเงินสำเร็จ (webhook) invoice=${invoiceId} charge=${verified.id}`);
    } else if (verified.status === 'failed' || verified.status === 'expired') {
      await this.markInvoiceFailed(invoiceId, verified.failure_message || verified.status);
    }

    return { received: true };
  }

  // ---------------------------------------------------------------
  private async markInvoicePaid(invoiceId: string, chargeId: string) {
    await this.db.update(`subscription_invoices?id=eq.${invoiceId}`, {
      status: 'paid',
      paid_at: new Date().toISOString(),
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
