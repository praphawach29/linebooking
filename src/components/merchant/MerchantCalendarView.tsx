import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Booking } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Clock,
  User,
  Filter,
} from 'lucide-react';
import { MerchantBookingDetailModal } from './MerchantBookingDetailModal';

export const MerchantCalendarView: React.FC = () => {
  const { activeTenant, bookings, staffs, setMerchantTab } = useSaaS();

  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [viewType, setViewType] = useState<'day' | 'week'>('day');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Time slots from 09:00 to 19:00
  const timeSlots = Array.from({ length: 11 }).map((_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const handlePrevDate = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const formatDateThai = (dStr: string) => {
    const d = new Date(dStr);
    const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const monthNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${dayNames[d.getDay()]}ที่ ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  // Filter bookings for current date
  const dayBookings = bookings.filter(
    (b) => b.tenantId === activeTenant.id && b.bookingDate === currentDate
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Calendar Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900">
              ตารางการจองประจำวัน (Daily Schedule)
            </h1>
            <p className="text-xs text-slate-500">{formatDateThai(currentDate)}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={handlePrevDate}
              className="p-1.5 hover:bg-white rounded-xl text-slate-700 transition-colors"
              title="วันก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1 text-xs font-bold text-slate-800 hover:bg-white rounded-xl transition-colors"
            >
              วันนี้
            </button>
            <button
              onClick={handleNextDate}
              className="p-1.5 hover:bg-white rounded-xl text-slate-700 transition-colors"
              title="วันถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setMerchantTab('walkin')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มคิวใหม่</span>
          </button>
        </div>
      </div>

      {/* Staff Columns Grid View (Day View) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header: Staff Columns */}
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 sticky top-0 z-10">
          <div className="col-span-2 p-3 border-r border-slate-200 flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>เวลา</span>
          </div>

          <div className="col-span-10 grid grid-cols-3 divide-x divide-slate-200">
            {staffs.length === 0 ? (
              <div className="p-3 text-slate-400 font-medium">ไม่พบข้อมูลช่าง</div>
            ) : (
              staffs.slice(0, 3).map((staff) => (
                <div key={staff.id} className="p-3 flex items-center gap-2">
                  <img
                    src={staff.avatarUrl}
                    alt={staff.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300"
                  />
                  <div className="truncate">
                    <p className="truncate text-slate-900 font-bold">{staff.name}</p>
                    <span className="text-[10px] text-slate-400">ช่างประจำ</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Time Grid Rows */}
        <div className="divide-y divide-slate-100">
          {timeSlots.map((timeStr) => (
            <div key={timeStr} className="grid grid-cols-12 min-h-[70px]">
              
              {/* Left Time Label */}
              <div className="col-span-2 p-3 border-r border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 font-mono flex items-start">
                {timeStr}
              </div>

              {/* Staff Grid Slots */}
              <div className="col-span-10 grid grid-cols-3 divide-x divide-slate-100 p-1">
                {staffs.slice(0, 3).map((staff) => {
                  // Find bookings matching this staff and time slot
                  const matchingBookings = dayBookings.filter(
                    (b) =>
                      (b.staffId === staff.id || !b.staffId) &&
                      b.startTime <= timeStr &&
                      b.endTime > timeStr &&
                      b.status !== 'cancelled'
                  );

                  return (
                    <div key={staff.id} className="p-1 min-h-[60px] relative">
                      {matchingBookings.map((bk) => (
                        <div
                          key={bk.id}
                          onClick={() => setSelectedBooking(bk)}
                          className={`p-2 rounded-xl text-xs cursor-pointer shadow-xs border transition-all hover:scale-[1.02] ${
                            bk.status === 'confirmed'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : bk.status === 'checked_in'
                              ? 'bg-blue-50 border-blue-300 text-blue-950'
                              : 'bg-amber-50 border-amber-300 text-amber-950'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="truncate">{bk.userName}</span>
                            <span className="text-[10px] font-mono opacity-80">
                              {bk.startTime}-{bk.endTime}
                            </span>
                          </div>
                          <p className="text-[10px] opacity-90 truncate mt-0.5 font-medium">
                            {bk.serviceName}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <MerchantBookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

    </div>
  );
};
