import React, { useState, useEffect } from 'react';
import { Service, Staff, Court, Booking, SelectedAddon, PaymentMethod } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { QrCode, Copy, Check, Sparkles, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { generatePromptPayPayload, promptPayQrImageUrl, formatPromptPayDisplay } from '../../utils/promptpay';

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
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const totalPrice = (service.price * bookingHours) + addonsTotalPrice;

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

  const handleSimulatePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSubmitError(null);

    // Extract clean HH:mm start time if range string (e.g. "18:00 - 20:00") is passed
    const cleanStartTime = time.includes(' - ') ? time.split(' - ')[0].trim() : time.trim();

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
      source: 'line_liff',
    });
    setIsProcessing(false);
    if (newBooking) {
      onBookingComplete(newBooking);
    } else {
      setSubmitError('ไม่สามารถยืนยันการจองได้ รอบเวลานี้อาจถูกจองแล้ว หรือช่วงเวลาไม่ถูกต้อง');
    }
  };

  return (
    <div className="p-4 space-y-5 pb-32 max-w-md mx-auto">
      <div className="text-center space-y-1 mt-1">
        <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 uppercase tracking-wider shadow-sm">
          Omise PromptPay Gateway
        </span>
        <h2 className="text-base font-black text-slate-900 mt-1.5">ชำระเงินมัดจำผ่าน PromptPay QR</h2>
        <p className="text-[12px] text-slate-500 font-medium">สแกนชำระเงินด้วยแอปพลิเคชันทุกธนาคาร</p>
      </div>

      {/* QR Code Canvas Frame */}
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

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2">
            <span className="text-slate-500 font-bold shrink-0">หมายเลขพร้อมเพย์:</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono font-black text-emerald-600 text-sm tracking-wider whitespace-nowrap">
                {promptpayNo}
              </span>
              <button
                type="button"
                onClick={handleCopyNo}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors border border-emerald-200 shrink-0"
                title="คัดลอกหมายเลข"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 z-40 max-w-md mx-auto space-y-2 shadow-lg">
        {submitError && (
          <p className="border border-red-200 bg-red-50 p-2 text-center text-xs font-bold text-red-700 rounded-xl">
            {submitError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={isProcessing}
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
              <span>ยืนยันการส่งคำขอจอง</span>
            </>
          )}
        </button>

        <div className="text-[10px] text-center text-slate-400 font-extrabold flex flex-col items-center justify-center gap-0.5 leading-tight pt-0.5">
          <span className="flex items-center gap-1 text-slate-500">
            <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
            การจองจะเริ่มด้วยสถานะรอชำระเงิน
          </span>
          <span className="text-slate-400">จนกว่าระบบชำระเงินจะได้รับการยืนยัน</span>
        </div>
      </div>
    </div>
  );
};
