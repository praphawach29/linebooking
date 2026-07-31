import React, { useState } from 'react';
import { Booking } from '../../types';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Share2,
  Download,
  MessageSquare,
  ChevronRight,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';

interface LiffBookingConfirmationProps {
  booking: Booking;
  onViewMyBookings: () => void;
}

export const LiffBookingConfirmation: React.FC<LiffBookingConfirmationProps> = ({
  booking,
  onViewMyBookings,
}) => {
  const { activeTenant } = useSaaS();
  const [downloadedIcs, setDownloadedIcs] = useState(false);

  const formatDateThai = (dStr: string) => {
    const d = new Date(dStr);
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const handleDownloadCalendar = () => {
    // Generate .ics string
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LINE OA Booking SaaS//TH
BEGIN:VEVENT
SUMMARY:${booking.serviceName} - ${activeTenant.name}
DESCRIPTION:รหัสการจอง: ${booking.refNo}\\nช่างผู้ให้บริการ: ${booking.staffName}\\nโทร: ${activeTenant.phone}
LOCATION:${activeTenant.address}
DTSTART:${booking.bookingDate.replace(/-/g, '')}T${booking.startTime.replace(':', '')}00
DTEND:${booking.bookingDate.replace(/-/g, '')}T${booking.endTime.replace(':', '')}00
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.refNo}.ics`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadedIcs(true);
    setTimeout(() => setDownloadedIcs(false), 3000);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Success Badge */}
      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">
          การจองคิวของคุณเสร็จสมบูรณ์!
        </h2>
        <p className="text-xs text-emerald-800 font-medium">
          รหัสการจอง: <span className="font-mono font-bold">{booking.refNo}</span>
        </p>
      </div>

      {/* LINE Flex Message Simulation Alert */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center gap-3 border border-slate-800 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs">
          <p className="font-bold text-emerald-400">ส่ง Flex Message ยืนยันแล้ว</p>
          <p className="text-[11px] text-slate-300">
            รายละเอียดการจองถูกส่งไปยัง LINE Chat ของคุณเรียบร้อยแล้ว
          </p>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        <div className="pb-3 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            รายละเอียดคิวบริการ
          </span>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            {booking.serviceName}
          </h3>
        </div>

        <div className="space-y-2 text-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>วันที่: <strong className="text-slate-900">{formatDateThai(booking.bookingDate)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>เวลา: <strong className="text-slate-900">{booking.startTime} - {booking.endTime} น.</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>ช่างผู้ให้บริการ: <strong className="text-slate-900">{booking.staffName}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">สถานที่: <strong className="text-slate-900">{activeTenant.address}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>ติดต่อร้าน: <strong className="text-slate-900">{activeTenant.phone}</strong></span>
          </div>

          {booking.addons && booking.addons.length > 0 && (
            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                บริการเสริมพิเศษที่เลือก ({booking.addons.length} รายการ):
              </span>
              <ul className="text-[11px] text-slate-700 space-y-1 pl-1">
                {booking.addons.map((a) => (
                  <li key={a.id} className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span>
                      • {a.name}
                      {a.selectedOption ? ` (${a.selectedOption})` : ''}
                    </span>
                    <span className="font-bold text-slate-900">+฿{(a?.price ?? 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Financial Details */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 pt-2">
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>ราคาทั้งหมด</span>
            <span>฿{(booking?.price ?? booking?.finalPrice ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-bold">
            <span>ชำระมัดจำแล้ว (PromptPay)</span>
            <span>฿{(booking?.depositAmount ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-800 font-semibold pt-1 border-t border-slate-200">
            <span>ชำระหน้าร้านคงเหลือ</span>
            <span>฿{((booking?.price ?? booking?.finalPrice ?? 0) - (booking?.depositAmount ?? 0)).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Calendar Add Button */}
      <button
        onClick={handleDownloadCalendar}
        className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-4 rounded-2xl border border-slate-300 shadow-xs flex items-center justify-center gap-2 transition-colors text-xs"
      >
        <Download className="w-4 h-4 text-emerald-600" />
        <span>{downloadedIcs ? 'ดาวน์โหลดไฟล์ .ics สำเร็จ!' : 'เพิ่มลงปฏิทิน (Google / Apple Calendar)'}</span>
      </button>

      {/* View My Bookings Button */}
      <button
        onClick={onViewMyBookings}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors text-xs"
      >
        <span>ดูรายการจองทั้งหมดของคุณ</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
