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
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  CalendarX,
  Phone,
  ArrowRight,
  Eye,
  Check,
  Printer
} from 'lucide-react';
import { MerchantBookingDetailModal } from './MerchantBookingDetailModal';

export const MerchantCalendarView: React.FC = () => {
  const { activeTenant, bookings, staffs, setMerchantTab } = useSaaS();

  const todayStr = new Date().toISOString().split('T')[0];
  const [currentDate, setCurrentDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Month & Year state for Monthly View
  const todayDateObj = new Date();
  const [viewYear, setViewYear] = useState<number>(todayDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDateObj.getMonth()); // 0-11

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const dayNamesThaiShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // Time slots from 09:00 to 19:00 for Day View
  const timeSlots = Array.from({ length: 11 }).map((_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Controls for Month Navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setCurrentDate(now.toISOString().split('T')[0]);
  };

  // Controls for Day Navigation
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const formatDateThai = (dStr: string) => {
    const d = new Date(dStr);
    const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    return `${dayNames[d.getDay()]}ที่ ${d.getDate()} ${monthNamesThai[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  // Calculate days for the Monthly Grid
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Create array of date strings for the current month view
  const monthCalendarDays: (string | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    monthCalendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = (viewMonth + 1).toString().padStart(2, '0');
    const dStr = d.toString().padStart(2, '0');
    monthCalendarDays.push(`${viewYear}-${mStr}-${dStr}`);
  }

  // Filter tenant bookings
  const tenantBookings = activeTenant
    ? bookings.filter((b) => b.tenantId === activeTenant.id)
    : [];

  // Bookings for selected currentDate
  const selectedDayBookings = tenantBookings.filter(
    (b) => b.bookingDate === currentDate && b.status !== 'cancelled'
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs">
      
      {/* Calendar Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              ปฏิทินคิวงานนัดหมาย (Booking Calendar)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {viewMode === 'month'
                ? `เดือน${monthNamesThai[viewMonth]} พ.ศ. ${viewYear + 543}`
                : formatDateThai(currentDate)}
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 font-bold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-white text-emerald-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>รายเดือน</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-white text-emerald-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>รายวัน</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2 rounded-2xl border border-slate-200 flex items-center gap-1.5 transition-colors"
            title="พิมพ์ตารางคิวงานประจำวัน"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>พิมพ์ตารางคิว</span>
          </button>

          <button
            onClick={() => setMerchantTab('walkin')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มคิวใหม่</span>
          </button>
        </div>
      </div>

      {/* MONTHLY VIEW MODE */}
      {viewMode === 'month' && (
        <div className="space-y-6">
          {/* Monthly Grid Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-4 sm:p-6 space-y-4">
            
            {/* Month Switcher Controls */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 transition-colors"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm sm:text-base font-black text-slate-900 px-2">
                  {monthNamesThai[viewMonth]} {viewYear + 543}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 transition-colors"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleGoToToday}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 text-xs transition-colors"
              >
                เดือนนี้ / วันนี้
              </button>
            </div>

            {/* Calendar Days Header */}
            <div className="grid grid-cols-7 text-center font-bold text-slate-400 text-xs py-1 border-b border-slate-100">
              {dayNamesThaiShort.map((day, idx) => (
                <div key={day} className={idx === 0 || idx === 6 ? 'text-rose-400' : ''}>
                  {day}
                </div>
              ))}
            </div>

            {/* 7-Column Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthCalendarDays.map((dateStr, idx) => {
                if (!dateStr) {
                  return <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-slate-50/40" />;
                }

                const dayNum = parseInt(dateStr.split('-')[2], 10);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === currentDate;

                // Find bookings on this day
                const dayBks = tenantBookings.filter(
                  (b) => b.bookingDate === dateStr && b.status !== 'cancelled'
                );

                const confirmedCount = dayBks.filter(
                  (b) => b.status === 'confirmed' || b.status === 'completed'
                ).length;
                const checkedInCount = dayBks.filter((b) => b.status === 'checked_in').length;
                const pendingCount = dayBks.filter((b) => b.status === 'pending').length;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setCurrentDate(dateStr)}
                    className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-2xl border text-left transition-all flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : isToday
                        ? 'bg-white border-slate-900 ring-1 ring-slate-900 shadow-xs'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Date Number Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono ${
                          isToday
                            ? 'bg-slate-900 text-white shadow-xs'
                            : isSelected
                            ? 'bg-emerald-600 text-white font-extrabold'
                            : 'text-slate-800'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Total Bookings Count Badge */}
                      {dayBks.length > 0 && (
                        <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-md font-mono">
                          {dayBks.length} คิว
                        </span>
                      )}
                    </div>

                    {/* Booking Status Indicator Dots */}
                    {dayBks.length > 0 ? (
                      <div className="space-y-1">
                        {/* Status Dots Row */}
                        <div className="flex items-center gap-1">
                          {confirmedCount > 0 && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"
                              title={`ยืนยันแล้ว ${confirmedCount} รายการ`}
                            />
                          )}
                          {checkedInCount > 0 && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"
                              title={`เช็คอินแล้ว ${checkedInCount} รายการ`}
                            />
                          )}
                          {pendingCount > 0 && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"
                              title={`รอยืนยัน ${pendingCount} รายการ`}
                            />
                          )}
                        </div>

                        {/* First Booking Time Snippet */}
                        <p className="text-[9px] text-slate-500 font-bold truncate hidden sm:block">
                          {dayBks[0].startTime} {dayBks[0].userName}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300 font-medium hidden sm:block">
                        ไม่มีคิว
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>ยืนยันแล้ว / สำเร็จ</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>เช็คอินแล้ว</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>รอยืนยัน</span>
              </span>
            </div>
          </div>

          {/* APPOINTMENT LIST FOR SELECTED DATE BELOW CALENDAR */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>รายการนัดหมายประจำวันที่เลือก:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100 font-mono">
                    {formatDateThai(currentDate)}
                  </span>
                </h3>
              </div>

              <span className="text-xs font-bold text-slate-500">
                รวม {selectedDayBookings.length} รายการ
              </span>
            </div>

            {selectedDayBookings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <CalendarX className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600 text-xs">ไม่มีคิวงานนัดหมายในวันที่เลือก</p>
                <p className="text-[11px] text-slate-400">
                  คลิกปุ่ม "+ เพิ่มคิวใหม่" หากต้องการลงคิว Walk-in ให้ลูกค้า
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayBookings.map((bk) => (
                  <div
                    key={bk.id}
                    onClick={() => setSelectedBooking(bk)}
                    className="p-4 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group"
                  >
                    {/* Status accent bar */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        bk.status === 'confirmed' || bk.status === 'completed'
                          ? 'bg-emerald-500'
                          : bk.status === 'checked_in'
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                    />

                    <div className="space-y-1.5 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                          ⏰ {bk.startTime} - {bk.endTime}
                        </span>

                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                            bk.status === 'confirmed' || bk.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : bk.status === 'checked_in'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {bk.status === 'confirmed'
                            ? 'ยืนยันแล้ว'
                            : bk.status === 'completed'
                            ? 'เสร็จสิ้น'
                            : bk.status === 'checked_in'
                            ? 'เช็คอินแล้ว'
                            : 'รอยืนยัน'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 pt-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{bk.userName}</span>
                        {bk.userPhone && (
                          <span className="text-slate-400 text-xs font-normal font-mono">
                            ({bk.userPhone})
                          </span>
                        )}
                      </h4>

                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>บริการ: {bk.serviceName}</span>
                      </p>

                      {bk.staffName && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          ผู้ดูแล/ช่าง: <span className="font-bold text-slate-700">{bk.staffName}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between pl-2">
                      <span className="font-black text-sm text-emerald-700">
                        ฿{(bk.totalPrice || 0).toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(bk);
                        }}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>ดูรายละเอียด</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAY VIEW MODE (Grid View) */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day Date Navigation Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                title="วันก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                {formatDateThai(currentDate)}
              </span>

              <button
                onClick={handleNextDay}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                title="วันถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(todayStr)}
              className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 text-xs"
            >
              วันนี้
            </button>
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
                      const matchingBookings = selectedDayBookings.filter(
                        (b) =>
                          (b.staffId === staff.id || !b.staffId) &&
                          b.startTime <= timeStr &&
                          b.endTime > timeStr
                      );

                      return (
                        <div key={staff.id} className="p-1 min-h-[60px] relative">
                          {matchingBookings.map((bk) => (
                            <div
                              key={bk.id}
                              onClick={() => setSelectedBooking(bk)}
                              className={`p-2 rounded-xl text-xs cursor-pointer shadow-xs border transition-all hover:scale-[1.02] ${
                                bk.status === 'confirmed' || bk.status === 'completed'
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
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <MerchantBookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {/* PRINT-ONLY AREA (Visible only during window.print()) */}
      <div className="hidden print:block printable-area p-8 space-y-6 text-slate-900 font-sans">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-black">{activeTenant?.name}</h1>
            <p className="text-sm font-bold text-slate-600">
              ตารางคิวงานนัดหมายประจำวัน ({formatDateThai(currentDate)})
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">พิมพ์เมื่อ: {new Date().toLocaleTimeString('th-TH')} น.</p>
            <p className="text-slate-500">เบอร์โทร: {activeTenant?.phone || '08x-xxx-xxxx'}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-y-2 border-slate-900">
              <th className="p-2.5 text-left font-black">เวลา</th>
              <th className="p-2.5 text-left font-black">ชื่อลูกค้า</th>
              <th className="p-2.5 text-left font-black">เบอร์โทร</th>
              <th className="p-2.5 text-left font-black">บริการ</th>
              <th className="p-2.5 text-left font-black">ช่าง/ผู้ดูแล</th>
              <th className="p-2.5 text-right font-black">ราคา</th>
              <th className="p-2.5 text-center font-black">สถานะ</th>
              <th className="p-2.5 text-center font-black">ลายเซ็นช่าง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {selectedDayBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                  ไม่มีรายการนัดหมายในวันที่เลือก
                </td>
              </tr>
            ) : (
              selectedDayBookings.map((bk) => (
                <tr key={bk.id} className="border-b border-slate-200">
                  <td className="p-2.5 font-mono font-bold">{bk.startTime} - {bk.endTime}</td>
                  <td className="p-2.5 font-bold">{bk.userName}</td>
                  <td className="p-2.5 font-mono">{bk.userPhone || '-'}</td>
                  <td className="p-2.5">{bk.serviceName}</td>
                  <td className="p-2.5 font-medium">{bk.staffName || 'ไม่ระบุ'}</td>
                  <td className="p-2.5 text-right font-bold">฿{(bk.totalPrice || 0).toLocaleString()}</td>
                  <td className="p-2.5 text-center font-bold">
                    {bk.status === 'confirmed' || bk.status === 'completed'
                      ? 'ยืนยันแล้ว'
                      : bk.status === 'checked_in'
                      ? 'เช็คอินแล้ว'
                      : 'รอยืนยัน'}
                  </td>
                  <td className="p-2.5 border-l border-slate-200"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="pt-8 flex justify-between text-xs text-slate-500 font-medium border-t border-slate-200">
          <p>รวมคิวงานทั้งหมด: {selectedDayBookings.length} รายการ</p>
          <p>พิมพ์จากระบบ LINE OA Booking SaaS</p>
        </div>
      </div>

    </div>
  );
};
