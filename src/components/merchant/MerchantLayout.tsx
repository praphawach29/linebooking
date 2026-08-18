import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Scissors,
  Users,
  CreditCard,
  BarChart3,
  MessageSquare,
  Sparkles,
  Settings,
  Star,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Store,
  Gift,
  Crown,
  ChevronLeft,
  ChevronRight,
  ScanLine,
} from 'lucide-react';
import { MerchantSubscriptionModal } from './MerchantSubscriptionModal';
import { getTenantQuotaInfo, FREE_PLAN_MONTHLY_BOOKING_LIMIT } from '../../lib/quota-manager';
import { toLocalDateStr } from '../../lib/date-utils';
import { getTenantTerminology } from '../../lib/tenant-terminology';

const lazyNamed = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] as React.ComponentType }));

const MerchantDashboard = lazyNamed(() => import('./MerchantDashboard'), 'MerchantDashboard');
const MerchantCalendarView = lazyNamed(() => import('./MerchantCalendarView'), 'MerchantCalendarView');
const MerchantWalkinBookingModal = lazyNamed(() => import('./MerchantWalkinBookingModal'), 'MerchantWalkinBookingModal');
const MerchantCheckInScanner = lazyNamed(() => import('./MerchantCheckInScanner'), 'MerchantCheckInScanner');
const MerchantShopSettings = lazyNamed(() => import('./MerchantShopSettings'), 'MerchantShopSettings');
const MerchantServiceManager = lazyNamed(() => import('./MerchantServiceManager'), 'MerchantServiceManager');
const MerchantStaffManager = lazyNamed(() => import('./MerchantStaffManager'), 'MerchantStaffManager');
const MerchantBookingFlowSettings = lazyNamed(() => import('./MerchantBookingFlowSettings'), 'MerchantBookingFlowSettings');
const MerchantPaymentSettings = lazyNamed(() => import('./MerchantPaymentSettings'), 'MerchantPaymentSettings');
const MerchantBookingSettings = lazyNamed(() => import('./MerchantBookingSettings'), 'MerchantBookingSettings');
const MerchantLoyaltyManager = lazyNamed(() => import('./MerchantLoyaltyManager'), 'MerchantLoyaltyManager');
const MerchantAnalytics = lazyNamed(() => import('./MerchantAnalytics'), 'MerchantAnalytics');
const MerchantLineOASettings = lazyNamed(() => import('./MerchantLineOASettings'), 'MerchantLineOASettings');
const MerchantOnboardingWizard = lazyNamed(() => import('./MerchantOnboardingWizard'), 'MerchantOnboardingWizard');
const MerchantReviews = lazyNamed(() => import('./MerchantReviews'), 'MerchantReviews');

const MerchantPanelFallback = () => (
  <div className="flex min-h-64 items-center justify-center" aria-label="Loading panel">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
  </div>
);

export const MerchantLayout: React.FC = () => {
  const { activeTenant, merchantTab, setMerchantTab, bookings, staffs, courts } = useSaaS();
  const terminology = getTenantTerminology(activeTenant);
  const { signOut, authUser } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Redirect platform_admin away from /merchant → /admin
  useEffect(() => {
    if (authUser?.role === 'platform_admin') {
      navigate('/admin', { replace: true });
    }
  }, [authUser, navigate]);

  const todayStr = toLocalDateStr(new Date());
  const todayBookingsCount = bookings.filter((b) => b.bookingDate === todayStr).length;

  const quotaInfo = activeTenant ? getTenantQuotaInfo(activeTenant, bookings, staffs, courts) : null;

  const handleTabChange = (tab: string) => {
    if (tab === 'subscription') {
      setIsSubscriptionModalOpen(true);
      setIsMobileMenuOpen(false);
      return;
    }
    setMerchantTab(tab);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ tab, icon: Icon, label, badge }: any) => {
    const isActive = merchantTab === tab;
    return (
      <button
        onClick={() => handleTabChange(tab)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
        } py-2.5 rounded-xl text-xs font-bold transition-all group text-left relative ${
          isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/25'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </div>
        {!isCollapsed && badge !== undefined && badge > 0 && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? 'bg-white text-emerald-700' : 'bg-primary/20 text-blue-300'}`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {isCollapsed && badge !== undefined && badge > 0 && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute right-2 top-2"></span>
        )}
      </button>
    );
  };

  const navGroups = [
    {
      title: 'การทำงานหลัก',
      items: [
        { tab: 'dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด', badge: todayBookingsCount },
        { tab: 'calendar', icon: Calendar, label: 'ปฏิทินคิวงาน' },
        { tab: 'walkin', icon: PlusCircle, label: 'เพิ่มคิว Walk-in' },
        { tab: 'checkin', icon: ScanLine, label: 'สแกนเช็กอิน' },
      ],
    },
    {
      title: 'ตั้งค่าหน้าร้าน & บริการ',
      items: [
        { tab: 'shop_settings', icon: Store, label: 'ข้อมูลร้านค้า & โลโก้' },
        { tab: 'services', icon: Scissors, label: `${terminology.serviceLabel} & ส่วนเสริม` },
        { tab: 'staffs', icon: Users, label: activeTenant?.businessType === 'sports' ? `${terminology.resourceName} (Courts)` : `ทีม${terminology.resourceName} (Staffs)` },
      ],
    },
    {
      title: 'การจอง & การชำระเงิน',
      items: [
        { tab: 'booking_flow', icon: Sparkles, label: 'ขั้นตอนการจอง (Flow)' },
        { tab: 'payments', icon: CreditCard, label: 'การชำระเงิน (QR Code)' },
        { tab: 'booking_settings', icon: Settings, label: 'ตั้งค่าการจองและยกเลิก' },
      ],
    },
    {
      title: 'การตลาด & สมาชิก',
      items: [
        { tab: 'line_settings', icon: MessageSquare, label: 'LINE OA Setup' },
        { tab: 'loyalty', icon: Gift, label: 'ระบบสมาชิก & รางวัล' },
        { tab: 'analytics', icon: BarChart3, label: 'สถิติ & รายงาน' },
        { tab: 'reviews', icon: Star, label: 'รีวิว & คะแนน' },
      ],
    },
    {
      title: 'แพ็กเกจ & บัญชี',
      items: [
        { tab: 'subscription', icon: Crown, label: 'ต่ออายุ / อัปเกรดแพ็กเกจ' },
      ],
    },
  ];

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 font-bold text-sm">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        กำลังโหลดข้อมูลร้านค้า...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-merchant-sidebar text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/20 bg-slate-800 shrink-0">
            <img src={activeTenant.logoUrl} alt={activeTenant.name} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-xs text-white truncate max-w-[160px]">{activeTenant.name}</h2>
            <p className="text-[10px] text-emerald-400 font-bold uppercase">Merchant Admin</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>{isMobileMenuOpen ? 'ปิด' : 'เมนู'}</span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-50 md:z-30 shrink-0 bg-merchant-sidebar flex flex-col justify-between
          transition-all duration-300 ease-in-out border-r border-white/10
          ${isMobileMenuOpen ? 'translate-x-0 w-[285px]' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-[76px]' : 'md:w-[260px]'}
        `}
      >
        <div className="p-4 sm:p-5 space-y-6 overflow-y-auto no-scrollbar">
          {/* Brand & Active Tenant Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">LINE OA Booking</h1>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Merchant Admin</p>
                  </div>
                )}
              </div>

              {/* Tablet & Desktop Collapse Toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title={isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Tenant Card */}
            <div className={`bg-white/5 rounded-2xl border border-white/10 flex items-center backdrop-blur-md shadow-inner ${isCollapsed ? 'p-2 justify-center' : 'p-3 gap-3'}`}>
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-800 shadow-sm">
                <img src={activeTenant.logoUrl} alt={activeTenant.name} className="w-full h-full object-cover" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className="font-bold text-xs text-white truncate">{activeTenant.name}</h2>
                    <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                      {activeTenant.plan}
                    </span>
                  </div>
                  <p className="text-[10px] text-success font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                    ร้านเปิดให้บริการ
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu Groups */}
          <nav className="space-y-5">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                {!isCollapsed && (
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.tab}
                      tab={item.tab}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 space-y-2 border-t border-white/5 bg-merchant-sidebar ${isCollapsed ? 'flex flex-col items-center justify-center p-3' : ''}`}>
          {authUser?.role === 'platform_admin' && (
            <Link
              to="/admin"
              className={`w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${isCollapsed ? 'p-2 justify-center' : ''}`}
              title="Super Admin"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Super Admin</span>}
            </Link>
          )}

          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 pt-1' : 'justify-between pt-1 px-1'}`}>
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white truncate">{authUser?.email || 'merchant'}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{activeTenant.name}</p>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white uppercase" title={authUser?.email || 'merchant'}>
                {(authUser?.email || 'M')[0]}
              </div>
            )}
            <button
              onClick={() => signOut()}
              title="ออกจากระบบ"
              className="text-slate-400 hover:text-red-400 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto no-scrollbar">
        {/* Live Trial & Quota Banner */}
        {quotaInfo && quotaInfo.isTrial && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-emerald-500/25">
                ⚡
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                  คุณกำลังอยู่ในช่วงทดลองใช้ Pro ฟรี 14 วัน!
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-300">
                    เหลืออีก {quotaInfo.trialDaysRemaining} วัน
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  ปลดล็อกทุกฟีเจอร์ใช้งานได้แบบไม่จำกัดโควตา (ไม่จำกัดจำนวนจอง ช่าง และสนาม)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              อัปเกรดแพ็กเกจ ⚡
            </button>
          </div>
        )}

        {quotaInfo && !quotaInfo.isUnlimited && quotaInfo.isBookingQuotaReached && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-red-950">
                  🚫 คุณใช้โควตานัดหมายฟรีครบ {FREE_PLAN_MONTHLY_BOOKING_LIMIT}/{FREE_PLAN_MONTHLY_BOOKING_LIMIT} รายการในเดือนนี้แล้ว
                </h4>
                <p className="text-xs text-red-700 mt-0.5">
                  ลูกค้าจะไม่สามารถลงทะเบียนนัดหมายเพิ่มได้ชั่วคราว อัปเกรดเป็น Pro เพื่อรับนัดหมายต่อไม่จำกัด
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              อัปเกรดเป็น Pro 🚀
            </button>
          </div>
        )}

        {quotaInfo && !quotaInfo.isUnlimited && !quotaInfo.isBookingQuotaReached && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-amber-950">
                  โควตาจองฟรีประจำเดือน: {quotaInfo.monthlyBookingsCount}/{FREE_PLAN_MONTHLY_BOOKING_LIMIT} รายการ
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  แพ็กเกจฟรีจำกัด 30 นัดหมาย/เดือน และพนักงาน 1 คน ➔ อัปเกรดเพื่อรับงานไม่จำกัด
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              อัปเกรดเป็น Pro ✨
            </button>
          </div>
        )}

        <Suspense fallback={<MerchantPanelFallback />}>
          {merchantTab === 'dashboard' && <MerchantDashboard />}
          {merchantTab === 'calendar' && <MerchantCalendarView />}
          {merchantTab === 'walkin' && <MerchantWalkinBookingModal />}
          {merchantTab === 'checkin' && <MerchantCheckInScanner />}
          {merchantTab === 'shop_settings' && <MerchantShopSettings />}
          {merchantTab === 'services' && <MerchantServiceManager />}
          {merchantTab === 'staffs' && <MerchantStaffManager />}
          {merchantTab === 'booking_flow' && <MerchantBookingFlowSettings />}
          {merchantTab === 'payments' && <MerchantPaymentSettings />}
          {merchantTab === 'booking_settings' && <MerchantBookingSettings />}
          {merchantTab === 'loyalty' && <MerchantLoyaltyManager />}
          {merchantTab === 'analytics' && <MerchantAnalytics />}
          {merchantTab === 'line_settings' && <MerchantLineOASettings />}
          {merchantTab === 'onboarding' && <MerchantOnboardingWizard />}
          {merchantTab === 'reviews' && <MerchantReviews />}
        </Suspense>
      </main>

      {/* Subscription Payment Modal */}
      <MerchantSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
};
