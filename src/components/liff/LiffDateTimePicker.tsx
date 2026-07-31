import React, { useState } from 'react';
import { Service, Staff, SelectedAddon } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  Sun,
  Sunset,
  Moon,
  Grid,
  ListFilter,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface LiffDateTimePickerProps {
  service: Service;
  staff: Staff | null;
  selectedDate: string;
  selectedTime: string;
  selectedAddons?: SelectedAddon[];
  onSelectSlot: (date: string, time: string) => void;
}

export const LiffDateTimePicker: React.FC<LiffDateTimePickerProps> = ({
  service,
  staff,
  selectedDate: initialDate,
  selectedTime: initialTime,
  selectedAddons = [],
  onSelectSlot,
}) => {
  const { getAvailableSlots } = useSaaS();

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const addonsExtraDuration = selectedAddons.reduce((sum, a) => sum + (a.extraDurationMinutes || 0), 0);
  const totalPrice = (service.price ?? 0) + addonsTotal;
  const totalDurationMinutes = service.durationMinutes + addonsExtraDuration;

  const [viewType, setViewType] = useState<'month' | 'strip'>('strip');
  const [activeDate, setActiveDate] = useState<string>(initialDate);
  const [activeTime, setActiveTime] = useState<string>(initialTime);

  // Month navigation state for month grid view
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตูลากร', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const shortMonthNamesThai = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const dayNamesThai = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // Generate 14-day date strip
  const dateStrip = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return {
      dateStr,
      dayName: dayNamesThai[d.getDay()],
      dayNumber: d.getDate(),
      monthName: shortMonthNamesThai[d.getMonth()],
      yearBE: d.getFullYear() + 543,
      fullThai: `${d.getDate()} ${monthNamesThai[d.getMonth()]} ${d.getFullYear() + 543}`,
    };
  });

  // Calendar matrix generator for month view
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const { firstDay, totalDays } = getDaysInMonth(calendarYear, calendarMonth);

  // Available slots for selected date
  const slots = getAvailableSlots(activeDate, service.id, staff?.id);

  // Time groupings
  const morningSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour < 12;
  });

  const afternoonSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour >= 12 && hour < 17;
  });

  const eveningSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour >= 17;
  });

  // Active date thai display
  const activeDateObj = new Date(activeDate);
  const activeDateThai = `${activeDateObj.getDate()} ${
    monthNamesThai[activeDateObj.getMonth()]
  } ${activeDateObj.getFullYear() + 543}`;

  const availableCount = slots.filter((s) => s.isAvailable).length;

  return (
    <div className="p-4 space-y-4 font-sans text-slate-800">
      {/* Service & Staff Info Header Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs opacity-90 border-b border-white/20 pb-2">
          <span className="font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            เลือกรอบเวลาการจอง
          </span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
            {totalDurationMinutes} นาที
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2 className="font-extrabold text-base leading-tight truncate max-w-[220px]">
              {service.name}
            </h2>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              ผู้ให้บริการ: {staff ? staff.name : 'ช่างคนใดก็ได้ (จัดสรรให้อัตโนมัติ)'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs opacity-80 block">
              {selectedAddons.length > 0 ? 'ราคารวม' : 'ค่าบริการ'}
            </span>
            <span className="text-lg font-black text-amber-300">
              ฿{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar View Toggle Header */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-emerald-600" />
          เลือกวันที่ต้องการเข้าใช้บริการ
        </h3>
        <div className="bg-slate-200/80 p-0.5 rounded-xl flex gap-1 text-[11px] font-bold">
          <button
            onClick={() => setViewType('strip')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
              viewType === 'strip'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3 h-3" />
            รายวัน
          </button>
          <button
            onClick={() => setViewType('month')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
              viewType === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3 h-3" />
            ปฏิทิน
          </button>
        </div>
      </div>

      {/* View 1: Scrollable Date Strip View */}
      {viewType === 'strip' && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x">
            {dateStrip.map((item) => {
              const isSelected = item.dateStr === activeDate;
              return (
                <button
                  key={item.dateStr}
                  onClick={() => {
                    setActiveDate(item.dateStr);
                    setActiveTime(''); // Reset time when date changes
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 py-2.5 rounded-2xl border transition-all snap-start ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold ${
                      isSelected ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {item.dayName}
                  </span>
                  <span className="text-base font-extrabold my-0.5">
                    {item.dayNumber}
                  </span>
                  <span className="text-[9px] opacity-80">{item.monthName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Full Interactive Month Calendar Grid View */}
      {viewType === 'month' && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900">
              {monthNamesThai[calendarMonth]} {calendarYear + 543}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-2">
            {dayNamesThai.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Day Cells Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty offset cells */}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const monthStr = (calendarMonth + 1).toString().padStart(2, '0');
              const dayStr = dayNum.toString().padStart(2, '0');
              const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;

              const isSelected = activeDate === dateKey;
              const isToday =
                today.getFullYear() === calendarYear &&
                today.getMonth() === calendarMonth &&
                today.getDate() === dayNum;

              // Check if date is past
              const cellDate = new Date(calendarYear, calendarMonth, dayNum);
              const isPast =
                cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <button
                  key={dateKey}
                  disabled={isPast}
                  onClick={() => {
                    setActiveDate(dateKey);
                    setActiveTime('');
                  }}
                  className={`h-9 w-full rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all ${
                    isPast
                      ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                      : isSelected
                      ? 'bg-emerald-600 text-white font-extrabold shadow-sm ring-2 ring-emerald-500/20'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isSelected && (
                    <span className="w-1 h-1 rounded-full bg-amber-300 -mt-0.5"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Summary Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-900">วันที่เลือก: {activeDateThai}</p>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
              มีรอบเวลาว่าง {availableCount} ช่วงเวลา
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-xl">
          เปิดให้บริการ
        </span>
      </div>

      {/* Time Slots Selection Area */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            เลือกรอบเวลาที่สะดวก (Time Slots)
          </h3>
          {slots.length > 0 && (
            <span className="text-[10px] text-slate-500 font-medium">
              คลิกเพื่อเลือกเวลา
            </span>
          )}
        </div>

        {slots.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2 py-8">
            <XCircle className="w-8 h-8 text-rose-400 mx-auto opacity-80" />
            <p className="text-xs text-slate-700 font-bold">
              ไม่มีรอบเวลาบริการว่างในวันที่เลือก
            </p>
            <p className="text-[11px] text-slate-400">
              ร้านปิดบริการหรือคิวเต็มแล้ว กรุณาเลือกวันอื่นในปฏิทิน
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Morning Period */}
            {morningSlots.length > 0 && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-bold">
                  <Sun className="w-3.5 h-3.5" />
                  <span>ช่วงเช้า (09:00 - 12:00 น.)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {morningSlots.map((slot) => {
                    const isSelected = activeTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        disabled={!slot.isAvailable}
                        onClick={() => setActiveTime(slot.startTime)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          !slot.isAvailable
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{slot.startTime} น.</span>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span
                          className={`text-[9px] font-semibold ${
                            !slot.isAvailable
                              ? 'text-slate-300'
                              : isSelected
                              ? 'text-emerald-100'
                              : 'text-emerald-600'
                          }`}
                        >
                          {slot.isAvailable ? 'ว่าง' : 'เต็มแล้ว'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Afternoon Period */}
            {afternoonSlots.length > 0 && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-bold">
                  <Sunset className="w-3.5 h-3.5" />
                  <span>ช่วงบ่าย (12:00 - 17:00 น.)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {afternoonSlots.map((slot) => {
                    const isSelected = activeTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        disabled={!slot.isAvailable}
                        onClick={() => setActiveTime(slot.startTime)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          !slot.isAvailable
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{slot.startTime} น.</span>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span
                          className={`text-[9px] font-semibold ${
                            !slot.isAvailable
                              ? 'text-slate-300'
                              : isSelected
                              ? 'text-emerald-100'
                              : 'text-emerald-600'
                          }`}
                        >
                          {slot.isAvailable ? 'ว่าง' : 'เต็มแล้ว'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evening Period */}
            {eveningSlots.length > 0 && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-600 text-[11px] font-bold">
                  <Moon className="w-3.5 h-3.5" />
                  <span>ช่วงเย็น/ค่ำ (17:00 - 20:00 น.)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {eveningSlots.map((slot) => {
                    const isSelected = activeTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        disabled={!slot.isAvailable}
                        onClick={() => setActiveTime(slot.startTime)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          !slot.isAvailable
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{slot.startTime} น.</span>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span
                          className={`text-[9px] font-semibold ${
                            !slot.isAvailable
                              ? 'text-slate-300'
                              : isSelected
                              ? 'text-emerald-100'
                              : 'text-emerald-600'
                          }`}
                        >
                          {slot.isAvailable ? 'ว่าง' : 'เต็มแล้ว'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Sticky/Bottom Action Button */}
      <div className="pt-2 sticky bottom-2">
        <button
          disabled={!activeTime}
          onClick={() => onSelectSlot(activeDate, activeTime)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all text-sm disabled:cursor-not-allowed disabled:shadow-none"
        >
          <span>
            {activeTime
              ? `ยืนยันรอบเวลา ${activeTime} น.`
              : 'กรุณาเลือกรอบเวลาที่ต้องการ'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

