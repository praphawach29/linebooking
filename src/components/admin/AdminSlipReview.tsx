import React, { useCallback, useEffect, useState } from 'react';
import {
  approveSlip,
  fetchSlips,
  getSlipImageUrl,
  PaymentSlip,
  rejectSlip,
  SlipCheck,
  slipStatusLabel,
} from '../../lib/slips';
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

const toneClasses: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface AdminSlipReviewProps {
  onCountChange?: (count: number) => void;
}

export const AdminSlipReview: React.FC<AdminSlipReviewProps> = ({ onCountChange }) => {
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewSlip, setPreviewSlip] = useState<PaymentSlip | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const list = await fetchSlips({ onlyPending: !showAll });
    setSlips(list);
    onCountChange?.(list.filter((s) => s.verificationStatus !== 'manual_approved' && s.verificationStatus !== 'manual_rejected').length);
    setIsLoading(false);
  }, [showAll, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  // ขอ signed URL ใหม่ทุกครั้งที่เปิดดู (bucket เป็น private, URL หมดอายุใน 5 นาที)
  const openPreview = async (slip: PaymentSlip) => {
    setPreviewSlip(slip);
    setPreviewUrl(null);
    const url = await getSlipImageUrl(slip.storagePath);
    setPreviewUrl(url);
  };

  const run = async (key: string, fn: () => Promise<any>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
      setPreviewSlip(null);
      setRejectingId(null);
      setRejectReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const renderChecks = (slip: PaymentSlip) => {
    if (!slip.checks) return null;
    const items = Object.values(slip.checks) as (SlipCheck | undefined)[];
    if (items.length === 0) return null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
        {items.map(
          (c) =>
            c && (
              <div key={c.label} className="flex items-start gap-1.5 text-[11px]">
                {c.pass ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <span className={`font-bold ${c.pass ? 'text-slate-600' : 'text-red-700'}`}>{c.label}</span>
                  <span className="text-slate-400"> — {c.detail}</span>
                </div>
              </div>
            )
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">ตรวจสอบสลิปโอนเงิน</h2>
            <p className="text-xs text-slate-500 font-medium">
              อนุมัติแล้วระบบจะต่ออายุแพ็กเกจให้ร้านค้าทันที
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            แสดงที่ตรวจแล้วด้วย
          </label>
          <button
            onClick={load}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="รีเฟรช"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
        </div>
      ) : slips.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-sm font-bold text-slate-700">ไม่มีสลิปรอตรวจสอบ</p>
          <p className="text-xs text-slate-400">
            เมื่อร้านค้าแนบสลิปเข้ามา รายการจะขึ้นที่นี่ (หรือถูกอนุมัติอัตโนมัติถ้าตรวจผ่านครบทุกข้อ)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slips.map((slip) => {
            const badge = slipStatusLabel(slip.verificationStatus);
            const isReviewed =
              slip.verificationStatus === 'manual_approved' || slip.verificationStatus === 'manual_rejected';

            return (
              <div
                key={slip.id}
                className="border border-slate-200 rounded-2xl p-4 hover:bg-slate-50/60 transition-colors space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {slip.tenantLogo && (
                      <img
                        src={slip.tenantLogo}
                        alt={slip.tenantName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-900 text-sm truncate">{slip.tenantName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${toneClasses[badge.tone]}`}>
                          {badge.text}
                        </span>
                        {slip.verifyProvider !== 'manual' && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg uppercase">
                            {slip.verifyProvider}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {slip.invoiceNo} · {slip.plan?.toUpperCase()} /{' '}
                        {slip.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'} ·{' '}
                        <span className="font-bold text-emerald-600">฿{slip.amountClaimed.toLocaleString()}</span>
                        {slip.amountVerified != null && slip.amountVerified !== slip.amountClaimed && (
                          <span className="text-red-600 font-bold"> (สลิป ฿{slip.amountVerified.toLocaleString()})</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(slip.createdAt).toLocaleString('th-TH')}
                        {slip.senderName && <span> · โอนโดย {slip.senderName}</span>}
                        {slip.transRef && <span className="font-mono"> · ref {slip.transRef}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openPreview(slip)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> ดูสลิป
                    </button>

                    {!isReviewed && (
                      <>
                        <button
                          onClick={() => setRejectingId(rejectingId === slip.id ? null : slip.id)}
                          className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl"
                        >
                          ปฏิเสธ
                        </button>
                        <button
                          onClick={() => run(`ap-${slip.id}`, () => approveSlip(slip.id))}
                          disabled={busy === `ap-${slip.id}`}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                        >
                          {busy === `ap-${slip.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          อนุมัติ
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {renderChecks(slip)}

                {slip.rejectReason && (
                  <p className="text-[11px] text-red-700 font-bold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    เหตุผล: {slip.rejectReason}
                  </p>
                )}

                {rejectingId === slip.id && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="เหตุผลที่ปฏิเสธ (ร้านค้าจะเห็นข้อความนี้)"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-400"
                    />
                    <button
                      onClick={() =>
                        run(`rj-${slip.id}`, () => rejectSlip(slip.id, rejectReason || 'สลิปไม่ถูกต้อง'))
                      }
                      disabled={busy === `rj-${slip.id}`}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
                    >
                      {busy === `rj-${slip.id}` ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธ'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ดูรูปสลิป */}
      {previewSlip && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewSlip(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm">สลิปของ {previewSlip.tenantName}</h3>
                <p className="text-[11px] text-slate-500">{previewSlip.invoiceNo}</p>
              </div>
              <button
                onClick={() => setPreviewSlip(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewUrl ? (
              <img src={previewUrl} alt="สลิป" className="w-full rounded-2xl border border-slate-200" />
            ) : (
              <div className="py-20 flex items-center justify-center gap-2 text-xs text-slate-500 font-bold">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดรูป...
              </div>
            )}

            {previewSlip.note && <p className="text-xs text-slate-600">หมายเหตุ: {previewSlip.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
