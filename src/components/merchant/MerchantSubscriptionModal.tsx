import React, { useState, useEffect, useMemo } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { BillingCycle, PlatformBillingPublic, SubscriptionInvoice, TenantPlan } from '../../types';
import {
  calcNextExpiry,
  chargeSubscriptionViaBackend,
  createOmiseCardToken,
  createSubscriptionInvoice,
  DEFAULT_BILLING_SETTINGS,
  fetchPublicBillingSettings,
  getPlanPrice,
  isOmiseBackendConfigured,
  markInvoiceFailed,
  markInvoicePaid,
} from '../../lib/billing';
import {
  formatPromptPayDisplay,
  generatePromptPayPayload,
  promptPayQrImageUrl,
} from '../../utils/promptpay';
import { submitSlip, SubmitSlipResult, MAX_SLIP_SIZE, SlipCheck } from '../../lib/slips';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Sparkles,
  X,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Upload,
  Clock,
  FileImage,
} from 'lucide-react';

interface MerchantSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MerchantSubscriptionModal: React.FC<MerchantSubscriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeTenant, updateTenant } = useSaaS();

  const [billing, setBilling] = useState<PlatformBillingPublic>(DEFAULT_BILLING_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>(
    activeTenant?.plan && activeTenant.plan !== 'free' ? activeTenant.plan : 'pro'
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'credit_card'>('promptpay');

  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paidInvoice, setPaidInvoice] = useState<SubscriptionInvoice | null>(null);

  // ขั้นตอนแนบสลิป (PromptPay)
  const [pendingInvoice, setPendingInvoice] = useState<SubscriptionInvoice | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipResult, setSlipResult] = useState<SubmitSlipResult | null>(null);

  // โหลดการตั้งค่ารับชำระเงินที่ Super Admin ตั้งไว้
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingSettings(true);
    fetchPublicBillingSettings()
      .then((s) => {
        if (!cancelled) setBilling(s);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // ถ้าแพลตฟอร์มยังไม่เปิด Omise ให้บังคับใช้ PromptPay
  useEffect(() => {
    if (!billing.omiseEnabled && paymentMethod === 'credit_card') setPaymentMethod('promptpay');
  }, [billing.omiseEnabled, paymentMethod]);

  const amount = useMemo(
    () => getPlanPrice(billing, selectedPlan, billingCycle),
    [billing, selectedPlan, billingCycle]
  );

  // PromptPay payload จริงตามมาตรฐาน EMVCo — สแกนจ่ายได้ด้วยแอปธนาคาร
  const qr = useMemo(() => {
    if (!billing.promptpayNumber) return { payload: '', imageUrl: '', error: 'แพลตฟอร์มยังไม่ได้ตั้งค่าเลขพร้อมเพย์รับชำระเงิน' };
    try {
      const payload = generatePromptPayPayload(billing.promptpayNumber, amount);
      return { payload, imageUrl: promptPayQrImageUrl(payload, 300), error: null as string | null };
    } catch (err: any) {
      return { payload: '', imageUrl: '', error: err.message as string };
    }
  }, [billing.promptpayNumber, amount]);

  const nextExpiry = useMemo(
    () => calcNextExpiry(activeTenant?.planExpiresAt, billingCycle),
    [activeTenant?.planExpiresAt, billingCycle]
  );

  if (!isOpen || !activeTenant) return null;

  const applyRenewal = async (invoice: SubscriptionInvoice, providerRef?: string) => {
    await markInvoicePaid(invoice.id, providerRef);
    if (billing.autoRenewOnPayment) {
      await updateTenant(activeTenant.id, {
        plan: selectedPlan,
        planExpiresAt: invoice.periodEnd || nextExpiry.toISOString(),
      });
    }
    setPaidInvoice({ ...invoice, status: 'paid', providerRef, paidAt: new Date().toISOString() });
  };

  /**
   * ขั้นที่ 1 — ออกใบแจ้งหนี้ + QR ล็อกยอด
   * (ยังไม่ต่ออายุ ต้องแนบสลิปแล้วผ่านการตรวจสอบก่อน)
   */
  const handleCreateInvoice = async () => {
    setErrorMsg(null);
    if (qr.error) {
      setErrorMsg(qr.error);
      return;
    }
    setIsProcessing(true);
    try {
      const invoice = await createSubscriptionInvoice({
        tenantId: activeTenant.id,
        plan: selectedPlan,
        billingCycle,
        amount,
        currency: billing.currency,
        method: 'promptpay',
        provider: 'promptpay',
        qrPayload: qr.payload,
        currentExpiry: activeTenant.planExpiresAt,
      });
      if (!invoice) throw new Error('ออกใบแจ้งหนี้ไม่สำเร็จ');
      setPendingInvoice(invoice);
    } catch (err: any) {
      setErrorMsg(err.message || 'ออกใบแจ้งหนี้ไม่สำเร็จ');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * ขั้นที่ 2 — แนบสลิปเพื่อตรวจสอบ
   * ผ่านการตรวจครบทุกข้อ → ต่ออายุอัตโนมัติ / ไม่ผ่าน → เข้าคิวให้เจ้าหน้าที่ตรวจ
   */
  const handleSubmitSlip = async () => {
    if (!pendingInvoice || !slipFile) return;
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const result = await submitSlip({
        tenantId: activeTenant.id,
        invoiceId: pendingInvoice.id,
        file: slipFile,
        note: `ต่ออายุ ${selectedPlan.toUpperCase()} (${billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'})`,
      });

      if (result.autoApproved) {
        // ฝั่งเซิร์ฟเวอร์อนุมัติและต่ออายุให้แล้ว — ซิงก์ state ในหน้าเว็บให้ตรงกัน
        await updateTenant(activeTenant.id, {
          plan: pendingInvoice.plan,
          planExpiresAt: pendingInvoice.periodEnd || nextExpiry.toISOString(),
        });
        setPaidInvoice({ ...pendingInvoice, status: 'paid', paidAt: new Date().toISOString() });
      } else {
        setSlipResult(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ส่งสลิปไม่สำเร็จ');
    } finally {
      setIsProcessing(false);
    }
  };

  /** ชำระผ่านบัตร: tokenize ที่ Omise Vault (client) → ตัดเงินที่ Backend (secret key อยู่ฝั่ง server) */
  const handleCardCharge = async () => {
    setErrorMsg(null);

    if (!billing.omisePublicKey) {
      setErrorMsg('แพลตฟอร์มยังไม่ได้ตั้งค่า Omise Public Key');
      return;
    }
    const [mm, yy] = card.expiry.split('/').map((s) => s.trim());
    if (!card.number || !mm || !yy || !card.cvc) {
      setErrorMsg('กรุณากรอกข้อมูลบัตรให้ครบถ้วน');
      return;
    }
    if (!isOmiseBackendConfigured()) {
      setErrorMsg(
        'ยังไม่ได้ตั้งค่า VITE_API_URL — การตัดบัตรต้องผ่าน Backend เพราะ Secret Key ห้ามอยู่ในเบราว์เซอร์'
      );
      return;
    }

    setIsProcessing(true);
    let invoice: SubscriptionInvoice | null = null;
    try {
      invoice = await createSubscriptionInvoice({
        tenantId: activeTenant.id,
        plan: selectedPlan,
        billingCycle,
        amount,
        currency: billing.currency,
        method: 'credit_card',
        provider: 'omise',
        currentExpiry: activeTenant.planExpiresAt,
      });
      if (!invoice) throw new Error('ออกใบแจ้งหนี้ไม่สำเร็จ');

      const tokenRes = await createOmiseCardToken(billing.omisePublicKey, {
        name: card.name || activeTenant.name,
        number: card.number.replace(/\s/g, ''),
        expirationMonth: Number(mm),
        expirationYear: Number(yy.length === 2 ? `20${yy}` : yy),
        securityCode: card.cvc,
      });
      if (!tokenRes.ok || !tokenRes.token) throw new Error(tokenRes.error || 'สร้าง token บัตรไม่สำเร็จ');

      const chargeRes = await chargeSubscriptionViaBackend({
        invoiceId: invoice.id,
        tenantId: activeTenant.id,
        amount,
        currency: billing.currency,
        token: tokenRes.token,
        description: `${activeTenant.name} — ${selectedPlan.toUpperCase()} (${
          billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'
        })`,
      });
      if (!chargeRes.ok) throw new Error(chargeRes.error || 'ตัดเงินไม่สำเร็จ');

      await applyRenewal(invoice, chargeRes.chargeId);
    } catch (err: any) {
      if (invoice) await markInvoiceFailed(invoice.id, err.message || 'unknown');
      setErrorMsg(err.message || 'ตัดบัตรไม่สำเร็จ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    setPaidInvoice(null);
    setPendingInvoice(null);
    setSlipResult(null);
    setSlipFile(null);
    setCard({ name: '', number: '', expiry: '', cvc: '' });
    onClose();
  };

  const copyPromptPayNumber = () => {
    navigator.clipboard?.writeText(billing.promptpayNumber || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {slipResult && !paidInvoice ? (
          /* ส่งสลิปแล้ว รอตรวจสอบ */
          <div className="text-center py-8 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">ส่งสลิปเรียบร้อยแล้ว</h3>
              <p className="text-sm text-slate-500 font-medium mt-1 max-w-md mx-auto">{slipResult.message}</p>
            </div>

            {/* ผลการตรวจ 4 ข้อ */}
            {slipResult.checks && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm mx-auto text-left space-y-2">
                {(Object.values(slipResult.checks) as (SlipCheck | undefined)[]).map(
                  (c) =>
                    c && (
                      <div key={c.label} className="flex items-start gap-2 text-xs">
                        {c.pass ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className={`font-bold ${c.pass ? 'text-slate-700' : 'text-red-700'}`}>{c.label}</p>
                          <p className="text-[11px] text-slate-500 break-words">{c.detail}</p>
                        </div>
                      </div>
                    )
                )}
              </div>
            )}

            <p className="text-xs text-slate-500">
              ปกติใช้เวลาตรวจสอบไม่เกิน 1 วันทำการ — ดูสถานะได้ที่หน้าตั้งค่าการชำระเงิน
            </p>

            <button
              onClick={handleFinish}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-2xl shadow-lg transition-all text-sm"
            >
              กลับสู่หน้าจัดการร้านค้า
            </button>
          </div>
        ) : !paidInvoice ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">ชำระเงินต่ออายุ / อัปเกรดแพ็กเกจ SaaS</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  ร้านค้า: <span className="font-bold text-slate-700">{activeTenant.name}</span> (ปัจจุบัน{' '}
                  {activeTenant.plan?.toUpperCase()} Plan
                  {activeTenant.planExpiresAt
                    ? ` — หมดอายุ ${new Date(activeTenant.planExpiresAt).toLocaleDateString('th-TH')}`
                    : ''}
                  )
                </p>
              </div>
            </div>

            {/* Billing Cycle Switch */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                รายเดือน
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  billingCycle === 'yearly' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>รายปี (ประหยัด 2 เดือน)</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 rounded-full uppercase">SAVE 17%</span>
              </button>
            </div>

            {/* Plan Selector Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setSelectedPlan('pro')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlan === 'pro'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">Pro Plan</span>
                  {selectedPlan === 'pro' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
                <p className="text-2xl font-black text-slate-900">
                  ฿{getPlanPrice(billing, 'pro', billingCycle).toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal"> /{billingCycle === 'monthly' ? 'เดือน' : 'ปี'}</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> คิวจองไม่จำกัด</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> ทีมช่างสูงสุด 10 คน</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> LINE Rich Menu Auto</li>
                </ul>
              </div>

              <div
                onClick={() => setSelectedPlan('enterprise')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlan === 'enterprise'
                    ? 'border-purple-500 bg-purple-50/50 shadow-md ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-black text-purple-600 uppercase tracking-wider">Enterprise</span>
                  {selectedPlan === 'enterprise' && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                </div>
                <p className="text-2xl font-black text-slate-900">
                  ฿{getPlanPrice(billing, 'enterprise', billingCycle).toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal"> /{billingCycle === 'monthly' ? 'เดือน' : 'ปี'}</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-500" /> ทุกฟีเจอร์ใน Pro</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-500" /> Custom Domain</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-500" /> Multi-branch สาขา</li>
                </ul>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">เลือกช่องทางชำระเงิน</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 font-bold text-xs transition-all ${
                    paymentMethod === 'promptpay'
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-black text-slate-900">PromptPay QR</span>
                    <span className="text-[10px] text-slate-500 font-medium">สแกนผ่านแอปธนาคาร</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!billing.omiseEnabled}
                  onClick={() => setPaymentMethod('credit_card')}
                  title={billing.omiseEnabled ? undefined : 'แพลตฟอร์มยังไม่ได้เปิดใช้งาน Omise Gateway'}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'credit_card'
                      ? 'border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-black text-slate-900">บัตรเครดิต / เดบิต</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {billing.omiseEnabled ? 'ผ่าน Omise (Opn Payments)' : 'ยังไม่เปิดให้บริการ'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Details */}
            {isLoadingSettings ? (
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูลบัญชีรับชำระเงิน...
              </div>
            ) : paymentMethod === 'promptpay' ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md flex flex-col items-center shrink-0">
                  {qr.imageUrl ? (
                    <img src={qr.imageUrl} alt="PromptPay QR" className="w-32 h-32 object-contain" />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-[10px] text-center text-red-500 font-bold px-2">
                      {qr.error}
                    </div>
                  )}
                  <span className="text-[10px] font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded mt-2">PromptPay</span>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500 font-medium">ยอดที่ต้องชำระสุทธิ</p>
                    <p className="text-3xl font-black text-emerald-600">฿{amount.toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    ผู้รับเงิน: <span className="font-bold text-slate-900">{billing.promptpayName || '-'}</span>
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs text-slate-600 font-medium">พร้อมเพย์:</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {formatPromptPayDisplay(billing.promptpayNumber || '-')}
                    </span>
                    {billing.promptpayNumber && (
                      <button
                        onClick={copyPromptPayNumber}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="คัดลอกเลขพร้อมเพย์"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * QR นี้ระบุยอดเงินไว้แล้ว สแกนจ่ายได้ทันที เมื่อโอนเสร็จให้แนบสลิปเพื่อตรวจสอบ
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ข้อมูลบัตรถูกส่งตรงไปยัง Omise Vault (PCI-DSS) ไม่ผ่านเซิร์ฟเวอร์ของเรา
                    {billing.omiseTestMode && (
                      <span className="ml-1 font-black text-amber-600">— โหมดทดสอบ (Test Mode)</span>
                    )}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อบนบัตร</label>
                  <input
                    type="text"
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="SOMCHAI JAIDEE"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หมายเลขบัตร</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">วันหมดอายุ (MM/YY)</label>
                    <input
                      type="text"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                      placeholder="12/28"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                      placeholder="123"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* สรุปรอบบิลใหม่ */}
            <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-2xl px-4 py-3 text-xs">
              <span className="font-bold text-slate-600">ใช้งานได้ถึง (หลังชำระเงิน)</span>
              <span className="font-black text-emerald-700">
                {nextExpiry.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ขั้นแนบสลิป — แสดงหลังออกใบแจ้งหนี้แล้ว */}
            {paymentMethod === 'promptpay' && pendingInvoice && (
              <div className="bg-emerald-50/60 border-2 border-dashed border-emerald-300 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-900">
                    แนบสลิปโอนเงิน (ใบแจ้งหนี้ {pendingInvoice.invoiceNo})
                  </span>
                </div>

                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > MAX_SLIP_SIZE) {
                        setErrorMsg('ไฟล์ใหญ่เกิน 5 MB กรุณาย่อรูปก่อน');
                        return;
                      }
                      setErrorMsg(null);
                      setSlipFile(f || null);
                    }}
                    className="hidden"
                  />
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-emerald-400 transition-colors">
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {slipFile ? slipFile.name : 'เลือกไฟล์รูปสลิป (JPG / PNG / PDF, ไม่เกิน 5 MB)'}
                    </span>
                  </div>
                </label>

                <p className="text-[11px] text-slate-500">
                  ระบบจะตรวจสอบยอดเงิน บัญชีปลายทาง เวลาโอน และเลขอ้างอิงรายการ
                  ถ้าผ่านครบจะต่ออายุให้ทันที ถ้าไม่ผ่านจะส่งให้เจ้าหน้าที่ตรวจสอบ
                </p>

                <button
                  onClick={handleSubmitSlip}
                  disabled={!slipFile || isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบสลิป...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> ส่งสลิปเพื่อตรวจสอบ</>
                  )}
                </button>
              </div>
            )}

            {!(paymentMethod === 'promptpay' && pendingInvoice) && (
              <button
                onClick={paymentMethod === 'promptpay' ? handleCreateInvoice : handleCardCharge}
                disabled={isProcessing || isLoadingSettings || amount <= 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> กำลังดำเนินการ...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {paymentMethod === 'promptpay'
                      ? `โอนแล้ว — ถัดไป: แนบสลิป (฿${amount.toLocaleString()})`
                      : `ตัดบัตร ฿${amount.toLocaleString()} (ต่ออายุทันที)`}
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Payment Success State */
          <div className="text-center py-8 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">ชำระเงินสำเร็จแล้ว! 🎉</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                แพ็กเกจของคุณปรับเป็น{' '}
                <span className="font-extrabold text-emerald-600 uppercase">{paidInvoice.plan} Plan</span> เรียบร้อยแล้ว
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">เลขที่ใบแจ้งหนี้:</span>
                <span className="font-mono font-bold text-slate-800">{paidInvoice.invoiceNo}</span>
              </div>
              {paidInvoice.providerRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Charge ID:</span>
                  <span className="font-mono font-bold text-slate-800">{paidInvoice.providerRef}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">ยอดชำระ:</span>
                <span className="font-bold text-emerald-600">฿{paidInvoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">ช่องทาง:</span>
                <span className="font-bold text-slate-800">
                  {paidInvoice.method === 'promptpay' ? 'PromptPay QR' : 'บัตรเครดิต / เดบิต'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">ใช้งานได้ถึง:</span>
                <span className="font-bold text-slate-800">
                  {paidInvoice.periodEnd ? new Date(paidInvoice.periodEnd).toLocaleDateString('th-TH') : '-'}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm"
            >
              กลับสู่หน้าจัดการร้านค้า
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
