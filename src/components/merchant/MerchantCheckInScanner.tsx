import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ImagePlus,
  Keyboard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';
import { Booking } from '../../types';
import { BookingApiError } from '../../lib/booking-api';

const READER_ID = 'merchant-checkin-reader';

function normalizeCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^CHECKIN-/i.test(trimmed)) return trimmed.toUpperCase();
  return `CHECKIN-${trimmed.replace(/^#/, '').toUpperCase()}`;
}

function getCheckInError(error: unknown): string {
  if (error instanceof BookingApiError) {
    if (error.code === 'BOOKING_NOT_FOUND') return 'ไม่พบรายการจองนี้ในร้านของคุณ';
    if (error.code === 'INVALID_BOOKING_STATUS') return 'รายการนี้ยังไม่พร้อมเช็กอิน หรือปิดงานไปแล้ว';
    if (error.code === 'VALIDATION_FAILED') return 'QR Code หรือรหัสจองไม่ถูกต้อง';
    if (error.statusCode === 401) return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบร้านค้าใหม่';
  }
  return error instanceof Error ? error.message : 'ไม่สามารถเช็กอินได้ กรุณาลองอีกครั้ง';
}

export const MerchantCheckInScanner: React.FC = () => {
  const { checkInBookingByCode } = useSaaS();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop().catch(() => undefined);
    setIsScanning(false);
  };

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) void scanner.stop().catch(() => undefined);
    scannerRef.current = null;
  }, []);

  const submitCode = async (value: string) => {
    const code = normalizeCode(value);
    if (!code || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      await stopScanner();
      const booking = await checkInBookingByCode(code);
      setResult(booking);
      setManualCode('');
    } catch (submitError) {
      setResult(null);
      setError(getCheckInError(submitError));
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const startScanner = async () => {
    setResult(null);
    setError(null);
    try {
      const scanner = scannerRef.current ?? new Html5Qrcode(READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decodedText) => void submitCode(decodedText),
        () => undefined,
      );
      setIsScanning(true);
    } catch (cameraError) {
      setIsScanning(false);
      setError('เปิดกล้องไม่ได้ กรุณาอนุญาตสิทธิ์กล้องหรือเลือกรูป QR Code แทน');
      console.error('Unable to start QR scanner:', cameraError);
    }
  };

  const scanImage = async (file?: File) => {
    if (!file || processingRef.current) return;
    setResult(null);
    setError(null);
    setIsProcessing(true);
    try {
      await stopScanner();
      const scanner = scannerRef.current ?? new Html5Qrcode(READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      const decodedText = await scanner.scanFile(file, true);
      await submitCode(decodedText);
    } catch (scanError) {
      if (!processingRef.current) setError('ไม่พบ QR Code ที่อ่านได้ในรูปนี้');
      console.error('Unable to scan QR image:', scanError);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setManualCode('');
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 sm:px-8">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
            <QrCode className="w-7 h-7 text-primary" /> สแกนเช็กอิน
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">ตรวจ QR Code จากรายการจองของลูกค้า</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4" /> ตรวจสอบสิทธิ์ร้านค้า
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-lg">
        <div className="relative bg-slate-950 min-h-[340px] flex items-center justify-center">
          <div id={READER_ID} className="w-full max-w-xl [&_video]:object-cover" />
          {!isScanning && !isProcessing && !result && (
            <button type="button" onClick={() => void startScanner()} className="absolute inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-lg shadow-lg">
              <Camera className="w-5 h-5" /> เปิดกล้อง
            </button>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-sm font-bold">กำลังตรวจสอบรายการจอง</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 flex flex-wrap gap-3">
          {isScanning ? (
            <button type="button" onClick={() => void stopScanner()} className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"><CameraOff className="w-4 h-4" /> ปิดกล้อง</button>
          ) : (
            <button type="button" onClick={() => void startScanner()} disabled={isProcessing} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"><Camera className="w-4 h-4" /> สแกนอีกครั้ง</button>
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"><ImagePlus className="w-4 h-4" /> เลือกรูป QR</button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void scanImage(event.target.files?.[0])} />
        </div>
      </div>

      {result && (
        <div className="border border-emerald-200 bg-emerald-50 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-lg font-extrabold text-emerald-900">เช็กอินสำเร็จ</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{result.userName} · {result.serviceName}</p>
            <p className="text-xs text-slate-600 mt-1">#{result.refNo} · {result.bookingDate.split('T')[0]} · {result.startTime}-{result.endTime}</p>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-bold text-sm"><RefreshCw className="w-4 h-4" /> รายการถัดไป</button>
        </div>
      )}

      {error && <div className="border border-rose-200 bg-rose-50 text-rose-700 font-bold text-sm p-4 rounded-lg">{error}</div>}

      <form onSubmit={(event) => { event.preventDefault(); void submitCode(manualCode); }} className="bg-white border border-slate-200 p-5 rounded-lg">
        <label htmlFor="manual-checkin-code" className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-3"><Keyboard className="w-4 h-4 text-primary" /> กรอกรหัสจอง</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input id="manual-checkin-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="BK-XXXXXXXX-XXXXXX" autoComplete="off" className="flex-1 h-11 px-4 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button type="submit" disabled={!manualCode.trim() || isProcessing} className="btn-primary h-11 px-5 text-sm inline-flex items-center justify-center gap-2">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} เช็กอิน
          </button>
        </div>
      </form>
    </div>
  );
};
