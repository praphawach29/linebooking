import React, { useState } from 'react';
import { Booking, BookingStatus } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  QrCode,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scissors,
  Loader2,
} from 'lucide-react';

interface MerchantBookingDetailModalProps {
  booking: Booking;
  onClose: () => void;
}

export const MerchantBookingDetailModal: React.FC<MerchantBookingDetailModalProps> = ({
  booking,
  onClose,
}) => {
  const { updateBookingStatus, completeBooking } = useSaaS();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BookingStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (newStatus === 'cancelled') {
      setShowCancelDialog(true);
      return;
    }

    setIsUpdating(true);
    setTargetStatus(newStatus);
    setErrorMsg(null);

    try {
      if (newStatus === 'completed') {
        await completeBooking(booking.id);
      } else {
        await updateBookingStatus(booking.id, newStatus);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกสถานะ');
    } finally {
      setIsUpdating(false);
      setTargetStatus(null);
    }
  };

  const handleConfirmCancel = async () => {
    setIsUpdating(true);
    setTargetStatus('cancelled');
    setErrorMsg(null);

    try {
      await updateBookingStatus(booking.id, 'cancelled', cancelReason || 'ร้านค้ายกเลิกคิว');
      setShowCancelDialog(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการยกเลิกคิว');
    } finally {
      setIsUpdating(false);
      setTargetStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-xs flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold">#{booking.refNo}</span>
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                {booking.source}
              </span>
            </div>
            <h2 className="font-bold text-sm text-white mt-0.5">รายละเอียดคิวจอง</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-2xl flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-red-400 hover:text-red-600 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Status Switcher Strip */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              สถานะคิวปัจจุบัน & ปรับเปลี่ยนสถานะ
            </span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => handleStatusChange('confirmed')}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 ${
                  booking.status === 'confirmed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-500'
                }`}
              >
                {isUpdating && targetStatus === 'confirmed' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  'ยืนยันคิวแล้ว'
                )}
              </button>

              <button
                onClick={() => handleStatusChange('checked_in')}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 ${
                  booking.status === 'checked_in'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-500'
                }`}
              >
                {isUpdating && targetStatus === 'checked_in' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  'เช็คอินหน้าร้าน'
                )}
              </button>

              <button
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 ${
                  booking.status === 'completed'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-800'
                }`}
              >
                {isUpdating && targetStatus === 'completed' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  'เสร็จสิ้นบริการ'
                )}
              </button>

              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 ${
                  booking.status === 'cancelled'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                }`}
              >
                {isUpdating && targetStatus === 'cancelled' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  'ยกเลิกคิว'
                )}
              </button>
            </div>
          </div>

          {/* Service & Customer Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ลูกค้า</span>
              <p className="font-bold text-slate-900">{booking.userName}</p>
              <p className="text-[11px] text-slate-500 font-mono">{booking.userPhone}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                {booking.courtName ? 'สนาม / คอร์ท' : 'ช่างผู้ให้บริการ'}
              </span>
              <p className="font-bold text-slate-900">{booking.courtName || booking.staffName || '-'}</p>
              <p className="text-[11px] text-emerald-600 font-medium">
                ระยะเวลา {booking.serviceDuration} นาที
              </p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-slate-400 block">วันที่จอง</span>
                <span className="font-bold text-slate-900">{booking.bookingDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-slate-400 block">เวลารอบ</span>
                <span className="font-bold text-slate-900">{booking.startTime} - {booking.endTime} น.</span>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              รายละเอียดการชำระเงิน ({booking.paymentMethod?.toUpperCase() || 'NOT SET'})
            </h4>

            <div className="space-y-1 text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>ราคาค่าบริการทั้งหมด</span>
                <span className="font-semibold text-slate-900">฿{(booking?.price ?? booking?.finalPrice ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>มัดจำออนไลน์แล้ว (PromptPay)</span>
                <span>฿{(booking?.depositAmount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>คงเหลือชำระหน้าร้าน</span>
                <span>฿{((booking?.price ?? booking?.finalPrice ?? 0) - (booking?.depositAmount ?? 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* QR Code Check-in Simulator */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center space-y-2">
            <p className="text-[11px] font-bold text-emerald-900 flex items-center justify-center gap-1">
              <QrCode className="w-4 h-4 text-emerald-600" />
              QR Code เช็คอินสำหรับลูกค้า ณ หน้าร้าน
            </p>
            <div className="bg-white p-2 border border-emerald-200 rounded-xl inline-block shadow-2xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CHECKIN-${booking.refNo}`}
                alt="Checkin QR"
                className="w-20 h-20 mx-auto"
              />
            </div>
          </div>

        </div>

        {/* Footer Cancel Dialog Overlay if open */}
        {showCancelDialog && (
          <div className="p-4 bg-red-50 border-t border-red-200 space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>ระบุเหตุผลการยกเลิกคิว</span>
            </div>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="ระบุเหตุผล..."
              className="w-full p-2 bg-white border border-red-200 rounded-xl text-xs focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={isUpdating}
                className="flex-1 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-xl disabled:opacity-50"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isUpdating}
                className="flex-1 py-1.5 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังยกเลิก...</span>
                  </>
                ) : (
                  'ยืนยันการยกเลิก'
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
