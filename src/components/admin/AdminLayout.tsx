import React, { ReactNode, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  LogOut,
  Megaphone,
  Menu,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'tenants'
  | 'users'
  | 'plans'
  | 'gateway'
  | 'invoices'
  | 'slips'
  | 'system';

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  /** จำนวนสลิปที่รอตรวจ — แสดงเป็น badge บนเมนู */
  pendingSlipCount?: number;
  onOpenAnnouncement?: () => void;
  children: ReactNode;
}

/**
 * AdminLayout — Sidebar ซ้ายสำหรับ Super Admin
 *
 * ใช้ design token ที่จองไว้ตั้งแต่ต้น: --color-admin-sidebar (#0B0F19)
 * และ --color-admin-sidebar-active (#4F46E5 Indigo) เพื่อแยกจากฝั่ง Merchant (เขียว)
 *
 * เหตุผลที่ย้ายจากแท็บด้านบน: เมนูเกิน 5 อันแล้วล้นจอ และเมนู "รออนุมัติสลิป"
 * ต้องโชว์ badge จำนวนคิวค้างตลอดเวลา
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onTabChange,
  pendingSlipCount = 0,
  onOpenAnnouncement,
  children,
}) => {
  const { signOut, authUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'ภาพรวม',
      items: [{ id: 'overview', label: 'แดชบอร์ด', icon: Activity }],
    },
    {
      title: 'ผู้เช่า',
      items: [
        { id: 'tenants', label: 'ร้านค้าทั้งหมด', icon: Building2 },
        { id: 'users', label: 'ผู้ใช้งานระบบ', icon: Users },
      ],
    },
    {
      title: 'การเงิน',
      items: [
        { id: 'plans', label: 'แพ็กเกจค่าบริการ', icon: DollarSign },
        { id: 'gateway', label: 'ตั้งค่ารับชำระเงิน', icon: CreditCard },
        { id: 'invoices', label: 'ใบแจ้งหนี้', icon: Receipt },
        { id: 'slips', label: 'รออนุมัติสลิป', icon: FileText, badge: pendingSlipCount },
      ],
    },
    {
      title: 'ระบบ',
      items: [{ id: 'system', label: 'System Health', icon: Zap }],
    },
  ];

  const handleNav = (tab: AdminTab) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden bg-admin-sidebar text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm">Super Admin</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors relative"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>{isMobileMenuOpen ? 'ปิด' : 'เมนู'}</span>
          {!isMobileMenuOpen && pendingSlipCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center">
              {pendingSlipCount > 9 ? '9+' : pendingSlipCount}
            </span>
          )}
        </button>
      </div>

      {/* Backdrop (mobile) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-50 md:z-30
          w-[285px] md:w-[260px] shrink-0 bg-admin-sidebar flex flex-col justify-between
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-5 space-y-6 overflow-y-auto no-scrollbar">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">LINE OA Booking</h1>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Super Admin</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-admin-sidebar-active text-white shadow-lg shadow-indigo-600/25'
                            : 'text-admin-sidebar-text hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {!!item.badge && item.badge > 0 && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                              isActive ? 'bg-white text-indigo-700' : 'bg-amber-400 text-slate-950'
                            }`}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-5 space-y-3 border-t border-white/5">
          {onOpenAnnouncement && (
            <button
              onClick={() => {
                onOpenAnnouncement();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/25 px-3 py-2.5 rounded-xl font-bold transition-all"
            >
              <Megaphone className="w-4 h-4" />
              <span>ประกาศระบบ</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate">{authUser?.email || 'admin'}</p>
              <p className="text-[10px] text-slate-500 font-medium">platform_admin</p>
            </div>
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

      {/* Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 space-y-6">{children}</main>
    </div>
  );
};
