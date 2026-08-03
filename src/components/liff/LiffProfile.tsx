import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Phone, Mail, Award, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';

interface LiffProfileProps {
  onNavigate?: (step: 'rewards' | 'point_history') => void;
}

export const LiffProfile: React.FC<LiffProfileProps> = ({ onNavigate }) => {
  const { currentUser, activeTenant, bookings, fetchMembership } = useSaaS();

  const userBookings = bookings.filter((b) => b.userId === currentUser?.id);
  const completedCount = userBookings.filter((b) => b.status === 'completed').length;
  const membership = currentUser ? fetchMembership(currentUser.id) : undefined;
  const points = membership?.points || 0;
  const tierDisplay = membership?.tier 
    ? membership.tier.charAt(0).toUpperCase() + membership.tier.slice(1) 
    : 'Bronze';

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* User Header Profile Card */}
      <div className="premium-card bg-gradient-to-br from-primary to-primary-dark border-primary-dark p-6 text-center space-y-4 relative overflow-hidden mt-2 shadow-lg shadow-primary/30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
        
        <div className="relative inline-block z-10">
          <div className="p-1 bg-white/20 rounded-full backdrop-blur-sm">
             <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={currentUser?.displayName || 'ลูกค้า'}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
              />
          </div>
          <span className="absolute bottom-1 right-1 bg-success text-white p-1.5 rounded-full border-2 border-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </span>
        </div>

        <div className="relative z-10">
          <h2 className="text-xl font-black text-white tracking-wide">
            {currentUser?.displayName || 'ลูกค้า'}
          </h2>
          <p className="text-[13px] text-primary-light font-bold mt-1 tracking-wider uppercase">
            LINE Login User
          </p>
        </div>

        <div className="bg-black/20 p-2 rounded-xl inline-block text-[11px] font-mono text-white/80 font-bold backdrop-blur-md relative z-10">
          ID: {currentUser?.lineUserId?.slice(0, 12) || '-'}...
        </div>
      </div>

      {/* Member Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="premium-card p-4 text-center">
          <span className="text-[11px] text-slate-500 block font-bold mb-1">การจองทั้งหมด</span>
          <span className="text-2xl font-black text-foreground">{userBookings.length}</span>
        </div>

        <div className="premium-card p-4 text-center">
          <span className="text-[11px] text-slate-500 block font-bold mb-1">ใช้บริการแล้ว</span>
          <span className="text-2xl font-black text-success-dark">{completedCount}</span>
        </div>

        <div 
          className="premium-card p-4 text-center relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
          onClick={() => onNavigate?.('rewards')}
        >
           <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-500/10 rounded-full blur-md"></div>
          <span className="text-[11px] text-slate-500 block font-bold mb-1 relative z-10">คะแนนสะสม</span>
          <span className="text-2xl font-black text-amber-500 relative z-10">{points.toLocaleString()}</span>
          <span className="text-[10px] text-amber-600 font-black absolute bottom-4 right-3">P</span>
        </div>
      </div>

      {/* Contact Info Card */}
      <div className="premium-card p-5 space-y-4">
        <h3 className="font-black text-foreground border-b border-border/60 pb-3 flex items-center justify-between text-[15px]">
          <span>ข้อมูลส่วนตัว</span>
          <button className="text-[11px] text-primary font-bold hover:underline">แก้ไข</button>
        </h3>

        <div className="space-y-4 text-[13px]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
               <Phone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-400 block font-bold mb-0.5">เบอร์โทรศัพท์</span>
              <span className="font-black font-mono text-foreground text-sm">{currentUser?.phone || '-'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
               <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-400 block font-bold mb-0.5">อีเมล</span>
              <span className="font-black text-foreground text-sm">{currentUser?.email || '-'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
               <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-400 block font-bold mb-0.5">ระดับสมาชิก</span>
              <span className="font-black text-amber-600 text-sm">VIP {tierDisplay} Member</span>
              <span className="block text-[10px] text-slate-400 font-medium">({activeTenant.name})</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Options (Placeholder for UX) */}
      <div className="premium-card divide-y divide-slate-100 overflow-hidden">
          <button 
            onClick={() => onNavigate?.('rewards')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
              <span className="font-bold text-[13px] text-foreground">แลกของรางวัล</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            onClick={() => onNavigate?.('point_history')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
              <span className="font-bold text-[13px] text-foreground">ประวัติการสะสมแต้ม</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
           <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <span className="font-bold text-[13px] text-foreground">นโยบายความเป็นส่วนตัว</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
           <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <span className="font-bold text-[13px] text-foreground">ติดต่อแอดมิน</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
      </div>

      {/* Logout simulation */}
      <button
        onClick={() => alert('จำลองการออกจากระบบ LINE Login')}
        className="w-full bg-white hover:bg-danger/5 text-danger font-black py-4 px-4 rounded-2xl border-2 border-danger/20 shadow-sm flex items-center justify-center gap-2 text-[13px] transition-all"
      >
        <LogOut className="w-5 h-5" />
        <span>ออกจากระบบ LIFF</span>
      </button>
    </div>
  );
};
