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
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">ยืนยันแล้ว</span>;
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">รอชำระเงิน</span>;
      case 'checked_in':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> เช็คอินแล้ว</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">เสร็จสิ้น</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">ยกเลิกแล้ว</span>;
      case 'no_show':
        return <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">ไม่มาตามนัด</span>;
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">การจองคิวของฉัน (My Bookings)</h2>
        <button
          onClick={onNewBooking}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>จองเพิ่ม</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'upcoming'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          กำลังจะถึง ({bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in').length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'completed'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          เสร็จสิ้น ({bookings.filter((b) => b.status === 'completed').length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'cancelled'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ยกเลิกแล้ว
        </button>
      </div>

      {/* Booking List */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center py-10 space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">ไม่มีรายการจองในหมวดนี้</p>
            <button
              onClick={onNewBooking}
              className="mt-2 text-xs bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl"
            >
              ค้นหาและจองคิวเลย
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">
                    #{b.refNo}
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs line-clamp-1">
                    {b.serviceName}
                  </h3>
                </div>
                {getStatusBadge(b.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formatDateThai(b.bookingDate)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{b.startTime} - {b.endTime} น.</span>
                </div>

                <div className="flex items-center gap-1.5 col-span-2">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ช่างผู้ให้บริการ: <strong className="text-slate-900 font-semibold">{b.staffName}</strong></span>
                </div>
              </div>

              {b.addons && b.addons.length > 0 && (
                <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 space-y-0.5">
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    บริการเสริม ({b.addons.length} รายการ):
                  </span>
                  {b.addons.map((a) => (
                    <div key={a.id} className="flex justify-between pl-2">
                      <span>• {a.name}{a.selectedOption ? ` (${a.selectedOption})` : ''}</span>
                      <span className="font-semibold">+฿{(a.price ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {b.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                  "{b.notes}"
                </p>
              )}

              {/* Action Buttons for Active Bookings including QR Check-in */}
              {(b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in') && (
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForQr(b)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs text-xs"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>แสดง QR Code เช็คอินหน้าร้าน (Quick Check-In)</span>
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForCancel(b)}
                      className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 border border-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>ยกเลิกคิว</span>
                    </button>

                    <button
                      type="button"
                      onClick={onNewBooking}
                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 border border-emerald-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>เลื่อนวัน/เวลา</span>
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white max-w-sm w-full p-5 rounded-3xl shadow-2xl space-y-4 text-xs relative border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedBookingForQr(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pt-1">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                Storefront Check-In QR
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm">QR Code สำหรับเช็คอินหน้าร้าน</h3>
              <p className="text-[11px] text-slate-500">แสดง QR Code นี้ให้พนักงานสแกนเพื่อยืนยันการรับบริการ</p>
            </div>

            {/* QR Code Canvas */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="inline-block bg-white p-3 border-2 border-slate-900 rounded-2xl shadow-inner relative">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=CHECKIN-${selectedBookingForQr.refNo}`}
                  alt="Check-in QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>

              <div className="flex items-center justify-center gap-2 bg-white py-1.5 px-3 rounded-xl border border-slate-200 font-mono text-xs">
                <span className="font-bold text-slate-800">Ref: #{selectedBookingForQr.refNo}</span>
                <button
                  type="button"
                  onClick={() => handleCopyRef(selectedBookingForQr.refNo)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Booking Quick Info */}
            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100/80 space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{selectedBookingForQr.serviceName}</span>
                <span className="text-emerald-700">฿{(selectedBookingForQr.finalPrice ?? selectedBookingForQr.price ?? 0).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between">
                <span>นัดหมาย: {formatDateThai(selectedBookingForQr.bookingDate)} ({selectedBookingForQr.startTime} น.)</span>
                <span>ช่าง: {selectedBookingForQr.staffName}</span>
              </div>
            </div>

            {/* Status & Simulate Check-In Button */}
            {selectedBookingForQr.status === 'checked_in' ? (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-center space-y-1 text-blue-900">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mx-auto" />
                <p className="font-bold">เช็คอินหน้าร้านเรียบร้อยแล้ว!</p>
                <p className="text-[10px] text-blue-700">พนักงานกำลังเตรียมห้อง/อุปกรณ์ให้บริการ</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSimulateCheckIn(selectedBookingForQr.id)}
                disabled={isSimulatingCheckin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs"
              >
                {isSimulatingCheckin ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังจำลองการสแกน QR หน้าร้าน...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>จำลองพนักงานสแกน QR เช็คอิน (Simulate Check-In)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedBookingForQr(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white max-w-sm w-full p-5 rounded-3xl shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">ยืนยันการยกเลิกการจองคิว?</h3>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">{selectedBookingForCancel.serviceName}</p>
              <p className="text-slate-600">
                วันที่ {formatDateThai(selectedBookingForCancel.bookingDate)} เวลา {selectedBookingForCancel.startTime} น.
              </p>
            </div>

            {/* Refund Rule Calculation */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1">
              <p className="font-bold text-amber-900">เงื่อนไขการคืนเงินมัดจำ (Cancellation Policy):</p>
              <p className="text-[11px] text-amber-800">
                คืนเงินมัดจำ <strong className="font-bold">{calculateRefundPct(selectedBookingForCancel)}%</strong> (คิดเป็น ฿
                {(((selectedBookingForCancel.depositAmount ?? 0) * calculateRefundPct(selectedBookingForCancel)) / 100).toLocaleString()})
              </p>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">เหตุผลในการยกเลิก</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="โปรดระบุเหตุผล (เช่น ติดภารกิจด่วน)..."
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForCancel(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                ยืนยันยกเลิกคิว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
