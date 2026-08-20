import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { SubscriptionsService } from './subscriptions.service';
import { SlipsService } from './slips.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import {
  AttachPaymentMethodDto,
  CancelSubscriptionDto,
  ChangePlanDto,
  SubscribeDto,
} from './dto/subscription.dto';
import { ReviewSlipDto, SubmitSlipDto } from './dto/slip.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import type { AppUser } from '../common/guards/supabase-auth.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * ทุก endpoint ต้องล็อกอินก่อน (SupabaseAuthGuard) ยกเว้น webhook
 *   - endpoint ของร้านค้า  → + TenantAccessGuard  (tenantId ต้องเป็นของตัวเอง)
 *   - endpoint ของแอดมิน   → + PlatformAdminGuard
 *   - webhook             → ไม่มี guard แต่ยืนยัน charge กับ Omise ซ้ำก่อนเชื่อ
 */
@Controller('billing')
@UseGuards(SupabaseAuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly subscriptions: SubscriptionsService,
    private readonly slips: SlipsService,
  ) {}

  // ---------------------------------------------------------------
  // จ่ายครั้งเดียว (ไม่ต่ออายุอัตโนมัติ)
  // ---------------------------------------------------------------
  @Post('charge')
  @UseGuards(TenantAccessGuard)
  createCharge(@Body() dto: CreateChargeDto) {
    return this.billingService.createCharge(dto);
  }

  // ---------------------------------------------------------------
  // บัตรที่ผูกไว้
  // ---------------------------------------------------------------
  @Post('payment-methods')
  @UseGuards(TenantAccessGuard)
  attachPaymentMethod(@Body() dto: AttachPaymentMethodDto, @Req() req: any) {
    return this.subscriptions.attachPaymentMethod({
      ...dto,
      // เก็บ IP ไว้เป็นหลักฐานความยินยอม (mandate)
      mandateIp: req.ip || req.headers?.['x-forwarded-for'],
    });
  }

  @Get('payment-methods')
  @UseGuards(TenantAccessGuard)
  listPaymentMethods(@Query('tenantId') tenantId: string) {
    return this.subscriptions.listPaymentMethods(tenantId);
  }

  @Delete('payment-methods/:id')
  @UseGuards(TenantAccessGuard)
  removePaymentMethod(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.subscriptions.removePaymentMethod(tenantId, id);
  }

  // ---------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------
  @Get('subscription')
  @UseGuards(TenantAccessGuard)
  getSubscription(@Query('tenantId') tenantId: string) {
    return this.subscriptions.getSubscriptionSummary(tenantId);
  }

  @Post('subscribe')
  @UseGuards(TenantAccessGuard)
  subscribe(@Body() dto: SubscribeDto) {
    return this.subscriptions.subscribe(dto);
  }

  @Get('plan-change-preview')
  @UseGuards(TenantAccessGuard)
  previewPlanChange(
    @Query('tenantId') tenantId: string,
    @Query('plan') plan: 'free' | 'pro' | 'enterprise',
    @Query('billingCycle') billingCycle: 'monthly' | 'yearly',
  ) {
    return this.subscriptions.previewPlanChange(tenantId, plan, billingCycle);
  }

  @Post('change-plan')
  @UseGuards(TenantAccessGuard)
  changePlan(@Body() dto: ChangePlanDto) {
    return this.subscriptions.changePlan(dto);
  }

  @Post('cancel')
  @UseGuards(TenantAccessGuard)
  cancel(@Body() dto: CancelSubscriptionDto) {
    return this.subscriptions.cancel(dto.tenantId, dto.immediately === true);
  }

  @Post('resume')
  @UseGuards(TenantAccessGuard)
  resume(@Body() dto: CancelSubscriptionDto) {
    return this.subscriptions.resume(dto.tenantId);
  }

  // ---------------------------------------------------------------
  // สลิปโอนเงิน PromptPay
  // ---------------------------------------------------------------

  /** ร้านค้าส่งสลิปของตัวเอง — uploadedBy มาจาก token ไม่ใช่จาก body */
  @Post('slips')
  @UseGuards(TenantAccessGuard)
  submitSlip(@Body() dto: SubmitSlipDto, @CurrentUser() user: AppUser) {
    return this.slips.submitSlip({ ...dto, uploadedBy: user.dbUserId });
  }

  /** ร้านค้าดูสลิปของตัวเอง / แอดมินดูได้ทั้งหมด (TenantAccessGuard ปล่อยผ่านให้ admin) */
  @Get('slips')
  @UseGuards(TenantAccessGuard)
  listSlips(@Query('status') status: string, @Query('tenantId') tenantId: string, @CurrentUser() user: AppUser) {
    // ผู้ใช้ทั่วไปบังคับให้เห็นเฉพาะร้านตัวเองเสมอ แม้จะไม่ส่ง tenantId มา
    const scopedTenantId = user.role === 'platform_admin' ? tenantId : tenantId || user.tenantIds[0];
    return this.slips.listSlips({ status, tenantId: scopedTenantId });
  }

  @Post('slips/:id/approve')
  @UseGuards(PlatformAdminGuard)
  approveSlip(@Param('id') id: string, @CurrentUser() user: AppUser) {
    return this.slips.approveSlip(id, user.dbUserId);
  }

  @Post('slips/:id/reject')
  @UseGuards(PlatformAdminGuard)
  rejectSlip(@Param('id') id: string, @Body() dto: ReviewSlipDto, @CurrentUser() user: AppUser) {
    return this.slips.rejectSlip(id, dto.reason || 'ไม่ระบุเหตุผล', user.dbUserId);
  }

  // ---------------------------------------------------------------
  // Ops & Reconciliation (Super Admin เท่านั้น)
  // ---------------------------------------------------------------

  /** คืนเงินใบแจ้งหนี้ */
  @Post('invoices/:id/refund')
  @UseGuards(PlatformAdminGuard)
  refundInvoice(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AppUser,
  ) {
    return this.subscriptions.refundInvoice(id, reason || 'Admin requested refund', user.dbUserId);
  }

  /** ตรวจสอบความถูกต้องของยอดระหว่าง Omise และ Database (Reconciliation) */
  @Get('reconciliation')
  @UseGuards(PlatformAdminGuard)
  getReconciliation(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return this.billingService.reconcileWithOmise(lim);
  }

  /** สั่ง Sync รายการที่สถานะไม่ตรงกันระหว่าง Omise และ DB */
  @Post('reconciliation/sync/:id')
  @UseGuards(PlatformAdminGuard)
  syncReconciliationInvoice(@Param('id') id: string) {
    return this.billingService.syncInvoiceFromOmise(id);
  }

  /** สั่งรอบเก็บเงินด้วยมือ — ใช้ตอนทดสอบหรือกู้สถานการณ์เมื่อ cron พลาด */
  @Post('run-collection')
  @UseGuards(PlatformAdminGuard)
  runCollection() {
    return this.subscriptions.processDueSubscriptions();
  }
}

/**
 * Webhook แยกออกมาเป็น controller ต่างหาก เพราะ Omise ยิงเข้ามาโดยไม่มี token ของผู้ใช้
 * ความปลอดภัยมาจากการดึง charge กลับไปยืนยันกับ Omise อีกครั้งใน handleWebhook()
 */
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Body() event: any) {
    return this.billingService.handleWebhook(event);
  }
}
