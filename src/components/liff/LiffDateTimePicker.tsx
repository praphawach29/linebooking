import React, { useEffect, useState } from 'react';
import { Service, Staff, SelectedAddon, Court } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { getTenantTerminology } from '../../lib/tenant-terminology';
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
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { SkeletonCard } from '../common/SkeletonCard';

import { calculateServicePrice } from '../../lib/pricing-calculator';

interface LiffDateTimePickerProps {
  service: Service;
  staff: Staff | null;
  court?: Court | null;
  selectedDate: string;
  selectedTime: string;
  selectedAddons?: SelectedAddon[];
  onSelectSlot: (date: string, time: string) => void;
}

export const LiffDateTimePicker: React.FC<LiffDateTimePickerProps> = ({
  service,
  staff,
  court,
  selectedDate: initialDate,
  selectedTime: initialTime,
  selectedAddons = [],
  onSelectSlot,
}) => {
  const { getAvailableSlots, activeTenant } = useSaaS();
  const terms = getTenantTerminology(activeTenant);

  const [bookingHours, setBookingHours] = useState<number>(1);
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const addonsExtraDuration = selectedAddons.reduce((sum, a) => sum + (a.extraDurationMinutes || 0), 0);
  
  const [activeDate, setActiveDate] = useState<string>(initialDate);
  const [activeTime, setActiveTime] = useState<string>(initialTime);

  const calculated = calculateServicePrice(service, activeTime, activeDate);
  const currentServicePrice = (calculated.finalPrice || service.price || 1200) * bookingHours;
  const totalPrice = currentServicePrice + addonsTotal;
  const totalDurationMinutes = (service.durationMinutes * bookingHours) + addonsExtraDuration;

  const [viewType, setViewType] = useState<'month' | 'strip'>('strip');
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof getAvailableSlots>>>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Month navigation state for month grid view
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
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

  useEffect(() => {
    let cancelled = false;
    setIsSlotsLoading(true);
    setSlotsError(null);

    getAvailableSlots(activeDate, service.id, staff?.id, court?.id)
      .then((nextSlots) => {
        if (!cancelled) setSlots(nextSlots);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSlots([]);
          setSlotsError(
            error instanceof Error ? error.message : 'Unable to load available slots',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeDate, service.id, staff?.id]);

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

  const checkSlotAvailableForHours = (startTimeStr: string, hrs: number) => {
    const startHour = parseInt(startTimeStr.split(':')[0], 10);
    for (let i = 0; i < hrs; i++) {
      const checkH = startHour + i;
      const checkHStr = checkH < 10 ? `0${checkH}:00` : `${checkH}:00`;
      const targetSlot = slots.find((s) => s.startTime === checkHStr);
      if (!targetSlot || !targetSlot.isAvailable) return false;
    }
    return true;
  };

  const getSlotDisplayLabel = (startTimeStr: string, hrs: number) => {
    if (hrs === 1) return startTimeStr;
    const startHour = parseInt(startTimeStr.split(':')[0], 10);
    const endHour = startHour + hrs;
    const endHourStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
    return `${startTimeStr} - ${endHourStr}`;
  };

  const renderSlotButton = (slot: { startTime: string; isAvailable: boolean }) => {
    const isAvailableForSelectedHours = checkSlotAvailableForHours(slot.startTime, bookingHours);
    const displayLabel = getSlotDisplayLabel(slot.startTime, bookingHours);
    const isSelected = activeTime === slot.startTime || activeTime === displayLabel;
    const isMultiHour = bookingHours > 1;

    return (
      <button
        key={slot.startTime}
        disabled={!isAvailableForSelectedHours}
        onClick={() => {
          if (bookingHours === 1) {
            setActiveTime(slot.startTime);
          } else {
            setActiveTime(displayLabel);
          }
        }}
        className={`rounded-2xl border font-bold transition-all duration-200 flex items-center justify-between gap-2 ${
          isMultiHour ? 'py-2.5 px-4' : 'py-2.5 px-1.5 flex-col justify-center'
        } ${
          !isAvailableForSelectedHours
            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
            : isSelected
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.03]'
            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50/50'
        }`}
      >
        <span className={`font-extrabold ${isMultiHour ? 'text-[12px]' : 'text-[12px]'}`}>{displayLabel}</span>
        <span
          className={`text-[9.5px] font-black shrink-0 ${
            !isAvailableForSelectedHours
              ? 'text-slate-300'
              : isSelected
              ? 'text-white/90'
              : 'text-emerald-600'
          }`}
        >
          {isAvailableForSelectedHours ? 'ว่าง' : 'เต็ม'}
        </span>
      </button>
    );
  };

  // Active date thai display
  const activeDateObj = new Date(activeDate);
  const activeDateThai = `${activeDateObj.getDate()} ${
    monthNamesThai[activeDateObj.getMonth()]
  } ${activeDateObj.getFullYear() + 543}`;

  const availableCount = slots.filter((s) => s.isAvailable).length;

  if (isSlotsLoading) {
    return (
      <div className="p-4 space-y-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
        </div>
        {[1, 2, 3].map((n) => (
          <SkeletonCard key={n} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Service & Staff Info Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-[22px] shadow-premium space-y-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
        <div className="flex items-center justify-between text-xs opacity-90 border-b border-white/10 pb-2 relative z-10">
          <span className="font-extrabold flex items-center gap-1 text-primary-light text-[11px]">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>เลือกรอบเวลา ({bookingHours} ชม.)</span>
          </span>
          <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-black text-[11px] shadow-sm shrink-0">
            {totalDurationMinutes} นาที
          </span>
        </div>
        <div className="flex items-center justify-between pt-0.5 relative z-10">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="font-black text-[14px] leading-tight truncate">
              {service.name}
            </h2>
            <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
              {terms.selectedResourceLabel}: <span className="font-bold text-white">{staff ? staff.name : terms.autoAssignedText}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block font-bold">
              {selectedAddons.length > 0 ? 'ราคารวม' : `฿/ชม.`}
            </span>
            <span className="text-lg font-black text-emerald-400">
              <span className="text-xs mr-0.5">฿</span>{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Duration Selector Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-black text-slate-900 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            {terms.durationLabel}
          </span>
          <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-xl border border-emerald-200">
            {bookingHours} ชม.
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {[1, 2, 3, 4].map((hrs) => {
            const isSelected = bookingHours === hrs;
            return (
              <button
                key={hrs}
                onClick={() => {
                  setBookingHours(hrs);
                  setActiveTime(''); // Reset selected time when duration changes
                }}
                className={`py-2.5 px-2 rounded-2xl text-xs font-black transition-all flex flex-col items-center gap-0.5 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.03]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{hrs} ชม.</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/90 font-extrabold' : 'text-slate-400 font-medium'}`}>
                  ฿{(service.price * hrs).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar View Toggle Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-black text-foreground flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-primary" />
          เลือกวันที่
        </h3>
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-[11px] font-black shadow-inner">
          <button
            onClick={() => setViewType('strip')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${
              viewType === 'strip'
                ? 'bg-white text-primary shadow-sm scale-[1.02]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            รายวัน
          </button>
          <button
            onClick={() => setViewType('month')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${
              viewType === 'month'
                ? 'bg-white text-primary shadow-sm scale-[1.02]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            ปฏิทิน
          </button>
        </div>
      </div>

      {/* View 1: Scrollable Date Strip View */}
      {viewType === 'strip' && (
        <div className="space-y-2">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
            {dateStrip.map((item) => {
              const isSelected = item.dateStr === activeDate;
              return (
                <button
                  key={item.dateStr}
                  onClick={() => {
                    setActiveDate(item.dateStr);
                    setActiveTime(''); // Reset time when date changes
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 py-3 rounded-2xl border transition-all duration-300 snap-start ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-[0_4px_12px_rgba(79,70,229,0.3)] ring-2 ring-primary/20 scale-[1.05]'
                      : 'bg-white text-slate-700 border-border hover:border-primary/30 shadow-sm'
                  }`}
                >
                  <span
                    className={`text-[11px] font-black ${
                      isSelected ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {item.dayName}
                  </span>
                  <span className="text-xl font-black my-0.5">
                    {item.dayNumber}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    isSelected ? 'text-white' : 'text-slate-500'
                  }`}>{item.monthName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Full Interactive Month Calendar Grid View */}
      {viewType === 'month' && (
        <div className="premium-card p-4 space-y-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[13px] font-black text-foreground">
              {monthNamesThai[calendarMonth]} {calendarYear + 543}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[11px] font-black text-slate-400 border-b border-border/50 pb-2">
            {dayNamesThai.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Day Cells Matrix */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[13px]">
            {/* Empty offset cells */}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-10" />
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
                  className={`h-10 w-full rounded-xl flex flex-col items-center justify-center font-bold text-[13px] transition-all duration-300 ${
                    isPast
                      ? 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                      : isSelected
                      ? 'bg-primary text-white font-black shadow-md shadow-primary/30 ring-2 ring-primary/20 scale-110'
                      : isToday
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-slate-100 text-slate-700 hover:scale-105'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white -mt-1 shadow-sm"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Summary Banner */}
      <div className="bg-primary/5 border border-primary/20 p-3 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-black text-[13px] text-foreground">วันที่เลือก: {activeDateThai}</p>
            <p className="text-[11px] text-slate-500 font-bold mt-0.5">
              มีรอบเวลาว่าง <span className="text-primary">{availableCount} ช่วงเวลา</span>
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black bg-success/10 text-success border border-success/20 px-2.5 py-1.5 rounded-xl">
          เปิดให้บริการ
        </span>
      </div>

      {/* Time Slots Selection Area */}
      <div className="space-y-4 pt-2">
        {slotsError && (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {slotsError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-black text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            เลือกรอบเวลาที่สะดวก
          </h3>
          {slots.length > 0 && (
            <span className="text-[11px] text-slate-500 font-medium">
              คลิกเพื่อเลือกเวลา
            </span>
          )}
        </div>

        {slots.length === 0 ? (
          <div className="premium-card text-center space-y-2 py-10 px-6">
            <XCircle className="w-10 h-10 text-danger/80 mx-auto mb-2" />
            <p className="text-[13px] text-slate-800 font-black">
              ไม่มีรอบเวลาบริการว่างในวันที่เลือก
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              ร้านอาจปิดบริการหรือคิวเต็มแล้ว กรุณาเลือกวันอื่นในปฏิทิน
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Morning Period */}
            {morningSlots.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-black bg-amber-50 w-fit px-3 py-1 rounded-xl border border-amber-200/60">
                  <Sun className="w-3.5 h-3.5" />
                  <span>ช่วงเช้า (08:00 - 12:00 น.)</span>
                </div>
                <div className={`grid gap-2 ${bookingHours > 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {morningSlots.map((slot) => renderSlotButton(slot))}
                </div>
              </div>
            )}

            {/* Afternoon Period */}
            {afternoonSlots.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-black bg-orange-50 w-fit px-3 py-1 rounded-xl border border-orange-200/60">
                  <Sunset className="w-3.5 h-3.5" />
                  <span>ช่วงบ่าย (12:00 - 17:00 น.)</span>
                </div>
                <div className={`grid gap-2 ${bookingHours > 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {afternoonSlots.map((slot) => renderSlotButton(slot))}
                </div>
              </div>
            )}

            {/* Evening Period */}
            {eveningSlots.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-600 text-[11px] font-black bg-indigo-50 w-fit px-3 py-1 rounded-xl border border-indigo-200/60">
                  <Moon className="w-3.5 h-3.5" />
                  <span>ช่วงเย็น/ค่ำ (17:00 - 23:00 น.)</span>
                </div>
                <div className={`grid gap-2 ${bookingHours > 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {eveningSlots.map((slot) => renderSlotButton(slot))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-[64px] left-0 right-0 bg-white/96 backdrop-blur-md rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] border border-slate-200 z-30 p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">รอบเวลาที่เลือก</p>
            <p className="text-[13px] font-black text-slate-900 leading-tight">
              {activeTime ? `${activeDateThai}, ${activeTime} น.` : 'แตะเลือกเวลา'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">รวมทั้งหมด</p>
            <p className="text-[14px] font-black text-emerald-600">฿{totalPrice.toLocaleString()}</p>
          </div>
        </div>
        <button
          disabled={!activeTime}
          onClick={() => onSelectSlot(activeDate, activeTime)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-6 rounded-2xl text-[14px] shadow-lg shadow-emerald-600/20 flex items-center justify-between group disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-500 transition-all"
        >
          <span>
            {activeTime
              ? `ยืนยันรอบเวลา ${activeTime} น.`
              : 'กรุณาเลือกรอบเวลาที่ต้องการ'}
          </span>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${activeTime ? 'bg-white/20 group-hover:translate-x-1' : 'bg-transparent'}`}>
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};
