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
    <div className="max-w-6xl mx-auto space-y-6 text-xs">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Platform Super Admin (Multi-tenant SaaS)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            แดชบอร์ดบริหารจัดการผู้ใช้บริการ ผู้เช่าร้านค้า และรายได้ของแพลตฟอร์ม
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeSubTab === 'tenants' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            ผู้เช่าร้านค้า ({tenants.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeSubTab === 'plans' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            แพ็กเกจค่าบริการ
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeSubTab === 'system' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Health
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400 font-bold">
            <span>จำนวนผู้เช่าทั้งหมด (Tenants)</span>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{tenants.length} ร้านค้า</p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            แอคทีฟ 100% (Pro: 1, Free: 1, Enterprise: 1)
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400 font-bold">
            <span>รายได้ประจำต่อเดือน (MRR)</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">฿{(totalMRR ?? 0).toLocaleString()}/เดือน</p>
          <p className="text-[11px] text-slate-500">คำนวณจากค่าสมัครสมาชิก SaaS</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400 font-bold">
            <span>จำนวนคิวจองทั้งแพลตฟอร์ม</span>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{bookings.length} รายการ</p>
          <p className="text-[11px] text-slate-500">รวมจากผู้เช่าทุกร้าน</p>
        </div>
      </div>

      {/* Subtab Content: Tenants List */}
      {activeSubTab === 'tenants' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 flex justify-between items-center">
            <span>รายชื่อร้านค้าในระบบ (Tenants Management)</span>
            <span className="text-slate-500 font-normal">เรียงตามวันที่สมัคร</span>
          </div>

          <div className="divide-y divide-slate-100">
            {tenants.map((t) => (
              <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <img src={t.logoUrl} alt={t.name} className="w-10 h-10 rounded-2xl object-cover border border-slate-200" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900">{t.name}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {t.slug}.booking.app
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ประเภท: {t.businessType} | ติดต่อ: {t.phone} ({t.email})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <span className={`px-2.5 py-1 rounded-xl font-bold uppercase text-[10px] font-mono ${
                    t.plan === 'enterprise'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : t.plan === 'pro'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {t.plan} Plan
                  </span>

                  <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab Content: Subscription Plans */}
      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Starter Plan</span>
            <h3 className="text-lg font-black text-slate-900">Free / ฿0</h3>
            <ul className="space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ รองรับคิวจองสูงสุด 45 คิว/เดือน</li>
              <li>✓ ทีมช่างสูงสุด 1 คน</li>
              <li>✓ PromptPay QR Payment</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-3xl border-2 border-emerald-500 shadow-md space-y-3 relative">
            <span className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              POPULAR
            </span>
            <span className="text-xs font-bold text-emerald-600 uppercase">Professional Plan</span>
            <h3 className="text-lg font-black text-slate-900">฿990 / เดือน</h3>
            <ul className="space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ คิวจองไม่จำกัด</li>
              <li>✓ ทีมช่างสูงสุด 10 คน</li>
              <li>✓ LINE Rich Menu Auto-Setup</li>
              <li>✓ Analytics & Excel Export</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-purple-600 uppercase">Enterprise Plan</span>
            <h3 className="text-lg font-black text-slate-900">฿2,990 / เดือน</h3>
            <ul className="space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
              <li>✓ คุณสมบัติทั้งหมดของ Pro Plan</li>
              <li>✓ Custom Domain (CNAME)</li>
              <li>✓ Dedicated SLA Support</li>
              <li>✓ Multi-location Branch Support</li>
            </ul>
          </div>
        </div>
      )}

      {/* Subtab Content: System Health */}
      {activeSubTab === 'system' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Zap className="w-4 h-4 text-emerald-600" />
            สถานะระบบเซิร์ฟเวอร์ (Platform Health & Sentry Logs)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block">API Latency (p95)</span>
              <span className="text-sm font-extrabold text-emerald-600">42 ms</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block">5xx Error Rate</span>
              <span className="text-sm font-extrabold text-emerald-600">0.00%</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block">Bull Queue Status</span>
              <span className="text-sm font-extrabold text-blue-600">Active (0 Pending)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block">PostgreSQL RLS</span>
              <span className="text-sm font-extrabold text-emerald-600">ENFORCED</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
