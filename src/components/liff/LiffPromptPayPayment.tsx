import React, { useState, useEffect } from 'react';
import { Service, Staff, Booking, SelectedAddon, PaymentMethod } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { QrCode, Copy, Check, Sparkles, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

interface LiffPromptPayPaymentProps {
  service: Service;
  staff: Staff | null;
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
    setIsProcessing(true);
    setSubmitError(null);
    const newBooking = await createBooking({
      serviceId: service.id,
      staffId: staff?.id,
      bookingDate: date,
      startTime: time,
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
      setSubmitError('ไม่สามารถยืนยันการจองได้ รอบเวลานี้อาจถูกจองแล้ว กรุณาเลือกเวลาใหม่');
    }
  };

  return (
    <div className="p-4 space-y-6 pb-28">
      <div className="text-center space-y-1 mt-2">
        <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 uppercase tracking-wider shadow-sm">
          Omise PromptPay Gateway
        </span>
        <h2 className="text-lg font-black text-foreground mt-2">ชำระเงินมัดจำผ่าน PromptPay QR</h2>
        <p className="text-[13px] text-slate-500 font-medium">สแกนชำระเงินด้วยแอปพลิเคชันทุกธนาคาร</p>
      </div>

      {/* QR Code Canvas Frame */}
      <div className="premium-card p-6 text-center space-y-5 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* PromptPay Header Banner */}
        <div className="bg-[#113566] text-white py-3 px-4 rounded-xl flex items-center justify-between shadow-md relative z-10">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-300" />
            <span className="text-[13px] font-black tracking-widest">PROMPTPAY</span>
          </div>
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
            Thai QR Payment
          </span>
        </div>

        {/* QR Image Simulation */}
        <div className="relative inline-block bg-white p-4 border-2 border-[#113566]/20 rounded-3xl shadow-lg relative z-10">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021229370016A000000677010111${promptpayNo}`}
            alt="PromptPay QR Code"
            className="w-48 h-48 mx-auto"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <Sparkles className="w-20 h-20 text-[#113566]" />
          </div>
        </div>

        {/* Payment Amount & Account Details */}
        <div className="space-y-1 relative z-10">
          <p className="text-[13px] text-slate-500 font-bold">ยอดเงินมัดจำชำระสุทธิวันนี้</p>
          <div className="text-3xl font-black text-primary tracking-tight">
            ฿{(depositAmount ?? 0).toLocaleString()}
          </div>
          {selectedAddons.length > 0 && (
            <p className="text-[11px] text-slate-400 font-bold mt-1">
              (รวมบริการเสริม {selectedAddons.length} รายการ: +฿{(addonsTotalPrice ?? 0).toLocaleString()})
            </p>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-[13px] space-y-3 text-left shadow-inner relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">บัญชีผู้รับเงิน:</span>
            <span className="font-black text-foreground">{promptpayName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">หมายเลขพร้อมเพย์:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-primary">{promptpayNo}</span>
              <button
                type="button"
                onClick={handleCopyNo}
                className="p-1.5 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                title="คัดลอกหมายเลข"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Timer Alert */}
        <div className="flex items-center justify-center gap-2 text-warning-dark bg-warning/10 py-3 px-4 rounded-xl text-[13px] font-bold border border-warning/20 shadow-sm relative z-10">
          <Clock className="w-5 h-5 text-warning-dark animate-spin-slow" />
          <span>กรุณาชำระเงินภายในเวลา: <strong className="font-mono text-warning-dark text-sm ml-1">{formatTimer(secondsLeft)}</strong></span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 z-40 max-w-[400px] mx-auto space-y-3">
        {submitError && (
          <p className="border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-700">
            {submitError}
          </p>
        )}
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={isProcessing}
          className="w-full btn-primary py-4 px-6 text-[15px] shadow-premium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              กำลังส่งคำขอจอง...
            </span>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>ยืนยันการส่งคำขอจอง</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400 font-bold flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          การจองจะเริ่มด้วยสถานะยังไม่ชำระเงินจนกว่าระบบชำระเงินจะยืนยัน
        </p>
      </div>
    </div>
  );
};
