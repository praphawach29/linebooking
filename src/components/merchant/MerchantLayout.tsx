import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
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
} from 'lucide-react';
import { MerchantDashboard } from './MerchantDashboard';
import { MerchantCalendarView } from './MerchantCalendarView';
import { MerchantWalkinBookingModal } from './MerchantWalkinBookingModal';
import { MerchantServiceManager } from './MerchantServiceManager';
import { MerchantStaffManager } from './MerchantStaffManager';
import { MerchantPaymentSettings } from './MerchantPaymentSettings';
import { MerchantAnalytics } from './MerchantAnalytics';
import { MerchantLineOASettings } from './MerchantLineOASettings';
import { MerchantOnboardingWizard } from './MerchantOnboardingWizard';

export const MerchantLayout: React.FC = () => {
  const { activeTenant, merchantTab, setMerchantTab, bookings } = useSaaS();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookingsCount = bookings.filter((b) => b.bookingDate === todayStr).length;

  const NavItem = ({ tab, icon: Icon, label, badge }: any) => {
    const isActive = merchantTab === tab;
    return (
      <button
        onClick={() => setMerchantTab(tab)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all duration-300 group ${
          isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
            : 'hover:bg-white/5 text-merchant-sidebar-text hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
          <span>{label}</span>
        </div>
        {badge !== undefined && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300 group-hover:bg-white/20'}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background flex flex-col md:flex-row relative overflow-hidden rounded-tl-3xl shadow-inner mt-4">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-[280px] bg-merchant-sidebar flex-shrink-0 flex flex-col justify-between shadow-2xl z-20">
        <div className="p-5 space-y-8">
          
          {/* Active Tenant Header Card */}
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center gap-4 backdrop-blur-md shadow-inner">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0 bg-slate-800 shadow-md">
              <img
                src={activeTenant.logoUrl}
                alt={activeTenant.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-sm text-white truncate">{activeTenant.name}</h2>
              <p className="text-xs text-success font-semibold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                ออนไลน์
              </p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-2">
            <NavItem tab="dashboard" icon={LayoutDashboard} label="แดชบอร์ด" badge={todayBookingsCount} />
            <NavItem tab="calendar" icon={Calendar} label="ปฏิทินคิวงาน" />
            <NavItem tab="walkin" icon={PlusCircle} label="เพิ่มคิว Walk-in" />
            
            <div className="pt-6 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4">
                ตั้งค่าร้านค้า
              </span>
            </div>

            <NavItem tab="services" icon={Scissors} label="บริการ (Services)" />
            <NavItem tab="staffs" icon={Users} label="ทีมช่าง (Staffs)" />
            <NavItem tab="payments" icon={CreditCard} label="การชำระเงิน" />
            <NavItem tab="line_settings" icon={MessageSquare} label="LINE OA Setup" />
            <NavItem tab="analytics" icon={BarChart3} label="วิเคราะห์ข้อมูล" />
          </nav>
        </div>

        {/* Onboarding Trigger Button */}
        <div className="p-5 border-t border-white/5">
          <button
            onClick={() => setMerchantTab('onboarding')}
            className="w-full bg-gradient-to-r from-success/20 to-success/10 hover:from-success hover:to-emerald-500 text-success hover:text-white font-bold py-3.5 px-4 rounded-2xl border border-success/30 text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            <span>เริ่มตั้งค่าระบบ (Wizard)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-background/50 relative">
        {/* Subtle background blur */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-success/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        <div className="max-w-6xl mx-auto">
          {merchantTab === 'dashboard' && <MerchantDashboard />}
          {merchantTab === 'calendar' && <MerchantCalendarView />}
          {merchantTab === 'walkin' && <MerchantWalkinBookingModal />}
          {merchantTab === 'services' && <MerchantServiceManager />}
          {merchantTab === 'staffs' && <MerchantStaffManager />}
          {merchantTab === 'payments' && <MerchantPaymentSettings />}
          {merchantTab === 'analytics' && <MerchantAnalytics />}
          {merchantTab === 'line_settings' && <MerchantLineOASettings />}
          {merchantTab === 'onboarding' && <MerchantOnboardingWizard />}
        </div>
      </main>

    </div>
  );
};
