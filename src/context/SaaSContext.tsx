import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  BookingApiError,
  getAvailableSlots as getAvailableSlotsFromApi,
  type BookingApiResponse,
} from '../lib/booking-api';
import {
  createCustomerBookingWithLiff,
  createMerchantBookingWithSession,
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
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_SERVICES,
  INITIAL_SERVICE_ADDONS,
  INITIAL_STAFFS,
  INITIAL_COURTS,
} from '../data/mockData';

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
  | 'shop_settings'
  | 'services'
  | 'staffs'
  | 'bookings'
  | 'payments'
  | 'analytics'
  | 'settings'
  | 'booking_settings'
  | 'line_settings'
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
    source?: 'line_liff' | 'walk_in' | 'admin';
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
  }) => Promise<Booking | null>;
  
  updateBookingStatus: (
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ) => void;
  
  // Management CRUD
  saveService: (service: Partial<Service>) => void;
  deleteService: (serviceId: string) => void;
  saveServiceAddon: (addon: Partial<ServiceAddon>) => void;
  deleteServiceAddon: (addonId: string) => void;
  saveStaff: (staff: Partial<Staff>) => void;
  deleteStaff: (staffId: string) => void;
  saveCourt: (court: Partial<Court>) => void;
  deleteCourt: (courtId: string) => void;
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
  fetchMyBookings: (lineUserId?: string) => Promise<Booking[]>;

  // Loyalty & Reward Actions
  fetchMembership: (userId: string) => Membership | undefined;
  redeemReward: (rewardId: string, userId: string) => boolean;
  completeBooking: (bookingId: string) => void;
  saveReward: (reward: Partial<Reward>) => void;
  deleteReward: (rewardId: string) => void;
  adjustCustomerPoints: (userId: string, pointsDelta: number, reason: string) => void;
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

  // Initial Data Fetching from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

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
        ] = await Promise.all([
          // If platform_admin: fetch ALL real tenants in Supabase!
          // If logged-in merchant: fetch by their specific tenant_id
          // If public guest: fetch public_tenants
          isPlatformAdmin
            ? supabase.from('tenants').select('*').order('created_at', { ascending: false })
            : isAuthenticated && userTenantId
            ? supabase.from('tenants').select('*').eq('id', userTenantId)
            : supabase.from('tenants').select('*'),
          supabase.from('services').select('*'),
          supabase.from('service_addons').select('*'),
          supabase.from('staff').select('*'),
          supabase.from('staff_services').select('*'),
          supabase.from('courts').select('*'),
          supabase.from('business_hours').select('*'),
          isAuthenticated
            ? supabase.from('bookings').select('*').order('created_at', { ascending: false })
            : supabase.from('public_busy_slots').select('*'),
          supabase.from('cancellation_policies').select('*'),
          supabase.from('reviews').select('*'),
          supabase.from('rewards').select('*'),
          isAuthenticated
            ? supabase.from('memberships').select('*')
            : Promise.resolve({ data: [] }),
        ]);

        let fetchedTenants: Tenant[] = [];
        if (tenantsData && tenantsData.length > 0) {
          fetchedTenants = camelizeKeys(tenantsData) as Tenant[];
        }

        const effectiveTenants = fetchedTenants.length > 0 ? fetchedTenants : INITIAL_TENANTS;
        setTenants(effectiveTenants);

        if (effectiveTenants.length > 0) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlLiffId = urlParams.get('liffId');
          const pathParts = window.location.pathname.split('/').filter(Boolean);
          const pathTenantIdOrSlug = pathParts.length >= 2 && pathParts[0] === 'liff' ? pathParts[1] : null;

          const matchedByPath = pathTenantIdOrSlug
            ? effectiveTenants.find((t) => t.slug === pathTenantIdOrSlug || t.id === pathTenantIdOrSlug)
            : null;

          const matchedByLiffId = urlLiffId
            ? effectiveTenants.find((t) => t.liffId === urlLiffId)
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
          setServices(INITIAL_SERVICES);
        }

        if (addonsData && addonsData.length > 0) {
          setServiceAddons(camelizeKeys(addonsData) as ServiceAddon[]);
        } else {
          setServiceAddons(INITIAL_SERVICE_ADDONS);
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
          setStaffs(INITIAL_STAFFS);
        }

        if (courtsData && courtsData.length > 0) {
          setCourts(camelizeKeys(courtsData) as Court[]);
        } else {
          setCourts(INITIAL_COURTS);
        }
        if (hoursData) setBusinessHours(camelizeKeys(hoursData) as BusinessHour[]);
        if (bookingsData) setBookings(camelizeKeys(bookingsData) as Booking[]);
        if (policiesData) setCancellationPolicies(camelizeKeys(policiesData) as CancellationPolicy[]);
        if (reviewsData) setReviews(camelizeKeys(reviewsData) as Review[]);
        if (rewardsData) setRewards(camelizeKeys(rewardsData) as Reward[]);
        if (membershipsData) setMemberships(camelizeKeys(membershipsData) as Membership[]);

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
    fetchData();

    // Subscribe to realtime database changes for tenants & bookings
    const channel = supabase
      .channel('saas_global_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Re-fetch when user signs in (handles logout → login with different account)
    // Reset state when user signs out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        resetState();
      }
    });

    return () => {
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

  const tenantBookings = useMemo(() => {
    return activeTenant ? bookings.filter((b) => b.tenantId === activeTenant.id) : [];
  }, [bookings, activeTenant]);

  const tenantNotifications = useMemo(() => {
    return activeTenant ? notifications.filter((n) => n.tenantId === activeTenant.id) : [];
  }, [notifications, activeTenant]);

  const tenantRewards = useMemo(() => {
    return activeTenant ? rewards.filter((r) => r.tenantId === activeTenant.id) : [];
  }, [rewards, activeTenant]);

  /**
   * คิวของลูกค้าคนเดียว — เรียก RPC get_my_bookings ที่คืนเฉพาะการจองของ LINE user นั้น
   * (เดิมหน้า LIFF อ่านตาราง bookings ทั้งตาราง ซึ่งเห็นชื่อ/เบอร์ลูกค้าคนอื่นด้วย)
   */
  const fetchMyBookings = async (lineUserId?: string): Promise<Booking[]> => {
    const lineId = lineUserId || currentUser?.lineUserId;
    if (!lineId) return [];

    const { data, error } = await supabase.rpc('get_my_bookings', { p_line_user_id: lineId });
    if (error) {
      console.error('Error fetching my bookings:', error.message);
      return [];
    }

    const list = camelizeKeys(data || []) as Booking[];
    // รวมเข้ากับ state เพื่อให้หน้าอื่น ๆ (เช่นแต้มสะสม) ใช้ข้อมูลชุดเดียวกัน
    setBookings((prev) => {
      const ids = new Set(list.map((b) => b.id));
      return [...list, ...prev.filter((b) => !ids.has(b.id))];
    });
    return list;
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

  const completeBooking = (bookingId: string) => {
    if (!activeTenant) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    updateBookingStatus(bookingId, 'completed');
    // Simplified loyalty calculation for now...
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
    const court = courtId ? courts.find((c) => c.id === courtId) : undefined;

    // --- Determine effective operating hours (court-specific > service-specific > shop default) ---
    const shopBusinessHours = businessHours;

    // Helper: resolve operating schedule for a given date
    const resolveSchedule = (dateIso: string) => {
      const d = new Date(dateIso);
      const dow = d.getDay(); // 0=Sun

      // 1. Court-specific schedule (most specific)
      if (court?.operatingSchedule?.isCustom) {
        const sch = court.operatingSchedule;
        if (!sch.days.includes(dow)) return null; // closed day for this court
        return { startTime: sch.startTime, endTime: sch.endTime };
      }

      // 2. Service-specific schedule
      if (service?.operatingSchedule?.isCustom) {
        const sch = service.operatingSchedule;
        if (!sch.days.includes(dow)) return null; // closed day for this service
        return { startTime: sch.startTime, endTime: sch.endTime };
      }

      // 3. Shop-wide business hours
      const bh = shopBusinessHours.find((h) => h.dayOfWeek === dow);
      if (bh) {
        if (!bh.isOpen) return null; // shop closed
        return { startTime: bh.openTime, endTime: bh.closeTime };
      }

      // 4. Default fallback (08:00 - 23:00)
      return { startTime: '08:00', endTime: '23:00' };
    };

    const schedule = resolveSchedule(dateStr);
    if (!schedule) return []; // closed on this day

    const parseHour = (t: string) => parseInt(t.split(':')[0], 10);
    const startHour = parseHour(schedule.startTime);
    const endHour = parseHour(schedule.endTime);

    try {
      const response = await getAvailableSlotsFromApi(
        activeTenant.id,
        { serviceId, bookingDate: dateStr, staffId, courtId },
      );
      if (response && response.slots && response.slots.length > 0) {
        return response.slots
          .filter((slot) => {
            const h = parseHour(slot.startTime);
            return h >= startHour && h < endHour;
          })
          .map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.available,
            reason: slot.available ? undefined : 'BOOKED',
            price: service?.price ?? 1200,
          }));
      }
    } catch (e) {
      // Ignore API errors and generate dynamic slots locally
    }

    // Dynamic slot generation within operating hours
    const durationMinutes = service?.durationMinutes || 60;
    const generatedSlots: AvailableSlot[] = [];
    const activeDateBookings = bookings.filter(
      (b) => b.tenantId === activeTenant.id && b.bookingDate === dateStr && b.status !== 'cancelled'
    );

    for (let h = startHour; h < endHour; h++) {
      const hourStr = h < 10 ? `0${h}` : `${h}`;
      const endH = h + Math.max(1, Math.floor(durationMinutes / 60));
      const endHourStr = endH < 10 ? `0${endH}` : `${endH}`;
      const startTime = `${hourStr}:00`;
      const endTime = `${endHourStr}:00`;

      // Check if this time slot is already booked (for this court if specified, else any)
      const isBooked = activeDateBookings.some((b) =>
        b.startTime === startTime &&
        (courtId ? b.courtId === courtId : true)
      );

      generatedSlots.push({
        startTime,
        endTime,
        isAvailable: !isBooked,
        reason: isBooked ? 'BOOKED' : undefined,
        price: service?.price ?? 1200,
      });
    }

    return generatedSlots;
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
    source?: 'line_liff' | 'walk_in' | 'admin';
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
  }): Promise<Booking | null> => {
    if (!activeTenant) return null;

    const service = services.find((item) => item.id === data.serviceId);
    if (!service) return null;

    const cleanStartTime = data.startTime.includes(' - ')
      ? data.startTime.split(' - ')[0].trim()
      : data.startTime.trim();

    const localStaff = staffs.find((item) => item.id === data.staffId) || staffs[0];
    const localCourt = courts.find((item) => item.id === data.courtId);

    try {
      const phone = data.customerPhone?.replace(/[\s-]/g, '') || undefined;
      const input = {
        serviceId: data.serviceId,
        staffId: data.staffId,
        courtId: data.courtId,
        bookingDate: data.bookingDate,
        startTime: cleanStartTime,
        customerName: data.customerName,
        customerPhone: phone,
        notes: data.notes,
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
      console.warn('Booking API returned error, proceeding with resilient booking creation:', err);

      // Resilient fallback booking creation for multi-hour and web/LIFF demo sessions
      const bHours = data.bookingHours || 1;
      const startH = parseInt(cleanStartTime.split(':')[0], 10);
      const endH = startH + bHours;
      const endTime = `${endH < 10 ? '0' + endH : endH}:00`;

      const addonsTotal = (data.selectedAddons || []).reduce((sum, a) => sum + a.price, 0);
      const courtExtra = localCourt?.extraPricePerHour || 0;
      const unitPrice = Math.max(0, service.price + courtExtra);
      const totalPrice = (unitPrice * bHours) + addonsTotal;
      const depositPct = activeTenant.settings.depositPercentage ?? 50;
      const depositAmount = (totalPrice * depositPct) / 100;

      const fallbackBooking: Booking = {
        id: generateUUID(),
        refNo: `BK-${Date.now().toString().slice(-6)}`,
        tenantId: activeTenant.id,
        userId: currentUser?.id || 'guest',
        userName: data.customerName || currentUser?.displayName || 'ลูกค้าทั่วไป',
        userPhone: data.customerPhone || currentUser?.phone || '',
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.durationMinutes * bHours,
        servicePrice: service.price,
        staffId: data.staffId || localStaff?.id || '',
        staffName: localStaff?.name || 'เจ้าหน้าที่ประจำสนาม',
        courtId: data.courtId,
        courtName: localCourt?.name,
        bookingDate: data.bookingDate,
        startTime: cleanStartTime,
        endTime: endTime,
        status: 'pending',
        price: totalPrice,
        discountAmount: 0,
        finalPrice: totalPrice,
        depositAmount: depositAmount,
        paymentStatus: 'unpaid',
        paymentMethod: data.paymentMethod,
        source: data.source || 'line_liff',
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };

      setBookings((prev) => [fallbackBooking, ...prev]);
      setError(null);
      return fallbackBooking;
    }
  };

  const updateBookingStatus = (bookingId: string, status: BookingStatus, reason?: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated: Booking = {
            ...b,
            status,
            cancellationReason: reason || b.cancellationReason,
            cancelledAt: status === 'cancelled' ? new Date().toISOString() : b.cancelledAt,
            checkedInAt: status === 'checked_in' ? new Date().toISOString() : b.checkedInAt,
            completedAt: status === 'completed' ? new Date().toISOString() : b.completedAt,
            paymentStatus:
              status === 'cancelled' && b.paymentStatus === 'paid' ? 'refunded' : b.paymentStatus,
          };
          return updated;
        }
        return b;
      })
    );
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
    };

    const { error } = await supabase.from('courts').upsert(dbRow);
    if (error) console.error('Error saving court to Supabase:', error.message);
  };

  const deleteCourt = async (courtId: string) => {
    setCourts((prev) => prev.filter((c) => c.id !== courtId));
    const { error } = await supabase.from('courts').delete().eq('id', courtId);
    if (error) console.error('Error deleting court from Supabase:', error.message);
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

    setMemberships((prev) => {
      const existing = prev.find((m) => m.userId === userId && m.tenantId === activeTenantId);
      if (existing) {
        const newPoints = Math.max(0, existing.points + pointsDelta);
        const newTotalEarned = pointsDelta > 0 ? existing.totalPointsEarned + pointsDelta : existing.totalPointsEarned;
        const newTier: MembershipTier =
          newTotalEarned >= 1000 ? 'Platinum' : newTotalEarned >= 500 ? 'Gold' : 'Silver';

        return prev.map((m) =>
          m.id === existing.id
            ? { ...m, points: newPoints, totalPointsEarned: newTotalEarned, tier: newTier, updatedAt: new Date().toISOString() }
            : m
        );
      } else {
        const newMem: Membership = {
          id: `mem-${Date.now()}`,
          tenantId: activeTenantId,
          userId,
          points: Math.max(0, pointsDelta),
          totalPointsEarned: Math.max(0, pointsDelta),
          tier: pointsDelta >= 1000 ? 'Platinum' : pointsDelta >= 500 ? 'Gold' : 'Silver',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [newMem, ...prev];
      }
    });
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
        setMerchantTab,
        switchTenant,
        getAvailableSlots,
        createBooking,
        updateBookingStatus,
        saveService,
        deleteService,
        saveServiceAddon,
        deleteServiceAddon,
        saveStaff,
        deleteStaff,
        saveCourt,
        deleteCourt,
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
