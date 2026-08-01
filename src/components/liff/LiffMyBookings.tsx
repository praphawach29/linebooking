import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Booking, BookingStatus } from '../../types';
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  XCircle,
  PlusCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  QrCode,
  CheckCircle2,
  Building2,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface LiffMyBookingsProps {
  onNewBooking: () => void;
}

export const LiffMyBookings: React.FC<LiffMyBookingsProps> = ({ onNewBooking }) => {
  const { bookings, cancellationPolicies, updateBookingStatus, activeTenant } = useSaaS();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [selectedBookingForQr, setSelectedBookingForQr] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isSimulatingCheckin, setIsSimulatingCheckin] = useState(false);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') {
      return b.status === 'pending' || b.status === 'confirmed' || b.status === 'checked_in';
    }
    if (activeTab === 'completed') {
      return b.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return b.status === 'cancelled' || b.status === 'no_show';
    }
    return true;
  });

  const formatDateThai = (dStr: string) => {
    const d = new Date(dStr);
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-success/10 text-success-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-success/20 shadow-sm">ยืนยันแล้ว</span>;
      case 'pending':
        return <span className="bg-warning/10 text-warning-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-warning/20 shadow-sm">รอชำระเงิน</span>;
      case 'checked_in':
        return <span className="bg-primary/10 text-primary-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5" /> เช็คอินแล้ว</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">เสร็จสิ้น</span>;
      case 'cancelled':
        return <span className="bg-danger/10 text-danger-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-danger/20 shadow-sm">ยกเลิกแล้ว</span>;
      case 'no_show':
        return <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-300 shadow-sm">ไม่มาตามนัด</span>;
    }
  };

  // Calculate cancellation policy refund percentage
  const calculateRefundPct = (booking: Booking): number => {
    const bookingTime = new Date(`${booking.bookingDate}T${booking.startTime}:00`).getTime();
    const now = new Date().getTime();
    const hoursDiff = (bookingTime - now) / (1000 * 3600);

    const sorted = [...cancellationPolicies].sort((a, b) => b.hoursBefore - a.hoursBefore);

    for (const pol of sorted) {
      if (hoursDiff >= pol.hoursBefore) {
        return pol.refundPercentage;
      }
    }
    return 0;
  };

  const handleConfirmCancel = () => {
    if (selectedBookingForCancel) {
      updateBookingStatus(selectedBookingForCancel.id, 'cancelled', cancelReason || 'ลูกค้าขอยกเลิกผ่าน LIFF');
      setSelectedBookingForCancel(null);
      setCancelReason('');
    }
  };

  const handleSimulateCheckIn = (bookingId: string) => {
    setIsSimulatingCheckin(true);
    setTimeout(() => {
      updateBookingStatus(bookingId, 'checked_in', 'ลูกค้าเช็คอิน QR หน้าร้านเรียบร้อยแล้ว');
      setIsSimulatingCheckin(false);
      // Update selected booking in modal to show checked_in state
      if (selectedBookingForQr) {
        setSelectedBookingForQr({
          ...selectedBookingForQr,
          status: 'checked_in',
        });
      }
    }, 800);
  };

  const handleCopyRef = (refNo: string) => {
    navigator.clipboard.writeText(refNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-lg font-black text-foreground">การจองคิวของฉัน</h2>
        <button
          onClick={onNewBooking}
          className="text-[11px] text-primary font-black flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>จองเพิ่ม</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl text-[13px] font-black shadow-inner border border-slate-200/50">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'upcoming'
              ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          กำลังจะถึง ({bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in').length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'completed'
              ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          เสร็จสิ้น ({bookings.filter((b) => b.status === 'completed').length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'cancelled'
              ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          ยกเลิก
        </button>
      </div>

      {/* Booking List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="premium-card p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-base text-slate-500 font-bold mb-4">ไม่มีรายการจองในหมวดนี้</p>
            <button
              onClick={onNewBooking}
              className="btn-primary py-3 px-6 text-[13px]"
            >
              ค้นหาและจองคิวเลย
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              className="premium-card p-5 space-y-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg group"
            >
              {/* Optional: Add a subtle side border indicator based on status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                b.status === 'confirmed' ? 'bg-success' :
                b.status === 'pending' ? 'bg-warning' :
                b.status === 'checked_in' ? 'bg-primary' :
                b.status === 'cancelled' ? 'bg-danger' : 'bg-slate-300'
              }`}></div>

              <div className="flex items-start justify-between pb-3 border-b border-border/60">
                <div>
                  <span className="text-[10px] font-mono font-black text-slate-400 block mb-1">
                    #{b.refNo}
                  </span>
                  <h3 className="font-black text-foreground text-[15px] line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                    {b.serviceName}
                  </h3>
                </div>
                <div className="shrink-0 ml-2">
                   {getStatusBadge(b.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600 text-[13px] font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-bold">{formatDateThai(b.bookingDate)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-bold">{b.startTime} - {b.endTime} น.</span>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>ช่างผู้ให้บริการ: <strong className="text-foreground font-black ml-1">{b.staffName}</strong></span>
                </div>
              </div>

              {b.addons && b.addons.length > 0 && (
                <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200/40 text-[11px] text-amber-900 space-y-1.5 shadow-inner">
                  <span className="font-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    บริการเสริม ({b.addons.length} รายการ):
                  </span>
                  {b.addons.map((a) => (
                    <div key={a.id} className="flex justify-between pl-5 pr-1 font-bold">
                      <span className="text-slate-600">• {a.name}{a.selectedOption ? ` (${a.selectedOption})` : ''}</span>
                      <span className="text-amber-700">+฿{(a.price ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {b.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl italic border border-slate-100 font-medium leading-relaxed shadow-inner">
                  "{b.notes}"
                </p>
              )}

              {/* Action Buttons for Active Bookings including QR Check-in */}
              {(b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in') && (
                <div className="pt-4 border-t border-slate-100 space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForQr(b)}
                    className="w-full bg-[#113566] hover:bg-[#0b2447] text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-[13px]"
                  >
                    <QrCode className="w-5 h-5 text-[#60a5fa]" />
                    <span>แสดง QR Code เช็คอินหน้าร้าน</span>
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForCancel(b)}
                      className="text-danger-dark bg-danger/5 hover:bg-danger/10 px-3 py-2.5 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 border border-danger/20 flex-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>ยกเลิกคิว</span>
                    </button>

                    <button
                      type="button"
                      onClick={onNewBooking}
                      className="text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-2.5 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 border border-primary/20 flex-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>เลื่อนคิว</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* QR Code Quick Check-In Modal */}
      {selectedBookingForQr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white max-w-[360px] w-full p-6 rounded-[32px] shadow-2xl space-y-5 text-[13px] relative border border-slate-200 transform animate-slideUp">
            <button
              type="button"
              onClick={() => setSelectedBookingForQr(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase tracking-wider shadow-sm">
                Storefront Check-In QR
              </span>
              <h3 className="font-black text-foreground text-lg">QR Code สำหรับเช็คอิน</h3>
              <p className="text-[11px] text-slate-500 font-medium">แสดง QR Code นี้ให้พนักงานสแกนเพื่อรับบริการ</p>
            </div>

            {/* QR Code Canvas */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-center space-y-4 shadow-inner">
              <div className="inline-block bg-white p-4 border-2 border-[#113566]/20 rounded-3xl shadow-lg relative">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=CHECKIN-${selectedBookingForQr.refNo}`}
                  alt="Check-in QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="flex items-center justify-center gap-2 bg-white py-2 px-4 rounded-xl border border-slate-200 font-mono text-[13px] shadow-sm">
                <span className="font-black text-slate-800">Ref: #{selectedBookingForQr.refNo}</span>
                <button
                  type="button"
                  onClick={() => handleCopyRef(selectedBookingForQr.refNo)}
                  className="p-1.5 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                >
                  {copiedRef ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Booking Quick Info */}
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-1.5">
              <div className="flex justify-between font-black text-foreground">
                <span className="truncate mr-2">{selectedBookingForQr.serviceName}</span>
                <span className="text-primary shrink-0">฿{(selectedBookingForQr.finalPrice ?? selectedBookingForQr.price ?? 0).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-slate-600 font-bold flex flex-col gap-1 pt-1 border-t border-primary/10">
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary/70" /> {formatDateThai(selectedBookingForQr.bookingDate)} ({selectedBookingForQr.startTime} น.)</span>
                <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-primary/70" /> ช่าง: {selectedBookingForQr.staffName}</span>
              </div>
            </div>

            {/* Status & Simulate Check-In Button */}
            {selectedBookingForQr.status === 'checked_in' ? (
              <div className="bg-success/10 border border-success/30 p-4 rounded-2xl text-center space-y-1.5 text-success-dark">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="font-black text-sm">เช็คอินหน้าร้านเรียบร้อยแล้ว!</p>
                <p className="text-[11px] font-medium text-success-dark/80">พนักงานกำลังเตรียมห้อง/อุปกรณ์ให้บริการ</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSimulateCheckIn(selectedBookingForQr.id)}
                disabled={isSimulatingCheckin}
                className="w-full btn-primary py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-[13px]"
              >
                {isSimulatingCheckin ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    กำลังตรวจสอบ...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>จำลองพนักงานสแกน (Simulate Check-In)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedBookingForQr(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-[13px]"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white max-w-[360px] w-full p-6 rounded-[32px] shadow-2xl space-y-5 text-[13px] border border-slate-200 transform animate-slideUp">
            <div className="flex flex-col items-center gap-2 text-danger pb-2 border-b border-slate-100">
              <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-black text-lg text-foreground text-center leading-tight">คุณต้องการยกเลิก<br/>การจองคิวใช่หรือไม่?</h3>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 shadow-inner text-center">
              <p className="font-black text-foreground text-[15px]">{selectedBookingForCancel.serviceName}</p>
              <p className="text-slate-500 font-bold text-[11px]">
                {formatDateThai(selectedBookingForCancel.bookingDate)} | เวลา {selectedBookingForCancel.startTime} น.
              </p>
            </div>

            {/* Refund Rule Calculation */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1.5">
              <p className="font-black text-amber-900 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  เงื่อนไขการคืนเงินมัดจำ:
              </p>
              <p className="text-[13px] text-amber-800 font-medium leading-relaxed">
                ตามนโยบาย คุณจะได้รับเงินมัดจำคืน <strong className="font-black bg-amber-200/50 px-1 rounded">{calculateRefundPct(selectedBookingForCancel)}%</strong><br/>
                <span className="text-[11px] text-amber-700/80 font-bold">(คิดเป็นยอดเงิน ฿{(((selectedBookingForCancel.depositAmount ?? 0) * calculateRefundPct(selectedBookingForCancel)) / 100).toLocaleString()})</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-600 font-bold text-[11px]">เหตุผลในการยกเลิก (ไม่บังคับ)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="โปรดระบุเหตุผล เช่น ติดภารกิจด่วน..."
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger transition-all bg-slate-50 focus:bg-white resize-none text-[13px] font-medium"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
                <button
                    type="button"
                    onClick={handleConfirmCancel}
                    className="w-full py-3.5 bg-danger text-white font-black rounded-xl hover:bg-danger-dark transition-colors shadow-md"
                >
                    ยืนยันยกเลิกคิว (Cancel Booking)
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedBookingForCancel(null)}
                    className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                    กลับไปหน้าเดิม
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
