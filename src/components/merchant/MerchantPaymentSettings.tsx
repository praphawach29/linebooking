import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { CreditCard, QrCode, ShieldAlert, Check, Save, Sparkles, Zap, Wallet, Lock } from 'lucide-react';
import { MerchantSubscriptionModal } from './MerchantSubscriptionModal';
import { MerchantBillingPortal } from './MerchantBillingPortal';
import { PaymentMethod } from '../../types';

const DEFAULT_ENABLED_METHODS: PaymentMethod[] = ['promptpay', 'cash'];

const PAYMENT_METHOD_META: Partial<Record<PaymentMethod, { label: string; desc: string; icon: React.ElementType; comingSoon?: boolean }>> = {
  promptpay: { label: 'PromptPay QR', desc: 'ลูกค้าสแกน QR โอนแล้วอัปโหลดสลิปให้ร้านตรวจสอบ', icon: QrCode },
  cash: { label: 'เงินสดหน้าร้าน', desc: 'ลูกค้าจองไว้ก่อน แล้วจ่ายเมื่อมาถึงร้าน', icon: Wallet },
  credit_card: { label: 'บัตรเครดิต/เดบิต', desc: 'ต้องเชื่อมต่อ payment gateway ก่อนจึงจะเปิดใช้งานได้', icon: CreditCard, comingSoon: true },
};

export const MerchantPaymentSettings: React.FC = () => {
  const { activeTenant, updateTenantSettings, cancellationPolicies, updateCancellationPolicies } =
    useSaaS();

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [promptpayNumber, setPromptpayNumber] = useState(
    activeTenant.settings.promptpayNumber || '0812345678'
  );
  const [promptpayName, setPromptpayName] = useState(
    activeTenant.settings.promptpayName || activeTenant.name
  );
  const [depositPct, setDepositPct] = useState(
    activeTenant.settings.depositPercentage ?? 50
  );
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethod[]>(
    activeTenant.settings.enabledPaymentMethods || DEFAULT_ENABLED_METHODS
  );
  const [savedMsg, setSavedMsg] = useState(false);

  const [policies, setPolicies] = useState(cancellationPolicies);

  const toggleMethod = (method: PaymentMethod) => {
    if (PAYMENT_METHOD_META[method].comingSoon) return;
    setEnabledMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      promptpayNumber,
      promptpayName,
      depositPercentage: Number(depositPct),
      enabledPaymentMethods: enabledMethods.length > 0 ? enabledMethods : DEFAULT_ENABLED_METHODS,
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
      
      {/* SaaS Subscription Billing Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-5 rounded-3xl border border-emerald-500/30 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">แพ็กเกจ SaaS ของร้านค้าคุณ:</span>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase font-mono">
                {activeTenant?.plan?.toUpperCase()} PLAN
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              ชำระค่าบริการให้ระบบผ่าน PromptPay QR หรือ บัตรเครดิต ต่ออายุอัตโนมัติ
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSubscriptionModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 text-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>ต่ออายุ / อัปเกรดแพ็กเกจ</span>
        </button>
      </div>

      {/* ต่ออายุอัตโนมัติ / บัตรที่ผูกไว้ / ประวัติการเรียกเก็บ */}
      <MerchantBillingPortal />

      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            ตั้งค่าการชำระเงิน & นโยบายยกเลิกคิว (Payments & Policies)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดบัญชีรับเงินมัดจำ PromptPay QR Code สำหรับลูกค้าของคุณ
          </p>
        </div>

        {savedMsg && (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> บันทึกสำเร็จ
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Enabled Payment Methods Box */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Wallet className="w-4 h-4 text-emerald-600" />
            วิธีชำระเงินที่เปิดให้ลูกค้าเลือกได้
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((method) => {
              const meta = PAYMENT_METHOD_META[method]!;
              const Icon = meta.icon;
              const isEnabled = enabledMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => toggleMethod(method)}
                  disabled={meta.comingSoon}
                  className={`text-left p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                    meta.comingSoon
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : isEnabled
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isEnabled && !meta.comingSoon ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{meta.label}</span>
                      {meta.comingSoon ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 flex items-center gap-1 shrink-0">
                          <Lock className="w-2.5 h-2.5" /> เร็วๆ นี้
                        </span>
                      ) : (
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                          isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                          }`} />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{meta.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PromptPay Settings Box */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <QrCode className="w-4 h-4 text-emerald-600" />
            ตั้งค่าบัญชี PromptPay QR รับเงินมัดจำจากลูกค้าของร้าน
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

      {/* Subscription Payment Modal */}
      <MerchantSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
};
