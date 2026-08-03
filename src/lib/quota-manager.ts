import { Tenant, Booking, Staff, Court, Service } from '../types';

export interface TenantQuotaInfo {
  isTrial: boolean;
  trialDaysRemaining: number;
  isPaidPlan: boolean;
  isUnlimited: boolean;

  // Monthly bookings
  monthlyBookingsCount: number;
  monthlyBookingsLimit: number;
  isBookingQuotaReached: boolean;

  // Staff limit
  staffCount: number;
  staffLimit: number;
  isStaffQuotaReached: boolean;

  // Court / resource limit
  courtCount: number;
  courtLimit: number;
  isCourtQuotaReached: boolean;

  // Service limit
  serviceCount: number;
  serviceLimit: number;
  isServiceQuotaReached: boolean;
}

export const FREE_PLAN_MONTHLY_BOOKING_LIMIT = 30;
export const FREE_PLAN_STAFF_LIMIT = 1;
export const FREE_PLAN_COURT_LIMIT = 1;
export const FREE_PLAN_SERVICE_LIMIT = 3;
export const TRIAL_DAYS = 14;

export function getTenantQuotaInfo(
  tenant: Tenant,
  bookings: Booking[] = [],
  staffs: Staff[] = [],
  courts: Court[] = [],
  services: Service[] = [],
): TenantQuotaInfo {
  // Prefer explicit trial_started_at from DB, fall back to created_at
  const trialStartStr =
    tenant.trialStartedAt ||
    (tenant as any).trial_started_at ||
    tenant.createdAt ||
    (tenant as any).created_at;

  const trialStartMs = trialStartStr ? new Date(trialStartStr).getTime() : Date.now();
  const trialEndMs = trialStartMs + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const isPaidPlan = tenant.plan === 'pro' || tenant.plan === 'enterprise';
  const isTrial = !isPaidPlan && nowMs <= trialEndMs;

  const trialDaysRemaining = isTrial
    ? Math.max(1, Math.ceil((trialEndMs - nowMs) / (1000 * 60 * 60 * 24)))
    : 0;

  const isUnlimited = isPaidPlan || isTrial;

  // Count current month's bookings
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyBookingsCount = bookings.filter(
    (b) => b.bookingDate && b.bookingDate.startsWith(currentMonthStr) && b.status !== 'cancelled'
  ).length;

  const staffCount = staffs.filter((s) => s.isActive).length;
  const courtCount = courts.filter((c) => c.isActive).length;
  const serviceCount = services.filter((s) => s.isActive).length;

  const monthlyBookingsLimit = isUnlimited ? Infinity : FREE_PLAN_MONTHLY_BOOKING_LIMIT;
  const staffLimit = isUnlimited ? Infinity : FREE_PLAN_STAFF_LIMIT;
  const courtLimit = isUnlimited ? Infinity : FREE_PLAN_COURT_LIMIT;
  const serviceLimit = isUnlimited ? Infinity : FREE_PLAN_SERVICE_LIMIT;

  return {
    isTrial,
    trialDaysRemaining,
    isPaidPlan,
    isUnlimited,

    monthlyBookingsCount,
    monthlyBookingsLimit,
    isBookingQuotaReached: !isUnlimited && monthlyBookingsCount >= FREE_PLAN_MONTHLY_BOOKING_LIMIT,

    staffCount,
    staffLimit,
    isStaffQuotaReached: !isUnlimited && staffCount >= FREE_PLAN_STAFF_LIMIT,

    courtCount,
    courtLimit,
    isCourtQuotaReached: !isUnlimited && courtCount >= FREE_PLAN_COURT_LIMIT,

    serviceCount,
    serviceLimit,
    isServiceQuotaReached: !isUnlimited && serviceCount >= FREE_PLAN_SERVICE_LIMIT,
  };
}
