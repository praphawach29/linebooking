import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useAuth } from '../../context/AuthContext';
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
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { MerchantDashboard } from './MerchantDashboard';
import { MerchantCalendarView } from './MerchantCalendarView';
import { MerchantWalkinBookingModal } from './MerchantWalkinBookingModal';
import { MerchantServiceManager } from './MerchantServiceManager';
import { MerchantStaffManager } from './MerchantStaffManager';
import { MerchantPaymentSettings } from './MerchantPaymentSettings';
import { MerchantAnalytics } from './MerchantAnalytics';
import { MerchantLineOASettings } from './MerchantLineOASettings';
import { MerchantBookingSettings } from './MerchantBookingSettings';
import { MerchantBookingFlowSettings } from './MerchantBookingFlowSettings';
import { MerchantOnboardingWizard } from './MerchantOnboardingWizard';
import { MerchantReviews } from './MerchantReviews';
import { MerchantSubscriptionModal } from './MerchantSubscriptionModal';
import { getTenantQuotaInfo, FREE_PLAN_MONTHLY_BOOKING_LIMIT } from '../../lib/quota-manager';
import { HeaderNav } from '../common/HeaderNav';

export const MerchantLayout: React.FC = () => {
  const { activeTenant, merchantTab, setMerchantTab, bookings, staffs, courts } = useSaaS();
  const { signOut, authUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookingsCount = bookings.filter((b) => b.bookingDate === todayStr).length;

  const quotaInfo = activeTenant ? getTenantQuotaInfo(activeTenant, bookings, staffs, courts) : null;

  const handleTabChange = (tab: string) => {
    setMerchantTab(tab);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ tab, icon: Icon, label, badge }: any) => {
    const isActive = merchantTab === tab;
    return (
      <button
        onClick={() => handleTabChange(tab)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all duration-300 group text-left ${
          isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.01]'
            : 'hover:bg-white/5 text-slate-300 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
          <span className="text-sm">{label}</span>
        </div>
        {badge !== undefined && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300 group-hover:bg-white/20'}`}>
            {badge}
          </span>
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
      ],
    },
    {
      title: 'จัดการระบบร้านค้า',
      items: [
        { tab: 'services', icon: Scissors, label: 'บริการ (Services)' },
        { tab: 'staffs', icon: Users, label: 'ทีมช่าง (Staffs)' },
        { tab: 'booking_flow', icon: Sparkles, label: 'ตั้งค่าขั้นตอนการจอง (Flow)' },
        { tab: 'payments', icon: CreditCard, label: 'การชำระเงิน (QR Code)' },
        { tab: 'booking_settings', icon: Settings, label: 'ตั้งค่าการจองและยกเลิก' },
        { tab: 'line_settings', icon: MessageSquare, label: 'LINE OA Setup' },
        { tab: 'analytics', icon: BarChart3, label: 'สถิติและรายงาน' },
        { tab: 'reviews', icon: Star, label: 'รีวิว & คะแนน' },
      ],
    },
  ];

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <HeaderNav />
        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-sm">
          กำลังโหลดข้อมูลร้านค้า...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <HeaderNav />

      {/* Mobile Top Sub-Header & Menu Trigger */}
      <div className="md:hidden bg-merchant-sidebar border-b border-white/10 px-4 py-3 flex items-center justify-between z-30 sticky top-16 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/20 bg-slate-800">
            <img src={activeTenant.logoUrl} alt={activeTenant.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-extrabold text-xs text-white truncate max-w-[160px]">{activeTenant.name}</h2>
            <p className="text-[10px] text-primary font-bold capitalize">{merchantTab}</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5 text-primary" />}
          <span>{isMobileMenuOpen ? 'ปิด' : 'เมนู'}</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative z-10 w-full max-w-7xl mx-auto p-3 sm:p-6 gap-6">

        {/* Sidebar Overlay for Mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-50 md:z-20
            w-[285px] md:w-[280px] bg-merchant-sidebar flex-shrink-0 flex flex-col justify-between
            shadow-2xl md:shadow-glass rounded-r-3xl md:rounded-3xl border-r md:border border-white/10
            transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            max-h-screen md:max-h-none overflow-y-auto
          `}
        >
          <div className="p-4 space-y-5">
            {/* Mobile Sidebar Close Header */}
            <div className="flex items-center justify-between md:hidden pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">เมนูจัดการร้าน</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Tenant Header Card */}
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-md shadow-inner">
              <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white/10 flex-shrink-0 bg-slate-800 shadow-md">
                <img src={activeTenant.logoUrl} alt={activeTenant.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-sm text-white truncate">{activeTenant.name}</h2>
                <p className="text-[11px] text-success font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                  ร้านเปิดให้บริการ
                </p>
              </div>
            </div>

            {/* Navigation Menu Groups */}
            <nav className="space-y-4">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block">
                    {group.title}
                  </span>
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
              ))}
            </nav>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>ต่ออายุ / อัปเกรดแพ็กเกจ</span>
            </button>

            <button
              onClick={() => handleTabChange('onboarding')}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-4 rounded-xl border border-white/10 text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>เริ่มตั้งค่าระบบ (Wizard)</span>
            </button>

            {authUser && (
              <button
                onClick={() => signOut()}
                className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-medium py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ ({authUser.email})</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-white/80 backdrop-blur-xl rounded-3xl border border-white shadow-glass relative">
          <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-success/5 rounded-full blur-[80px] pointer-events-none -z-10" />

          <div className="max-w-6xl mx-auto">
            {/* Live Trial & Quota Banner */}
            {quotaInfo && quotaInfo.isTrial && (
              <div className="mb-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 shadow-sm">
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
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 shadow-sm">
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
              <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
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

            {merchantTab === 'dashboard' && <MerchantDashboard />}
            {merchantTab === 'calendar' && <MerchantCalendarView />}
            {merchantTab === 'walkin' && <MerchantWalkinBookingModal />}
            {merchantTab === 'services' && <MerchantServiceManager />}
            {merchantTab === 'staffs' && <MerchantStaffManager />}
            {merchantTab === 'booking_flow' && <MerchantBookingFlowSettings />}
            {merchantTab === 'payments' && <MerchantPaymentSettings />}
            {merchantTab === 'booking_settings' && <MerchantBookingSettings />}
            {merchantTab === 'analytics' && <MerchantAnalytics />}
            {merchantTab === 'line_settings' && <MerchantLineOASettings />}
            {merchantTab === 'onboarding' && <MerchantOnboardingWizard />}
            {merchantTab === 'reviews' && <MerchantReviews />}
          </div>
        </main>
      </div>

      {/* Quick Mobile Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 p-2 z-30 flex items-center justify-around text-slate-400">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${merchantTab === 'dashboard' ? 'text-primary' : 'hover:text-white'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>แดชบอร์ด</span>
        </button>
        <button
          onClick={() => handleTabChange('calendar')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${merchantTab === 'calendar' ? 'text-primary' : 'hover:text-white'}`}
        >
          <Calendar className="w-5 h-5" />
          <span>ปฏิทิน</span>
        </button>

        {/* Floating Quick Walk-in Button */}
        <button
          onClick={() => handleTabChange('walkin')}
          className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/40 active:scale-90 transition-transform"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <button
          onClick={() => handleTabChange('services')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${merchantTab === 'services' ? 'text-primary' : 'hover:text-white'}`}
        >
          <Scissors className="w-5 h-5" />
          <span>บริการ</span>
        </button>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold hover:text-white"
        >
          <Menu className="w-5 h-5" />
          <span>เมนูทั้งหมด</span>
        </button>
      </div>

      {/* Subscription Payment Modal */}
      <MerchantSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
};
