import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { TenantPlan } from '../../types';
import {
  ShieldCheck,
  Building2,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  Zap,
  Lock,
  Users,
  CreditCard,
  Settings,
  MoreVertical
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { tenants, bookings } = useSaaS();
  const [activeSubTab, setActiveTab] = useState<'tenants' | 'plans' | 'system'>('tenants');

  const totalMRR = tenants.reduce((sum, t) => {
    if (t.plan === 'enterprise') return sum + 2990;
    if (t.plan === 'pro') return sum + 990;
    return sum;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-success/20 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 text-primary-light rounded-2xl border border-primary/30 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                Platform Super Admin
                <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-widest font-bold">Multi-tenant</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                แดชบอร์ดบริหารจัดการผู้ใช้บริการ ผู้เช่าร้านค้า และรายได้ของแพลตฟอร์ม
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-md relative z-10 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'tenants' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            ผู้เช่า ({tenants.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'plans' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            แพ็กเกจค่าบริการ
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'system' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            System Health
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm text-slate-500 font-bold">จำนวนผู้เช่าทั้งหมด</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{tenants.length} <span className="text-lg text-slate-400 font-bold">ร้านค้า</span></h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm">
               <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-success-dark font-bold bg-success/10 inline-flex px-2.5 py-1 rounded-lg">
             <CheckCircle2 className="w-3.5 h-3.5" />
             <span>Active 100% (Pro: 1, Free: 1, Ent: 1)</span>
          </div>
        </div>

        <div className="premium-card p-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm text-slate-500 font-bold">รายได้ประจำ (MRR)</p>
              <h3 className="text-3xl font-black text-success mt-1">฿{(totalMRR ?? 0).toLocaleString()} <span className="text-lg text-slate-400 font-bold">/ ด.</span></h3>
            </div>
             <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success-dark border border-success/20 shadow-sm">
               <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold inline-flex px-1 py-1">
             <TrendingUp className="w-3.5 h-3.5" />
             <span>คำนวณจากค่าสมัครสมาชิก SaaS</span>
          </div>
        </div>

        <div className="premium-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm text-slate-500 font-bold">ยอดคิวจองรวม</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{bookings.length} <span className="text-lg text-slate-400 font-bold">รายการ</span></h3>
            </div>
             <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
               <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold inline-flex px-1 py-1">
             <Users className="w-3.5 h-3.5" />
             <span>รวมจากผู้เช่าทุกร้านในระบบ</span>
          </div>
        </div>
      </div>

      {/* Subtab Content: Tenants List */}
      {activeSubTab === 'tenants' && (
        <div className="premium-card overflow-hidden">
          <div className="p-5 border-b border-border/60 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                รายชื่อร้านค้าในระบบ
            </h2>
            <div className="flex items-center gap-2">
                 <input 
                    type="text" 
                    placeholder="ค้นหาร้านค้า..." 
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                 />
                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {tenants.map((t) => (
              <div key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                      <img src={t.logoUrl} alt={t.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-foreground text-base">{t.name}</h3>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md border border-slate-200">
                        {t.slug}.booking.app
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                      <span className="capitalize">{t.businessType}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{t.phone}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{t.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-end">
                  <span className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] font-mono tracking-wider shadow-sm ${
                    t.plan === 'enterprise'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200 shadow-[0_2px_8px_rgba(168,85,247,0.15)]'
                      : t.plan === 'pro'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-[0_2px_8px_rgba(59,130,246,0.15)]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {t.plan}
                  </span>

                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab Content: Subscription Plans */}
      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="premium-card p-8 flex flex-col h-full border-2 border-transparent">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Starter Plan</span>
            <h3 className="text-3xl font-black text-foreground mb-6">Free <span className="text-base text-slate-400 font-bold">/ เดือน</span></h3>
            <ul className="space-y-4 text-sm text-slate-600 font-medium flex-1 pt-6 border-t border-slate-100">
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>รองรับคิวจองสูงสุด 45 คิว/เดือน</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>ทีมช่างสูงสุด 1 คน</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>PromptPay QR Payment</span>
              </li>
            </ul>
            <button className="w-full py-3 mt-8 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors">
                จัดการแพ็กเกจ
            </button>
          </div>

          <div className="premium-card p-8 flex flex-col h-full border-2 border-primary relative shadow-xl shadow-primary/10 transform md:-translate-y-2">
            <span className="absolute -top-4 right-6 bg-primary text-white text-[11px] font-black px-4 py-1 rounded-full shadow-lg">
              POPULAR
            </span>
            <span className="text-xs font-black text-primary uppercase tracking-widest mb-2 block">Professional Plan</span>
            <h3 className="text-3xl font-black text-foreground mb-6">฿990 <span className="text-base text-slate-400 font-bold">/ เดือน</span></h3>
            <ul className="space-y-4 text-sm text-slate-700 font-bold flex-1 pt-6 border-t border-slate-100">
               <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>คิวจองไม่จำกัด</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>ทีมช่างสูงสุด 10 คน</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>LINE Rich Menu Auto-Setup</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span>Analytics & Excel Export</span>
              </li>
            </ul>
             <button className="w-full py-3 mt-8 rounded-xl font-bold btn-primary shadow-md">
                จัดการแพ็กเกจ
            </button>
          </div>

          <div className="premium-card p-8 flex flex-col h-full border-2 border-transparent">
            <span className="text-xs font-black text-purple-600 uppercase tracking-widest mb-2 block">Enterprise Plan</span>
            <h3 className="text-3xl font-black text-foreground mb-6">฿2,990 <span className="text-base text-slate-400 font-bold">/ เดือน</span></h3>
            <ul className="space-y-4 text-sm text-slate-600 font-medium flex-1 pt-6 border-t border-slate-100">
               <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>คุณสมบัติทั้งหมดของ Pro Plan</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Custom Domain (CNAME)</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Dedicated SLA Support</span>
              </li>
              <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Multi-location Branch Support</span>
              </li>
            </ul>
             <button className="w-full py-3 mt-8 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:border-purple-600 hover:text-purple-600 transition-colors">
                จัดการแพ็กเกจ
            </button>
          </div>
        </div>
      )}

      {/* Subtab Content: System Health */}
      {activeSubTab === 'system' && (
        <div className="premium-card overflow-hidden">
           <div className="p-6 border-b border-border/60 bg-slate-50/50">
             <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              สถานะระบบเซิร์ฟเวอร์ (Platform Health)
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Monitoring metrics from Sentry & Datadog</p>
           </div>
          

          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <span className="text-xs text-slate-400 font-bold block mb-2">API Latency (p95)</span>
              <span className="text-2xl font-black text-success group-hover:scale-110 inline-block transition-transform">42 ms</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <span className="text-xs text-slate-400 font-bold block mb-2">5xx Error Rate</span>
              <span className="text-2xl font-black text-success group-hover:scale-110 inline-block transition-transform">0.00%</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <span className="text-xs text-slate-400 font-bold block mb-2">Bull Queue Tasks</span>
              <span className="text-2xl font-black text-primary group-hover:scale-110 inline-block transition-transform">0 <span className="text-sm text-slate-400 font-bold">Pending</span></span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <span className="text-xs text-slate-400 font-bold block mb-2">PostgreSQL RLS</span>
              <span className="text-xl font-black text-success group-hover:scale-110 inline-block transition-transform tracking-widest mt-1">ENFORCED</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
