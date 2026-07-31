import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
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
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_SERVICES,
  INITIAL_SERVICE_ADDONS,
  INITIAL_STAFFS,
  INITIAL_COURTS,
  INITIAL_BUSINESS_HOURS,
  INITIAL_CANCELLATION_POLICIES,
  INITIAL_BOOKINGS,
  INITIAL_NOTIFICATIONS,
  CURRENT_MOCK_USER,
} from '../data/mockData';

type ViewMode = 'liff' | 'merchant' | 'admin' | 'line_simulator';
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
  tenants: Tenant[];
  activeTenant: Tenant;
  viewMode: ViewMode;
  merchantTab: MerchantTab;
  currentUser: User;
  services: Service[];
  serviceAddons: ServiceAddon[];
  staffs: Staff[];
  courts: Court[];
  bookings: Booking[];
  businessHours: BusinessHour[];
  cancellationPolicies: CancellationPolicy[];
  notifications: NotificationItem[];
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
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
  }) => Booking;
  
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
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant-001');
  const [viewMode, setViewMode] = useState<ViewMode>('liff');
  const [merchantTab, setMerchantTab] = useState<MerchantTab>('dashboard');
  const [currentUser] = useState<User>(CURRENT_MOCK_USER);

  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [serviceAddons, setServiceAddons] = useState<ServiceAddon[]>(INITIAL_SERVICE_ADDONS);
  const [staffs, setStaffs] = useState<Staff[]>(INITIAL_STAFFS);
  const [courts, setCourts] = useState<Court[]>(INITIAL_COURTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(INITIAL_BUSINESS_HOURS);
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>(INITIAL_CANCELLATION_POLICIES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const activeTenant = useMemo(() => {
    return tenants.find((t) => t.id === activeTenantId) || tenants[0];
  }, [tenants, activeTenantId]);

  const tenantServices = useMemo(() => {
    return services.filter((s) => s.tenantId === activeTenant.id);
  }, [services, activeTenant.id]);

  const tenantServiceAddons = useMemo(() => {
    return serviceAddons.filter((a) => a.tenantId === activeTenant.id && a.isActive);
  }, [serviceAddons, activeTenant.id]);

  const tenantStaffs = useMemo(() => {
    return staffs.filter((s) => s.tenantId === activeTenant.id);
  }, [staffs, activeTenant.id]);

  const tenantCourts = useMemo(() => {
    return courts.filter((c) => c.tenantId === activeTenant.id);
  }, [courts, activeTenant.id]);

  const tenantBookings = useMemo(() => {
    return bookings.filter((b) => b.tenantId === activeTenant.id);
  }, [bookings, activeTenant.id]);

  const tenantNotifications = useMemo(() => {
    return notifications.filter((n) => n.tenantId === activeTenant.id);
  }, [notifications, activeTenant.id]);

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

  const createBooking = (data: {
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
  }): Booking => {
    const service = services.find((s) => s.id === data.serviceId)!;
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

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      refNo,
      tenantId: activeTenant.id,
      userId: currentUser.id,
      userName: data.customerName || currentUser.displayName,
      userPhone: data.customerPhone || currentUser.phone || '081-234-5678',
      userAvatar: currentUser.avatarUrl,
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: totalDuration,
      servicePrice: service.price,
      staffId: staff?.id,
      staffName: staff ? staff.name : (activeTenant.businessType === 'sports' ? 'ผู้ดูแลสนาม' : 'ช่างคนใดก็ได้'),
      staffAvatar: staff?.avatarUrl,
      courtId: court?.id,
      courtName: court?.name,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime,
      status: isPaid ? 'confirmed' : 'pending',
      price: totalPrice,
      discountAmount: 0,
      finalPrice: totalPrice,
      depositAmount,
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      paymentMethod: data.paymentMethod,
      source: data.source || 'line_liff',
      notes: data.notes,
      addons: addons.length > 0 ? addons : undefined,
      addonsTotalPrice: addonsPrice > 0 ? addonsPrice : undefined,
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Create Notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      tenantId: activeTenant.id,
      userId: currentUser.id,
      bookingId: newBooking.id,
      title: 'การจองคิวใหม่สำเร็จ 🟢',
      message: `บริการ ${service.name} วันที่ ${data.bookingDate} เวลา ${data.startTime} น. ได้รับการจองแล้ว`,
      type: 'booking_confirmation',
      channel: 'line',
      status: 'unread',
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);

    return newBooking;
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
        viewMode,
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
        setViewMode,
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
