import React, { useState, useEffect } from 'react';
import { Service, Staff, Court, Booking, SelectedAddon, PaymentMethod } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { QrCode, Copy, Check, Sparkles, ShieldCheck, AlertCircle, Clock, Upload, Banknote, ImageIcon } from 'lucide-react';
import { generatePromptPayPayload, promptPayQrImageUrl, formatPromptPayDisplay } from '../../utils/promptpay';
import { getBookingSubmitErrorMessage } from '../../lib/booking-error-message';

interface LiffPromptPayPaymentProps {
  service: Service;
  staff: Staff | null;
  court?: Court | null;
  date: string;
  time: string;
  bookingHours?: number;
  selectedAddons?: SelectedAddon[];
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  onBookingComplete: (booking: Booking) => void;
}

// Client-side image compression to ensure fast, reliable slip upload on mobile networks
const compressSlipImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 0.82 quality (~120KB - 250KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const LiffPromptPayPayment: React.FC<LiffPromptPayPaymentProps> = ({
  service,
  staff,
  court,
  date,
  time,
  bookingHours: bookingHoursProp,
  selectedAddons = [],
  customerName,
  customerPhone,
  notes,
  paymentMethod = 'promptpay',
  onBookingComplete,
}) => {
  const { activeTenant, createBooking } = useSaaS();
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60); // 15 mins
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressingSlip, setIsCompressingSlip] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slipDataUrl, setSlipDataUrl] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const isCash = paymentMethod === 'cash';

  // Derive booking hours
  const bookingHours = (() => {
    if (bookingHoursProp && bookingHoursProp > 0) return bookingHoursProp;
    if (time && time.includes(' - ')) {
      const parts = time.split(' - ');
      const startH = parseInt(parts[0].split(':')[0], 10);
      const endH = parseInt(parts[1].split(':')[0], 10);
      const diff = endH - startH;
      return diff > 0 ? diff : 1;
    }
    return 1;
  })();

  const addonsTotalPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const courtExtra = court?.extraPricePerHour || 0;
  const unitPricePerHour = Math.max(0, service.price + courtExtra);
  const totalPrice = (unitPricePerHour * bookingHours) + addonsTotalPrice;

  const depositPct = activeTenant.settings.depositPercentage ?? 50;
  const depositAmount = (totalPrice * depositPct) / 100;
  const promptpayNo = activeTenant.settings.promptpayNumber || '081-234-5678';
  const promptpayName = activeTenant.settings.promptpayName || activeTenant.name;

  const qrImageUrl = (() => {
    try {
      const payload = generatePromptPayPayload(promptpayNo, depositAmount);
      return promptPayQrImageUrl(payload, 300);
    } catch (e) {
      console.warn('Failed to generate EMVCo PromptPay payload:', e);
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(promptpayNo)}`;
    }
  })();

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyNo = () => {
    navigator.clipboard.writeText(promptpayNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipError(null);
    setIsCompressingSlip(true);

    try {
      const compressedDataUrl = await compressSlipImage(file);
      setSlipDataUrl(compressedDataUrl);
    } catch (err) {
      const reader = new FileReader();
      reader.onloadend = () => setSlipDataUrl(reader.result as string);
      reader.onerror = () => setSlipError('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่');
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingSlip(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (isProcessing) return;

    if (!isCash && !slipDataUrl) {
      setSlipError('กรุณาแนบสลิปโอนเงินก่อนยืนยันการจอง');
      return;
    }

    setIsProcessing(true);
    setSubmitError(null);

    // Extract clean HH:mm start time if range string (e.g. "18:00 - 20:00") is passed
    const cleanStartTime = time.includes(' - ') ? time.split(' - ')[0].trim() : time.trim();

    try {
      const newBooking = await createBooking({
        serviceId: service.id,
        staffId: staff?.id,
        courtId: court?.id,
        bookingDate: date,
        startTime: cleanStartTime,
        bookingHours: bookingHours,
        selectedAddons,
        customerName,
        customerPhone,
        notes,
        paymentMethod,
        depositPaid: !isCash,
        paymentSlipUrl: isCash ? undefined : (slipDataUrl || undefined),
        source: 'line_liff',
      });
      if (newBooking) {
        onBookingComplete(newBooking);
      } else {
        setSubmitError('ระบบไม่สามารถยืนยันการจองได้ กรุณากลับไปตรวจสอบข้อมูลแล้วลองใหม่ (รหัส: BOOKING_NOT_CREATED)');
      }
    } catch (error: unknown) {
      setSubmitError(getBookingSubmitErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-5 pb-32 max-w-md mx-auto">
      <div className="text-center space-y-1 mt-1">
        {isCash ? (
          <>
            <h2 className="text-base font-black text-slate-900 mt-1.5">ยืนยันการจอง — ชำระเงินสดหน้าร้าน</h2>
            <p className="text-[12px] text-slate-500 font-medium">ไม่ต้องชำระเงินตอนนี้ จ่ายเต็มจำนวนเมื่อมาถึงร้าน</p>
          </>
        ) : (
          <>
            <h2 className="text-base font-black text-slate-900 mt-1.5">ชำระเงินมัดจำผ่าน PromptPay QR</h2>
            <p className="text-[12px] text-slate-500 font-medium">สแกนชำระเงินด้วยแอปพลิเคชันทุกธนาคาร แล้วแนบสลิปเพื่อยืนยัน</p>
          </>
        )}
      </div>

      {isCash ? (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Banknote className="w-8 h-8" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[12px] text-slate-500 font-bold">ยอดที่ต้องชำระหน้าร้าน</p>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              ฿{(totalPrice ?? 0).toLocaleString()}
            </div>
            {selectedAddons.length > 0 && (
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                (รวมบริการเสริม {selectedAddons.length} รายการ: +฿{(addonsTotalPrice ?? 0).toLocaleString()})
              </p>
            )}
          </div>
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
            ระบบจะยืนยันคิวให้ทันที ร้านค้าจะเก็บเงินสดเต็มจำนวนตอนคุณมาใช้บริการ
          </p>
        </div>
      ) : (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 relative overflow-hidden">
        {/* PromptPay Header Banner */}
        <div className="bg-[#113566] text-white py-2.5 px-4 rounded-2xl flex items-center justify-between shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-300" />
            <span className="text-[12px] font-black tracking-widest">PROMPTPAY</span>
          </div>
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
            Thai QR Payment
          </span>
        </div>

        {/* QR Image Simulation */}
        <div className="relative inline-block bg-white p-3 border-2 border-[#113566]/20 rounded-2xl shadow-md relative z-10">
          <img
            src={qrImageUrl}
            alt="PromptPay QR Code"
            className="w-44 h-44 mx-auto object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <Sparkles className="w-16 h-16 text-[#113566]" />
          </div>
        </div>

        {/* Payment Amount & Account Details */}
        <div className="space-y-0.5 relative z-10">
          <p className="text-[12px] text-slate-500 font-bold">ยอดเงินมัดจำชำระสุทธิวันนี้</p>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">
            ฿{(depositAmount ?? 0).toLocaleString()}
          </div>
          {selectedAddons.length > 0 && (
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              (รวมบริการเสริม {selectedAddons.length} รายการ: +฿{(addonsTotalPrice ?? 0).toLocaleString()})
            </p>
          )}
        </div>

        {/* Responsive Mobile Account Box */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-[12px] space-y-2.5 text-left shadow-inner relative z-10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-bold shrink-0">บัญชีผู้รับเงิน:</span>
            <span className="font-black text-slate-900 truncate text-right">{promptpayName}</span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5">
            <span className="text-slate-500 font-bold text-[11.5px] shrink-0">หมายเลขพร้อมเพย์:</span>
            <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="font-mono font-black text-emerald-600 text-[12px] sm:text-[13px] tracking-wide select-all">
                {promptpayNo}
              </span>
              <button
                type="button"
                onClick={handleCopyNo}
                className="p-1 hover:bg-emerald-50 active:bg-emerald-100 rounded-lg text-emerald-700 transition-colors shrink-0"
                title="คัดลอกหมายเลข"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Timer Alert - 2 Distinct Lines */}
        <div className="flex flex-col items-center justify-center gap-1 text-amber-900 bg-amber-50/90 py-3 px-4 rounded-2xl border border-amber-200/90 shadow-xs relative z-10 text-center">
          <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-amber-800">
            <Clock className="w-4 h-4 text-amber-600 animate-spin-slow shrink-0" />
            <span>กรุณาชำระเงินภายในเวลา</span>
          </div>
          <div className="text-base font-black font-mono text-amber-900 tracking-wider">
            {formatTimer(secondsLeft)} <span className="text-xs font-bold text-amber-700 font-prompt">นาที</span>
          </div>
        </div>
      </div>
      )}

      {/* Slip Upload — required to confirm a non-cash booking */}
      {!isCash && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-[13px] font-black text-slate-900 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            แนบสลิปการโอนเงิน
          </h3>
          {slipDataUrl ? (
            <div className="relative">
              <img src={slipDataUrl} alt="สลิปที่แนบ" className="w-full max-h-56 object-contain rounded-2xl border border-slate-200" />
              <button
                type="button"
                onClick={() => setSlipDataUrl(null)}
                className="absolute top-2 right-2 bg-white/90 border border-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-white shadow-xs"
              >
                เปลี่ยนรูป
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-300 rounded-2xl py-6 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
              {isCompressingSlip ? (
                <>
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[12px] font-bold text-emerald-600">กำลังประมวลผลรูปภาพ...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-[12px] font-bold">แตะเพื่ออัปโหลดสลิป</span>
                </>
              )}
              <input type="file" accept="image/*" disabled={isCompressingSlip} className="hidden" onChange={handleSlipFileChange} />
            </label>
          )}
          {slipError && <p className="text-[11px] font-bold text-rose-600">{slipError}</p>}
          <p className="text-[10px] text-slate-400">ร้านค้าจะตรวจสอบสลิปและยืนยันการชำระเงินให้หลังจากนี้</p>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 z-40 max-w-md mx-auto space-y-2 shadow-lg">
        {submitError && (
          <p className="border border-red-200 bg-red-50 p-2 text-center text-xs font-bold text-red-700 rounded-xl">
            {submitError}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirmBooking}
          disabled={isProcessing || (!isCash && !slipDataUrl)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-6 rounded-2xl text-[14px] shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-98 transition-all"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              กำลังส่งคำขอจอง...
            </span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>{isCash ? 'ยืนยันการจอง' : 'ยืนยันการจอง (แนบสลิปแล้ว)'}</span>
            </>
          )}
        </button>

        <div className="text-[10px] text-center text-slate-400 font-extrabold flex flex-col items-center justify-center gap-0.5 leading-tight pt-0.5">
          <span className="flex items-center gap-1 text-slate-500">
            <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
            {isCash ? 'จองสำเร็จทันที ไม่ต้องรอตรวจสอบการชำระเงิน' : 'การจองจะเริ่มด้วยสถานะรอชำระเงิน'}
          </span>
          {!isCash && <span className="text-slate-400">จนกว่าร้านค้าจะตรวจสอบสลิปและยืนยัน</span>}
        </div>
      </div>
    </div>
  );
};
