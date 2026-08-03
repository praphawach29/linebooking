import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HeaderNav: React.FC = () => {
  const {
    tenants,
    activeTenant,
    switchTenant,
    setMerchantTab,
  } = useSaaS();
  const { authUser, signOut } = useAuth();

  return (
    <header className="bg-admin-sidebar/95 backdrop-blur-xl text-white border-b border-white/10 sticky top-0 z-50 shadow-glass transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">

          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 md:gap-4 group cursor-pointer">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300 group-hover:scale-105">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  LINE OA Booking
                </span>
                <span className="bg-primary/20 text-blue-300 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/30 hidden sm:inline-block">
                  SaaS Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden lg:block font-medium">
                ระบบจัดการจองคิวผ่าน LINE OA
              </p>
            </div>
          </Link>

          {/* Right Section */}
          <div className="flex items-center gap-3">

            {/* Tenant Display */}
            {activeTenant && (
              authUser?.role === 'platform_admin' ? (
                /* platform_admin: Full dropdown to switch between tenants */
                <div className="relative group">
                  <div className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer transition-all duration-300 shadow-sm backdrop-blur-md">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 hidden sm:flex shrink-0">
                      <img src={activeTenant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left max-w-[100px] sm:max-w-[140px] truncate">
                      <span className="block font-bold text-xs sm:text-sm text-white truncate">
                        {activeTenant.name}
                      </span>
                      <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider hidden sm:inline-block">
                        {activeTenant.plan}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform duration-300" />
                  </div>

                  {/* Dropdown Menu — platform_admin only */}
                  <div className="absolute right-0 mt-2 w-72 bg-admin-sidebar border border-white/10 rounded-2xl shadow-2xl py-2 hidden group-hover:block z-50">
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        สลับร้านค้า
                      </p>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto px-2 space-y-1">
                      {tenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => switchTenant(tenant.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-200 ${
                            tenant.id === activeTenant.id
                              ? 'bg-primary/10 border border-primary/20 text-primary font-bold'
                              : 'hover:bg-white/5 border border-transparent text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <img
                              src={tenant.logoUrl}
                              alt={tenant.name}
                              className="w-8 h-8 rounded-full border border-white/10 object-cover shadow-sm shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-semibold text-xs truncate">
                                {tenant.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {tenant.slug}.booking.app
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1">
                      <button
                        onClick={() => setMerchantTab('onboarding')}
                        className="w-full text-center py-2 text-xs font-bold text-success hover:text-white bg-success/10 hover:bg-success border border-success/20 hover:border-success rounded-xl transition-all duration-300 shadow-sm"
                      >
                        + เพิ่มร้านค้าใหม่
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular merchant: Static shop name badge — no dropdown */
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm backdrop-blur-md">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 hidden sm:flex shrink-0">
                    <img src={activeTenant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left max-w-[100px] sm:max-w-[140px] truncate">
                    <span className="block font-bold text-xs sm:text-sm text-white truncate">
                      {activeTenant.name}
                    </span>
                    <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider hidden sm:inline-block">
                      {activeTenant.plan}
                    </span>
                  </div>
                </div>
              )
            )}

            {/* Auth Profile / Logout */}
            {authUser ? (
              <div className="flex items-center gap-2">
                {authUser.role === 'platform_admin' && (
                  <Link
                    to="/admin"
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hidden md:flex"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Super Admin</span>
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">ออก</span>
                </button>
              </div>
            ) : (
              <Link
                to="/merchant/login"
                className="bg-primary hover:bg-primary/90 text-white px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
