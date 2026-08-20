import React, { useState, useEffect } from 'react';
import {
  fetchOmiseReconciliation,
  syncInvoiceWithOmise,
  refundInvoiceViaBackend,
} from '../../lib/billing';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Search,
  DollarSign,
  Receipt,
  Check,
} from 'lucide-react';

export const AdminReconciliation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalChargesChecked: number;
    totalInvoicesChecked: number;
    discrepancyCount: number;
    discrepancies: Array<{
      type: string;
      description: string;
      invoiceId?: string;
      chargeId?: string;
      dbStatus?: string;
      omiseStatus?: string;
      dbAmount?: number;
      omiseAmount?: number;
      chargeCreatedAt?: string;
      invoiceCreatedAt?: string;
    }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setActionSuccess(null);
    const res = await fetchOmiseReconciliation();
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      setError(res.error || 'ไม่สามารถโหลดข้อมูลกระทบยอดได้');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async (invoiceId: string) => {
    setSyncingId(invoiceId);
    setActionSuccess(null);
    const res = await syncInvoiceWithOmise(invoiceId);
    if (res.ok) {
      setActionSuccess(`ซิงค์สถานะใบแจ้งหนี้ #${invoiceId} สำเร็จ`);
      await loadData();
    } else {
      alert('ซิงค์ไม่สำเร็จ: ' + res.error);
    }
    setSyncingId(null);
  };

  const handleRefund = async (invoiceId: string) => {
    if (!refundReason.trim()) {
      alert('กรุณาระบุเหตุผลการคืนเงิน');
      return;
    }
    const confirmed = window.confirm(
      `ยืนยันการคืนเงินสำหรับใบแจ้งหนี้ #${invoiceId} ผ่าน Omise API หรือไม่?`,
    );
    if (!confirmed) return;

    setSyncingId(invoiceId);
    const res = await refundInvoiceViaBackend(invoiceId, refundReason);
    if (res.ok) {
      setActionSuccess(`ทำรายการคืนเงินสำเร็จ`);
      setRefundingId(null);
      setRefundReason('');
      await loadData();
    } else {
      alert('คืนเงินไม่สำเร็จ: ' + res.error);
    }
    setSyncingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-indigo-600" />
            <span>กระทบยอดการเงิน (Omise vs Database Reconciliation)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ตรวจสอบความถูกต้องของยอดเงิน สถานะการจ่าย และการคืนเงิน ระหว่างเกตเวย์ Omise กับฐานข้อมูล
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>ตรวจสอบยอดใหม่ (Re-run)</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Omise Charges ที่ตรวจ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {loading ? '...' : data?.totalChargesChecked ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">รายการธุรกรรมล่าสุดจาก Omise API</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Subscription Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {loading ? '...' : data?.totalInvoicesChecked ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">ใบแจ้งหนี้ในฐานข้อมูล</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">รายการที่พบความผิดปกติ</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              (data?.discrepancyCount ?? 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {(data?.discrepancyCount ?? 0) > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${
            (data?.discrepancyCount ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {loading ? '...' : data?.discrepancyCount ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">
            {(data?.discrepancyCount ?? 0) === 0 ? 'ยอดเงินและสถานะตรงกัน 100%' : 'ต้องตรวจสอบหรือกด Sync'}
          </span>
        </div>
      </div>

      {/* Discrepancy Table or All Clear Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">
            รายการความผิดปกติและข้อขัดแย้ง (Discrepancy Log)
          </h3>
          <span className="text-xs text-slate-400">
            {data?.discrepancies.length ?? 0} รายการ
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span>กำลังตรวจสอบและคำนวณกระทบยอด...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-xs">
            {error}
          </div>
        ) : data && data.discrepancies.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">ไม่พบความผิดปกติของยอดเงิน</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              รายการชำระเงินและสถานะใน Omise ตรงกับฐานข้อมูล subscription_invoices ทุกประการ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">ประเภทข้อผิดพลาด</th>
                  <th className="px-6 py-3">รายละเอียด</th>
                  <th className="px-6 py-3">สถานะ (DB vs Omise)</th>
                  <th className="px-6 py-3">ยอดเงิน (DB vs Omise)</th>
                  <th className="px-6 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data?.discrepancies.map((d, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {d.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-bold">{d.description}</p>
                      {d.invoiceId && (
                        <p className="text-[10px] font-mono text-slate-400">Invoice: #{d.invoiceId}</p>
                      )}
                      {d.chargeId && (
                        <p className="text-[10px] font-mono text-slate-400">Charge: {d.chargeId}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-[11px]">
                        <p><span className="text-slate-400">DB:</span> <span className="font-bold">{d.dbStatus || '-'}</span></p>
                        <p><span className="text-slate-400">Omise:</span> <span className="font-bold text-indigo-600">{d.omiseStatus || '-'}</span></p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-[11px]">
                        <p><span className="text-slate-400">DB:</span> ฿{(d.dbAmount ?? 0).toLocaleString()}</p>
                        <p><span className="text-slate-400">Omise:</span> <span className="font-bold text-indigo-600">฿{(d.omiseAmount ?? 0).toLocaleString()}</span></p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {d.invoiceId && (
                        <button
                          onClick={() => handleSync(d.invoiceId!)}
                          disabled={syncingId === d.invoiceId}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition disabled:opacity-50"
                        >
                          {syncingId === d.invoiceId ? 'กำลังซิงค์...' : 'Sync จาก Omise'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
