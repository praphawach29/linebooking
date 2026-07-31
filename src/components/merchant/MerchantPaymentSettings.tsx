import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { CreditCard, QrCode, ShieldAlert, Check, Save } from 'lucide-react';

export const MerchantPaymentSettings: React.FC = () => {
  const { activeTenant, updateTenantSettings, cancellationPolicies, updateCancellationPolicies } =
    useSaaS();

  const [promptpayNumber, setPromptpayNumber] = useState(
    activeTenant.settings.promptpayNumber || '0812345678'
  );
  const [promptpayName, setPromptpayName] = useState(
    activeTenant.settings.promptpayName || activeTenant.name
  );
  const [depositPct, setDepositPct] = useState(
    activeTenant.settings.depositPercentage ?? 50
  );
  const [savedMsg, setSavedMsg] = useState(false);

  const [policies, setPolicies] = useState(cancellationPolicies);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      promptpayNumber,
      promptpayName,
      depositPercentage: Number(depositPct),
    });
    updateCancellationPolicies(policies);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handlePolicyChange = (index: number, field: 'hoursBefore' | 'refundPercentage', val: number) => {
    const updated = [...policies];
    updated[index] = { ...updated[index], [field]: val };
    setPolicies(updated);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            ตั้งค่าการชำระเงิน & นโยบายยกเลิกคิว (Payments & Policies)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดบัญชีรับเงินมัดจำ PromptPay QR Code และอัตราการคืนเงินกรณีลูกค้ายกเลิก
          </p>
        </div>

        {savedMsg && (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> บันทึกสำเร็จ
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* PromptPay Settings Box */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <QrCode className="w-4 h-4 text-emerald-600" />
            ตั้งค่าบัญชี PromptPay QR (Omise Gateway Integration)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                หมายเลขพร้อมเพย์ (เบอร์โทร / เลขนิติบุคคล) *
              </label>
              <input
                type="text"
                required
                value={promptpayNumber}
                onChange={(e) => setPromptpayNumber(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ชื่อบัญชีแสดงผลเมื่อลูกค้าสแกน *
              </label>
              <input
                type="text"
                required
                value={promptpayName}
                onChange={(e) => setPromptpayName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              สัดส่วนเงินมัดจำที่ต้องชำระออนไลน์ (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={depositPct}
                onChange={(e) => setDepositPct(Number(e.target.value))}
                className="flex-1 accent-emerald-600 cursor-pointer"
              />
              <span className="font-extrabold text-sm text-slate-900 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 font-mono">
                {depositPct}% ({depositPct === 100 ? 'ชำระเต็มจำนวน' : depositPct === 0 ? 'ไม่ต้องมัดจำ' : 'มัดจำบางส่วน'})
              </span>
            </div>
          </div>
        </div>

        {/* Cancellation Policies Box */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            นโยบายการคืนเงินมัดจำกรณีลูกค้ายกเลิก (Cancellation Refund Rules)
          </h2>

          <div className="space-y-3">
            {policies.map((pol, idx) => (
              <div
                key={pol.id || idx}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900">{pol.name}</p>
                  <p className="text-[11px] text-slate-500">
                    ยื่นขอยกเลิกล่วงหน้าอย่างน้อย {pol.hoursBefore} ชั่วโมง
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">คืนเงิน:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pol.refundPercentage}
                      onChange={(e) => handlePolicyChange(idx, 'refundPercentage', Number(e.target.value))}
                      className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold font-mono"
                    />
                    <span className="font-bold text-slate-700">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-colors text-xs"
        >
          <Save className="w-4 h-4" />
          <span>บันทึกการตั้งค่าทั้งหมด</span>
        </button>

      </form>

    </div>
  );
};
