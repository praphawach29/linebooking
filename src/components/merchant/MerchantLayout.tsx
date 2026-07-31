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
  Settings,
  MessageSquare,
  Sparkles,
  Building2,
  Store,
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 flex flex-col justify-between">
        <div className="p-4 space-y-6">
          
          {/* Active Tenant Header Card */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex items-center gap-3">
            <img
              src={activeTenant.logoUrl}
              alt={activeTenant.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xs text-white truncate">{activeTenant.name}</h2>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {activeTenant.slug}.booking.app
              </p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1 text-xs">
            <button
              onClick={() => setMerchantTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'dashboard'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>แดชบอร์ด (Overview)</span>
              </div>
              <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {todayBookingsCount}
              </span>
            </button>

            <button
              onClick={() => setMerchantTab('calendar')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'calendar'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>ปฏิทินตารางคิว (Calendar)</span>
            </button>

            <button
              onClick={() => setMerchantTab('walkin')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'walkin'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>ลงคิว Walk-in / ทางโทรศัพท์</span>
            </button>

            <div className="pt-3 pb-1 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3.5">
                จัดการข้อมูลร้าน
              </span>
            </div>

            <button
              onClick={() => setMerchantTab('services')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'services'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>แคตตาล็อกบริการ (Services)</span>
            </button>

            <button
              onClick={() => setMerchantTab('staffs')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'staffs'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>จัดการทีมช่าง (Staffs)</span>
            </button>

            <button
              onClick={() => setMerchantTab('payments')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'payments'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>ชำระเงิน & นโยบายยกเลิก</span>
            </button>

            <button
              onClick={() => setMerchantTab('line_settings')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'line_settings'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>LINE OA & Rich Menu Setup</span>
            </button>

            <button
              onClick={() => setMerchantTab('analytics')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                merchantTab === 'analytics'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>รายงาน & วิเคราะห์รายได้</span>
            </button>
          </nav>
        </div>

        {/* Onboarding Trigger Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setMerchantTab('onboarding')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold py-2.5 px-3 rounded-xl border border-slate-700 text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>เริ่มต้นตั้งค่าร้าน (4-Step Wizard)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {merchantTab === 'dashboard' && <MerchantDashboard />}
        {merchantTab === 'calendar' && <MerchantCalendarView />}
        {merchantTab === 'walkin' && <MerchantWalkinBookingModal />}
        {merchantTab === 'services' && <MerchantServiceManager />}
        {merchantTab === 'staffs' && <MerchantStaffManager />}
        {merchantTab === 'payments' && <MerchantPaymentSettings />}
        {merchantTab === 'analytics' && <MerchantAnalytics />}
        {merchantTab === 'line_settings' && <MerchantLineOASettings />}
        {merchantTab === 'onboarding' && <MerchantOnboardingWizard />}
      </main>

    </div>
  );
};
