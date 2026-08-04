import React, { useEffect, useState, useCallback } from 'react';
import { Service, Staff, SelectedAddon, Court } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { getTenantTerminology } from '../../lib/tenant-terminology';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  ChevronLeft,
  Sun,
  Sunset,
  Moon,
  Grid,
  ListFilter,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
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
  onSelectSlot: (date: string, time: string, hours: number) => void;
}

// Converts "HH:MM" string to integer hour number
const toHour = (timeStr: string) => parseInt(timeStr.split(':')[0], 10);
// Formats integer hour back to "HH:00" string
const toTimeStr = (hour: number) => `${hour < 10 ? '0' : ''}${hour}:00`;

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

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const addonsExtraDuration = selectedAddons.reduce((sum, a) => sum + (a.extraDurationMinutes || 0), 0);

  const [activeDate, setActiveDate] = useState<string>(initialDate);

  // Tap-to-Range state: start slot hour, end slot hour (both null = nothing selected)
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  const [viewType, setViewType] = useState<'month' | 'strip'>('strip');
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof getAvailableSlots>>>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

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

  // Derived selection values
  const selectedHours = rangeStart !== null && rangeEnd !== null
    ? Math.abs(rangeEnd - rangeStart) + 1
    : rangeStart !== null ? 1 : 0;

  const selectedStartHour = rangeStart !== null && rangeEnd !== null
    ? Math.min(rangeStart, rangeEnd)
    : rangeStart;

  const selectedEndHour = rangeStart !== null && rangeEnd !== null
    ? Math.max(rangeStart, rangeEnd) + 1  // end time is exclusive (end of last slot)
    : rangeStart !== null ? rangeStart + 1 : null;

  const activeTimeDisplay = selectedStartHour !== null && selectedEndHour !== null
    ? selectedHours === 1
      ? `${toTimeStr(selectedStartHour)}`
      : `${toTimeStr(selectedStartHour)} - ${toTimeStr(selectedEndHour)}`
    : '';

  // Price calculation (including court extra price/discount per hour)
  const courtExtraPrice = court?.extraPricePerHour || 0;
  const calculated = calculateServicePrice(service, activeTimeDisplay, activeDate);
  const basePricePerHour = (calculated.finalPrice || service.price || 1200) + courtExtraPrice;
  const pricePerHour = Math.max(0, basePricePerHour);
  const totalServicePrice = pricePerHour * (selectedHours || 1);
  const totalPrice = (selectedHours > 0 ? totalServicePrice : pricePerHour) + addonsTotal;
  const totalDurationMinutes = (service.durationMinutes * (selectedHours || 1)) + addonsExtraDuration;

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
      fullThai: `${d.getDate()} ${monthNamesThai[d.getMonth()]} ${d.getFullYear() + 543}`,
    };
  });

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
    else setCalendarMonth(calendarMonth - 1);
  };
  const handleNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
    else setCalendarMonth(calendarMonth + 1);
  };

  const { firstDay, totalDays } = getDaysInMonth(calendarYear, calendarMonth);

  // Load slots when date/service/staff changes
  useEffect(() => {
    let cancelled = false;
    setIsSlotsLoading(true);
    setSlotsError(null);
    setRangeStart(null);
    setRangeEnd(null);
    setSelectionError(null);

    getAvailableSlots(activeDate, service.id, staff?.id, court?.id)
      .then((nextSlots) => { if (!cancelled) setSlots(nextSlots); })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSlots([]);
          setSlotsError(error instanceof Error ? error.message : 'ไม่สามารถโหลดรอบเวลาได้');
        }
      })
      .finally(() => { if (!cancelled) setIsSlotsLoading(false); });

    return () => { cancelled = true; };
  }, [activeDate, service.id, staff?.id]);

  // --- Tap-to-Range Logic ---
  // Returns true if all slots from hourA to hourB (inclusive, ordered) are available
  const isRangeAllAvailable = useCallback((hourA: number, hourB: number): boolean => {
    const lo = Math.min(hourA, hourB);
    const hi = Math.max(hourA, hourB);
    for (let h = lo; h <= hi; h++) {
      const slot = slots.find(s => toHour(s.startTime) === h);
      if (!slot || !slot.isAvailable) return false;
    }
    return true;
  }, [slots]);

  const handleSlotTap = useCallback((hour: number, isAvailable: boolean) => {
    if (!isAvailable) return;
    setSelectionError(null);

    // Nothing selected → set start
    if (rangeStart === null) {
      setRangeStart(hour);
      setRangeEnd(null);
      return;
    }

    // Tap same slot as start → deselect
    if (hour === rangeStart && rangeEnd === null) {
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    // We have a range → tapping any slot resets and sets new start
    if (rangeEnd !== null) {
      setRangeStart(hour);
      setRangeEnd(null);
      return;
    }

    // We have only a start → try to set end
    const lo = Math.min(rangeStart, hour);
    const hi = Math.max(rangeStart, hour);

    if (!isRangeAllAvailable(lo, hi)) {
      setSelectionError(`มีสล็อตที่ไม่ว่างในช่วง ${toTimeStr(lo)} - ${toTimeStr(hi + 1)} น. กรุณาเลือกเฉพาะช่วงที่ว่างต่อเนื่องกัน`);
      // Keep the start, let user pick a different end
      return;
    }

    setRangeEnd(hour);
  }, [rangeStart, rangeEnd, isRangeAllAvailable]);

  const handleClearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setSelectionError(null);
  };

  // Determine slot visual state for each slot button
  const getSlotState = (hour: number, isAvailable: boolean) => {
    if (!isAvailable) return 'unavailable';
    if (rangeStart === null) return 'idle';

    const lo = rangeStart !== null && rangeEnd !== null ? Math.min(rangeStart, rangeEnd) : rangeStart;
    const hi = rangeStart !== null && rangeEnd !== null ? Math.max(rangeStart, rangeEnd) : rangeStart;

    if (hour < lo || hour > hi) {
      // Hoverable if we only have a start (not yet a range)
      return 'idle';
    }
    if (hour === lo && lo === hi) return 'solo'; // single selected
    if (hour === lo) return 'range-start';
    if (hour === hi) return 'range-end';
    return 'range-mid';
  };

  // Time groupings
  const morningSlots = slots.filter(s => toHour(s.startTime) < 12);
  const afternoonSlots = slots.filter(s => { const h = toHour(s.startTime); return h >= 12 && h < 17; });
  const eveningSlots = slots.filter(s => toHour(s.startTime) >= 17);
  const availableCount = slots.filter(s => s.isAvailable).length;

  const getPeriodRangeText = (periodSlots: typeof slots) => {
    if (periodSlots.length === 0) return '';
    const firstStart = periodSlots[0].startTime;
    const lastSlotHour = toHour(periodSlots[periodSlots.length - 1].startTime);
    const lastEnd = toTimeStr(lastSlotHour + 1);
    return `(${firstStart} - ${lastEnd} น.)`;
  };

  const renderSlotButton = (slot: { startTime: string; isAvailable: boolean }) => {
    const hour = toHour(slot.startTime);
    const state = getSlotState(hour, slot.isAvailable);
    const isInRange = state === 'solo' || state === 'range-start' || state === 'range-mid' || state === 'range-end';

    // Preview: when we have a start but not end, show which slots would extend range
    const wouldExtend = rangeStart !== null && rangeEnd === null && slot.isAvailable
      && isRangeAllAvailable(Math.min(rangeStart, hour), Math.max(rangeStart, hour));

    let buttonClass = `relative h-12 rounded-2xl border font-bold transition-all duration-200 flex items-center justify-between px-3 gap-1 text-[12px] select-none `;

    if (state === 'unavailable') {
      buttonClass += 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed';
    } else if (state === 'solo') {
      buttonClass += 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 scale-[1.02]';
    } else if (state === 'range-start') {
      buttonClass += 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 rounded-r-none border-r-0';
    } else if (state === 'range-mid') {
      buttonClass += 'bg-emerald-500 text-white border-emerald-500 rounded-none border-x-0';
    } else if (state === 'range-end') {
      buttonClass += 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 rounded-l-none border-l-0';
    } else if (wouldExtend && rangeEnd === null) {
      buttonClass += 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400';
    } else {
      buttonClass += 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50/50 active:scale-[0.97]';
    }

    return (
      <button
        key={slot.startTime}
        disabled={state === 'unavailable'}
        onClick={() => handleSlotTap(hour, slot.isAvailable)}
        className={buttonClass}
      >
        <span className="font-extrabold">{slot.startTime}</span>
        <span className={`text-[9px] font-black shrink-0 ${
          state === 'unavailable' ? 'text-slate-300' :
          isInRange ? 'text-white/90' :
          wouldExtend ? 'text-emerald-600' : 'text-emerald-600'
        }`}>
          {state === 'unavailable' ? 'เต็ม' : isInRange ? '✓' : 'ว่าง'}
        </span>
      </button>
    );
  };

  // Active date display
  const activeDateObj = new Date(activeDate);
  const activeDateThai = `${activeDateObj.getDate()} ${monthNamesThai[activeDateObj.getMonth()]} ${activeDateObj.getFullYear() + 543}`;

  if (isSlotsLoading) {
    return (
      <div className="p-4 space-y-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
        </div>
        {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
      </div>
    );
  }

  const canConfirm = selectedStartHour !== null && selectedHours >= 1;

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Service & Staff Info Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-[22px] shadow-premium space-y-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
        <div className="flex items-center justify-between text-xs opacity-90 border-b border-white/10 pb-2 relative z-10">
          <span className="font-extrabold flex items-center gap-1 text-primary-light text-[11px]">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>เลือกรอบเวลา {selectedHours > 0 ? `(${selectedHours} ชม.)` : ''}</span>
          </span>
          {selectedHours > 0 && (
            <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-black text-[11px] shadow-sm shrink-0">
              {totalDurationMinutes} นาที
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-0.5 relative z-10">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="font-black text-[14px] leading-tight truncate">{service.name}</h2>
            <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
              {terms.selectedResourceLabel}:{' '}
              <span className="font-bold text-white">
                {court
                  ? `${court.name}${court.extraPricePerHour ? ` (${court.extraPricePerHour > 0 ? '+' : ''}${court.extraPricePerHour}฿)` : ''}`
                  : staff
                  ? staff.name
                  : terms.autoAssignedText}
              </span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block font-bold">
              {selectedHours > 1 ? 'ราคารวม' : '฿/ชม.'}
            </span>
            <span className="text-lg font-black text-emerald-400">
              <span className="text-xs mr-0.5">฿</span>
              {selectedHours > 0 ? totalPrice.toLocaleString() : pricePerHour.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* HOW TO USE hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-blue-600 font-black text-[11px]">?</span>
        </div>
        <div>
          <p className="text-[11px] font-black text-blue-800">วิธีเลือกเวลา</p>
          <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
            กดสล็อตเริ่มต้น → กดสล็อตสิ้นสุด ระบบจะเลือกช่วงเวลาทั้งหมดให้อัตโนมัติ<br />
            สล็อตสีเทา = เต็มแล้ว ไม่สามารถเลือกได้
          </p>
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
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${viewType === 'strip' ? 'bg-white text-primary shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <ListFilter className="w-3.5 h-3.5" />รายวัน
          </button>
          <button
            onClick={() => setViewType('month')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${viewType === 'month' ? 'bg-white text-primary shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Grid className="w-3.5 h-3.5" />ปฏิทิน
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
                  onClick={() => { setActiveDate(item.dateStr); handleClearSelection(); }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 py-3 rounded-2xl border transition-all duration-300 snap-start ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-[0_4px_12px_rgba(79,70,229,0.3)] ring-2 ring-primary/20 scale-[1.05]'
                      : 'bg-white text-slate-700 border-border hover:border-primary/30 shadow-sm'
                  }`}
                >
                  <span className={`text-[11px] font-black ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{item.dayName}</span>
                  <span className="text-xl font-black my-0.5">{item.dayNumber}</span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>{item.monthName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Full Month Calendar Grid */}
      {viewType === 'month' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[13px] font-black text-foreground">
              {monthNamesThai[calendarMonth]} {calendarYear + 543}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors active:scale-95">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-black text-slate-400 border-b border-border/50 pb-2">
            {dayNamesThai.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[13px]">
            {Array.from({ length: firstDay }).map((_, idx) => <div key={`empty-${idx}`} className="h-10" />)}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const monthStr = (calendarMonth + 1).toString().padStart(2, '0');
              const dayStr = dayNum.toString().padStart(2, '0');
              const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;
              const isSelected = activeDate === dateKey;
              const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === dayNum;
              const cellDate = new Date(calendarYear, calendarMonth, dayNum);
              const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <button
                  key={dateKey}
                  disabled={isPast}
                  onClick={() => { setActiveDate(dateKey); handleClearSelection(); }}
                  className={`h-10 w-full rounded-xl flex flex-col items-center justify-center font-bold text-[13px] transition-all duration-300 ${
                    isPast ? 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                    : isSelected ? 'bg-primary text-white font-black shadow-md shadow-primary/30 ring-2 ring-primary/20 scale-110'
                    : isToday ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'hover:bg-slate-100 text-slate-700 hover:scale-105'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white -mt-1 shadow-sm"></span>}
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

      {/* Selection Error Alert */}
      {selectionError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-600 font-black text-[11px]">!</span>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-black text-amber-800">เลือกช่วงเวลาไม่ได้</p>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5">{selectionError}</p>
          </div>
          <button onClick={() => setSelectionError(null)} className="text-amber-400 hover:text-amber-600 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selection Summary (when range selected) */}
      {selectedHours > 0 && selectedStartHour !== null && selectedEndHour !== null && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black text-emerald-800">ช่วงเวลาที่เลือก</p>
              <p className="text-[13px] font-black text-emerald-900">
                {toTimeStr(selectedStartHour)} - {toTimeStr(selectedEndHour)} น.
                <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-lg">
                  {selectedHours} ชม.
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="text-emerald-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Time Slots Selection Area */}
      <div className="space-y-4 pt-2">
        {slotsError && (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 rounded-xl">
            {slotsError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-black text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            เลือกรอบเวลาที่สะดวก
          </h3>
          {rangeStart !== null && rangeEnd === null && (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 animate-pulse">
              กดสล็อตสิ้นสุด
            </span>
          )}
          {rangeStart === null && (
            <span className="text-[11px] text-slate-500 font-medium">
              แตะสล็อตที่ต้องการ
            </span>
          )}
        </div>

        {slots.length === 0 ? (
          <div className="premium-card text-center space-y-2 py-10 px-6">
            <XCircle className="w-10 h-10 text-danger/80 mx-auto mb-2" />
            <p className="text-[13px] text-slate-800 font-black">ไม่มีรอบเวลาบริการว่างในวันที่เลือก</p>
            <p className="text-[11px] text-slate-500 font-medium">ร้านอาจปิดบริการหรือคิวเต็มแล้ว กรุณาเลือกวันอื่นในปฏิทิน</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Morning Period */}
            {morningSlots.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-black bg-amber-50 w-fit px-3 py-1 rounded-xl border border-amber-200/60">
                  <Sun className="w-3.5 h-3.5" />
                  <span>ช่วงเช้า {getPeriodRangeText(morningSlots)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {morningSlots.map((slot) => renderSlotButton(slot))}
                </div>
              </div>
            )}

            {/* Afternoon Period */}
            {afternoonSlots.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-black bg-orange-50 w-fit px-3 py-1 rounded-xl border border-orange-200/60">
                  <Sunset className="w-3.5 h-3.5" />
                  <span>ช่วงบ่าย {getPeriodRangeText(afternoonSlots)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {afternoonSlots.map((slot) => renderSlotButton(slot))}
                </div>
              </div>
            )}

            {/* Evening Period */}
            {eveningSlots.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-600 text-[11px] font-black bg-indigo-50 w-fit px-3 py-1 rounded-xl border border-indigo-200/60">
                  <Moon className="w-3.5 h-3.5" />
                  <span>ช่วงเย็น/ค่ำ {getPeriodRangeText(eveningSlots)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          <div className="min-w-0 pr-2">
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">รอบเวลาที่เลือก</p>
            {canConfirm && selectedStartHour !== null && selectedEndHour !== null ? (
              <div className="space-y-0.5">
                <p className="text-[12px] font-black text-slate-900 leading-snug truncate">
                  {activeDateThai}
                </p>
                <p className="text-[12px] font-extrabold text-emerald-700 leading-snug">
                  {toTimeStr(selectedStartHour)} - {toTimeStr(selectedEndHour)} น.
                </p>
              </div>
            ) : (
              <p className="text-[12px] font-black text-slate-900 leading-snug">
                แตะสล็อตเพื่อเลือกเวลา
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">รวมทั้งหมด</p>
            <p className="text-[14px] font-black text-emerald-600">
              ฿{canConfirm ? totalPrice.toLocaleString() : pricePerHour.toLocaleString()}
              {canConfirm && selectedHours > 0 && (
                <span className="block text-[10px] font-bold text-slate-500">({selectedHours} ชม.)</span>
              )}
            </p>
          </div>
        </div>
        <button
          disabled={!canConfirm}
          onClick={() => {
            if (canConfirm && selectedStartHour !== null) {
              onSelectSlot(activeDate, activeTimeDisplay, selectedHours);
            }
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-6 rounded-2xl text-[14px] shadow-lg shadow-emerald-600/20 flex items-center justify-between group disabled:bg-slate-300 disabled:shadow-none disabled:text-slate-500 transition-all"
        >
          <span className="truncate font-black text-sm">
            {canConfirm ? 'ยืนยัน' : 'กรุณาเลือกรอบเวลา'}
          </span>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${canConfirm ? 'bg-white/20 group-hover:translate-x-1' : 'bg-transparent'}`}>
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};
