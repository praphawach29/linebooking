import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  BookingApiError,
  getAvailableSlots as getAvailableSlotsFromApi,
  type BookingApiResponse,
} from '../lib/booking-api';
import {
  checkInMerchantBookingWithSession,
  createCustomerBookingWithLiff,
  createMerchantBookingWithSession,
  getCustomerBookingsWithLiff,
  rescheduleMerchantBookingWithSession,
  updateMerchantBookingStatusWithSession,
  verifyMerchantBookingPaymentWithSession,
} from '../lib/booking-client';
import { mapBookingApiResponse } from '../lib/booking-mapper';
import {
  Tenant,
  Service,
  ServiceAddon,
  SelectedAddon,
  Staff,
  Court,
  Booking,
  BusinessHour,
  CancellationPolicy,
  Review,
  NotificationItem,
  User,
  AvailableSlot,
  BookingStatus,
  PaymentMethod,
  Membership,
  MembershipTier,
  PointTransaction,
  Reward,
  RewardRedemption,
  TenantLoyaltySettings,
  CustomerPackage,
  BlackoutDate,
} from '../types';
import { BookingService } from '../services/bookingService';

const toCamelCase = (str: string) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

const camelizeKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => camelizeKeys(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamelCase(key)]: camelizeKeys(obj[key]),
      }),
      {}
    );
  }
  return obj;
};

type MerchantTab =
  | 'dashboard'
  | 'calendar'
  | 'walkin'
  | 'checkin'
  | 'shop_settings'
  | 'services'
  | 'staffs'
  | 'bookings'
  | 'payments'
  | 'analytics'
  | 'settings'
  | 'booking_settings'
  | 'booking_flow'
  | 'line_settings'
  | 'loyalty'
  | 'reviews'
  | 'onboarding';

interface SaaSContextType {
  isLoading: boolean;
  error: string | null;

  tenants: Tenant[];
  activeTenant: Tenant | null;

  merchantTab: MerchantTab;
  currentUser: User | null;
  services: Service[];
  serviceAddons: ServiceAddon[];
  staffs: Staff[];
  courts: Court[];
  bookings: Booking[];
  businessHours: BusinessHour[];
  cancellationPolicies: CancellationPolicy[];
  reviews: Review[];
  notifications: NotificationItem[];
  
  memberships: Membership[];
  pointTransactions: PointTransaction[];
  rewards: Reward[];
  loyaltySettings: TenantLoyaltySettings | null;
  customerPackages: CustomerPackage[];
  blackoutDates: BlackoutDate[];
  
  // Realtime
  lastRealtimeUpdate: number;
  
  // Actions
  setMerchantTab: (tab: MerchantTab) => void;
  switchTenant: (tenantId: string) => void;
  
  // Slot availability engine
  getAvailableSlots: (date: string, serviceId: string, staffId?: string, courtId?: string) => Promise<AvailableSlot[]>;
  
  // Booking operations
  createBooking: (data: {
    serviceId: string;
    staffId?: string;
    courtId?: string;
    bookingDate: string;
    startTime: string;
    bookingHours?: number;
    notes?: string;
    selectedAddons?: SelectedAddon[];
    paymentMethod: PaymentMethod;
    depositPaid?: boolean;
    paymentSlipUrl?: string;
    source?: 'line_liff' | 'walk_in' | 'admin';
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
  }) => Promise<Booking | null>;
  
  updateBookingStatus: (
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ) => Promise<void>;
  checkInBookingByCode: (code: string) => Promise<Booking>;
  verifyBookingPayment: (bookingId: string) => Promise<void>;
  rescheduleBooking: (
    bookingId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ) => Promise<void>;
  
  // Management CRUD
  saveService: (service: Partial<Service>) => void;
  deleteService: (serviceId: string) => void;
  saveServiceAddon: (addon: Partial<ServiceAddon>) => void;
  deleteServiceAddon: (addonId: string) => void;
  saveStaff: (staff: Partial<Staff>) => void;
  deleteStaff: (staffId: string) => void;
  saveCourt: (court: Partial<Court>) => void;
  deleteCourt: (courtId: string) => void;
  addBlackoutDate: (data: Omit<BlackoutDate, 'id' | 'tenantId' | 'createdAt'>) => Promise<void>;
  deleteBlackoutDate: (id: string) => Promise<void>;
  updateTenantSettings: (settings: Partial<Tenant['settings']>, tenantInfo?: Partial<Tenant>) => void;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => Promise<void>;
  updateCurrentUserContact: (contact: { phone?: string; email?: string }) => Promise<boolean>;
  updateBusinessHours: (hours: BusinessHour[]) => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
  addOnboardingTenant: (tenantData: Partial<Tenant>, initialService: Partial<Service>) => void;
  updateCancellationPolicies: (policies: CancellationPolicy[]) => void;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;

  /**
   * ดึงคิวของลูกค้าคนหนึ่ง (หน้า LIFF)
   * หลัง migration 0007 ตาราง bookings อ่านสาธารณะไม่ได้แล้ว ต้องผ่าน RPC ที่คืนเฉพาะของเจ้าตัว
   */
  fetchMyBookings: (lineUserId?: string, phone?: string) => Promise<Booking[]>;

  // Loyalty & Reward Actions
  fetchMembership: (userId: string) => Membership | undefined;
  redeemReward: (rewardId: string, userId: string) => boolean;
  completeBooking: (bookingId: string) => Promise<void>;
  saveReward: (reward: Partial<Reward>) => void;
  deleteReward: (rewardId: string) => void;
  adjustCustomerPoints: (userId: string, pointsDelta: number, reason: string) => void;
  saveLoyaltySettings: (settings: Partial<TenantLoyaltySettings>) => Promise<void>;
  addCustomerPackage: (pkg: Omit<CustomerPackage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<number>(Date.now());

  // Persistent Merchant Tab (sync with URL query string ?tab=... & localStorage)
  const [merchantTab, setMerchantTabState] = useState<MerchantTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab') as MerchantTab;
      if (urlTab) return urlTab;
      const saved = localStorage.getItem('merchant_active_tab') as MerchantTab;
      if (saved) return saved;
    } catch (e) {
      // ignore
    }
    return 'dashboard';
  });

  const setMerchantTab = (tab: MerchantTab) => {
    setMerchantTabState(tab);
    try {
      localStorage.setItem('merchant_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const syncTabFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab') as MerchantTab;
        if (urlTab) {
          setMerchantTabState(urlTab);
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceAddons, setServiceAddons] = useState<ServiceAddon[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loyaltySettings, setLoyaltySettings] = useState<TenantLoyaltySettings | null>(null);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);

  // Initial Data Fetching from Supabase
  useEffect(() => {
    async function fetchData(isSilent = false) {
      try {
        if (!isSilent) setIsLoading(true);

        // RLS หลัง migration 0007:
        //   - ผู้ที่ล็อกอินแล้ว (เจ้าของร้าน/แอดมิน) อ่านตารางจริงได้ → ได้ข้อมูลครบรวม LINE credentials
        //   - ผู้เยี่ยมชม (หน้า LIFF ลูกค้า) อ่านได้เฉพาะ view ที่คัดฟิลด์แล้ว
        const { data: sessionData } = await supabase.auth.getSession();
        const isAuthenticated = !!sessionData.session;

        let currentUserObj: User | null = null;
        let userTenantId: string | null = null;
        let isPlatformAdmin = false;

        if (sessionData.session?.user) {
          const authId = sessionData.session.user.id;
          const { data: userRows } = await supabase
            .from('users')
            .select('*')
            .or(`id.eq.${authId},auth_user_id.eq.${authId}`)
            .limit(1);

          if (userRows && userRows.length > 0) {
            currentUserObj = userRows[0] as unknown as User;
            userTenantId = (userRows[0] as any).tenant_id || null;
            isPlatformAdmin = currentUserObj.role === 'platform_admin';
          }
        }
        setCurrentUser(currentUserObj);

        const [
          { data: tenantsData },
          { data: servicesData },
          { data: addonsData },
          { data: staffData },
          { data: staffServicesData },
          { data: courtsData },
          { data: hoursData },
          { data: bookingsData },
          { data: policiesData },
          { data: reviewsData },
          { data: rewardsData },
          { data: membershipsData },
          { data: loyaltySettingsData },
          { data: customerPackagesData },
          { data: blackoutDatesData }
        ] = await Promise.all([
          // If platform_admin: fetch ALL real tenants in Supabase!
          // If logged-in merchant: fetch by their specific tenant_id
          // Public guests use the filtered view, which excludes LINE credentials.
          isPlatformAdmin
            ? supabase.from('tenants').select('*').order('created_at', { ascending: false })
            : isAuthenticated && userTenantId
            ? supabase.from('tenants').select('*').eq('id', userTenantId)
            : supabase.from('public_tenants').select('*'),
          supabase.from('services').select('*'),
          supabase.from('service_addons').select('*'),
          supabase.from('staff').select('*'),
          supabase.from('staff_services').select('*'),
          supabase.from('courts').select('*'),
          supabase.from('business_hours').select('*'),
          supabase.from('bookings').select('*').order('created_at', { ascending: false }),
          supabase.from('cancellation_policies').select('*'),
          supabase.from('reviews').select('*'),
          supabase.from('rewards').select('*'),
          isAuthenticated
            ? supabase.from('memberships').select('*')
            : Promise.resolve({ data: [] }),
          isAuthenticated && userTenantId
            ? supabase.from('tenant_loyalty_settings').select('*').eq('tenant_id', userTenantId).single()
            : Promise.resolve({ data: null, error: null }),
          isAuthenticated && userTenantId
            ? supabase.from('customer_packages').select('*').eq('tenant_id', userTenantId)
            : Promise.resolve({ data: [] }),
          supabase.from('blackout_dates').select('*')
        ]);

        let fetchedTenants: Tenant[] = [];
        if (tenantsData && tenantsData.length > 0) {
          fetchedTenants = camelizeKeys(tenantsData) as Tenant[];
        }

        const effectiveTenants = fetchedTenants;
        setTenants(effectiveTenants);

        if (effectiveTenants.length > 0) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlLiffId = urlParams.get('liffId');
          const urlLiffClientId = urlParams.get('liffClientId');
          const pathParts = window.location.pathname.split('/').filter(Boolean);
          const pathTenantIdOrSlug = pathParts.length >= 2 && pathParts[0] === 'liff' ? pathParts[1] : null;

          const matchedByPath = pathTenantIdOrSlug
            ? effectiveTenants.find((t) => t.slug === pathTenantIdOrSlug || t.id === pathTenantIdOrSlug)
            : null;

          const matchedByLiffId = urlLiffId
            ? effectiveTenants.find((t) => t.liffId === urlLiffId)
            : urlLiffClientId
            ? effectiveTenants.find((t) => t.liffId && t.liffId.startsWith(urlLiffClientId))
            : null;

          const matchedByUser = userTenantId
            ? effectiveTenants.find((t) => t.id === userTenantId)
            : null;

          const matchedByConfiguredLiff = effectiveTenants.find((t) => t.liffId && t.liffId.trim() !== '');

          const matchedByJackSports = effectiveTenants.find(
            (t) => t.name === 'JackSports' || t.slug === 'shop-praphawach2022' || t.businessType === 'sports'
          );

          const active =
            matchedByPath ||
            matchedByLiffId ||
            matchedByUser ||
            matchedByConfiguredLiff ||
            matchedByJackSports ||
            effectiveTenants[0];

          setActiveTenantId(active.id);
        }

        if (servicesData && servicesData.length > 0) {
          setServices(camelizeKeys(servicesData) as Service[]);
        } else {
          setServices([]);
        }

        if (addonsData && addonsData.length > 0) {
          setServiceAddons(camelizeKeys(addonsData) as ServiceAddon[]);
        } else {
          setServiceAddons([]);
        }

        if (staffData && staffData.length > 0) {
          const formattedStaff = camelizeKeys(staffData) as Staff[];
          if (staffServicesData) {
            const camelStaffServices = camelizeKeys(staffServicesData);
            formattedStaff.forEach(staff => {
              staff.serviceIds = camelStaffServices
                .filter((ss: any) => ss.staffId === staff.id)
                .map((ss: any) => ss.serviceId);
            });
          }
          setStaffs(formattedStaff);
        } else {
          setStaffs([]);
        }

        if (courtsData && courtsData.length > 0) {
          setCourts(camelizeKeys(courtsData) as Court[]);
        } else {
          setCourts([]);
        }
        if (hoursData) setBusinessHours(camelizeKeys(hoursData) as BusinessHour[]);
        if (bookingsData) {
          setBookings(camelizeKeys(bookingsData) as Booking[]);
        }
        if (policiesData) setCancellationPolicies(camelizeKeys(policiesData) as CancellationPolicy[]);
        if (reviewsData) setReviews(camelizeKeys(reviewsData) as Review[]);
        if (rewardsData) setRewards(camelizeKeys(rewardsData) as Reward[]);
        if (membershipsData) setMemberships(camelizeKeys(membershipsData) as Membership[]);
        
        if (loyaltySettingsData) setLoyaltySettings(camelizeKeys(loyaltySettingsData) as TenantLoyaltySettings);
        if (customerPackagesData) setCustomerPackages(camelizeKeys(customerPackagesData) as CustomerPackage[]);
        if (blackoutDatesData) setBlackoutDates(camelizeKeys(blackoutDatesData) as BlackoutDate[]);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error fetching data from Supabase:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    }

    function resetState() {
      setTenants([]);
      setActiveTenantId(null);
      setCurrentUser(null);
      setServices([]);
      setServiceAddons([]);
      setStaffs([]);
      setCourts([]);
      setBookings([]);
      setBusinessHours([]);
      setCancellationPolicies([]);
      setReviews([]);
      setRewards([]);
      setMemberships([]);
      setIsLoading(false);
    }

    // Initial fetch on mount
    fetchData(false);

    // Subscribe to realtime database changes for tenants & bookings
    const channel = supabase
      .channel('saas_global_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        () => {
          fetchData(true);
          setLastRealtimeUpdate(Date.now());
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchData(true);
          setLastRealtimeUpdate(Date.now());
        }
      )
      .subscribe();

    // Lightweight polling: ONLY refresh bookings table to avoid re-rendering tenants/services/staffs
    async function fetchBookingsOnly() {
      try {
        // Re-check session to get tenant context for proper filtering
        const { data: sessionSnap } = await supabase.auth.getSession();
        let tenantFilter: string | null = null;
        if (sessionSnap.session?.user) {
          const { data: uRows } = await supabase
            .from('users')
            .select('tenant_id')
            .or(`id.eq.${sessionSnap.session.user.id},auth_user_id.eq.${sessionSnap.session.user.id}`)
            .limit(1);
          if (uRows && uRows[0]?.tenant_id) tenantFilter = uRows[0].tenant_id;
        }

        const query = tenantFilter
          ? supabase.from('bookings').select('*').eq('tenant_id', tenantFilter)
          : supabase.from('bookings').select('*');

        const { data: bookingsData } = await query;
        if (bookingsData) {
          setBookings(camelizeKeys(bookingsData) as Booking[]);
        }
      } catch (e) {
        // Ignore background poll errors
      }
    }

    // Auto polling interval every 10 seconds for real-time dashboard updates (lightweight)
    const pollInterval = setInterval(() => {
      fetchBookingsOnly();
    }, 10000);

    // Re-fetch when user signs in (handles logout → login with different account)
    // Reset state when user signs out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchData(false);
      } else if (event === 'SIGNED_OUT') {
        resetState();
      }
    });

    return () => {
      clearInterval(pollInterval);
      subscription.unsubscribe();
      channel.unsubscribe();
    };
  }, []);

  const activeTenant = useMemo(() => {
    return tenants.find((t) => t.id === activeTenantId) || null;
  }, [tenants, activeTenantId]);

  const tenantServices = useMemo(() => {
    return activeTenant ? services.filter((s) => s.tenantId === activeTenant.id) : [];
  }, [services, activeTenant]);

  const tenantServiceAddons = useMemo(() => {
    return activeTenant ? serviceAddons.filter((a) => a.tenantId === activeTenant.id && a.isActive) : [];
  }, [serviceAddons, activeTenant]);

  const tenantStaffs = useMemo(() => {
    return activeTenant ? staffs.filter((s) => s.tenantId === activeTenant.id) : [];
  }, [staffs, activeTenant]);

  const tenantCourts = useMemo(() => {
    return activeTenant ? courts.filter((c) => c.tenantId === activeTenant.id) : [];
  }, [courts, activeTenant]);

  const tenantBlackoutDates = useMemo(() => {
    return activeTenant ? blackoutDates.filter((b) => b.tenantId === activeTenant.id) : [];
  }, [blackoutDates, activeTenant]);

  const tenantBookings = useMemo(() => {
    return activeTenant ? bookings.filter((b) => b.tenantId === activeTenant.id) : [];
  }, [bookings, activeTenant]);

  const tenantNotifications = useMemo(() => {
    return activeTenant ? notifications.filter((n) => n.tenantId === activeTenant.id) : [];
  }, [notifications, activeTenant]);

  const tenantRewards = useMemo(() => {
    return activeTenant ? rewards.filter((r) => r.tenantId === activeTenant.id) : [];
  }, [rewards, activeTenant]);

  /** Load this customer history through the LINE-authenticated backend API. */
  const fetchMyBookings = async (lineUserId?: string, phone?: string): Promise<Booking[]> => {
    let lineId = lineUserId || currentUser?.lineUserId;
    if (!lineId) {
      try {
        const rawProfile = localStorage.getItem('line_liff_profile_v1');
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          if (parsed && parsed.lineUserId) {
            lineId = parsed.lineUserId;
          }
        }
      } catch (e) {}
    }

    if (!lineId || !activeTenant) return [];

    const liffId =
      activeTenant.liffId ||
      (import.meta.env.VITE_LIFF_ID as string | undefined) ||
      '';

    try {
      const response = await getCustomerBookingsWithLiff({
        tenantId: activeTenant.id,
        liffId,
      });
      const list = response.map((item) => {
        const service = services.find((entry) => entry.id === item.serviceId);
        return mapBookingApiResponse(item, service);
      });

      setBookings((prev) => {
        const ids = new Set(list.map((b) => b.id));
        return [...list, ...prev.filter((b) => !ids.has(b.id))];
      });
      return list;
    } catch (error) {
      console.error('Error fetching customer bookings from API:', error);
      return [];
    }
  };

  const fetchMembership = (userId: string) => {
    if (!activeTenant) return undefined;
    return memberships.find(m => m.tenantId === activeTenant.id && m.userId === userId);
  };

  const redeemReward = (rewardId: string, userId: string) => {
    if (!activeTenant) return false;
    const reward = rewards.find(r => r.id === rewardId);
    const membership = memberships.find(m => m.tenantId === activeTenant.id && m.userId === userId);

    if (!reward || !membership || membership.points < reward.pointsRequired) {
      return false;
    }

    // Update local state (in a real app, this should be a Supabase RPC or transaction)
    setMemberships(prev => prev.map(m => {
      if (m.id === membership.id) {
        return { ...m, points: m.points - reward.pointsRequired };
      }
      return m;
    }));

    const newTx: PointTransaction = {
      id: `pt-${Date.now()}`,
      membershipId: membership.id,
      bookingId: undefined,
      points: -reward.pointsRequired,
      type: 'redeem',
      description: `แลกของรางวัล: ${reward.name}`,
      createdAt: new Date().toISOString(),
    };
    setPointTransactions(prev => [newTx, ...prev]);

    return true;
  };

  const completeBooking = async (bookingId: string) => {
    if (!activeTenant) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    await updateBookingStatus(bookingId, 'completed');
  };

  const switchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
  };

  const getAvailableSlots = async (
    dateStr: string,
    serviceId: string,
    staffId?: string,
    courtId?: string,
  ): Promise<AvailableSlot[]> => {
    if (!activeTenant) return [];
    const service = services.find((item) => item.id === serviceId);

    try {
      const response = await getAvailableSlotsFromApi(
        activeTenant.id,
        { serviceId, bookingDate: dateStr, staffId, courtId },
      );

      return (response.slots || []).map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.available,
        reason: slot.available ? undefined : 'BOOKED',
        price: service?.price ?? 1200,
      }));
    } catch (apiError: any) {
      console.warn('getAvailableSlotsFromApi fallback to BookingService:', apiError);

      const calculatedSlots = BookingService.getAvailableSlots(
        service?.durationMinutes ?? 60,
        staffId ?? null,
        dateStr,
        bookings.filter((b) => b.tenantId === activeTenant.id),
        businessHours.filter((b) => b.tenantId === activeTenant.id),
        staffs.filter((s) => s.tenantId === activeTenant.id),
      );

      const filteredSlots = (service?.durationMinutes ?? 60) >= 60
        ? calculatedSlots.filter((slot) => slot.time.endsWith(':00'))
        : calculatedSlots;

      return filteredSlots.map((slot) => ({
        startTime: slot.time,
        endTime: slot.time,
        isAvailable: slot.available,
        reason: slot.reason,
        price: service?.price ?? 1200,
      }));
    }
  };

  const createBooking = async (data: {
    serviceId: string;
    staffId?: string;
    courtId?: string;
    bookingDate: string;
    startTime: string;
    bookingHours?: number;
    notes?: string;
    selectedAddons?: SelectedAddon[];
    paymentMethod: PaymentMethod;
    depositPaid?: boolean;
    paymentSlipUrl?: string;
    source?: 'line_liff' | 'walk_in' | 'admin';
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
  }): Promise<Booking | null> => {
    if (!activeTenant) return null;

    const service = services.find(
      (item) => item.id === data.serviceId && (!item.tenantId || item.tenantId === activeTenant.id)
    );
    if (!service) {
      setError('Selected service does not belong to the current shop. Please choose a service again.');
      return null;
    }

    // Try to get line user id from stored profile
    const lineProfileRaw = (() => {
      try { return localStorage.getItem('line_liff_profile_v1'); } catch { return null; }
    })();
    const lineProfile = lineProfileRaw ? (() => { try { return JSON.parse(lineProfileRaw); } catch { return null; } })() : null;

    // Check booking limit if source is line_liff
    if (data.source === 'line_liff' && lineProfile?.userId && activeTenant.settings.bookingLimit?.enabled) {
      const limitConfig = activeTenant.settings.bookingLimit;
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (limitConfig.period === 'day') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
      } else if (limitConfig.period === 'week') {
        const day = now.getDay() || 7; // 1-7 (Monday-Sunday)
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      const userBookingsInPeriod = bookings.filter(b => 
        b.userId === lineProfile.lineUserId &&
        b.tenantId === activeTenant.id &&
        b.status !== 'cancelled' &&
        new Date(b.createdAt) >= periodStart &&
        new Date(b.createdAt) < periodEnd
      );

      if (userBookingsInPeriod.length >= limitConfig.amount) {
        let periodText = limitConfig.period === 'day' ? 'วัน' : limitConfig.period === 'week' ? 'สัปดาห์' : 'เดือน';
        setError(`คุณใช้งานสิทธิ์การจองครบกำหนดแล้ว (${limitConfig.amount} ครั้งต่อ${periodText})`);
        return null;
      }
    }

    const cleanStartTime = data.startTime.includes(' - ')
      ? data.startTime.split(' - ')[0].trim()
      : data.startTime.trim();

    const tenantStaffs = staffs.filter((item) => item.tenantId === activeTenant.id);
    const tenantCourts = courts.filter((item) => item.tenantId === activeTenant.id);
    const localStaff = tenantStaffs.find((item) => item.id === data.staffId) || tenantStaffs[0];
    const localCourt = tenantCourts.find((item) => item.id === data.courtId);

    const courtExtra = localCourt?.extraPricePerHour || 0;
    const unitPricePerHour = (service?.price ?? 1200) + courtExtra;
    const hours = data.bookingHours || 1;
    const addonsTotal = data.selectedAddons?.reduce((s, a) => s + (a?.price ?? 0), 0) || 0;
    const totalPrice = (unitPricePerHour * hours) + addonsTotal;
    const depositPct = activeTenant.settings?.depositPercentage ?? 50;
    const depositAmount = data.paymentMethod === 'cash' ? 0 : Math.round((totalPrice * depositPct) / 100);

    const [startHourNum, startMinNum] = cleanStartTime.split(':').map(Number);
    const totalMinutes = ((startHourNum || 10) * 60 + (startMinNum || 0)) + (hours * 60);
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const calculatedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    try {
      const phone = data.customerPhone?.replace(/[\s-]/g, '') || undefined;
      const input = {
        serviceId: data.serviceId,
        serviceName: service?.name || 'บริการ',
        staffId: data.staffId,
        staffName: localStaff?.name,
        courtId: data.courtId,
        courtName: localCourt?.name,
        bookingDate: data.bookingDate,
        startTime: cleanStartTime,
        endTime: calculatedEndTime,
        bookingHours: data.bookingHours,
        customerName: data.customerName,
        customerPhone: phone,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        depositPaid: data.depositPaid,
        paymentSlipUrl: data.paymentSlipUrl,
        price: totalPrice,
        finalPrice: totalPrice,
        depositAmount: depositAmount,
      };
      const isMerchant = data.source === 'walk_in' || data.source === 'admin';
      let response: BookingApiResponse;

      if (isMerchant) {
        if (!data.customerId) {
          setError('Select an existing customer before creating a merchant booking.');
          return null;
        }
        response = await createMerchantBookingWithSession(
          { ...input, customerId: data.customerId },
          { tenantId: activeTenant.id },
        );
      } else {
        const liffId =
          activeTenant.liffId ||
          (import.meta.env.VITE_LIFF_ID as string | undefined) ||
          '';
        response = await createCustomerBookingWithLiff(input, {
          tenantId: activeTenant.id,
          liffId,
        });
      }

      const savedBooking = mapBookingApiResponse(response, service, localStaff, localCourt);

      setBookings((prev) => [savedBooking, ...prev]);
      setError(null);
      
      return savedBooking;
    } catch (err: unknown) {
      console.error('Booking API request failed:', err);
      setError(err instanceof Error ? err.message : 'Unable to create booking');
      throw err;
    }
  };

  const updateBookingStatus = async (bookingId: string, status: BookingStatus, reason?: string) => {
    const existing = bookings.find((booking) => booking.id === bookingId);
    if (!existing) {
      throw new Error('ไม่พบรายการจองนี้ในข้อมูลล่าสุด กรุณารีเฟรชหน้าแล้วลองอีกครั้ง');
    }
    if (!activeTenant) {
      throw new Error('ไม่พบข้อมูลร้านค้าที่กำลังใช้งาน กรุณาเข้าสู่ระบบใหม่');
    }

    try {
      const response = await updateMerchantBookingStatusWithSession(
        bookingId,
        { status, reason },
        { tenantId: activeTenant.id },
      );
      const service = services.find((item) => item.id === response.serviceId);
      const staff = staffs.find((item) => item.id === response.staffId);
      const court = courts.find((item) => item.id === response.courtId);
      const updated = mapBookingApiResponse(response, service, staff, court);
      setBookings((prev) => prev.map((item) => (item.id === bookingId ? updated : item)));

      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update booking status');
      throw updateError;
    }
  };

  const verifyBookingPayment = async (bookingId: string): Promise<void> => {
    if (!activeTenant) {
      throw new Error('ไม่พบข้อมูลร้านค้าที่กำลังใช้งาน กรุณาเข้าสู่ระบบใหม่');
    }

    try {
      const response = await verifyMerchantBookingPaymentWithSession(
        bookingId,
        { tenantId: activeTenant.id },
      );
      const service = services.find((item) => item.id === response.serviceId);
      const staff = staffs.find((item) => item.id === response.staffId);
      const court = courts.find((item) => item.id === response.courtId);
      const updated = mapBookingApiResponse(response, service, staff, court);
      setBookings((prev) => prev.map((item) => (item.id === bookingId ? updated : item)));
      setError(null);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Failed to verify payment');
      throw verifyError;
    }
  };

  const checkInBookingByCode = async (code: string): Promise<Booking> => {
    if (!activeTenant) throw new Error('No active tenant');

    try {
      const response = await checkInMerchantBookingWithSession(code, {
        tenantId: activeTenant.id,
      });
      const service = services.find((item) => item.id === response.serviceId);
      const staff = staffs.find((item) => item.id === response.staffId);
      const court = courts.find((item) => item.id === response.courtId);
      const checkedIn = mapBookingApiResponse(response, service, staff, court);
      setBookings((prev) => {
        const exists = prev.some((item) => item.id === checkedIn.id);
        return exists
          ? prev.map((item) => (item.id === checkedIn.id ? checkedIn : item))
          : [checkedIn, ...prev];
      });
      setError(null);
      return checkedIn;
    } catch (checkInError) {
      setError(checkInError instanceof Error ? checkInError.message : 'Failed to check in booking');
      throw checkInError;
    }
  };

  const rescheduleBooking = async (
    bookingId: string,
    newDate: string,
    newStartTime: string,
    _newEndTime: string,
  ) => {
    const existing = bookings.find((booking) => booking.id === bookingId);
    if (!existing || !activeTenant) return;

    try {
      const response = await rescheduleMerchantBookingWithSession(
        bookingId,
        { bookingDate: newDate, startTime: newStartTime },
        { tenantId: activeTenant.id },
      );
      const service = services.find((item) => item.id === response.serviceId);
      const staff = staffs.find((item) => item.id === response.staffId);
      const court = courts.find((item) => item.id === response.courtId);
      const updated = mapBookingApiResponse(response, service, staff, court);
      setBookings((prev) => prev.map((item) => (item.id === bookingId ? updated : item)));
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to reschedule booking');
      throw updateError;
    }
  };

  const saveService = async (serviceData: Partial<Service>) => {
    if (!activeTenant) return;
    const isUUID = serviceData.id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(serviceData.id);
    const isNew = !serviceData.id || !isUUID;
    const id = isUUID ? serviceData.id! : generateUUID();

    const newService: Service = {
      id,
      tenantId: activeTenant.id,
      name: serviceData.name || 'บริการใหม่',
      description: serviceData.description || '',
      durationMinutes: serviceData.durationMinutes || 60,
      price: serviceData.price || 500,
      currency: 'THB',
      maxCapacity: 1,
      bufferMinutes: serviceData.bufferMinutes || 0,
      colorCode: serviceData.colorCode || '#3B82F6',
      imageUrl: serviceData.imageUrl || '',
      category: serviceData.category || 'ทั่วไป',
      isActive: true,
      sortOrder: serviceData.sortOrder || services.length + 1,
      timePricingRules: serviceData.timePricingRules || [],
      operatingSchedule: serviceData.operatingSchedule,
    };

    setServices((prev) => {
      const exists = prev.some((s) => s.id === id || (serviceData.id && s.id === serviceData.id));
      if (exists) {
        return prev.map((s) => (s.id === id || (serviceData.id && s.id === serviceData.id) ? newService : s));
      }
      return [newService, ...prev];
    });

    const row: any = {
      id,
      tenant_id: activeTenant.id,
      name: newService.name,
      description: newService.description,
      duration_minutes: newService.durationMinutes,
      price: newService.price,
      currency: 'THB',
      max_capacity: 1,
      buffer_minutes: newService.bufferMinutes,
      color_code: newService.colorCode,
      image_url: newService.imageUrl || null,
      category: newService.category,
      is_active: true,
      sort_order: newService.sortOrder,
      operating_schedule: newService.operatingSchedule ?? null,
    };

    if (newService.timePricingRules) {
      row.time_pricing_rules = newService.timePricingRules;
    }

    const { error } = await supabase.from('services').upsert(row);
    if (error) {
      console.error('Error saving service to Supabase:', error.message);
      if (error.message.includes('time_pricing_rules')) {
        delete row.time_pricing_rules;
        await supabase.from('services').upsert(row);
      }
    }
  };

  const deleteService = async (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) console.error('Error deleting service in Supabase:', error.message);
  };

  const saveServiceAddon = async (addonData: Partial<ServiceAddon>) => {
    if (!activeTenant) return;
    const isUUID = addonData.id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(addonData.id);
    const isNew = !addonData.id || !isUUID;
    const id = isUUID ? addonData.id! : generateUUID();

    const newAddon: ServiceAddon = {
      id,
      tenantId: activeTenant.id,
      name: addonData.name || 'บริการเสริมใหม่',
      description: addonData.description || '',
      price: addonData.price || 100,
      extraDurationMinutes: addonData.extraDurationMinutes || 0,
      category: addonData.category || 'ทั่วไป',
      badge: addonData.badge || '',
      imageUrl: addonData.imageUrl || '',
      icon: addonData.icon || '',
      options: addonData.options,
      isActive: true,
    };

    setServiceAddons((prev) => {
      const exists = prev.some((a) => a.id === id || (addonData.id && a.id === addonData.id));
      if (exists) {
        return prev.map((a) => (a.id === id || (addonData.id && a.id === addonData.id) ? newAddon : a));
      }
      return [newAddon, ...prev];
    });

    const row: any = {
      id,
      tenant_id: activeTenant.id,
      name: newAddon.name,
      description: newAddon.description,
      price: newAddon.price,
      extra_duration_minutes: newAddon.extraDurationMinutes,
      category: newAddon.category,
      badge: newAddon.badge,
      image_url: newAddon.imageUrl || null,
      icon: newAddon.icon,
      is_active: newAddon.isActive,
    };

    const { error } = await supabase.from('service_addons').upsert(row);
    if (error) {
      console.error('Error saving service addon to Supabase:', error.message);
      if (error.message.includes('image_url')) {
        delete row.image_url;
        await supabase.from('service_addons').upsert(row);
      }
    }
  };

  const deleteServiceAddon = async (addonId: string) => {
    setServiceAddons((prev) => prev.filter((a) => a.id !== addonId));
    const { error } = await supabase.from('service_addons').delete().eq('id', addonId);
    if (error) console.error('Error deleting service addon in Supabase:', error.message);
  };

  const saveStaff = async (staffData: Partial<Staff>) => {
    if (!activeTenant) return;
    const isUUID = staffData.id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(staffData.id);
    const isNew = !staffData.id || !isUUID;
    const id = isUUID ? staffData.id! : generateUUID();

    const newStaff: Staff = {
      id,
      tenantId: activeTenant.id,
      name: staffData.name || 'ช่างใหม่',
      phone: staffData.phone || '',
      email: staffData.email || '',
      avatarUrl:
        staffData.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      colorCode: staffData.colorCode || '#10B981',
      bio: staffData.bio || 'ช่างผู้เชี่ยวชาญประจำร้าน',
      rating: staffData.rating || 5.0,
      reviewsCount: staffData.reviewsCount || 1,
      isActive: staffData.isActive ?? true,
      serviceIds: staffData.serviceIds || [],
      workingDays: staffData.workingDays || [1, 2, 3, 4, 5, 6],
      workStartTime: staffData.workStartTime || '09:00',
      workEndTime: staffData.workEndTime || '18:00',
    };

    setStaffs((prev) => {
      const exists = prev.some((st) => st.id === id || (staffData.id && st.id === staffData.id));
      if (exists) {
        return prev.map((st) => (st.id === id || (staffData.id && st.id === staffData.id) ? newStaff : st));
      }
      return [newStaff, ...prev];
    });

    const row: any = {
      id,
      tenant_id: activeTenant.id,
      name: newStaff.name,
      phone: newStaff.phone,
      email: newStaff.email,
      avatar_url: newStaff.avatarUrl,
      color_code: newStaff.colorCode,
      bio: newStaff.bio,
      rating: newStaff.rating,
      reviews_count: newStaff.reviewsCount,
      is_active: newStaff.isActive,
    };

    const { error } = await supabase.from('staff').upsert(row);
    if (error) console.error('Error saving staff to Supabase:', error.message);
  };

  const deleteStaff = async (staffId: string) => {
    setStaffs((prev) => prev.filter((st) => st.id !== staffId));
    const { error } = await supabase.from('staff').delete().eq('id', staffId);
    if (error) console.error('Error deleting staff in Supabase:', error.message);
  };

  const saveCourt = async (courtData: Partial<Court>) => {
    if (!activeTenantId) return;
    const isUUID = courtData.id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courtData.id);
    const isNew = !courtData.id || !isUUID;
    const courtId = isUUID ? courtData.id! : generateUUID();

    const validServiceId =
      courtData.serviceId &&
      courtData.serviceId.trim() !== '' &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courtData.serviceId)
        ? courtData.serviceId
        : null;

    const newCourt: Court = {
      id: courtId,
      tenantId: activeTenantId,
      serviceId: validServiceId || '',
      name: courtData.name || 'สนาม A',
      code: courtData.code || `CRT-${Math.floor(10 + Math.random() * 90)}`,
      description: courtData.description || 'สนามคุณภาพมาตรฐาน',
      type: courtData.type || 'indoor',
      imageUrl:
        courtData.imageUrl ||
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80',
      extraPricePerHour: courtData.extraPricePerHour || 0,
      isActive: courtData.isActive ?? true,
      operatingSchedule: courtData.operatingSchedule,
    };

    setCourts((prev) => {
      const exists = prev.some((c) => c.id === courtId || (courtData.id && c.id === courtData.id));
      if (exists) {
        return prev.map((c) => (c.id === courtId || (courtData.id && c.id === courtData.id) ? newCourt : c));
      }
      return [newCourt, ...prev];
    });

    const dbRow = {
      id: courtId,
      tenant_id: activeTenantId,
      service_id: validServiceId,
      name: newCourt.name,
      code: newCourt.code,
      description: newCourt.description,
      type: newCourt.type,
      image_url: newCourt.imageUrl,
      extra_price_per_hour: newCourt.extraPricePerHour,
      is_active: newCourt.isActive,
      operating_schedule: newCourt.operatingSchedule ?? null,
    };

    const { error } = await supabase.from('courts').upsert(dbRow);
    if (error) console.error('Error saving court to Supabase:', error.message);
  };

  const deleteCourt = async (courtId: string) => {
    setCourts((prev) => prev.filter((c) => c.id !== courtId));
    const { error } = await supabase.from('courts').delete().eq('id', courtId);
    if (error) console.error('Error deleting court from Supabase:', error.message);
  };

  const addBlackoutDate = async (data: Omit<BlackoutDate, 'id' | 'tenantId' | 'createdAt'>) => {
    if (!activeTenantId) return;

    const row = {
      tenant_id: activeTenantId,
      scope: data.scope,
      service_id: data.scope === 'service' ? data.serviceId : null,
      court_id: data.scope === 'court' ? data.courtId : null,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason || null,
    };

    const { data: inserted, error } = await supabase.from('blackout_dates').insert(row).select().single();
    if (error) {
      console.error('Error adding blackout date to Supabase:', error.message);
      return;
    }

    setBlackoutDates((prev) => [camelizeKeys(inserted) as BlackoutDate, ...prev]);
  };

  const deleteBlackoutDate = async (id: string) => {
    setBlackoutDates((prev) => prev.filter((b) => b.id !== id));
    const { error } = await supabase.from('blackout_dates').delete().eq('id', id);
    if (error) console.error('Error deleting blackout date from Supabase:', error.message);
  };

  const updateTenantSettings = async (
    newSettings: Partial<Tenant['settings']>,
    tenantInfo?: Partial<Tenant>
  ) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === activeTenant.id) {
          return {
            ...t,
            ...tenantInfo,
            settings: {
              ...t.settings,
              ...newSettings,
            },
          };
        }
        return t;
      })
    );

    if (activeTenant) {
      await updateTenant(activeTenant.id, {
        ...tenantInfo,
        settings: {
          ...activeTenant.settings,
          ...newSettings,
        },
      });
    }
  };

  // อัปเดตข้อมูลร้านค้า (ใช้ทั้งจาก Super Admin, เมนูตั้งค่าร้านค้า และตอนต่ออายุแพ็กเกจ) + persist ลง Supabase
  const updateCurrentUserContact = async (contact: { phone?: string; email?: string }): Promise<boolean> => {
    if (!currentUser) return false;

    const updates: Partial<User> = {
      phone: contact.phone?.trim() || '',
      email: contact.email?.trim() || '',
    };

    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));

    const { error } = await supabase
      .from('users')
      .update({ phone: updates.phone || null, email: updates.email || null })
      .eq('id', currentUser.id);

    if (error) {
      console.error('Error updating user contact in Supabase:', error.message);
      setCurrentUser(currentUser);
      return false;
    }

    return true;
  };
  const updateTenant = async (tenantId: string, updates: Partial<Tenant>) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? ({ ...t, ...updates } as Tenant) : t))
    );

    const row: Record<string, any> = {};
    if (updates.plan !== undefined) row.plan = updates.plan;
    if (updates.planExpiresAt !== undefined) row.plan_expires_at = updates.planExpiresAt;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.slug !== undefined) row.slug = updates.slug;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl;
    if (updates.coverImageUrl !== undefined) row.cover_image_url = updates.coverImageUrl;
    if (updates.phone !== undefined) row.phone = updates.phone;
    if (updates.email !== undefined) row.email = updates.email;
    if (updates.address !== undefined) row.address = updates.address;
    if (updates.businessType !== undefined) row.business_type = updates.businessType;
    if (updates.lineChannelId !== undefined) row.line_channel_id = updates.lineChannelId;
    if (updates.lineChannelSecret !== undefined) row.line_channel_secret = updates.lineChannelSecret;
    if (updates.lineChannelAccessToken !== undefined) row.line_channel_access_token = updates.lineChannelAccessToken;
    if (updates.liffId !== undefined) row.liff_id = updates.liffId;
    if (updates.settings !== undefined) row.settings = updates.settings;

    if (Object.keys(row).length === 0) return;

    const { error } = await supabase.from('tenants').update(row).eq('id', tenantId);
    if (error) console.error('Error updating tenant in Supabase:', error.message);
  };

  const deleteTenant = async (tenantId: string) => {
    setTenants((prev) => prev.filter((t) => t.id !== tenantId));
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
    if (error) console.error('Error deleting tenant in Supabase:', error.message);
  };

  const updateBusinessHours = async (hours: BusinessHour[]): Promise<void> => {
    if (!activeTenant) return;
    setBusinessHours(hours);

    for (const bh of hours) {
      const row = {
        tenant_id: activeTenant.id,
        day_of_week: bh.dayOfWeek,
        open_time: bh.openTime,
        close_time: bh.closeTime,
        is_open: bh.isOpen,
      };

      const { error } = await supabase
        .from('business_hours')
        .upsert(row, { onConflict: 'tenant_id,day_of_week' });

      if (error) {
        console.error('Error upserting business_hours:', error.message);
      }
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: 'read' as const } : n))
    );
  };

  const addOnboardingTenant = (
    tenantData: Partial<Tenant>,
    initialService: Partial<Service>
  ) => {
    const newTenantId = `tenant-${Date.now()}`;
    const slug = tenantData.slug || `shop-${Math.floor(Math.random() * 1000)}`;

    const newTenant: Tenant = {
      id: newTenantId,
      name: tenantData.name || 'ร้านค้าใหม่',
      slug,
      description: tenantData.description || '',
      logoUrl:
        tenantData.logoUrl ||
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&auto=format&fit=crop&q=80',
      coverImageUrl:
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80',
      phone: tenantData.phone || '02-000-0000',
      email: tenantData.email || 'owner@example.com',
      address: tenantData.address || 'กรุงเทพมหานคร',
      businessType: tenantData.businessType || 'spa',
      plan: 'pro',
      commissionRate: 0,
      isActive: true,
      lineChannelId: tenantData.lineChannelId || '2009999999',
      lineChannelSecret: tenantData.lineChannelSecret || 'secret123456',
      liffId: tenantData.liffId || '2009999999-MockLiff',
      settings: {
        promptpayNumber: '0812345678',
        promptpayName: tenantData.name,
        depositPercentage: 50,
        autoConfirm: true,
        bufferMinutesDefault: 15,
        maxAdvanceBookingDays: 30,
        currency: 'THB',
      },
      createdAt: new Date().toISOString(),
    };

    const firstService: Service = {
      id: `svc-${Date.now()}`,
      tenantId: newTenantId,
      name: initialService.name || 'บริการแรก',
      description: initialService.description || 'รายละเอียดบริการ',
      durationMinutes: initialService.durationMinutes || 60,
      price: initialService.price || 1000,
      currency: 'THB',
      maxCapacity: 1,
      bufferMinutes: 15,
      colorCode: '#3B82F6',
      category: 'ทั่วไป',
      isActive: true,
      sortOrder: 1,
    };

    setTenants((prev) => [...prev, newTenant]);
    setServices((prev) => [...prev, firstService]);
    setActiveTenantId(newTenantId);
    setMerchantTab('dashboard');
  };

  const updateCancellationPolicies = (policies: CancellationPolicy[]) => {
    setCancellationPolicies(policies);
  };

  const addReview = (review: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = {
      ...review,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setReviews(prev => [newReview, ...prev]);
    // Optionally insert to supabase here
  };

  const saveReward = async (rewardData: Partial<Reward>) => {
    if (!activeTenantId) return;
    const isNew = !rewardData.id;
    const rewardId = rewardData.id || `reward-${Date.now()}`;

    const newReward: Reward = {
      id: rewardId,
      tenantId: activeTenantId,
      name: rewardData.name || 'ของรางวัลใหม่',
      description: rewardData.description || '',
      pointsRequired: rewardData.pointsRequired || 100,
      imageUrl: rewardData.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300',
      isActive: rewardData.isActive ?? true,
      createdAt: rewardData.createdAt || new Date().toISOString(),
    };

    setRewards((prev) => (isNew ? [newReward, ...prev] : prev.map((r) => (r.id === rewardId ? newReward : r))));

    const dbRow = {
      id: rewardId,
      tenant_id: activeTenantId,
      name: newReward.name,
      description: newReward.description,
      points_required: newReward.pointsRequired,
      image_url: newReward.imageUrl,
      is_active: newReward.isActive,
    };

    const { error } = await supabase.from('rewards').upsert(dbRow);
    if (error) console.error('Error saving reward to Supabase:', error.message);
  };

  const deleteReward = async (rewardId: string) => {
    setRewards((prev) => prev.filter((r) => r.id !== rewardId));
    const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
    if (error) console.error('Error deleting reward from Supabase:', error.message);
  };

  const adjustCustomerPoints = async (userId: string, pointsDelta: number, reason: string) => {
    if (!activeTenantId) return;

    const existing = memberships.find((m) => m.userId === userId && m.tenantId === activeTenantId);
    const newPoints = Math.max(0, (existing?.points || 0) + pointsDelta);
    const newTotalEarned =
      pointsDelta > 0 ? (existing?.totalPointsEarned || 0) + pointsDelta : existing?.totalPointsEarned || 0;
    // Mirrors computeMembershipTier() in backend/src/bookings/bookings.service.ts
    // so manual point adjustments land on the same tier thresholds as automatic
    // point-earning on check-in.
    const newTier: MembershipTier =
      newTotalEarned >= 1000 ? 'Platinum' : newTotalEarned >= 500 ? 'Gold' : newTotalEarned >= 100 ? 'Silver' : 'Bronze';

    // Persist to Supabase so the change is reflected everywhere the `memberships`
    // table is read from (e.g. the LINE LIFF customer profile via the backend API),
    // not just in this browser's local state.
    const { data, error } = await supabase
      .from('memberships')
      .upsert(
        {
          ...(existing ? { id: existing.id } : {}),
          tenant_id: activeTenantId,
          user_id: userId,
          points: newPoints,
          total_points_earned: newTotalEarned,
          tier: newTier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error adjusting customer points in Supabase:', error.message);
      return;
    }

    const updatedMembership = camelizeKeys(data) as Membership;
    setMemberships((prev) => {
      const idx = prev.findIndex((m) => m.id === updatedMembership.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedMembership;
        return next;
      }
      return [updatedMembership, ...prev];
    });

    const { error: txError } = await supabase.from('point_transactions').insert({
      membership_id: updatedMembership.id,
      points: pointsDelta,
      type: pointsDelta >= 0 ? 'ADJUST_ADD' : 'ADJUST_DEDUCT',
      description: reason,
    });
    if (txError) console.error('Error logging point transaction:', txError.message);
  };

  const saveLoyaltySettings = async (settings: Partial<TenantLoyaltySettings>) => {
    if (!activeTenantId) return;

    const dataToSave = {
      tenant_id: activeTenantId,
      point_strategy: settings.pointStrategy,
      points_per_visit: settings.pointsPerVisit,
      points_per_currency: settings.pointsPerCurrency,
      currency_amount: settings.currencyAmount,
      enable_package_deduction: settings.enablePackageDeduction,
      updated_at: new Date().toISOString()
    };

    setLoyaltySettings((prev) => ({
      ...prev,
      ...settings,
      tenantId: activeTenantId,
      pointStrategy: settings.pointStrategy || prev?.pointStrategy || 'DISABLED',
      pointsPerVisit: settings.pointsPerVisit ?? prev?.pointsPerVisit ?? 0,
      pointsPerCurrency: settings.pointsPerCurrency ?? prev?.pointsPerCurrency ?? 0,
      currencyAmount: settings.currencyAmount ?? prev?.currencyAmount ?? 100,
      enablePackageDeduction: settings.enablePackageDeduction ?? prev?.enablePackageDeduction ?? false
    } as TenantLoyaltySettings));

    const { error } = await supabase.from('tenant_loyalty_settings').upsert(dataToSave, { onConflict: 'tenant_id' });
    if (error) console.error('Error saving loyalty settings:', error.message);
  };

  const addCustomerPackage = async (pkg: Omit<CustomerPackage, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!activeTenantId) return;

    const newId = generateUUID();
    const newPkg: CustomerPackage = {
      ...pkg,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCustomerPackages((prev) => [...prev, newPkg]);

    const { error } = await supabase.from('CustomerPackage').insert({
      id: newId,
      tenant_id: activeTenantId,
      user_id: pkg.userId,
      service_id: pkg.serviceId,
      package_name: pkg.packageName,
      total_quota: pkg.totalQuota,
      used_quota: pkg.usedQuota,
      expires_at: pkg.expiresAt,
      status: pkg.status
    });
    
    if (error) console.error('Error adding customer package:', error.message);
  };

  return (
    <SaaSContext.Provider
      value={{
        isLoading,
        error,
        tenants,
        activeTenant,
        merchantTab,
        currentUser,
        services: tenantServices,
        serviceAddons: tenantServiceAddons,
        staffs: tenantStaffs,
        courts: tenantCourts,
        bookings: tenantBookings,
        businessHours,
        cancellationPolicies,
        reviews,
        notifications: tenantNotifications,
        memberships,
        pointTransactions,
        rewards: tenantRewards,
        loyaltySettings,
        customerPackages,
        blackoutDates: tenantBlackoutDates,
        lastRealtimeUpdate,
        setMerchantTab,
        switchTenant,
        getAvailableSlots,
        createBooking,
        updateBookingStatus,
        checkInBookingByCode,
        verifyBookingPayment,
        rescheduleBooking,
        saveService,
        deleteService,
        saveServiceAddon,
        deleteServiceAddon,
        saveStaff,
        deleteStaff,
        saveCourt,
        deleteCourt,
        addBlackoutDate,
        deleteBlackoutDate,
        updateTenantSettings,
        updateTenant,
        updateCurrentUserContact,
        updateBusinessHours,
        deleteTenant,
        markNotificationAsRead,
        addOnboardingTenant,
        updateCancellationPolicies,
        addReview,
        fetchMyBookings,
        fetchMembership,
        redeemReward,
        completeBooking,
        saveReward,
        deleteReward,
        adjustCustomerPoints,
        saveLoyaltySettings,
        addCustomerPackage,
      }}
    >
      {children}
    </SaaSContext.Provider>
  );
};

export const useSaaS = () => {
  const context = useContext(SaaSContext);
  if (!context) {
    throw new Error('useSaaS must be used within a SaaSProvider');
  }
  return context;
};

