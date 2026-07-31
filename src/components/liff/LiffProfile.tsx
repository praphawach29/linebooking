import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { User, Phone, Mail, Award, ShieldCheck, Heart, LogOut } from 'lucide-react';

export const LiffProfile: React.FC = () => {
  const { currentUser, activeTenant, bookings } = useSaaS();

  const userBookings = bookings.filter((b) => b.userId === currentUser.id);
  const completedCount = userBookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="p-4 space-y-4">
      {/* User Header Profile Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-3">
        <div className="relative inline-block">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.displayName}
            className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 mx-auto shadow-md"
          />
          <span className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>

        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            {currentUser.displayName}
          </h2>
          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
            LINE Login User
          </p>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 inline-block text-[11px] font-mono text-slate-500">
          User ID: {currentUser.lineUserId?.slice(0, 12)}...
        </div>
      </div>

      {/* Member Statistics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">การจองทั้งหมด</span>
          <span className="text-base font-extrabold text-slate-900">{userBookings.length}</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">ใช้บริการแล้ว</span>
          <span className="text-base font-extrabold text-emerald-600">{completedCount}</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">คะแนนสะสม</span>
          <span className="text-base font-extrabold text-amber-500">250 P</span>
        </div>
      </div>

      {/* Contact Info Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
          ข้อมูลส่วนตัว
        </h3>

        <div className="space-y-2.5 text-slate-700">
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">เบอร์โทรศัพท์</span>
              <span className="font-bold font-mono text-slate-900">{currentUser.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">อีเมล</span>
              <span className="font-bold text-slate-900">{currentUser.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">ระดับสมาชิก</span>
              <span className="font-bold text-slate-900">VIP Gold Member ({activeTenant.name})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout simulation */}
      <button
        onClick={() => alert('จำลองการออกจากระบบ LINE Login')}
        className="w-full bg-white hover:bg-slate-50 text-red-600 font-bold py-3 px-4 rounded-2xl border border-red-200 shadow-xs flex items-center justify-center gap-2 text-xs transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>ออกจากระบบ LIFF</span>
      </button>
    </div>
  );
};
