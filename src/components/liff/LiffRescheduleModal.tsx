import React, { useState } from 'react';
import { Booking } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { LiffDateTimePicker } from './LiffDateTimePicker';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatDateThai } from '../../utils/dateFormatter';

interface LiffRescheduleModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

export const LiffRescheduleModal: React.FC<LiffRescheduleModalProps> = ({ booking, onClose, onSuccess }) => {
  const { services, staffs, courts, rescheduleBooking } = useSaaS();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find(s => s.id === booking.serviceId);
  const staff = staffs.find(s => s.id === booking.staffId) || null;
  const court = courts.find(c => c.id === booking.courtId) || null;

  if (!service) return null;

  const handleSelectSlot = (date: string, time: string, hours: number) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a new date and time / กรุณาเลือกวันที่และเวลาใหม่');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Calculate end time
      const [startHour, startMin] = selectedTime.split(':').map(Number);
      const startMinTotal = startHour * 60 + startMin;
      const endMinTotal = startMinTotal + service.durationMinutes;
      const endHour = Math.floor(endMinTotal / 60);
      const endMin = endMinTotal % 60;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      await rescheduleBooking(booking.id, selectedDate, selectedTime, endTimeStr);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule / ไม่สามารถเลื่อนคิวได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-50 max-w-[400px] w-full min-h-[500px] rounded-[32px] shadow-2xl relative border border-slate-200 transform animate-slideUp overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-foreground text-lg">เลื่อนคิวจอง</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">#{booking.refNo} - {booking.serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Time Banner */}
        <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 shrink-0">
          <p className="text-[11px] font-bold text-amber-800 mb-1">เวลาปัจจุบัน:</p>
          <div className="flex items-center gap-4 text-amber-700 font-medium text-[13px]">
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formatDateThai(booking.bookingDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)} น.</span>
            </div>
          </div>
        </div>

        {/* Date/Time Picker Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <LiffDateTimePicker
            service={service}
            staff={staff}
            court={court}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedAddons={[]}
            onSelectSlot={handleSelectSlot}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3">
          {error && (
            <div className="p-2 bg-danger/10 text-danger text-[11px] font-bold rounded-lg text-center">
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || isLoading}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-slate-300 disabled:text-slate-500 text-white font-black py-3.5 px-4 rounded-xl transition-colors shadow-md text-[13px] flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            ยืนยันการเลื่อนคิว
          </button>
        </div>

      </div>
    </div>
  );
};
