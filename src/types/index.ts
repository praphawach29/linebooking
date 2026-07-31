export type TenantPlan = 'free' | 'pro' | 'enterprise';

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
  businessType: 'spa' | 'barbershop' | 'clinic' | 'salon' | 'other';
  plan: TenantPlan;
  planExpiresAt?: string;
  commissionRate: number;
  isActive: boolean;
  lineChannelId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  liffId?: string;
  settings: {
    promptpayNumber?: string;
    promptpayName?: string;
    depositPercentage?: number;
    autoConfirm?: boolean;
    bufferMinutesDefault?: number;
    maxAdvanceBookingDays?: number;
    minLeadTimeHours?: number;
    currency?: string;
    lineReminderEnabled?: boolean;
    lineReminderHoursBefore?: number;
    lineBookingConfirmationEnabled?: boolean;
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
  bookingDate: string; // "2026-08-01"
  startTime: string; // "10:00"
  endTime: string; // "11:00"
  status: BookingStatus;
  price: number;
  discountAmount: number;
  finalPrice: number;
  depositAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
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
