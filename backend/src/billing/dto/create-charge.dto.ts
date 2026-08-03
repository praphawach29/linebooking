import { IsNumber, IsOptional, IsPositive, IsString, IsIn } from 'class-validator';

export class CreateChargeDto {
  @IsString()
  invoiceId: string;

  @IsString()
  tenantId: string;

  @IsNumber()
  @IsPositive()
  amount: number; // หน่วยเป็นบาท

  @IsOptional()
  @IsString()
  currency?: string;

  /** token บัตรที่ frontend สร้างจาก Omise Vault ด้วย public key */
  @IsOptional()
  @IsString()
  token?: string;

  /** ใช้เมื่อต้องการให้ Omise ออก QR PromptPay ให้แทนการตัดบัตร */
  @IsOptional()
  @IsIn(['promptpay'])
  source?: 'promptpay';

  @IsString()
  description: string;
}
