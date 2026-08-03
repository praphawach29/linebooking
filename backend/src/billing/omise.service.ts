import { Injectable, Logger, BadRequestException } from '@nestjs/common';

/**
 * OmiseService — ห่อ Omise (Opn Payments) REST API
 *
 * นี่คือที่เดียวในระบบที่ถือ OMISE_SECRET_KEY
 * Frontend จะได้รับแค่ public key เพื่อสร้าง token ที่ vault.omise.co เท่านั้น
 */
@Injectable()
export class OmiseService {
  private readonly logger = new Logger(OmiseService.name);
  private readonly apiBase = 'https://api.omise.co';

  get isConfigured(): boolean {
    return !!process.env.OMISE_SECRET_KEY;
  }

  private get secretKey(): string {
    const key = process.env.OMISE_SECRET_KEY;
    if (!key) throw new BadRequestException('ยังไม่ได้ตั้งค่า OMISE_SECRET_KEY ใน backend/.env');
    return key;
  }

  private async request(path: string, method: 'GET' | 'POST' | 'DELETE' | 'PATCH', body?: any, idempotencyKey?: string) {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
    // Omise รองรับ Idempotency-Key เพื่อกันการตัดเงินซ้ำเมื่อ retry
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json.object === 'error') {
      this.logger.error(`Omise ${method} ${path} ล้มเหลว: [${json.code}] ${json.message}`);
      throw new BadRequestException(json.message || 'เรียก Omise API ไม่สำเร็จ');
    }
    return json;
  }

  /** สร้าง Customer พร้อมผูกบัตรใบแรกจาก token (token ใช้ได้ครั้งเดียว) */
  createCustomer(input: { email?: string; description: string; token: string }) {
    return this.request('/customers', 'POST', {
      email: input.email,
      description: input.description,
      card: input.token,
    });
  }

  /** เพิ่มบัตรใบใหม่ให้ customer เดิม */
  attachCard(customerId: string, token: string) {
    return this.request(`/customers/${customerId}`, 'PATCH', { card: token });
  }

  retrieveCustomer(customerId: string) {
    return this.request(`/customers/${customerId}`, 'GET');
  }

  detachCard(customerId: string, cardId: string) {
    return this.request(`/customers/${customerId}/cards/${cardId}`, 'DELETE');
  }

  /**
   * ตัดเงิน
   * @param amountBaht จำนวนเงินหน่วยบาท (จะแปลงเป็นสตางค์ให้)
   * @param idempotencyKey กันตัดซ้ำเมื่อ worker รันซ้อนหรือ retry
   */
  createCharge(input: {
    amountBaht: number;
    currency?: string;
    description: string;
    customerId?: string;
    cardId?: string;
    token?: string;
    metadata?: Record<string, any>;
    /** true = merchant-initiated (รอบต่ออายุอัตโนมัติ ไม่ต้องทำ 3DS) */
    recurring?: boolean;
    returnUri?: string;
    idempotencyKey?: string;
  }) {
    const body: Record<string, any> = {
      amount: Math.round(input.amountBaht * 100), // สตางค์
      currency: (input.currency || 'THB').toLowerCase(),
      description: input.description,
      metadata: input.metadata,
    };

    if (input.customerId) {
      body.customer = input.customerId;
      if (input.cardId) body.card = input.cardId;
    } else if (input.token) {
      body.card = input.token;
    } else {
      throw new BadRequestException('ต้องระบุ customerId หรือ token');
    }

    // ครั้งแรก (CIT) ต้องผ่าน 3DS — รอบต่ออายุ (MIT) ตั้ง recurring เพื่อขอยกเว้น
    if (input.recurring) {
      body.recurring = true;
    } else if (input.returnUri) {
      body.return_uri = input.returnUri;
    }

    return this.request('/charges', 'POST', body, input.idempotencyKey);
  }

  retrieveCharge(chargeId: string) {
    return this.request(`/charges/${chargeId}`, 'GET');
  }

  /** ตัดเงินจาก source (เช่น PromptPay) — source ใช้คนละ field กับบัตร */
  createChargeFromSource(input: {
    sourceId: string;
    amountBaht: number;
    currency?: string;
    description: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }) {
    return this.request(
      '/charges',
      'POST',
      {
        amount: Math.round(input.amountBaht * 100),
        currency: (input.currency || 'THB').toLowerCase(),
        source: input.sourceId,
        description: input.description,
        metadata: input.metadata,
        return_uri: process.env.BILLING_RETURN_URI,
      },
      input.idempotencyKey,
    );
  }

  /** สร้าง source PromptPay (ได้ QR ที่ Omise ยืนยันผลให้ผ่าน webhook) */
  createPromptPaySource(amountBaht: number, currency = 'THB') {
    return this.request('/sources', 'POST', {
      type: 'promptpay',
      amount: Math.round(amountBaht * 100),
      currency: currency.toLowerCase(),
    });
  }
}
