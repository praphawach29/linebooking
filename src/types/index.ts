export type TenantPlan = 'free' | 'pro' | 'enterprise';

export type BookingFlowMode = 'service_staff_time' | 'sports_court_time' | 'service_time_only';

/**
 * กำหนดวันและเวลาให้บริการสำหรับบริการหลัก/บริการย่อยแต่ละรายการ
 * days: [0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์]
 */
export interface OperatingSchedule {
  isCustom: boolean;       // true = ใช้ตารางเวลาของตัวเอง, false = ใช้ตามร้านค้า
  days: number[];          // วันที่เปิดให้บริการ [0,1,2,3,4,5,6]
  startTime: string;       // เวลาเปิด เช่น "08:00"
  endTime: string;         // เวลาปิด เช่น "22:00"
}

export interface Court {
  id: string;
  tenantId: string;
  serviceId: string; // Belongs to a service category e.g. Futsal
  name: string; // e.g. "สนาม A (Indoor)"
  code: string; // e.g. "COURT-A"
  description?: string;
  type?: string;
  imageUrl?: string;
  extraPricePerHour?: number;
  isActive: boolean;
  operatingSchedule?: OperatingSchedule; // ตารางเวลาเฉพาะของสนามนี้
}

export type BlackoutScope = 'tenant' | 'service' | 'court';

/**
 * วันหยุดล่วงหน้า/ปิดปรับปรุง — ปิดรับจองทั้งวันในช่วงวันที่กำหนด
 * ตามขอบเขต (ทั้งร้าน / เฉพาะบริการหลัก / เฉพาะสนาม)
 */
export interface BlackoutDate {
  id: string;
  tenantId: string;
  scope: BlackoutScope;
  serviceId?: string | null;
  courtId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason?: string | null;
  createdAt?: string;
}

export type BookingPresetTemplate = 'EXPRESS_QUEUE' | 'SERVICE_AND_STAFF' | 'RESOURCE_AND_SLOT' | 'CUSTOM';
export type PaymentMode = 'NO_PAYMENT' | 'DEPOSIT_ONLY' | 'FULL_PAYMENT';

export interface BookingFlowConfig {
  presetTemplate: BookingPresetTemplate;
  paymentMode: PaymentMode;
  depositAmount?: number;
  steps: {
    requireService: boolean;
    requireStaff: boolean;
    requireResource: boolean;
    requireNotes?: boolean;
  };
  autoAssignStaff: boolean;
  autoAssignResource: boolean;
  slotIntervalMinutes?: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string; // e.g. spa-happy
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  phone: string;
  email: string;
  address: string;
  businessType: 'spa' | 'barbershop' | 'clinic' | 'salon' | 'sports' | 'other';
  plan: TenantPlan;
  planExpiresAt?: string;
  /** Set by server when the shop is first created. Used to calculate 14-day trial window. */
  trialStartedAt?: string;
  commissionRate: number;
  isActive: boolean;
  lineChannelId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  liffId?: string;
  settings: {
    promptpayNumber?: string;
    promptpayName?: string;
    autoConfirm?: boolean;
    maxAdvanceBookingDays?: number;
    maxAdvanceBookingUnit?: 'days' | 'hours';
    minLeadTimeHours?: number;
    depositPercentage?: number;
    bufferMinutesDefault?: number;
    googleMapUrl?: string;
    currency?: string;
    lineReminderEnabled?: boolean;
    lineReminderHoursBefore?: number;
    lineBookingConfirmationEnabled?: boolean;
    linePushMessageCount?: number;
    linePushMessageMonth?: string;
    bookingLimit?: {
      enabled: boolean;
      amount: number;
      period: 'day' | 'week' | 'month';
    };
    bookingFlowMode?: BookingFlowMode;
    enableStaffSelection?: boolean;
    enableCourtSelection?: boolean;
    resourceTerm?: string;
    bookingFlowConfig?: BookingFlowConfig;
  };
  createdAt: string;
}

export type Role = 'customer' | 'staff' | 'merchant_admin' | 'platform_admin';

export interface User {
  id: string;
  tenantId?: string;
  lineUserId?: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  createdAt: string;
}

export interface ServiceAddonOption {
  id: string;
  name: string;
  priceDelta?: number;
}

export interface ServiceAddon {
  id: string;
  tenantId: string;
  serviceIds?: string[];
  name: string;
  description: string;
  price: number;
  extraDurationMinutes?: number;
  category: string;
  badge?: string;
  icon?: string;
  imageUrl?: string;
  options?: ServiceAddonOption[];
  isActive: boolean;
}

export interface SelectedAddon {
  id: string;
  addonId: string;
  name: string;
  price: number;
  extraDurationMinutes?: number;
  selectedOption?: string;
}

export interface TimePricingRule {
  id: string;
  name: string; // e.g. "ราคาช่วงกลางวัน", "ราคาช่วงเย็น/กลางคืน"
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  price: number;
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] (0=Sun, 1=Mon, ..., 6=Sat). Empty = All days
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  maxCapacity: number;
  bufferMinutes: number;
  colorCode: string;
  imageUrl?: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  addons?: ServiceAddon[];
  timePricingRules?: TimePricingRule[];
  operatingSchedule?: OperatingSchedule; // ตารางเวลาเฉพาะของบริการนี้
}

export interface Staff {
  id: string;
  tenantId: string;
  userId?: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string;
  colorCode: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  serviceIds: string[]; // Services this staff can perform
  workingDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  workStartTime?: string; // e.g. "09:00"
  workEndTime?: string; // e.g. "18:00"
}

export interface BusinessHour {
  id: string;
  tenantId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ... 6=Saturday
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  isOpen: boolean;
}

export interface StaffSchedule {
  id: string;
  tenantId: string;
  staffId: string;
  specificDate?: string; // "YYYY-MM-DD" or undefined for recurring
  dayOfWeek?: number; // 0-6
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  isAvailable: boolean;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partial_refund';
export type PaymentMethod = 'promptpay' | 'credit_card' | 'cash' | 'transfer';
export type BookingSource = 'line_liff' | 'web' | 'admin' | 'walk_in';

export interface Booking {
  id: string;
  refNo: string; // e.g. BK123456
  tenantId: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAvatar?: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  staffId?: string;
  staffName?: string;
  staffAvatar?: string;
  courtId?: string;
  courtName?: string;
  bookingDate: string; // "2026-08-01"
  startTime: string; // "10:00"
  endTime: string; // "11:00"
  status: BookingStatus;
  price: number;
  discountAmount: number;
  finalPrice: number;
  depositAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  source: BookingSource;
  notes?: string;
  addons?: SelectedAddon[];
  addonsTotalPrice?: number;
  cancellationReason?: string;
  cancelledAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  reminderSentAt?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  provider: 'omise' | 'stripe';
  providerRef?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  createdAt: string;
}

export interface CancellationPolicy {
  id: string;
  tenantId: string;
  name: string;
  hoursBefore: number;
  refundPercentage: number;
  isDefault: boolean;
}

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  bookingId?: string;
  title: string;
  message: string;
  type: 'booking_confirmation' | 'reminder' | 'cancellation' | 'payment';
  channel: 'line' | 'sms' | 'email';
  status: 'sent' | 'unread' | 'read';
  createdAt: string;
  flexMessageData?: any;
}

export interface AvailableSlot {
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  isAvailable: boolean;
  reason?: string; // "BOOKED" | "OUT_OF_HOURS" | "STAFF_UNAVAILABLE"
  price: number;
}

// -----------------------------------------
// Member & Loyalty System Types
// -----------------------------------------

export type MembershipTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface Membership {
  id: string;
  tenantId: string;
  userId: string;
  points: number; // Current points
  totalPointsEarned: number; // Lifetime points
  tier: MembershipTier;
  createdAt: string;
  updatedAt: string;
}

export type PointTransactionType = 'earn' | 'redeem' | 'adjust';

export interface PointTransaction {
  id: string;
  membershipId: string;
  bookingId?: string;
  points: number; // Can be positive or negative
  type: PointTransactionType;
  description: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  pointsRequired: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TenantLoyaltySettings {
  tenantId: string;
  pointStrategy: 'PER_VISIT' | 'AMOUNT_BASED' | 'DISABLED';
  pointsPerVisit: number;
  pointsPerCurrency: number;
  currencyAmount: number;
  enablePackageDeduction: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerPackage {
  id: string;
  tenantId: string;
  userId: string;
  serviceId?: string | null;
  packageName: string;
  totalQuota: number;
  usedQuota: number;
  expiresAt?: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
  createdAt?: string;
  updatedAt?: string;
}

export type RewardRedemptionStatus = 'pending' | 'used' | 'expired';

export interface RewardRedemption {
  id: string;
  membershipId: string;
  rewardId: string;
  status: RewardRedemptionStatus;
  redeemedAt: string;
  usedAt?: string;
}

// -----------------------------------------
// Platform Billing (ค่าบริการ SaaS ที่ร้านค้าจ่ายให้แพลตฟอร์ม)
// -----------------------------------------

export type BillingCycle = 'monthly' | 'yearly';
export type BillingProvider = 'promptpay' | 'omise';

/** ฟิลด์ที่ร้านค้าอ่านได้ (view: platform_billing_public) — ไม่มี secret key */
export interface PlatformBillingPublic {
  activeProvider: BillingProvider;
  promptpayNumber?: string;
  promptpayName?: string;
  omiseEnabled: boolean;
  omisePublicKey?: string;
  omiseTestMode: boolean;
  pricePro: { monthly: number; yearly: number };
  priceEnterprise: { monthly: number; yearly: number };
  currency: string;
  autoRenewOnPayment: boolean;

  // การตรวจสอบสลิปโอนเงิน (ช่องทาง PromptPay)
  slipVerifyProvider: SlipVerifyProvider;
  slipAutoApprove: boolean;
  expectedReceiverName?: string;
  slipTimeWindowHours: number;
  slipAmountTolerance: number;
  renewalReminderDays: number[];
}

export type SlipVerifyProvider = 'manual' | 'slipok' | 'easyslip';

/** ฟิลด์เต็ม — เฉพาะ platform_admin (table: platform_settings) */
export interface PlatformBillingSettings extends PlatformBillingPublic {
  omiseSecretKey?: string;
  slipVerifyApiKey?: string;
  slipVerifyBranchId?: string;
  expectedReceiverAccount?: string;
  updatedAt?: string;
}

export type SubscriptionInvoiceStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export interface SubscriptionInvoice {
  id: string;
  invoiceNo: string;
  tenantId: string;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  method: 'promptpay' | 'credit_card';
  provider: 'manual' | 'promptpay' | 'omise';
  providerRef?: string;
  status: SubscriptionInvoiceStatus;
  qrPayload?: string;
  periodStart?: string;
  periodEnd?: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  tenantId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  customerName?: string;
}
