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
    <div className="p-4 space-y-5 pb-28">
      {/* Top Success Badge */}
      <div className="premium-card bg-gradient-to-b from-success/10 to-white border-success/20 p-8 text-center space-y-4 relative overflow-hidden mt-2">
        <div className="absolute top-0 left-0 right-0 h-1 bg-success"></div>
        <div className="w-20 h-20 bg-success text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.4)] relative z-10 animate-bounce-slow">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1.5 relative z-10">
          <h2 className="text-xl font-black text-foreground">
            การจองคิวของคุณเสร็จสมบูรณ์!
          </h2>
          <p className="text-[13px] text-success-dark font-black">
            รหัสการจอง: <span className="font-mono bg-white px-2 py-1 rounded-lg shadow-sm border border-success/10 ml-1">{booking.refNo}</span>
          </p>
        </div>
      </div>

      {/* LINE Flex Message Simulation Alert */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-start gap-4 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-xl pointer-events-none"></div>
        <div className="w-10 h-10 rounded-xl bg-success/20 text-success-light flex items-center justify-center flex-shrink-0 shadow-inner relative z-10">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="flex-1 text-[13px] relative z-10">
          <p className="font-black text-success-light mb-1">ส่ง Flex Message ยืนยันแล้ว</p>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            รายละเอียดการจองถูกส่งไปยัง LINE Chat ของคุณเรียบร้อยแล้ว กรุณาแสดงข้อความนี้เมื่อถึงร้าน
          </p>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="premium-card p-5 space-y-4">
        <div className="pb-4 border-b border-border/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
            รายละเอียดคิวบริการ
          </span>
          <h3 className="text-lg font-black text-foreground mt-3">
            {booking.serviceName}
          </h3>
        </div>

        <div className="space-y-3.5 text-[13px] text-slate-600 font-medium">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5 shrink-0">
               <Calendar className="w-4 h-4" />
            </div>
            <div>
               <span className="text-[11px] text-slate-500 font-bold block mb-0.5">วันที่</span>
               <span className="font-black text-foreground text-[13px]">{formatDateThai(booking.bookingDate)}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
             <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5 shrink-0">
                <Clock className="w-4 h-4" />
             </div>
             <div>
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5">เวลา</span>
                <span className="font-black text-foreground text-[13px]">{booking.startTime} - {booking.endTime} น.</span>
             </div>
          </div>

          <div className="flex items-start gap-3">
             <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5 shrink-0">
                <User className="w-4 h-4" />
             </div>
             <div>
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5">ช่างผู้ให้บริการ</span>
                <span className="font-black text-foreground text-[13px]">{booking.staffName}</span>
             </div>
          </div>

          <div className="flex items-start gap-3">
             <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5 shrink-0">
                <MapPin className="w-4 h-4" />
             </div>
             <div className="flex-1">
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5">สถานที่</span>
                <span className="font-black text-foreground text-[13px] leading-tight block">{activeTenant.address}</span>
             </div>
          </div>

          <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5 shrink-0">
                 <Phone className="w-4 h-4" />
              </div>
              <div>
                 <span className="text-[11px] text-slate-500 font-bold block mb-0.5">ติดต่อร้าน</span>
                 <span className="font-black text-foreground text-[13px] font-mono">{activeTenant.phone}</span>
              </div>
          </div>

          {booking.addons && booking.addons.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2 mt-2">
              <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 inline-flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                บริการเสริมพิเศษที่เลือก ({booking.addons.length} รายการ)
              </span>
              <ul className="text-[13px] text-slate-700 space-y-1.5">
                {booking.addons.map((a) => (
                  <li key={a.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="font-bold">
                      • {a.name}
                      {a.selectedOption ? <span className="text-primary ml-1">({a.selectedOption})</span> : ''}
                    </span>
                    <span className="font-black text-foreground">+฿{(a?.price ?? 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Financial Details */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 pt-3 mt-4 shadow-inner">
          <div className="flex justify-between text-slate-500 text-[13px] font-bold">
            <span>ราคาทั้งหมด</span>
            <span>฿{(booking?.price ?? booking?.finalPrice ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-success-dark font-black text-[13px] bg-success/10 px-2 py-1.5 rounded-lg">
            <span>ชำระมัดจำแล้ว (PromptPay)</span>
            <span>฿{(booking?.depositAmount ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-foreground font-black pt-2 border-t border-slate-200 text-sm mt-1">
            <span>ชำระหน้าร้านคงเหลือ</span>
            <span className="text-primary">฿{((booking?.price ?? booking?.finalPrice ?? 0) - (booking?.depositAmount ?? 0)).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 z-40 max-w-[400px] mx-auto space-y-3">
        {/* Calendar Add Button */}
        <button
          onClick={handleDownloadCalendar}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-center gap-2 transition-all hover:border-primary/30 hover:text-primary text-[13px]"
        >
          <Download className="w-5 h-5 text-primary" />
          <span>{downloadedIcs ? 'ดาวน์โหลดไฟล์ .ics สำเร็จ!' : 'เพิ่มลงปฏิทิน (Google / Apple Calendar)'}</span>
        </button>

        {/* View My Bookings Button */}
        <button
          onClick={onViewMyBookings}
          className="w-full btn-primary py-4 px-6 text-[15px] shadow-premium flex items-center justify-center gap-2 group"
        >
          <span>ดูรายการจองทั้งหมดของคุณ</span>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
