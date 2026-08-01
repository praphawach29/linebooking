import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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

type MerchantTab =
  | 'dashboard'
  | 'calendar'
  | 'walkin'
  | 'services'
  | 'staffs'
  | 'bookings'
  | 'payments'
  | 'analytics'
  | 'settings'
  | 'line_settings'
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
  notifications: NotificationItem[];
  
  memberships: Membership[];
  pointTransactions: PointTransaction[];
  rewards: Reward[];
  
  // Actions
  setMerchantTab: (tab: MerchantTab) => void;
  switchTenant: (tenantId: string) => void;
  
  // Slot availability engine
  getAvailableSlots: (date: string, serviceId: string, staffId?: string) => AvailableSlot[];
  
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
  markNotificationAsRead: (notificationId: string) => void;
  addOnboardingTenant: (tenantData: Partial<Tenant>, initialService: Partial<Service>) => void;
  updateCancellationPolicies: (policies: CancellationPolicy[]) => void;

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Initial Data Fetching from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // For now, we will fetch the first user to simulate a logged-in user
        const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
        if (users && users.length > 0) {
          setCurrentUser(users[0] as unknown as User);
        }

        const [
          { data: tenantsData },
          { data: servicesData },
          { data: addonsData },
          { data: staffData },
          { data: courtsData },
          { data: hoursData },
          { data: bookingsData },
          { data: policiesData },
          { data: rewardsData },
        ] = await Promise.all([
          supabase.from('tenants').select('*'),
          supabase.from('services').select('*'),
          supabase.from('service_addons').select('*'),
          supabase.from('staff').select('*'),
          supabase.from('courts').select('*'),
          supabase.from('business_hours').select('*'),
          supabase.from('bookings').select('*').order('created_at', { ascending: false }),
          supabase.from('cancellation_policies').select('*'),
          supabase.from('rewards').select('*'),
        ]);

        if (tenantsData) {
          setTenants(tenantsData as unknown as Tenant[]);
          if (tenantsData.length > 0) setActiveTenantId(tenantsData[0].id);
        }
        if (servicesData) setServices(servicesData as unknown as Service[]);
        if (addonsData) setServiceAddons(addonsData as unknown as ServiceAddon[]);
        if (staffData) setStaffs(staffData as unknown as Staff[]);
        if (courtsData) setCourts(courtsData as unknown as Court[]);
        if (hoursData) setBusinessHours(hoursData as unknown as BusinessHour[]);
        if (bookingsData) setBookings(bookingsData as unknown as Booking[]);
        if (policiesData) setCancellationPolicies(policiesData as unknown as CancellationPolicy[]);
        if (rewardsData) setRewards(rewardsData as unknown as Reward[]);

      } catch (err: any) {
        console.error('Error fetching data from Supabase:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
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

  // Time Utility Helpers
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Real Slot Availability Generator based on PDF Spec Logic:
  // 1. Check business_hours for tenant
  // 2. Filter by staff schedule / service duration + buffer_time
  // 3. Subtract confirmed/pending bookings
  const getAvailableSlots = (dateStr: string, serviceId: string, staffId?: string): AvailableSlot[] => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return [];

    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, ...

    // Check business hours
    const bh = businessHours.find((b) => b.tenantId === activeTenant.id && b.dayOfWeek === dayOfWeek);
    if (!bh || !bh.isOpen) {
      return [];
    }

    const startMinutes = timeToMinutes(bh.openTime);
    const endMinutes = timeToMinutes(bh.closeTime);
    const slotStep = 30; // 30-min intervals
    const durationWithBuffer = service.durationMinutes + service.bufferMinutes;

    // Get existing bookings for this date and tenant (excluding cancelled)
    const existingBookings = bookings.filter(
      (b) =>
        b.tenantId === activeTenant.id &&
        b.bookingDate === dateStr &&
        b.status !== 'cancelled' &&
        (!staffId || !b.staffId || b.staffId === staffId)
    );

    const slots: AvailableSlot[] = [];

    for (let cur = startMinutes; cur + service.durationMinutes <= endMinutes; cur += slotStep) {
      const slotStart = minutesToTime(cur);
      const slotEnd = minutesToTime(cur + service.durationMinutes);

      // Check collision with existing bookings
      const curStartMin = cur;
      const curEndMin = cur + durationWithBuffer;

      const hasConflict = existingBookings.some((b) => {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime) + service.bufferMinutes;
        return Math.max(curStartMin, bStart) < Math.min(curEndMin, bEnd);
      });

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !hasConflict,
        reason: hasConflict ? 'BOOKED' : undefined,
        price: service.price,
      });
    }

    return slots;
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
  }): Promise<Booking | null> => {
    if (!activeTenant || !currentUser) return null;

    const service = services.find((s) => s.id === data.serviceId);
    if (!service) return null;
    const staff = staffs.find((st) => st.id === data.staffId);
    const court = courts.find((c) => c.id === data.courtId);

    const addons = data.selectedAddons || [];
    const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
    const addonsExtraDuration = addons.reduce((sum, a) => sum + (a.extraDurationMinutes || 0), 0);

    const totalDuration = service.durationMinutes + addonsExtraDuration;
    const startMin = timeToMinutes(data.startTime);
    const endMin = startMin + totalDuration;
    const endTime = minutesToTime(endMin);

    const courtExtraPrice = court?.extraPricePerHour || 0;
    const totalPrice = service.price + addonsPrice + courtExtraPrice;
    const depositPct = activeTenant.settings.depositPercentage ?? 50;
    const depositAmount = (totalPrice * depositPct) / 100;
    const isPaid = data.depositPaid || data.paymentMethod === 'cash';

    const refNo = `BK${data.bookingDate.replace(/-/g, '').slice(2)}${Math.floor(10 + Math.random() * 90)}`;

    const newBooking = {
      ref_no: refNo,
      tenant_id: activeTenant.id,
      user_id: currentUser.id,
      user_name: data.customerName || currentUser.displayName,
      user_phone: data.customerPhone || currentUser.phone || '081-234-5678',
      service_id: service.id,
      service_name: service.name,
      service_duration: totalDuration,
      service_price: service.price,
      staff_id: staff?.id || null,
      staff_name: staff ? staff.name : (activeTenant.businessType === 'sports' ? 'ผู้ดูแลสนาม' : 'ช่างคนใดก็ได้'),
      court_id: court?.id || null,
      court_name: court?.name || null,
      booking_date: data.bookingDate,
      start_time: data.startTime,
      end_time: endTime,
      status: isPaid ? 'confirmed' : 'pending',
      price: totalPrice,
      discount_amount: 0,
      final_price: totalPrice,
      deposit_amount: depositAmount,
      payment_status: isPaid ? 'paid' : 'unpaid',
      payment_method: data.paymentMethod,
      source: data.source || 'line_liff',
      notes: data.notes || null,
      addons: addons.length > 0 ? addons : null,
      addons_total_price: addonsPrice > 0 ? addonsPrice : 0,
    };

    try {
      const { data: insertedData, error } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select()
        .single();

      if (error) {
        console.error('Error inserting booking:', error);
        return null;
      }
      
      const savedBooking = insertedData as unknown as Booking;
      setBookings((prev) => [savedBooking, ...prev]);
      
      return savedBooking;
    } catch (err) {
      console.error('Unexpected error:', err);
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

  const updateTenantSettings = (
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

  return (
    <SaaSContext.Provider
      value={{
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
        markNotificationAsRead,
        addOnboardingTenant,
        updateCancellationPolicies,
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
