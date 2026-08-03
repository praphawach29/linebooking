import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { OmiseService } from './omise.service';
import { SupabaseService } from '../common/supabase/supabase.service';

type BillingCycle = 'monthly' | 'yearly';
type Plan = 'free' | 'pro' | 'enterprise';

interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan: Plan;
  billing_cycle: BillingCycle;
  status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  default_payment_method_id: string | null;
  retry_count: number;
  next_retry_at: string | null;
  pending_plan: Plan | null;
  pending_billing_cycle: BillingCycle | null;
}

interface PaymentMethodRow {
  id: string;
  tenant_id: string;
  omise_customer_id: string;
  omise_card_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface PlatformSettingsRow {
  price_pro_monthly: number;
  price_pro_yearly: number;
  price_enterprise_monthly: number;
  price_enterprise_yearly: number;
  currency: string;
  dunning_retry_days: number[];
  grace_period_days: number;
  trial_days: number;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly omise: OmiseService,
    private readonly db: SupabaseService,
  ) {}

  // ===============================================================
  // การผูกบัตร (Vaulting)
  // ===============================================================

  /**
   * ผูกบัตรใหม่ให้ร้านค้า
   * frontend ส่ง token ที่สร้างจาก Omise Vault ด้วย public key มาให้ (ไม่เคยมีเลขบัตรผ่าน server เรา)
   */
  async attachPaymentMethod(input: {
    tenantId: string;
    token: string;
    email?: string;
    mandateAccepted: boolean;
    mandateIp?: string;
    mandateText?: string;
  }) {
    if (!input.mandateAccepted) {
      throw new BadRequestException('ต้องยินยอมเงื่อนไขการตัดเงินอัตโนมัติก่อนผูกบัตร');
    }

    const tenant = await this.db.selectOne<{ id: string; name: string; email: string }>(
      `tenants?id=eq.${input.tenantId}&select=id,name,email`,
    );
    if (!tenant) throw new NotFoundException('ไม่พบร้านค้า');

    // ถ้าเคยผูกบัตรแล้ว ใช้ customer เดิม เพิ่มบัตรใบใหม่เข้าไป
    const existing = await this.db.selectOne<PaymentMethodRow>(
      `payment_methods?tenant_id=eq.${input.tenantId}&select=omise_customer_id&limit=1`,
    );

    const customer = existing?.omise_customer_id
      ? await this.omise.attachCard(existing.omise_customer_id, input.token)
      : await this.omise.createCustomer({
          email: input.email || tenant.email,
          description: `${tenant.name} (tenant:${tenant.id})`,
          token: input.token,
        });

    const cards = customer.cards?.data || [];
    const card = cards[cards.length - 1];
    if (!card) throw new BadRequestException('ผูกบัตรไม่สำเร็จ — Omise ไม่ได้คืนข้อมูลบัตร');

    // บัตรใบใหม่เป็น default เสมอ → ปลด default ของใบเดิม
    await this.db.update(`payment_methods?tenant_id=eq.${input.tenantId}`, { is_default: false });

    const saved = await this.db.upsert<PaymentMethodRow>(
      'payment_methods',
      {
        tenant_id: input.tenantId,
        provider: 'omise',
        omise_customer_id: customer.id,
        omise_card_id: card.id,
        brand: card.brand,
        last4: card.last_digits,
        exp_month: card.expiration_month,
        exp_year: card.expiration_year,
        name_on_card: card.name,
        is_default: true,
        mandate_accepted_at: new Date().toISOString(),
        mandate_ip: input.mandateIp,
        mandate_text: input.mandateText || 'ยินยอมให้ตัดเงินค่าบริการอัตโนมัติทุกรอบบิลจนกว่าจะยกเลิก',
      },
      'tenant_id,omise_card_id',
    );

    this.logger.log(`ผูกบัตรสำเร็จ tenant=${input.tenantId} card=${card.id} (${card.brand} ****${card.last_digits})`);
    return this.maskPaymentMethod(saved);
  }

  async listPaymentMethods(tenantId: string) {
    const rows = await this.db.select<PaymentMethodRow>(
      `payment_methods?tenant_id=eq.${tenantId}&order=is_default.desc,created_at.desc`,
    );
    return (rows || []).map((r) => this.maskPaymentMethod(r));
  }

  async removePaymentMethod(tenantId: string, paymentMethodId: string) {
    const pm = await this.db.selectOne<PaymentMethodRow>(
      `payment_methods?id=eq.${paymentMethodId}&tenant_id=eq.${tenantId}`,
    );
    if (!pm) throw new NotFoundException('ไม่พบบัตรใบนี้');

    const sub = await this.getSubscription(tenantId);
    if (sub && sub.default_payment_method_id === pm.id && sub.status === 'active' && !sub.cancel_at_period_end) {
      throw new BadRequestException(
        'บัตรใบนี้ใช้ต่ออายุอัตโนมัติอยู่ — กรุณาเพิ่มบัตรใบใหม่ หรือยกเลิกการต่ออายุอัตโนมัติก่อน',
      );
    }

    await this.omise.detachCard(pm.omise_customer_id, pm.omise_card_id).catch((e) => {
      this.logger.warn(`ลบบัตรที่ Omise ไม่สำเร็จ (ลบในระบบเราต่อ): ${e.message}`);
    });
    await this.db.delete(`payment_methods?id=eq.${paymentMethodId}`);
    return { success: true };
  }

  private maskPaymentMethod(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      brand: row.brand,
      last4: row.last4,
      expMonth: row.exp_month,
      expYear: row.exp_year,
      isDefault: row.is_default,
      isExpiring: this.isExpiringSoon(row.exp_month, row.exp_year),
    };
  }

  private isExpiringSoon(month: number, year: number): boolean {
    if (!month || !year) return false;
    const expiry = new Date(year, month, 0, 23, 59, 59);
    const in30Days = new Date(Date.now() + 30 * 864e5);
    return expiry <= in30Days;
  }

  // ===============================================================
  // สมัคร / ต่ออายุ
  // ===============================================================

  async getSubscription(tenantId: string): Promise<SubscriptionRow | null> {
    return this.db.selectOne<SubscriptionRow>(`subscriptions?tenant_id=eq.${tenantId}`);
  }

  /** ข้อมูลสรุปสำหรับหน้า Merchant */
  async getSubscriptionSummary(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const paymentMethods = await this.listPaymentMethods(tenantId);
    return {
      subscription: sub
        ? {
            id: sub.id,
            plan: sub.plan,
            billingCycle: sub.billing_cycle,
            status: sub.status,
            currentPeriodStart: sub.current_period_start,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            defaultPaymentMethodId: sub.default_payment_method_id,
            retryCount: sub.retry_count,
            nextRetryAt: sub.next_retry_at,
            pendingPlan: sub.pending_plan,
            pendingBillingCycle: sub.pending_billing_cycle,
          }
        : null,
      paymentMethods,
    };
  }

  /**
   * สมัครสมาชิกครั้งแรก — ตัดเงินรอบแรกทันที (CIT) แล้วสร้าง subscription
   * รอบถัดไป worker จะตัดให้เองอัตโนมัติ
   */
  async subscribe(input: { tenantId: string; plan: Plan; billingCycle: BillingCycle; paymentMethodId?: string }) {
    if (input.plan === 'free') throw new BadRequestException('แพ็กเกจ Free ไม่ต้องสมัครสมาชิก');

    const pm = await this.resolvePaymentMethod(input.tenantId, input.paymentMethodId);
    const settings = await this.getPlatformSettings();
    const amount = this.priceOf(settings, input.plan, input.billingCycle);

    const existing = await this.getSubscription(input.tenantId);
    const periodStart = new Date();
    const periodEnd = this.addCycle(periodStart, input.billingCycle);

    // สร้างใบแจ้งหนี้ก่อนตัดเงิน — invoice คือ source of truth
    const invoice = await this.db.insert<any>('subscription_invoices', {
      invoice_no: this.genInvoiceNo(),
      tenant_id: input.tenantId,
      subscription_id: existing?.id || null,
      payment_method_id: pm.id,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      amount,
      currency: settings.currency,
      method: 'credit_card',
      provider: 'omise',
      status: 'pending',
      billing_reason: 'subscription_create',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      idempotency_key: `sub_create_${input.tenantId}_${periodStart.toISOString().slice(0, 10)}`,
    });

    const charge = await this.chargeInvoice(invoice, pm, {
      description: `สมัครแพ็กเกจ ${input.plan.toUpperCase()} (${input.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'})`,
      recurring: false, // ครั้งแรกเป็น CIT
    });

    if (!charge.paid) {
      throw new BadRequestException(charge.failureMessage || 'ตัดบัตรไม่สำเร็จ');
    }

    const sub = await this.db.upsert<SubscriptionRow>(
      'subscriptions',
      {
        tenant_id: input.tenantId,
        plan: input.plan,
        billing_cycle: input.billingCycle,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        default_payment_method_id: pm.id,
        retry_count: 0,
        next_retry_at: null,
        last_error: null,
        pending_plan: null,
        pending_billing_cycle: null,
        updated_at: new Date().toISOString(),
      },
      'tenant_id',
    );

    await this.db.update(`subscription_invoices?id=eq.${invoice.id}`, { subscription_id: sub?.id });
    await this.syncTenantPlan(input.tenantId, input.plan, periodEnd);

    this.logger.log(`สมัครสมาชิกสำเร็จ tenant=${input.tenantId} plan=${input.plan} charge=${charge.chargeId}`);
    return { success: true, chargeId: charge.chargeId, subscription: await this.getSubscriptionSummary(input.tenantId) };
  }

  /**
   * เก็บเงินรอบถัดไปของ subscription หนึ่งราย (เรียกจาก worker)
   * ใช้ MIT (recurring=true) จึงไม่ต้องให้ merchant ทำ OTP
   */
  async renewSubscription(sub: SubscriptionRow): Promise<{ paid: boolean; reason?: string }> {
    // ยกเลิกไว้แล้ว → จบรอบนี้แล้วปิดเลย ไม่ต้องเก็บเงิน
    if (sub.cancel_at_period_end) {
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await this.syncTenantPlan(sub.tenant_id, 'free', new Date(sub.current_period_end));
      this.logger.log(`ปิด subscription ตามคำขอยกเลิก tenant=${sub.tenant_id}`);
      return { paid: false, reason: 'canceled' };
    }

    const settings = await this.getPlatformSettings();

    // ถ้ามีการสั่งลดแพ็กเกจไว้ ให้มีผลตั้งแต่รอบนี้
    const plan = sub.pending_plan || sub.plan;
    const cycle = sub.pending_billing_cycle || sub.billing_cycle;

    if (plan === 'free') {
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        status: 'canceled',
        plan: 'free',
        pending_plan: null,
        pending_billing_cycle: null,
        updated_at: new Date().toISOString(),
      });
      await this.syncTenantPlan(sub.tenant_id, 'free', new Date(sub.current_period_end));
      return { paid: false, reason: 'downgraded_to_free' };
    }

    const pm = sub.default_payment_method_id
      ? await this.db.selectOne<PaymentMethodRow>(`payment_methods?id=eq.${sub.default_payment_method_id}`)
      : await this.db.selectOne<PaymentMethodRow>(
          `payment_methods?tenant_id=eq.${sub.tenant_id}&is_default=eq.true&limit=1`,
        );

    if (!pm) {
      await this.handleRenewalFailure(sub, settings, 'ไม่พบบัตรที่ผูกไว้');
      return { paid: false, reason: 'no_payment_method' };
    }

    const amount = this.priceOf(settings, plan, cycle);
    const periodStart = new Date(sub.current_period_end);
    const periodEnd = this.addCycle(periodStart, cycle);

    // ใบแจ้งหนี้หนึ่งใบต่อหนึ่งรอบ — retry ใช้ใบเดิม เพิ่ม attempt_count
    const idempotencyKey = `sub_cycle_${sub.id}_${periodStart.toISOString()}`;
    let invoice = await this.db.selectOne<any>(
      `subscription_invoices?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`,
    );

    if (!invoice) {
      invoice = await this.db.insert<any>('subscription_invoices', {
        invoice_no: this.genInvoiceNo(),
        tenant_id: sub.tenant_id,
        subscription_id: sub.id,
        payment_method_id: pm.id,
        plan,
        billing_cycle: cycle,
        amount,
        currency: settings.currency,
        method: 'credit_card',
        provider: 'omise',
        status: 'pending',
        billing_reason: 'subscription_cycle',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        idempotency_key: idempotencyKey,
      });
    }

    const charge = await this.chargeInvoice(invoice, pm, {
      description: `ต่ออายุแพ็กเกจ ${plan.toUpperCase()} (${cycle === 'yearly' ? 'รายปี' : 'รายเดือน'})`,
      recurring: true, // MIT — ไม่ต้อง 3DS
      attempt: (invoice.attempt_count || 0) + 1,
    });

    if (!charge.paid) {
      await this.handleRenewalFailure(sub, settings, charge.failureMessage || 'ตัดบัตรไม่สำเร็จ');
      return { paid: false, reason: charge.failureMessage };
    }

    await this.db.update(`subscriptions?id=eq.${sub.id}`, {
      plan,
      billing_cycle: cycle,
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
      pending_plan: null,
      pending_billing_cycle: null,
      default_payment_method_id: pm.id,
      updated_at: new Date().toISOString(),
    });
    await this.syncTenantPlan(sub.tenant_id, plan, periodEnd);

    this.logger.log(`ต่ออายุสำเร็จ tenant=${sub.tenant_id} plan=${plan} ถึง ${periodEnd.toISOString()}`);
    return { paid: true };
  }

  /**
   * Dunning — ตัดไม่ผ่านแล้วทำอะไรต่อ
   * ยังไม่ตัดสิทธิ์ทันที ให้ grace period แล้ว retry ตามตารางที่ตั้งไว้
   */
  private async handleRenewalFailure(sub: SubscriptionRow, settings: PlatformSettingsRow, reason: string) {
    const retryDays = settings.dunning_retry_days?.length ? settings.dunning_retry_days : [3, 5, 7];
    const nextAttempt = sub.retry_count; // index ของ retry ครั้งถัดไป

    if (nextAttempt >= retryDays.length) {
      // retry ครบแล้วยังไม่ได้เงิน → ลดเป็น Free
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        status: 'unpaid',
        last_error: reason,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      });
      await this.syncTenantPlan(sub.tenant_id, 'free', new Date());
      this.logger.warn(`ตัดบัตรไม่สำเร็จครบทุกครั้ง → ลดเป็น Free tenant=${sub.tenant_id} (${reason})`);
      await this.notify(sub.tenant_id, `ไม่สามารถเก็บค่าบริการได้ ระบบได้ปรับแพ็กเกจเป็น Free แล้ว (${reason})`);
      return;
    }

    // เลื่อน retry ครั้งถัดไป และเลี่ยงวันเสาร์-อาทิตย์ (ธนาคารมักปฏิเสธ/ลูกค้าเติมเงินไม่ทัน)
    const nextRetry = this.skipWeekend(new Date(Date.now() + retryDays[nextAttempt] * 864e5));

    await this.db.update(`subscriptions?id=eq.${sub.id}`, {
      status: 'past_due',
      retry_count: sub.retry_count + 1,
      next_retry_at: nextRetry.toISOString(),
      last_error: reason,
      updated_at: new Date().toISOString(),
    });

    this.logger.warn(
      `ตัดบัตรไม่ผ่าน tenant=${sub.tenant_id} ครั้งที่ ${sub.retry_count + 1}/${retryDays.length} — ลองใหม่ ${nextRetry.toISOString()}`,
    );
    await this.notify(
      sub.tenant_id,
      `ตัดบัตรค่าบริการไม่สำเร็จ (${reason}) ระบบจะลองอีกครั้งวันที่ ${nextRetry.toLocaleDateString('th-TH')} — กรุณาตรวจสอบบัตรของท่าน`,
    );
  }

  // ===============================================================
  // ยกเลิก / กลับมาใช้ / เปลี่ยนแพ็กเกจ
  // ===============================================================

  /** ยกเลิก — ค่าเริ่มต้นคือใช้ได้จนจบรอบที่จ่ายไว้แล้ว (ไม่ตัดสิทธิ์ทันที) */
  async cancel(tenantId: string, immediately = false) {
    const sub = await this.getSubscription(tenantId);
    if (!sub) throw new NotFoundException('ยังไม่มีสมาชิกรายเดือนสำหรับร้านนี้');

    if (immediately) {
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        status: 'canceled',
        cancel_at_period_end: false,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await this.syncTenantPlan(tenantId, 'free', new Date());
    } else {
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    this.logger.log(`ยกเลิกสมาชิก tenant=${tenantId} (ทันที=${immediately})`);
    return this.getSubscriptionSummary(tenantId);
  }

  /** กลับมาต่ออายุอัตโนมัติเหมือนเดิม (ทำได้ก่อนจบรอบ) */
  async resume(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    if (!sub) throw new NotFoundException('ยังไม่มีสมาชิกรายเดือนสำหรับร้านนี้');
    if (sub.status === 'canceled') {
      throw new BadRequestException('สมาชิกถูกปิดไปแล้ว กรุณาสมัครใหม่');
    }

    await this.db.update(`subscriptions?id=eq.${sub.id}`, {
      cancel_at_period_end: false,
      canceled_at: null,
      updated_at: new Date().toISOString(),
    });
    return this.getSubscriptionSummary(tenantId);
  }

  /**
   * เปลี่ยนแพ็กเกจกลางรอบ
   *  - อัปเกรด  → มีผลทันที คิดเฉพาะส่วนต่างตามวันที่เหลือ (proration)
   *  - ดาวน์เกรด → มีผลเมื่อจบรอบ (ไม่คืนเงิน ไม่ตัดสิทธิ์กลางคัน)
   */
  async changePlan(input: { tenantId: string; plan: Plan; billingCycle: BillingCycle }) {
    const sub = await this.getSubscription(input.tenantId);
    if (!sub) throw new NotFoundException('ยังไม่มีสมาชิกรายเดือน กรุณาสมัครก่อน');

    const settings = await this.getPlatformSettings();
    const currentPrice = this.priceOf(settings, sub.plan, sub.billing_cycle);
    const newPrice = this.priceOf(settings, input.plan, input.billingCycle);

    const isUpgrade = newPrice > currentPrice;

    if (!isUpgrade) {
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        pending_plan: input.plan,
        pending_billing_cycle: input.billingCycle,
        updated_at: new Date().toISOString(),
      });
      return {
        success: true,
        effective: 'period_end',
        effectiveAt: sub.current_period_end,
        amountCharged: 0,
        subscription: await this.getSubscriptionSummary(input.tenantId),
      };
    }

    const proration = this.calcProration({
      periodStart: new Date(sub.current_period_start),
      periodEnd: new Date(sub.current_period_end),
      currentPrice,
      newPrice,
    });

    if (proration.amountDue <= 0) {
      // ส่วนต่างเป็นศูนย์ (เช่นเหลือวันน้อยมาก) — เปลี่ยนให้เลยไม่ต้องเก็บเงิน
      await this.db.update(`subscriptions?id=eq.${sub.id}`, {
        plan: input.plan,
        billing_cycle: input.billingCycle,
        updated_at: new Date().toISOString(),
      });
      await this.syncTenantPlan(input.tenantId, input.plan, new Date(sub.current_period_end));
      return {
        success: true,
        effective: 'immediate',
        amountCharged: 0,
        subscription: await this.getSubscriptionSummary(input.tenantId),
      };
    }

    const pm = await this.resolvePaymentMethod(input.tenantId, sub.default_payment_method_id || undefined);

    const invoice = await this.db.insert<any>('subscription_invoices', {
      invoice_no: this.genInvoiceNo(),
      tenant_id: input.tenantId,
      subscription_id: sub.id,
      payment_method_id: pm.id,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      amount: proration.amountDue,
      currency: settings.currency,
      method: 'credit_card',
      provider: 'omise',
      status: 'pending',
      billing_reason: 'subscription_update',
      period_start: new Date().toISOString(),
      period_end: sub.current_period_end,
      idempotency_key: `sub_update_${sub.id}_${Date.now()}`,
    });

    const charge = await this.chargeInvoice(invoice, pm, {
      description: `อัปเกรดเป็น ${input.plan.toUpperCase()} (ส่วนต่าง ${proration.remainingDays} วันที่เหลือ)`,
      recurring: true,
    });

    if (!charge.paid) throw new BadRequestException(charge.failureMessage || 'ตัดบัตรส่วนต่างไม่สำเร็จ');

    await this.db.update(`subscriptions?id=eq.${sub.id}`, {
      plan: input.plan,
      billing_cycle: input.billingCycle,
      pending_plan: null,
      pending_billing_cycle: null,
      updated_at: new Date().toISOString(),
    });
    await this.syncTenantPlan(input.tenantId, input.plan, new Date(sub.current_period_end));

    return {
      success: true,
      effective: 'immediate',
      amountCharged: proration.amountDue,
      proration,
      subscription: await this.getSubscriptionSummary(input.tenantId),
    };
  }

  /** พรีวิวยอดส่วนต่างก่อนกดยืนยัน (ไม่ตัดเงิน) */
  async previewPlanChange(tenantId: string, plan: Plan, billingCycle: BillingCycle) {
    const sub = await this.getSubscription(tenantId);
    const settings = await this.getPlatformSettings();
    const newPrice = this.priceOf(settings, plan, billingCycle);

    if (!sub) return { isUpgrade: true, effective: 'immediate', amountDue: newPrice, credit: 0, remainingDays: 0 };

    const currentPrice = this.priceOf(settings, sub.plan, sub.billing_cycle);
    if (newPrice <= currentPrice) {
      return { isUpgrade: false, effective: 'period_end', effectiveAt: sub.current_period_end, amountDue: 0, credit: 0 };
    }

    const proration = this.calcProration({
      periodStart: new Date(sub.current_period_start),
      periodEnd: new Date(sub.current_period_end),
      currentPrice,
      newPrice,
    });
    return { isUpgrade: true, effective: 'immediate', ...proration };
  }

  /**
   * คิดส่วนต่างแบบ prorate ตามจำนวนวันที่เหลือในรอบ
   *   เครดิตจากแพ็กเกจเดิมที่ยังไม่ได้ใช้  =  ราคาเดิม  × (วันที่เหลือ / วันทั้งรอบ)
   *   ค่าแพ็กเกจใหม่เฉพาะวันที่เหลือ      =  ราคาใหม่ × (วันที่เหลือ / วันทั้งรอบ)
   *   ยอดที่ต้องจ่ายเพิ่ม                  =  ค่าใหม่ − เครดิต
   */
  private calcProration(input: { periodStart: Date; periodEnd: Date; currentPrice: number; newPrice: number }) {
    const totalMs = input.periodEnd.getTime() - input.periodStart.getTime();
    const remainingMs = Math.max(0, input.periodEnd.getTime() - Date.now());
    const ratio = totalMs > 0 ? remainingMs / totalMs : 0;

    const credit = Math.round(input.currentPrice * ratio * 100) / 100;
    const newPortion = Math.round(input.newPrice * ratio * 100) / 100;
    const amountDue = Math.max(0, Math.round((newPortion - credit) * 100) / 100);

    return {
      totalDays: Math.round(totalMs / 864e5),
      remainingDays: Math.ceil(remainingMs / 864e5),
      credit,
      newPortion,
      amountDue,
    };
  }

  // ===============================================================
  // Worker entry point
  // ===============================================================

  /**
   * ไล่เก็บเงินทุก subscription ที่ถึงกำหนด — เรียกจาก cron วันละครั้ง
   *   1. active/trialing ที่ current_period_end <= now  → เก็บเงินรอบใหม่
   *   2. past_due ที่ next_retry_at <= now              → retry ตามตาราง dunning
   */
  async processDueSubscriptions(): Promise<{ processed: number; paid: number; failed: number }> {
    if (!this.db.isConfigured) {
      this.logger.warn('ข้ามรอบเก็บเงิน — ยังไม่ได้ตั้งค่า Supabase');
      return { processed: 0, paid: 0, failed: 0 };
    }

    const now = new Date().toISOString();
    const due = (await this.db.select<SubscriptionRow>(
      `subscriptions?or=(and(status.in.(active,trialing),current_period_end.lte.${now}),and(status.eq.past_due,next_retry_at.lte.${now}))&order=current_period_end.asc&limit=200`,
    )) || [];

    if (due.length === 0) return { processed: 0, paid: 0, failed: 0 };
    this.logger.log(`พบ subscription ที่ถึงกำหนดเก็บเงิน ${due.length} ราย`);

    let paid = 0;
    let failed = 0;
    for (const sub of due) {
      try {
        const result = await this.renewSubscription(sub);
        result.paid ? paid++ : failed++;
      } catch (err: any) {
        failed++;
        this.logger.error(`เก็บเงิน tenant=${sub.tenant_id} ล้มเหลว: ${err.message}`);
      }
    }

    this.logger.log(`สรุปรอบเก็บเงิน: สำเร็จ ${paid} / ไม่สำเร็จ ${failed}`);
    return { processed: due.length, paid, failed };
  }

  /**
   * ซิงก์รอบบิลของ subscription จากใบแจ้งหนี้ที่ยืนยันว่าจ่ายแล้ว
   * ใช้ตอนรับ webhook (กรณีเงินเข้าแบบ asynchronous เช่น PromptPay ผ่าน Omise หรือ 3DS)
   */
  async syncFromPaidInvoice(invoiceId: string) {
    const invoice = await this.db.selectOne<any>(`subscription_invoices?id=eq.${invoiceId}`);
    if (!invoice?.subscription_id || invoice.status !== 'paid') return;

    const sub = await this.db.selectOne<SubscriptionRow>(`subscriptions?id=eq.${invoice.subscription_id}`);
    if (!sub) return;

    // ใบเก่ากว่ารอบปัจจุบัน (webhook มาซ้ำ/มาช้า) → ไม่ต้องขยายรอบซ้ำ
    if (new Date(invoice.period_end) <= new Date(sub.current_period_end)) return;

    await this.db.update(`subscriptions?id=eq.${sub.id}`, {
      plan: invoice.plan,
      billing_cycle: invoice.billing_cycle,
      status: 'active',
      current_period_start: invoice.period_start,
      current_period_end: invoice.period_end,
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
      pending_plan: null,
      pending_billing_cycle: null,
      updated_at: new Date().toISOString(),
    });
    await this.syncTenantPlan(sub.tenant_id, invoice.plan, new Date(invoice.period_end));
    this.logger.log(`ซิงก์รอบบิลจาก webhook แล้ว tenant=${sub.tenant_id} ถึง ${invoice.period_end}`);
  }

  /** แจ้งเตือนบัตรใกล้หมดอายุ (เรียกจาก cron เช่นกัน) */
  async notifyExpiringCards(): Promise<number> {
    const cards = (await this.db.select<any>(`payment_methods?is_default=eq.true`)) || [];
    const soon = cards.filter((c) => this.isExpiringSoon(c.exp_month, c.exp_year));
    for (const c of soon) {
      await this.notify(
        c.tenant_id,
        `บัตร ${c.brand} ****${c.last4} จะหมดอายุ ${c.exp_month}/${c.exp_year} — กรุณาอัปเดตบัตรก่อนรอบบิลถัดไป`,
      );
    }
    if (soon.length) this.logger.log(`แจ้งเตือนบัตรใกล้หมดอายุ ${soon.length} ใบ`);
    return soon.length;
  }

  // ===============================================================
  // Helper
  // ===============================================================

  /** ตัดเงินตามใบแจ้งหนี้ + อัปเดตสถานะใบแจ้งหนี้ */
  private async chargeInvoice(
    invoice: any,
    pm: PaymentMethodRow,
    opts: { description: string; recurring: boolean; attempt?: number },
  ): Promise<{ paid: boolean; chargeId?: string; failureMessage?: string }> {
    const attempt = opts.attempt ?? 1;

    try {
      const charge = await this.omise.createCharge({
        amountBaht: Number(invoice.amount),
        currency: invoice.currency,
        description: opts.description,
        customerId: pm.omise_customer_id,
        cardId: pm.omise_card_id,
        recurring: opts.recurring,
        metadata: { invoice_id: invoice.id, tenant_id: invoice.tenant_id, attempt },
        // key เดียวกันในรอบเดียวกัน + attempt เดียวกัน = ไม่ตัดซ้ำ
        idempotencyKey: `${invoice.id}_a${attempt}`,
      });

      const paid = charge.status === 'successful' || charge.paid === true;

      await this.db.update(`subscription_invoices?id=eq.${invoice.id}`, {
        status: paid ? 'paid' : 'failed',
        paid_at: paid ? new Date().toISOString() : null,
        provider_ref: charge.id,
        attempt_count: attempt,
        failure_reason: paid ? null : charge.failure_message || charge.failure_code,
      });

      return paid
        ? { paid: true, chargeId: charge.id }
        : { paid: false, chargeId: charge.id, failureMessage: charge.failure_message || charge.failure_code };
    } catch (err: any) {
      await this.db.update(`subscription_invoices?id=eq.${invoice.id}`, {
        status: 'failed',
        attempt_count: attempt,
        failure_reason: err.message,
      });
      return { paid: false, failureMessage: err.message };
    }
  }

  private async resolvePaymentMethod(tenantId: string, paymentMethodId?: string): Promise<PaymentMethodRow> {
    const pm = paymentMethodId
      ? await this.db.selectOne<PaymentMethodRow>(`payment_methods?id=eq.${paymentMethodId}&tenant_id=eq.${tenantId}`)
      : await this.db.selectOne<PaymentMethodRow>(
          `payment_methods?tenant_id=eq.${tenantId}&is_default=eq.true&limit=1`,
        );
    if (!pm) throw new BadRequestException('ยังไม่ได้ผูกบัตรสำหรับตัดเงินอัตโนมัติ');
    return pm;
  }

  private async getPlatformSettings(): Promise<PlatformSettingsRow> {
    const row = await this.db.selectOne<PlatformSettingsRow>('platform_settings?id=eq.1');
    return (
      row || {
        price_pro_monthly: 990,
        price_pro_yearly: 9900,
        price_enterprise_monthly: 2990,
        price_enterprise_yearly: 29900,
        currency: 'THB',
        dunning_retry_days: [3, 5, 7],
        grace_period_days: 10,
        trial_days: 0,
      }
    );
  }

  private priceOf(settings: PlatformSettingsRow, plan: Plan, cycle: BillingCycle): number {
    if (plan === 'free') return 0;
    if (plan === 'enterprise') {
      return Number(cycle === 'yearly' ? settings.price_enterprise_yearly : settings.price_enterprise_monthly);
    }
    return Number(cycle === 'yearly' ? settings.price_pro_yearly : settings.price_pro_monthly);
  }

  private addCycle(from: Date, cycle: BillingCycle): Date {
    const next = new Date(from);
    if (cycle === 'yearly') next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }

  /** เลี่ยงเสาร์-อาทิตย์ เลื่อนไปวันจันทร์ */
  private skipWeekend(date: Date): Date {
    const d = new Date(date);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d;
  }

  private async syncTenantPlan(tenantId: string, plan: Plan, expiresAt: Date) {
    await this.db.update(`tenants?id=eq.${tenantId}`, {
      plan,
      plan_expires_at: expiresAt.toISOString(),
    });
  }

  private genInvoiceNo(): string {
    return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  /**
   * แจ้งเตือนร้านค้า
   * TODO: ต่อกับ NotificationsService (LINE Messaging API) เมื่อ Phase 1 เสร็จ
   *       ตอนนี้ log ไว้ก่อนเพื่อให้ตามรอย dunning ได้
   */
  private async notify(tenantId: string, message: string) {
    this.logger.log(`[แจ้งเตือน tenant=${tenantId}] ${message}`);
  }
}
