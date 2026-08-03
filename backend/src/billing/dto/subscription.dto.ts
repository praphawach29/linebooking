import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class AttachPaymentMethodDto {
  @IsUUID()
  tenantId: string;

  /** token จาก Omise Vault (สร้างฝั่ง browser ด้วย public key) */
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  email?: string;

  /** ต้องเป็น true — หลักฐานความยินยอมให้ตัดเงินอัตโนมัติ */
  @IsBoolean()
  mandateAccepted: boolean;

  @IsOptional()
  @IsString()
  mandateText?: string;
}

export class SubscribeDto {
  @IsUUID()
  tenantId: string;

  @IsIn(['pro', 'enterprise'])
  plan: 'pro' | 'enterprise';

  @IsIn(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;
}

export class ChangePlanDto {
  @IsUUID()
  tenantId: string;

  @IsIn(['free', 'pro', 'enterprise'])
  plan: 'free' | 'pro' | 'enterprise';

  @IsIn(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';
}

export class CancelSubscriptionDto {
  @IsUUID()
  tenantId: string;

  /** true = ตัดสิทธิ์ทันที, false/ไม่ส่ง = ใช้ได้จนจบรอบที่จ่ายไว้ (ค่าเริ่มต้น) */
  @IsOptional()
  @IsBoolean()
  immediately?: boolean;
}
