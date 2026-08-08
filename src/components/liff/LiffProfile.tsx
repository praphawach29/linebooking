import React, { useState, useEffect } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useLiffProfile } from '../../hooks/useLiffProfile';
import { getCustomerMembership } from '../../lib/booking-api';
import { Membership } from '../../types';
import { Phone, Mail, Award, ShieldCheck, LogOut, ChevronRight, UserCheck, Edit3, Save, Check } from 'lucide-react';
import liff from '@line/liff';

interface LiffProfileProps {
  onNavigate?: (step: 'rewards' | 'point_history') => void;
}

export const LiffProfile: React.FC<LiffProfileProps> = ({ onNavigate }) => {
  const { currentUser, activeTenant, bookings, fetchMembership, updateCurrentUserContact, fetchMyBookings } = useSaaS();
  const liffProfile = useLiffProfile(activeTenant?.liffId);

  const [membershipData, setMembershipData] = useState<Membership | null>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  const [phoneInput, setPhoneInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('liff_customer_contact');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) return parsed.phone;
      }
    } catch (e) {}
    return currentUser?.phone || '';
  });

  const [emailInput, setEmailInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('liff_customer_contact');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) return parsed.email;
      }
    } catch (e) {}
    return currentUser?.email || '';
  });

  useEffect(() => {
    if (activeTenant && liffProfile.isLoggedIn) {
      // Fetch bookings history
      fetchMyBookings(liffProfile.lineUserId, phoneInput).then(bks => {
        if (bks) setMyBookings(bks);
      }).catch(console.error);
      
      // Use the LINE ID Token to fetch latest membership from API
      try {
        const token = liff.getIDToken();
        if (token) {
          getCustomerMembership({
            tenantId: activeTenant.id,
            accessToken: token,
            phone: phoneInput
          }).then(mem => {
            if (mem) setMembershipData(mem);
          }).catch(console.error);
        }
      } catch (err) {
        console.error("Failed to fetch membership:", err);
      }
    }
  }, [activeTenant, liffProfile.isLoggedIn, liffProfile.lineUserId]);


  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const displayName = liffProfile.displayName !== 'ลูกค้า LINE User'
    ? liffProfile.displayName
    : (currentUser?.displayName || currentUser?.name || 'คุณลูกค้า');

  const avatarUrl = liffProfile.pictureUrl || currentUser?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  // Determine which bookings to count: use the fetched ones if available, otherwise fallback to global context filtered by phone
  const userBookings = myBookings.length > 0 
    ? myBookings 
    : bookings.filter((b) => b.userId === currentUser?.id || b.phoneInput === phoneInput);
  
  const completedCount = userBookings.filter((b) => b.status === 'completed' || b.status === 'checked_in').length;
  const membership = membershipData || (currentUser ? fetchMembership(currentUser.id) : undefined);
  const points = membership?.points || 0;
  const tierRaw = membership?.tier || 'Bronze';
  const tierDisplay = tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1).toLowerCase();
  const tierLabel = tierRaw.toLowerCase() === 'platinum' || tierRaw.toLowerCase() === 'vip'
    ? `VIP ${tierDisplay}`
    : `${tierDisplay} Member`;

  const handleSaveContact = () => {
    try {
      localStorage.setItem('liff_customer_contact', JSON.stringify({ phone: phoneInput, email: emailInput }));
    } catch (e) {}

    if (currentUser && updateCurrentUserContact) {
      updateCurrentUserContact({ phone: phoneInput, email: emailInput });
    }

    setIsEditingContact(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="p-4 space-y-5 pb-28 font-prompt">
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว</span>
        </div>
      )}

      {/* User Header Profile Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-slate-700/60 rounded-[32px] p-6 text-center space-y-4 relative overflow-hidden mt-2 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl -mr-20 -mt-20"></div>
        
        <div className="relative inline-block z-10">
          <div className="p-1 bg-white/20 rounded-full backdrop-blur-sm shadow-lg">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl bg-slate-800"
            />
          </div>
          <span className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-slate-900 shadow-md">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>

        <div className="relative z-10 space-y-1">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{displayName}</span>
            {liffProfile.isLoggedIn && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                LINE Verified
              </span>
            )}
          </h2>
          <p className="text-[12px] text-slate-300 font-bold tracking-wider uppercase">
            {liffProfile.statusMessage || 'บัญชีลูกค้า LINE Official Account'}
          </p>
        </div>

        <div className="bg-black/30 px-3 py-1.5 rounded-xl inline-block text-[11px] font-mono text-emerald-300 font-bold border border-white/10 relative z-10">
          ID: {liffProfile.lineUserId ? `${liffProfile.lineUserId.slice(0, 10)}...` : 'U100234589...'}
        </div>

        {!liffProfile.isLoggedIn && !liffProfile.isInClient && (
          <div className="pt-2">
            <button
              onClick={() => liffProfile.login()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mx-auto"
            >
              <UserCheck className="w-4 h-4" />
              <span>เข้าสู่ระบบด้วย LINE</span>
            </button>
          </div>
        )}
      </div>

      {/* Member Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-slate-500 block font-bold mb-1">การจองทั้งหมด</span>
          <span className="text-xl font-black text-slate-900">{userBookings.length}</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-slate-500 block font-bold mb-1">ใช้บริการแล้ว</span>
          <span className="text-xl font-black text-emerald-600">{completedCount}</span>
        </div>

        <div 
          className="bg-white border border-slate-200/80 rounded-2xl p-3.5 text-center relative overflow-hidden cursor-pointer active:scale-95 transition-transform shadow-sm"
          onClick={() => onNavigate?.('rewards')}
        >
          <span className="text-[11px] text-slate-500 block font-bold mb-1">คะแนนสะสม</span>
          <span className="text-xl font-black text-amber-500">{points.toLocaleString()} <span className="text-xs font-mono">P</span></span>
        </div>
      </div>

      {/* Contact Info Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-900 text-sm">ข้อมูลส่วนตัวสำหรับการจอง</h3>
          {isEditingContact ? (
            <button
              onClick={handleSaveContact}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึก</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditingContact(true)}
              className="text-xs font-bold text-slate-600 hover:text-emerald-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>แก้ไข</span>
            </button>
          )}
        </div>

        <div className="space-y-4 text-[13px]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-400 block font-bold mb-0.5">เบอร์โทรศัพท์ติดต่อ</span>
              {isEditingContact ? (
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="กรอกเบอร์โทรศัพท์..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <span className="font-black font-mono text-slate-800 text-sm">{phoneInput || '081-234-5678 (ระบุตอนจอง)'}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-400 block font-bold mb-0.5">อีเมล</span>
              {isEditingContact ? (
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="กรอกอีเมล..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <span className="font-black text-slate-800 text-xs">{emailInput || liffProfile.email || 'ยังไม่ได้ระบุอีเมล'}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-400 block font-bold mb-0.5">ระดับสมาชิกสโมสร</span>
              <span className="font-black text-amber-600 text-xs">{tierLabel}</span>
              <span className="block text-[10px] text-slate-400 font-medium">({activeTenant?.name || 'JackSports'})</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Links Options */}
      <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-sm">
        <button 
          onClick={() => onNavigate?.('rewards')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <span className="font-bold text-[13px] text-slate-800">แลกของรางวัลสมาชิก</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <button 
          onClick={() => onNavigate?.('point_history')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <span className="font-bold text-[13px] text-slate-800">ประวัติคะแนนสะสม</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Logout button */}
      {liffProfile.isLoggedIn && (
        <button
          onClick={() => liffProfile.logout()}
          className="w-full bg-white hover:bg-red-50 text-red-600 font-black py-3 px-4 rounded-2xl border border-red-200 shadow-sm flex items-center justify-center gap-2 text-[13px] transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ LINE</span>
        </button>
      )}
    </div>
  );
};
