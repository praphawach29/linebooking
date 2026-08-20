import React, { useState, useEffect } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import type { useLiffProfile } from '../../hooks/useLiffProfile';
import { type CustomerProfileSummary, linkCustomerPhone } from '../../lib/booking-api';
import {
  loadCustomerProfileSummary,
  readCustomerProfileCache,
  writeCustomerProfileCache,
} from '../../lib/customer-profile-cache';
import {
  exportCustomerDataWithLiff,
  eraseCustomerDataWithLiff,
} from '../../lib/booking-client';
import { LegalModal, LegalModalType } from '../legal/LegalModals';
import { Membership } from '../../types';
import {
  Phone,
  Mail,
  Award,
  ShieldCheck,
  LogOut,
  ChevronRight,
  UserCheck,
  Edit3,
  Save,
  Check,
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  Loader2,
} from 'lucide-react';
import liff from '@line/liff';

interface LiffProfileProps {
  onNavigate?: (step: 'rewards' | 'point_history') => void;
  liffProfile: ReturnType<typeof useLiffProfile>;
}

// Phone-merge check only needs to run once per phone number, not on every
// page load — it's a full backend transaction, not a cheap read.
const LINKED_PHONE_KEY = 'liff_phone_linked_v1';
const getLinkedPhone = (): string | null => {
  try { return localStorage.getItem(LINKED_PHONE_KEY); } catch { return null; }
};
const setLinkedPhone = (phone: string) => {
  try { localStorage.setItem(LINKED_PHONE_KEY, phone); } catch {}
};

export const LiffProfile: React.FC<LiffProfileProps> = ({
  onNavigate,
  liffProfile,
}) => {
  const {
    currentUser,
    activeTenant,
    fetchMembership,
    updateCurrentUserContact,
  } = useSaaS();
  const initialSummary =
    activeTenant && liffProfile.lineUserId
      ? readCustomerProfileCache(activeTenant.id, liffProfile.lineUserId)
      : null;

  const [membershipData, setMembershipData] = useState<Membership | null>(
    (initialSummary?.membership as Membership | undefined) || null,
  );
  const [bookingCount, setBookingCount] = useState(
    initialSummary?.stats.totalBookings || 0,
  );
  const [completedCount, setCompletedCount] = useState(
    initialSummary?.stats.completedVisits || 0,
  );
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(
    !initialSummary,
  );

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

  const [legalModal, setLegalModal] = useState<LegalModalType>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [showErasureConfirm, setShowErasureConfirm] = useState(false);
  const [erasureSuccess, setErasureSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleExportData = async () => {
    if (!activeTenant || !liffProfile.lineUserId) return;
    setIsExporting(true);
    setActionMessage(null);
    try {
      const data = await exportCustomerDataWithLiff({
        tenantId: activeTenant.id,
        liffId: activeTenant.lineLiffId || '',
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-booking-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionMessage('ดาวน์โหลดข้อมูลสำเร็จแล้ว (JSON)');
    } catch (err: any) {
      setActionMessage('ไม่สามารถดาวน์โหลดข้อมูลได้: ' + (err?.message || 'โปรดลองใหม่'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleEraseData = async () => {
    if (!activeTenant || !liffProfile.lineUserId) return;
    setIsErasing(true);
    setActionMessage(null);
    try {
      await eraseCustomerDataWithLiff({
        tenantId: activeTenant.id,
        liffId: activeTenant.lineLiffId || '',
      });
      setShowErasureConfirm(false);
      setErasureSuccess(true);
      setActionMessage('ข้อมูลส่วนบุคคลของคุณถูกลบและทำให้นิรนามเรียบร้อยแล้ว');
      localStorage.removeItem('liff_customer_contact');
      localStorage.removeItem(LINKED_PHONE_KEY);
    } catch (err: any) {
      setActionMessage('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (err?.message || 'โปรดลองใหม่'));
    } finally {
      setIsErasing(false);
    }
  };

  useEffect(() => {
    if (!activeTenant || !liffProfile.isLoggedIn || !liffProfile.lineUserId) {
      setIsStatsLoading(false);
      return;
    }

    let disposed = false;
    let refreshInFlight = false;
    let refreshPending = false;
    const cached = readCustomerProfileCache(
      activeTenant.id,
      liffProfile.lineUserId,
    );

    const applySummary = (summary: CustomerProfileSummary) => {
      if (disposed) return;
      setMembershipData(summary.membership as Membership);
      setBookingCount(summary.stats.totalBookings);
      setCompletedCount(summary.stats.completedVisits);
      writeCustomerProfileCache(
        activeTenant.id,
        liffProfile.lineUserId,
        summary,
      );
    };

    if (cached) {
      applySummary(cached);
      setIsStatsLoading(false);
    } else {
      setIsStatsLoading(true);
    }

    const refreshSummary = async () => {
      if (disposed) return;
      if (refreshInFlight) {
        refreshPending = true;
        return;
      }
      refreshInFlight = true;
      try {
        const token = liff.getIDToken();
        if (!token) return;
        const summary = await loadCustomerProfileSummary({
          tenantId: activeTenant.id,
          lineUserId: liffProfile.lineUserId,
          accessToken: token,
          phone: phoneInput,
        });
        applySummary(summary);
      } catch (error) {
        console.error('Failed to refresh customer profile summary:', error);
      } finally {
        refreshInFlight = false;
        if (!disposed) setIsStatsLoading(false);
        if (refreshPending && !disposed) {
          refreshPending = false;
          void refreshSummary();
        }
      }
    };

    void refreshSummary();

    if (phoneInput && getLinkedPhone() !== phoneInput) {
      const token = liff.getIDToken();
      if (token) {
        void linkCustomerPhone({
          tenantId: activeTenant.id,
          accessToken: token,
          phone: phoneInput,
        })
          .then((result) => {
            setLinkedPhone(phoneInput);
            if (result.merged) return refreshSummary();
          })
          .catch(console.error);
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshSummary();
    };
    const intervalId = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [
    activeTenant?.id,
    liffProfile.isLoggedIn,
    liffProfile.lineUserId,
  ]);

  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const displayName = liffProfile.displayName !== 'ลูกค้า LINE User'
    ? liffProfile.displayName
    : (currentUser?.displayName || currentUser?.name || 'คุณลูกค้า');

  const avatarUrl = liffProfile.pictureUrl || currentUser?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

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

    // The customer is self-attesting this phone number is theirs — safe point
    // to merge in any separate account (e.g. a walk-in check-in scanned
    // before they ever logged into LINE) that shares this phone, so their
    // real point/tier history shows up under their LINE-authenticated account.
    if (activeTenant && liffProfile.isLoggedIn && phoneInput) {
      try {
        const token = liff.getIDToken();
        if (token) {
          linkCustomerPhone({
            tenantId: activeTenant.id,
            accessToken: token,
            phone: phoneInput,
          })
            .then(() => {
              setLinkedPhone(phoneInput);
              if (!liffProfile.lineUserId) return;
              return loadCustomerProfileSummary({
                tenantId: activeTenant.id,
                lineUserId: liffProfile.lineUserId,
                accessToken: token,
                phone: phoneInput,
              }).then((summary) => {
                setMembershipData(summary.membership as Membership);
                setBookingCount(summary.stats.totalBookings);
                setCompletedCount(summary.stats.completedVisits);
                if (liffProfile.lineUserId) {
                  writeCustomerProfileCache(
                    activeTenant.id,
                    liffProfile.lineUserId,
                    summary,
                  );
                }
              });
            })
            .catch(console.error);
        }
      } catch (err) {
        console.error('Failed to link phone:', err);
      }
    }

    setIsEditingContact(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="p-4 space-y-5 pb-4 font-prompt">
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
          {isStatsLoading ? (
            <span className="block h-6 w-8 mx-auto rounded-md bg-slate-200 animate-pulse" />
          ) : (
            <span className="text-xl font-black text-slate-900">{bookingCount}</span>
          )}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-slate-500 block font-bold mb-1">ใช้บริการแล้ว</span>
          {isStatsLoading ? (
            <span className="block h-6 w-8 mx-auto rounded-md bg-slate-200 animate-pulse" />
          ) : (
            <span className="text-xl font-black text-emerald-600">{completedCount}</span>
          )}
        </div>

        <div
          className="bg-white border border-slate-200/80 rounded-2xl p-3.5 text-center relative overflow-hidden cursor-pointer active:scale-95 transition-transform shadow-sm"
          onClick={() => onNavigate?.('rewards')}
        >
          <span className="text-[11px] text-slate-500 block font-bold mb-1">คะแนนสะสม</span>
          {isStatsLoading ? (
            <span className="block h-6 w-10 mx-auto rounded-md bg-slate-200 animate-pulse" />
          ) : (
            <span className="text-xl font-black text-amber-500">{points.toLocaleString()} <span className="text-xs font-mono">P</span></span>
          )}
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
              {isStatsLoading ? (
                <span className="block h-4 w-24 rounded-md bg-slate-200 animate-pulse" />
              ) : (
                <span className="font-black text-amber-600 text-xs">{tierLabel}</span>
              )}
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

      {/* PDPA & Data Privacy Subject Rights */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs text-slate-800">ความเป็นส่วนตัวและสิทธิข้อมูลส่วนบุคคล (PDPA)</h4>
        </div>

        {actionMessage && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs p-2.5 rounded-xl font-medium">
            {actionMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl border border-slate-200 text-xs transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>ส่งออกข้อมูล (Export)</span>
          </button>

          <button
            onClick={() => setShowErasureConfirm(true)}
            disabled={isErasing || erasureSuccess}
            className="flex items-center justify-center gap-1.5 p-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-200 text-xs transition-colors disabled:opacity-50"
          >
            {isErasing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>ขอลบข้อมูล (Erasure)</span>
          </button>
        </div>

        <div className="flex justify-center gap-4 text-[11px] text-slate-400 font-semibold pt-1">
          <button
            onClick={() => setLegalModal('privacy')}
            className="hover:text-slate-600 underline"
          >
            นโยบายความเป็นส่วนตัว
          </button>
          <span>•</span>
          <button
            onClick={() => setLegalModal('terms')}
            className="hover:text-slate-600 underline"
          >
            ข้อกำหนดการใช้บริการ
          </button>
        </div>
      </div>

      {/* Erasure Confirmation Modal */}
      {showErasureConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-slideUp border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-black text-slate-800 text-base">ยืนยันการขอลบข้อมูลส่วนบุคคล?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ระบบจะทำการลบชื่อ เบอร์โทรศัพท์ และยกเลิกการผูกบัญชี LINE โดยทำให้ข้อมูลประวัติการจองเป็นข้อมูลนิรนามตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowErasureConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEraseData}
                disabled={isErasing}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                {isErasing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal Popup */}
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />

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
