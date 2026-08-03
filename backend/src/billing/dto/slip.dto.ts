import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitSlipDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  invoiceId: string;

  /** path ในบัคเก็ต payment-slips เช่น {tenantId}/{invoiceId}/1735689600000.jpg */
  @IsString()
  storagePath: string;

  /** base64 ของรูป (data URI ตัด prefix ออกแล้ว) — ใช้ส่งให้ API ตรวจสลิป */
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @IsOptional()
  @IsString()
  note?: string;

  // หมายเหตุ: uploadedBy ไม่รับจาก body — ดึงจาก token ที่ผ่าน guard แล้วเท่านั้น
}

export class ReviewSlipDto {
  @IsOptional()
  @IsString()
  reason?: string;

  // หมายเหตุ: reviewerId ไม่รับจาก body — ดึงจาก token เท่านั้น
}
