import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import {
  Smartphone,
  Store,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Building2,
} from 'lucide-react';

export const HeaderNav: React.FC = () => {
  const {
    tenants,
    activeTenant,
    switchTenant,
    viewMode,
    setViewMode,
    setMerchantTab,
  } = useSaaS();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  LINE OA Booking
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  SaaS Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                ระบบจองคิวบริการผ่าน LINE Official Account & LIFF
              </p>
            </div>
          </div>

          {/* Viewport Modes */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setViewMode('liff')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'liff'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">LIFF Customer App</span>
              <span className="md:hidden">LIFF</span>
            </button>

            <button
              onClick={() => {
                setViewMode('merchant');
                setMerchantTab('dashboard');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'merchant'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span className="hidden md:inline">Merchant Portal</span>
              <span className="md:hidden">Merchant</span>
            </button>

            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'admin'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden md:inline">Platform Admin</span>
              <span className="md:hidden">Admin</span>
            </button>

            <button
              onClick={() => setViewMode('line_simulator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'line_simulator'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">LINE OA Bot Simulator</span>
              <span className="md:hidden">LINE Bot</span>
            </button>
          </div>

          {/* Tenant Selector Dropdown */}
          <div className="relative group">
            <div className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 cursor-pointer transition-colors">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <div className="text-left max-w-[130px] truncate">
                <span className="block font-semibold text-white truncate">
                  {activeTenant.name}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  {activeTenant.plan} plan
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform" />
            </div>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-700/60 mb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  เลือกเลือกร้านค้า (Multi-tenant)
                </p>
              </div>
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => switchTenant(tenant.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-700/70 transition-colors ${
                    tenant.id === activeTenant.id
                      ? 'text-emerald-400 font-semibold bg-emerald-500/10'
                      : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={tenant.logoUrl}
                      alt={tenant.name}
                      className="w-6 h-6 rounded-lg object-cover"
                    />
                    <div className="truncate">
                      <p className="truncate font-medium">{tenant.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {tenant.slug}.booking.app
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                      tenant.plan === 'enterprise'
                        ? 'bg-purple-500/20 text-purple-300'
                        : tenant.plan === 'pro'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-600/30 text-slate-400'
                    }`}
                  >
                    {tenant.plan}
                  </span>
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-700/60 px-2">
                <button
                  onClick={() => {
                    setViewMode('merchant');
                    setMerchantTab('onboarding');
                  }}
                  className="w-full text-center py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  + เพิ่มร้านค้าใหม่ (Onboarding)
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
