import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  Check,
} from "lucide-react";
import { motion } from "motion/react";
import { useSaaS } from "../../context/SaaSContext";
import { Booking } from "../../types";
import { BookingApiError } from "../../lib/booking-api";

const READER_ID = "merchant-checkin-reader";

function normalizeCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^CHECKIN-/i.test(trimmed)) return trimmed.toUpperCase();
  return `CHECKIN-${trimmed.replace(/^#/, "").toUpperCase()}`;
}

function getCheckInError(error: unknown): string {
  if (error instanceof BookingApiError) {
    if (error.code === "BOOKING_NOT_FOUND")
      return "ไม่พบรายการจองนี้ในร้านของคุณ";
    if (error.code === "INVALID_BOOKING_STATUS")
      return "รายการนี้ยังไม่พร้อมเช็กอิน หรือปิดงานไปแล้ว";
    if (error.code === "VALIDATION_FAILED")
      return "QR Code หรือรหัสจองไม่ถูกต้อง";
    if (error.statusCode === 401)
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบร้านค้าใหม่";
  }
  return error instanceof Error
    ? error.message
    : "ไม่สามารถเช็กอินได้ กรุณาลองอีกครั้ง";
}

export const MerchantCheckInScanner: React.FC = () => {
  const { checkInBookingByCode } = useSaaS();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async (clearReader = true) => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop().catch(() => undefined);
    if (clearReader && scanner) {
      try {
        scanner.clear();
      } catch {
        // The reader may already have been cleared after a successful scan.
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsStarting(false);
  };

  useEffect(
    () => () => {
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        void scanner.stop().finally(() => {
          try {
            scanner.clear();
          } catch {
            // Component teardown can race with html5-qrcode cleanup.
          }
        });
      }
      scannerRef.current = null;
    },
    [],
  );

  const submitCode = async (value: string) => {
    const code = normalizeCode(value);
    if (!code || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      await stopScanner(true);
      const booking = await checkInBookingByCode(code);
      setResult(booking);
      setManualCode("");
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
    setIsStarting(true);
    try {
      await stopScanner(true);
      setIsStarting(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decodedText) => void submitCode(decodedText),
        () => undefined,
      );
      setIsScanning(true);
      setIsStarting(false);
    } catch (cameraError) {
      setIsScanning(false);
      setIsStarting(false);
      setError(
        "เปิดกล้องไม่ได้ กรุณาอนุญาตสิทธิ์กล้องหรือเลือกรูป QR Code แทน",
      );
      console.error("Unable to start QR scanner:", cameraError);
    }
  };

  const scanImage = async (file?: File) => {
    if (!file || processingRef.current) return;
    setResult(null);
    setError(null);
    setIsProcessing(true);
    try {
      await stopScanner(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      const decodedText = await scanner.scanFile(file, true);
      await submitCode(decodedText);
    } catch (scanError) {
      if (!processingRef.current) setError("ไม่พบ QR Code ที่อ่านได้ในรูปนี้");
      console.error("Unable to scan QR image:", scanError);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 sm:px-8">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
            <QrCode className="w-7 h-7 text-primary" /> สแกนเช็กอิน
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            ตรวจ QR Code จากรายการจองของลูกค้า
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4" /> ตรวจสอบสิทธิ์ร้านค้า
        </div>
      </div>

      {!result && !isProcessing && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-lg"
        >
          <div className="relative bg-slate-950 min-h-[340px] flex items-center justify-center">
            <div
              id={READER_ID}
              className="w-full h-full max-w-2xl [&_video]:!block [&_video]:!w-full [&_video]:!h-full [&_video]:min-h-[340px] [&_video]:object-cover"
            />
            {!isScanning && !isStarting && (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="absolute inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-lg shadow-lg"
              >
                <Camera className="w-5 h-5" /> เปิดกล้อง
              </button>
            )}
            {isStarting && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="text-sm font-bold">
                  กำลังเปิดกล้อง
                </span>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-200 flex flex-wrap gap-3">
            {isScanning ? (
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <CameraOff className="w-4 h-4" /> ปิดกล้อง
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startScanner()}
                disabled={isProcessing || isStarting}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Camera className="w-4 h-4" /> เปิดกล้องสแกน
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isStarting}
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <ImagePlus className="w-4 h-4" /> เลือกรูป QR
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void scanImage(event.target.files?.[0])}
            />
          </div>
        </motion.div>
      )}

      {isProcessing && !result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-blue-200 bg-blue-50 p-12 rounded-lg flex flex-col items-center justify-center gap-6 text-center min-h-[340px]"
        >
          <div className="relative">
            <div className="w-20 h-20 bg-blue-200 rounded-full animate-ping absolute inset-0 opacity-50" />
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center relative z-10">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-blue-900">กำลังตรวจสอบข้อมูล</p>
            <p className="text-sm font-bold text-slate-600 mt-2">ระบบกำลังยืนยันการเช็กอิน กรุณารอสักครู่...</p>
          </div>
        </motion.div>
      )}

      {result && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
          className="border-2 border-emerald-500 bg-emerald-50 p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center gap-6 relative overflow-hidden shadow-xl"
        >
          {/* Background decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-200 rounded-full blur-3xl opacity-50" />
          
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.6, delay: 0.2 }}
            className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", bounce: 0.6 }}
            >
              <Check className="w-12 h-12 text-emerald-600 stroke-[3]" />
            </motion.div>
          </motion.div>

          <div className="relative z-10 max-w-md">
            <h2 className="text-3xl font-extrabold text-emerald-900 mb-2">
              เช็กอินสำเร็จ!
            </h2>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100 mb-4 text-left">
              <p className="text-lg font-bold text-slate-800">
                {result.userName}
              </p>
              <p className="text-sm font-semibold text-emerald-600 mt-1">
                {result.serviceName}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                <span>Ref: #{result.refNo}</span>
                <span>{result.bookingDate.split("T")[0]}</span>
                <span>{result.startTime}-{result.endTime}</span>
              </div>
            </div>
            
            <p className="text-sm font-bold text-emerald-700 bg-emerald-100 py-2 px-4 rounded-full inline-block">
              สถานะอัปเดตเรียบร้อย ระบบแจ้งเตือนไปยังลูกค้าแล้ว
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => void startScanner()}
            className="relative z-10 mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-md w-full sm:w-auto transition-colors"
          >
            <RefreshCw className="w-5 h-5" /> สแกนรายการถัดไป
          </motion.button>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="border border-rose-200 bg-rose-50 text-rose-700 font-bold text-sm p-4 rounded-lg flex items-start gap-3"
        >
          <div className="mt-0.5"><ShieldCheck className="w-5 h-5" /></div>
          <div>{error}</div>
        </motion.div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitCode(manualCode);
        }}
        className="bg-white border border-slate-200 p-5 rounded-lg"
      >
        <label
          htmlFor="manual-checkin-code"
          className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-3"
        >
          <Keyboard className="w-4 h-4 text-primary" /> กรอกรหัสจอง
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="manual-checkin-code"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="BK-XXXXXXXX-XXXXXX"
            autoComplete="off"
            className="flex-1 h-11 px-4 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || isProcessing}
            className="btn-primary h-11 px-5 text-sm inline-flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}{" "}
            เช็กอิน
          </button>
        </div>
      </form>
    </div>
  );
};
