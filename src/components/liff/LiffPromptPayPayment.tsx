import React, { useState, useEffect } from 'react';
import { Service, Staff, Booking, SelectedAddon, PaymentMethod } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { QrCode, Copy, Check, Sparkles, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

interface LiffPromptPayPaymentProps {
  service: Service;
  staff: Staff | null;
  date: string;
  time: string;
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

  const addonsTotalPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = service.price + addonsTotalPrice;

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

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newBooking = createBooking({
        serviceId: service.id,
        staffId: staff?.id,
        bookingDate: date,
        startTime: time,
        selectedAddons,
        customerName,
        customerPhone,
        notes,
        paymentMethod,
        depositPaid: true,
        source: 'line_liff',
      });
      setIsProcessing(false);
      onBookingComplete(newBooking);
    }, 1200);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center space-y-1">
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
          Omise PromptPay Gateway
        </span>
        <h2 className="text-base font-bold text-slate-900">ชำระเงินมัดจำผ่าน PromptPay QR</h2>
        <p className="text-xs text-slate-500">สแกนชำระเงินด้วยแอปพลิเคชันทุกธนาคาร</p>
      </div>

      {/* QR Code Canvas Frame */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
        
        {/* PromptPay Header Banner */}
        <div className="bg-blue-900 text-white py-2 px-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-300" />
            <span className="text-xs font-bold tracking-wider">PROMPTPAY</span>
          </div>
          <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded">
            Thai QR Payment
          </span>
        </div>

        {/* QR Image Simulation */}
        <div className="relative inline-block bg-white p-3 border-2 border-slate-900 rounded-2xl shadow-inner">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021229370016A000000677010111${promptpayNo}`}
            alt="PromptPay QR Code"
            className="w-48 h-48 mx-auto"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <Sparkles className="w-16 h-16 text-slate-900" />
          </div>
        </div>

        {/* Payment Amount & Account Details */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">ยอดเงินมัดจำชำระสุทธิวันนี้</p>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            ฿{(depositAmount ?? 0).toLocaleString()}
          </div>
          {selectedAddons.length > 0 && (
            <p className="text-[10px] text-slate-500 font-medium">
              (รวมบริการเสริม {selectedAddons.length} รายการ: +฿{(addonsTotalPrice ?? 0).toLocaleString()})
            </p>
          )}
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">บัญชีผู้รับเงิน:</span>
            <span className="font-bold text-slate-900">{promptpayName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">หมายเลขพร้อมเพย์:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-900">{promptpayNo}</span>
              <button
                type="button"
                onClick={handleCopyNo}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="คัดลอกหมายเลข"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Timer Alert */}
        <div className="flex items-center justify-center gap-2 text-amber-800 bg-amber-50 py-2 px-3 rounded-xl text-xs font-semibold border border-amber-200/80">
          <Clock className="w-4 h-4 text-amber-600 animate-spin" />
          <span>กรุณาชำระเงินภายในเวลา: <strong className="font-mono text-amber-900">{formatTimer(secondsLeft)}</strong></span>
        </div>
      </div>

      {/* Simulator Payment Confirmation Button */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={isProcessing}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors text-sm disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              กำลังตรวจสอบรายการชำระเงิน...
            </span>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>จำลองการสแกนชำระเงินสำเร็จ (Simulate Paid)</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          ระบบจะสแกน Webhook ยืนยันสลิปอัตโนมัติภายใน 1-2 วินาที
        </p>
      </div>
    </div>
  );
};
