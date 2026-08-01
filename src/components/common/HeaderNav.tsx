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
  Menu,
} from 'lucide-react';

export const HeaderNav: React.FC = () => {
  const {
    tenants,
    activeTenant,
    switchTenant,
    setMerchantTab,
  } = useSaaS();

  return (
    <header className="bg-admin-sidebar/95 backdrop-blur-xl text-white border-b border-white/10 sticky top-0 z-50 shadow-glass transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300 group-hover:scale-105">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  LINE OA Booking
                </span>
                <span className="bg-primary/20 text-blue-300 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border border-primary/30 hidden sm:inline-block">
                  SaaS Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden lg:block mt-0.5 font-medium">
                ระบบจัดการจองคิวครบวงจร
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">

            {/* Tenant Selector Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer transition-all duration-300 shadow-sm backdrop-blur-md">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 hidden sm:flex">
                  <img src={activeTenant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="text-left max-w-[100px] sm:max-w-[140px] truncate">
                  <span className="block font-bold text-sm text-white truncate">
                    {activeTenant.name}
                  </span>
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline-block mt-0.5">
                    {activeTenant.plan}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform duration-300" />
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-3 w-72 bg-admin-sidebar border border-white/10 rounded-2xl shadow-2xl shadow-black/50 py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="px-4 py-2 border-b border-white/5 mb-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    เลือกสลับร้านค้า
                  </p>
                </div>
                <div className="max-h-[300px] overflow-y-auto px-2 space-y-1">
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => switchTenant(tenant.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 ${
                        tenant.id === activeTenant.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <img
                          src={tenant.logoUrl}
                          alt={tenant.name}
                          className="w-10 h-10 rounded-full border border-white/10 object-cover shadow-sm"
                        />
                        <div className="truncate">
                          <p className={`font-semibold truncate ${tenant.id === activeTenant.id ? 'text-primary' : 'text-slate-200'}`}>
                            {tenant.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {tenant.slug}.booking.app
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1">
                  <button
                    onClick={() => {
                      // navigate('/merchant'); // TODO: Add navigate
                      setMerchantTab('onboarding');
                      window.location.href = '/merchant';
                    }}
                    className="w-full text-center py-2.5 text-sm font-bold text-success hover:text-white bg-success/10 hover:bg-success border border-success/20 hover:border-success rounded-xl transition-all duration-300 shadow-sm"
                  >
                    + เพิ่มร้านค้าใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
