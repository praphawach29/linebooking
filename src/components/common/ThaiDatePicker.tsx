import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface ThaiDatePickerProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (value: string) => void; // Emits YYYY-MM-DD
  className?: string;
  placeholder?: string;
}

/**
 * ThaiDatePicker — Formats date input as DD/MM/YYYY (วัน/เดือน/ปี)
 * Compatible with Thai date display while maintaining standard YYYY-MM-DD state.
 */
export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  className,
  placeholder = 'dd/mm/yyyy',
}) => {
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD -> DD/MM/YYYY
  const toDDMMYYYY = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return iso;
  };

  const [displayText, setDisplayText] = useState(() => toDDMMYYYY(value));

  // Sync displayText when value prop changes from outside / calendar picker
  useEffect(() => {
    setDisplayText(toDDMMYYYY(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayText(raw);

    // Auto-parse DD/MM/YYYY -> YYYY-MM-DD
    const parts = raw.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      if (day.length === 2 && month.length === 2 && year.length === 4) {
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          onChange(`${year}-${month}-${day}`);
        }
      }
    }
  };

  const openCalendar = () => {
    if (hiddenDateRef.current) {
      try {
        if ('showPicker' in hiddenDateRef.current) {
          hiddenDateRef.current.showPicker();
        } else {
          hiddenDateRef.current.click();
        }
      } catch (err) {
        hiddenDateRef.current.click();
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={displayText}
        onChange={handleInputChange}
        onClick={openCalendar}
        className={
          className ||
          'w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium'
        }
      />
      <button
        type="button"
        onClick={openCalendar}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 p-1 transition-colors"
        title="เลือกวันที่จากปฏิทิน"
      >
        <Calendar className="w-4 h-4" />
      </button>

      {/* Hidden native date input for calendar popup */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        className="sr-only opacity-0 absolute bottom-0 left-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
};
