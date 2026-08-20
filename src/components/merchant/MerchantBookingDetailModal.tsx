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
  RefreshCw,
  Maximize2,
  ZoomIn,
  Eye,
} from 'lucide-react';
import { LiffRescheduleModal } from '../liff/LiffRescheduleModal';

interface MerchantBookingDetailModalProps {
  booking: Booking;
  onClose: () => void;
}

export const MerchantBookingDetailModal: React.FC<MerchantBookingDetailModalProps> = ({
  booking,
  onClose,
}) => {
  const { updateBookingStatus, completeBooking, verifyBookingPayment } = useSaaS();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showSlipZoom, setShowSlipZoom] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BookingStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const handleVerifyPayment = async () => {
    setIsVerifyingPayment(true);
    setErrorMsg(null);
    try {
      await verifyBookingPayment(booking.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ยืนยันการชำระเงินไม่สำเร็จ');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

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
        <div className="p-5 overflow-y-auto space-y-4 flex-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-2xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          {/* Quick Actions (Status Toggles) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              สถานะคิวปัจจุบัน & ปรับเปลี่ยนสถานะ
            </span>
            
            {/* Action Group 1: Standard Progression */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleStatusChange('confirmed')}
                disabled={isUpdating}
                className={`px-2 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${
                  booking.status === 'confirmed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isUpdating && targetStatus === 'confirmed' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'ยืนยันคิวแล้ว'
                )}
              </button>

              <button
                onClick={() => handleStatusChange('checked_in')}
                disabled={isUpdating}
                className={`px-2 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${
                  booking.status === 'checked_in'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isUpdating && targetStatus === 'checked_in' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'เช็คอินหน้าร้าน'
                )}
              </button>

              <button
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdating}
                className={`px-2 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${
                  booking.status === 'completed'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isUpdating && targetStatus === 'completed' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'เสร็จสิ้นบริการ'
                )}
              </button>
              
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={isUpdating}
                className={`px-2 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${
                  booking.status === 'cancelled'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                }`}
              >
                {isUpdating && targetStatus === 'cancelled' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'ยกเลิก'
                )}
              </button>
            </div>
            
            {/* Action Group 2: Modifying booking */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowRescheduleModal(true)}
                disabled={isUpdating || booking.status === 'cancelled' || booking.status === 'completed'}
                className="flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                เลื่อนคิว
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
            <h4 className="font-bold text-slate-900 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                รายละเอียดการชำระเงิน ({booking.paymentMethod?.toUpperCase() || 'NOT SET'})
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                booking.paymentStatus === 'paid'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {booking.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ยืนยัน'}
              </span>
            </h4>

            <div className="space-y-1 text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>ราคาค่าบริการทั้งหมด</span>
                <span className="font-semibold text-slate-900">฿{(booking?.price ?? booking?.finalPrice ?? 0).toLocaleString()}</span>
              </div>
              {(booking?.depositAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>ยอดมัดจำที่ลูกค้าแจ้ง</span>
                  <span>฿{(booking?.depositAmount ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>คงเหลือชำระหน้าร้าน</span>
                <span>฿{((booking?.price ?? booking?.finalPrice ?? 0) - (booking?.depositAmount ?? 0)).toLocaleString()}</span>
              </div>
            </div>

            {booking.paymentSlipUrl && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">หลักฐานสลิปการโอนเงิน:</span>
                  {!imageError && (
                    <button
                      type="button"
                      onClick={() => setShowSlipZoom(true)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      ดูรูปขนาดใหญ่
                    </button>
                  )}
                </div>

                {imageError ? (
                  <div className="p-4 bg-slate-100/80 rounded-2xl border border-dashed border-slate-300 text-center space-y-1.5 py-6">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-600">ไม่สามารถโหลดรูปภาพสลิปได้</p>
                    <p className="text-[10px] text-slate-400">รายการนี้อาจเป็นข้อมูลทดสอบระบบ หรือลิงก์ภาพไม่ถูกต้อง</p>
                  </div>
                ) : (
                  <div
                    onClick={() => setShowSlipZoom(true)}
                    className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white max-h-56 flex items-center justify-center"
                  >
                    <img
                      src={booking.paymentSlipUrl}
                      alt="สลิปการโอนเงิน"
                      onError={() => setImageError(true)}
                      className="w-full h-auto max-h-56 object-contain transition-transform duration-200 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-[2px]">
                      <Maximize2 className="w-4 h-4" />
                      <span>คลิกเพื่อดูรูปเต็มจอ</span>
                    </div>
                  </div>
                )}

                {errorMsg && <p className="text-[11px] font-bold text-rose-600">{errorMsg}</p>}
                {booking.paymentStatus !== 'paid' && (
                  <button
                    type="button"
                    onClick={handleVerifyPayment}
                    disabled={isVerifyingPayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isVerifyingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>ยืนยันว่าได้รับเงินแล้ว</span>
                  </button>
                )}
              </div>
            )}
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

        {showRescheduleModal && (
          <LiffRescheduleModal
            booking={booking}
            onClose={() => setShowRescheduleModal(false)}
            onSuccess={() => {
              setShowRescheduleModal(false);
              onClose(); // Close details modal to refresh data
            }}
          />
        )}

      </div>

      {/* Fullscreen Slip Lightbox Modal */}
      {showSlipZoom && booking.paymentSlipUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-60 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSlipZoom(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={booking.paymentSlipUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              เปิดแท็บใหม่
            </a>
            <button
              onClick={() => setShowSlipZoom(false)}
              className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div 
            className="max-w-2xl max-h-[85vh] p-2 bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={booking.paymentSlipUrl}
              alt="สลิปโอนเงินขนาดเต็ม"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
          <p className="text-slate-400 text-xs mt-3">
            คลิกที่ว่างหรือกดปุ่ม ✕ เพื่อปิด
          </p>
        </div>
      )}
    </div>
  );
};
