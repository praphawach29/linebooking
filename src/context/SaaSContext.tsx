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
  PointTransaction,
  Reward,
  RewardRedemption,
} from '../types';

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
  getAvailableSlots: (date: string, serviceId: string, staffId?: string) => Promise<AvailableSlot[]>;
  
  // Booking operations
  createBooking: (data: {
    serviceId: string;
    staffId?: string;
    courtId?: string;
    bookingDate: string;
    startTime: string;
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
  markNotificationAsRead: (notificationId: string) => void;
  addOnboardingTenant: (tenantData: Partial<Tenant>, initialService: Partial<Service>) => void;
  updateCancellationPolicies: (policies: CancellationPolicy[]) => void;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;

  /**
   * ดึงคิวของลูกค้าคนหนึ่ง (หน้า LIFF)
   * หลัง migration 0007 ตาราง bookings อ่านสาธารณะไม่ได้แล้ว ต้องผ่าน RPC ที่คืนเฉพาะของเจ้าตัว
   */
  fetchMyBookings: (lineUserId?: string) => Promise<Booking[]>;

  // Loyalty Actions
  fetchMembership: (userId: string) => Membership | undefined;
  redeemReward: (rewardId: string, userId: string) => boolean;
  completeBooking: (bookingId: string) => void;
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  const [merchantTab, setMerchantTab] = useState<MerchantTab>('dashboard');
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
            : supabase.from(isAuthenticated ? 'tenants' : 'public_tenants').select('*'),
          supabase.from('services').select('*'),
          supabase.from('service_addons').select('*'),
          supabase.from('staff').select('*'),
          supabase.from('staff_services').select('*'),
          supabase.from('courts').select('*'),
          supabase.from('business_hours').select('*'),
          // ผู้เยี่ยมชมเห็นแค่ "ช่วงเวลาที่ไม่ว่าง" ไม่เห็นชื่อ/เบอร์ของใคร
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

        if (tenantsData) {
          const formatted = camelizeKeys(tenantsData) as Tenant[];
          setTenants(formatted);
          if (formatted.length > 0) {
            const matched = userTenantId ? formatted.find((t) => t.id === userTenantId) : null;
            setActiveTenantId(matched ? matched.id : formatted[0].id);
          }
        }
        if (servicesData) setServices(camelizeKeys(servicesData) as Service[]);
        if (addonsData) setServiceAddons(camelizeKeys(addonsData) as ServiceAddon[]);
        if (staffData) {
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
        }
        if (courtsData) setCourts(camelizeKeys(courtsData) as Court[]);
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
  ): Promise<AvailableSlot[]> => {
    if (!activeTenant) return [];
    const service = services.find((item) => item.id === serviceId);
    if (!service) return [];

    const response = await getAvailableSlotsFromApi(
      activeTenant.id,
      { serviceId, bookingDate: dateStr, staffId },
    );
    return response.slots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.available,
      reason: slot.available ? undefined : 'BOOKED',
      price: service.price,
    }));
  };

  const createBooking = async (data: {
    serviceId: string;
    staffId?: string;
    courtId?: string;
    bookingDate: string;
    startTime: string;
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

    try {
      const phone = data.customerPhone?.replace(/[\s-]/g, '') || undefined;
      const input = {
        serviceId: data.serviceId,
        staffId: data.staffId,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
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

      const localStaff = staffs.find((item) => item.id === response.staffId);
      const savedBooking = mapBookingApiResponse(response, service, localStaff);

      setBookings((prev) => [savedBooking, ...prev]);
      setError(null);
      return savedBooking;
    } catch (err: unknown) {
      if (
        err instanceof BookingApiError &&
        err.code === 'BOOKING_SLOT_UNAVAILABLE'
      ) {
        await getAvailableSlots(data.bookingDate, data.serviceId, data.staffId).catch(
          () => undefined,
        );
      }
      const message = err instanceof Error ? err.message : 'Booking failed';
      setError(message);
      console.error('Booking API error:', err);
      return null;
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

  const saveService = (serviceData: Partial<Service>) => {
    if (serviceData.id) {
      setServices((prev) =>
        prev.map((s) => (s.id === serviceData.id ? ({ ...s, ...serviceData } as Service) : s))
      );
    } else {
      const newService: Service = {
        id: `svc-${Date.now()}`,
        tenantId: activeTenant.id,
        name: serviceData.name || 'บริการใหม่',
        description: serviceData.description || '',
        durationMinutes: serviceData.durationMinutes || 60,
        price: serviceData.price || 500,
        currency: 'THB',
        maxCapacity: 1,
        bufferMinutes: serviceData.bufferMinutes || 15,
        colorCode: serviceData.colorCode || '#3B82F6',
        category: serviceData.category || 'ทั่วไป',
        isActive: true,
        sortOrder: services.length + 1,
      };
      setServices((prev) => [...prev, newService]);
    }
  };

  const deleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const saveServiceAddon = (addonData: Partial<ServiceAddon>) => {
    if (addonData.id) {
      setServiceAddons((prev) =>
        prev.map((a) => (a.id === addonData.id ? ({ ...a, ...addonData } as ServiceAddon) : a))
      );
    } else {
      const newAddon: ServiceAddon = {
        id: `addon-${Date.now()}`,
        tenantId: activeTenant.id,
        name: addonData.name || 'บริการเสริมใหม่',
        description: addonData.description || '',
        price: addonData.price || 100,
        extraDurationMinutes: addonData.extraDurationMinutes || 0,
        category: addonData.category || 'ทั่วไป',
        badge: addonData.badge,
        icon: addonData.icon,
        options: addonData.options,
        isActive: true,
      };
      setServiceAddons((prev) => [...prev, newAddon]);
    }
  };

  const deleteServiceAddon = (addonId: string) => {
    setServiceAddons((prev) => prev.filter((a) => a.id !== addonId));
  };

  const saveStaff = (staffData: Partial<Staff>) => {
    if (staffData.id) {
      setStaffs((prev) =>
        prev.map((st) => (st.id === staffData.id ? ({ ...st, ...staffData } as Staff) : st))
      );
    } else {
      const newStaff: Staff = {
        id: `staff-${Date.now()}`,
        tenantId: activeTenant.id,
        name: staffData.name || 'ช่างใหม่',
        phone: staffData.phone || '080-000-0000',
        email: staffData.email || '',
        avatarUrl:
          staffData.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        colorCode: staffData.colorCode || '#10B981',
        bio: staffData.bio || 'ช่างผู้เชี่ยวชาญประจำร้าน',
        rating: 5.0,
        reviewsCount: 1,
        isActive: true,
        serviceIds: staffData.serviceIds || [],
      };
      setStaffs((prev) => [...prev, newStaff]);
    }
  };

  const deleteStaff = (staffId: string) => {
    setStaffs((prev) => prev.filter((st) => st.id !== staffId));
  };

  const saveCourt = (courtData: Partial<Court>) => {
    if (courtData.id) {
      setCourts((prev) =>
        prev.map((c) => (c.id === courtData.id ? ({ ...c, ...courtData } as Court) : c))
      );
    } else {
      const newCourt: Court = {
        id: `court-${Date.now()}`,
        tenantId: activeTenant.id,
        serviceId: courtData.serviceId || '',
        name: courtData.name || 'สนาม A',
        code: courtData.code || `CRT-${Math.floor(10 + Math.random() * 90)}`,
        description: courtData.description || 'สนามคุณภาพมาตรฐาน',
        type: courtData.type || 'indoor',
        imageUrl: courtData.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80',
        extraPricePerHour: courtData.extraPricePerHour || 0,
        isActive: true,
      };
      setCourts((prev) => [...prev, newCourt]);
    }
  };

  const deleteCourt = (courtId: string) => {
    setCourts((prev) => prev.filter((c) => c.id !== courtId));
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
        markNotificationAsRead,
        addOnboardingTenant,
        updateCancellationPolicies,
        addReview,
        fetchMyBookings,
        fetchMembership,
        redeemReward,
        completeBooking,
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
