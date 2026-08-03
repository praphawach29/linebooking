import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { BillingCycle, PlatformBillingPublic, SubscriptionInvoice, TenantPlan } from '../../types';
import {
  createOmiseCardToken,
  DEFAULT_BILLING_SETTINGS,
  fetchInvoices,
  fetchPublicBillingSettings,
  getPlanPrice,
} from '../../lib/billing';
import {
  attachCard,
  cancelSubscription,
  changePlan,
  getSubscription,
  isBillingBackendConfigured,
  MANDATE_TEXT,
  previewPlanChange,
  removeCard,
  resumeSubscription,
  statusLabel,
  subscribe,
  SubscriptionSummary,
  ProrationPreview,
} from '../../lib/subscriptions';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

const toneClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

const thDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export const MerchantBillingPortal: React.FC = () => {
  const { activeTenant } = useSaaS();

  const [billing, setBilling] = useState<PlatformBillingPublic>(DEFAULT_BILLING_SETTINGS);
  const [summary, setSummary] = useState<SubscriptionSummary>({ subscription: null, paymentMethods: [] });
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showCardForm, setShowCardForm] = useState(false);
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [mandateAccepted, setMandateAccepted] = useState(false);

  const [targetPlan, setTargetPlan] = useState<TenantPlan>('pro');
  const [targetCycle, setTargetCycle] = useState<BillingCycle>('monthly');
  const [preview, setPreview] = useState<ProrationPreview | null>(null);

  const backendReady = isBillingBackendConfigured();

  const reload = useCallback(async () => {
    if (!activeTenant) return;
    setError(null);
    try {
      const [settings, inv] = await Promise.all([
        fetchPublicBillingSettings(),
        fetchInvoices(activeTenant.id),
      ]);
      setBilling(settings);
      setInvoices(inv);

      if (backendReady) {
        const sub = await getSubscription(activeTenant.id);
        setSummary(sub);
        if (sub.subscription) {
          setTargetPlan(sub.subscription.plan);
          setTargetCycle(sub.subscription.billingCycle);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant, backendReady]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sub = summary.subscription;
  const defaultCard = summary.paymentMethods.find((c) => c.isDefault) || summary.paymentMethods[0];
  const badge = sub ? statusLabel(sub.status, sub.cancelAtPeriodEnd) : null;

  const targetPrice = useMemo(
    () => getPlanPrice(billing, targetPlan, targetCycle),
    [billing, targetPlan, targetCycle]
  );

  const planChanged = !!sub && (sub.plan !== targetPlan || sub.billingCycle !== targetCycle);

  // ดูยอดส่วนต่างก่อนกดยืนยันเปลี่ยนแพ็กเกจ
  useEffect(() => {
    if (!activeTenant || !backendReady || !sub || !planChanged) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    previewPlanChange(activeTenant.id, targetPlan, targetCycle)
      .then((p) => !cancelled && setPreview(p))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [activeTenant, backendReady, sub, planChanged, targetPlan, targetCycle]);

  const run = async (key: string, fn: () => Promise<any>, successMsg?: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await reload();
      if (successMsg) setNotice(successMsg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleAddCard = async () => {
    if (!activeTenant) return;
    if (!mandateAccepted) {
      setError('กรุณายอมรับเงื่อนไขการตัดเงินอัตโนมัติก่อน');
      return;
    }
    if (!billing.omisePublicKey) {
      setError('แพลตฟอร์มยังไม่ได้ตั้งค่า Omise Public Key');
      return;
    }
    const [mm, yy] = card.expiry.split('/').map((s) => s.trim());
    if (!card.number || !mm || !yy || !card.cvc) {
      setError('กรุณากรอกข้อมูลบัตรให้ครบถ้วน');
      return;
    }

    await run(
      'add-card',
      async () => {
        // เลขบัตรวิ่งตรงไป Omise Vault ไม่ผ่าน server ของเรา
        const tokenRes = await createOmiseCardToken(billing.omisePublicKey!, {
          name: card.name || activeTenant.name,
          number: card.number.replace(/\s/g, ''),
          expirationMonth: Number(mm),
          expirationYear: Number(yy.length === 2 ? `20${yy}` : yy),
          securityCode: card.cvc,
        });
        if (!tokenRes.ok || !tokenRes.token) throw new Error(tokenRes.error || 'สร้าง token บัตรไม่สำเร็จ');

        await attachCard({
          tenantId: activeTenant.id,
          token: tokenRes.token,
          email: activeTenant.email,
          mandateAccepted: true,
        });

        setShowCardForm(false);
        setCard({ name: '', number: '', expiry: '', cvc: '' });
        setMandateAccepted(false);
      },
      'ผูกบัตรเรียบร้อยแล้ว'
    );
  };

  if (!activeTenant) return null;

  if (!backendReady) {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-slate-400" />
          ต่ออายุอัตโนมัติ (Auto-renew)
        </h2>
        <p className="text-xs text-slate-500">
          ยังใช้งานไม่ได้ — ต้องตั้งค่า <code className="font-mono bg-slate-100 px-1 rounded">VITE_API_URL</code> ให้ชี้ไปที่ Backend
          เพราะการตัดบัตรอัตโนมัติต้องทำฝั่งเซิร์ฟเวอร์ (secret key ห้ามอยู่ในเบราว์เซอร์)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* สถานะสมาชิก */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            การต่ออายุอัตโนมัติ (Subscription)
          </h2>
          {badge && (
            <span className={`px-3 py-1 rounded-full border font-bold text-[11px] ${toneClasses[badge.tone]}`}>
              {badge.text}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-bold">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
          </div>
        ) : !sub || sub.status === 'canceled' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-medium">
              ยังไม่ได้เปิดการต่ออายุอัตโนมัติ — ผูกบัตรไว้แล้วระบบจะเก็บค่าบริการให้เองทุกรอบ ไม่ต้องมาโอนเอง
            </p>
            {defaultCard ? (
              <button
                onClick={() =>
                  run(
                    'subscribe',
                    () =>
                      subscribe({
                        tenantId: activeTenant.id,
                        plan: targetPlan === 'free' ? 'pro' : targetPlan,
                        billingCycle: targetCycle,
                        paymentMethodId: defaultCard.id,
                      }),
                    'เปิดการต่ออายุอัตโนมัติเรียบร้อย'
                  )
                }
                disabled={busy === 'subscribe'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {busy === 'subscribe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                เปิดต่ออายุอัตโนมัติ ({(targetPlan === 'free' ? 'pro' : targetPlan).toUpperCase()} ฿
                {getPlanPrice(billing, targetPlan === 'free' ? 'pro' : targetPlan, targetCycle).toLocaleString()}/
                {targetCycle === 'yearly' ? 'ปี' : 'เดือน'})
              </button>
            ) : (
              <p className="text-xs text-amber-700 font-bold">↓ ผูกบัตรด้านล่างก่อน แล้วปุ่มเปิดใช้งานจะขึ้นมา</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <span className="block text-[11px] text-slate-500 font-bold mb-1">แพ็กเกจปัจจุบัน</span>
                <span className="text-sm font-black text-slate-900 uppercase">
                  {sub.plan} · {sub.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <span className="block text-[11px] text-slate-500 font-bold mb-1">
                  {sub.cancelAtPeriodEnd ? 'ใช้งานได้ถึง' : 'เก็บเงินรอบถัดไป'}
                </span>
                <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
                  {thDate(sub.currentPeriodEnd)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <span className="block text-[11px] text-slate-500 font-bold mb-1">ยอดที่จะเรียกเก็บ</span>
                <span className="text-sm font-black text-emerald-600">
                  {sub.cancelAtPeriodEnd ? '—' : `฿${getPlanPrice(billing, sub.plan, sub.billingCycle).toLocaleString()}`}
                </span>
              </div>
            </div>

            {sub.status === 'past_due' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  ตัดบัตรไม่สำเร็จ (ครั้งที่ {sub.retryCount}) ระบบจะลองใหม่วันที่ {thDate(sub.nextRetryAt)} —
                  กรุณาตรวจสอบวงเงินหรือเปลี่ยนบัตร ยังใช้งานได้ตามปกติในช่วงนี้
                </span>
              </div>
            )}

            {sub.pendingPlan && (
              <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 text-sky-800 rounded-2xl px-4 py-3 text-xs font-bold">
                <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  จะเปลี่ยนเป็น {sub.pendingPlan.toUpperCase()} (
                  {sub.pendingBillingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'}) ในวันที่ {thDate(sub.currentPeriodEnd)}
                </span>
              </div>
            )}

            {sub.cancelAtPeriodEnd ? (
              <button
                onClick={() => run('resume', () => resumeSubscription(activeTenant.id), 'กลับมาต่ออายุอัตโนมัติแล้ว')}
                disabled={busy === 'resume'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {busy === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                กลับมาต่ออายุอัตโนมัติ
              </button>
            ) : (
              <button
                onClick={() =>
                  run(
                    'cancel',
                    () => cancelSubscription(activeTenant.id, false),
                    'ยกเลิกการต่ออายุแล้ว — ใช้งานได้จนจบรอบที่จ่ายไว้'
                  )
                }
                disabled={busy === 'cancel'}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 disabled:opacity-60"
              >
                {busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                ยกเลิกการต่ออายุอัตโนมัติ
              </button>
            )}
          </div>
        )}
      </div>

      {/* เปลี่ยนแพ็กเกจ + พรีวิวส่วนต่าง */}
      {sub && sub.status !== 'canceled' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Zap className="w-4 h-4 text-amber-500" />
            เปลี่ยนแพ็กเกจ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">แพ็กเกจ</label>
              <select
                value={targetPlan}
                onChange={(e) => setTargetPlan(e.target.value as TenantPlan)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="free">Free (ยกเลิกเมื่อจบรอบ)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">รอบชำระ</label>
              <select
                value={targetCycle}
                onChange={(e) => setTargetCycle(e.target.value as BillingCycle)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="monthly">รายเดือน</option>
                <option value="yearly">รายปี (ประหยัด 2 เดือน)</option>
              </select>
            </div>
          </div>

          {planChanged && preview && (
            <div
              className={`rounded-2xl px-4 py-3 text-xs font-medium border ${
                preview.isUpgrade ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-sky-50 border-sky-200 text-sky-900'
              }`}
            >
              {preview.isUpgrade ? (
                <div className="space-y-1">
                  <p className="font-black">อัปเกรดมีผลทันที — คิดเฉพาะส่วนต่างของวันที่เหลือ</p>
                  <p>
                    เหลืออีก {preview.remainingDays} วันในรอบนี้ · เครดิตจากแพ็กเกจเดิม ฿
                    {preview.credit?.toLocaleString()} · <span className="font-black">ต้องจ่ายเพิ่ม ฿{preview.amountDue.toLocaleString()}</span>
                  </p>
                </div>
              ) : (
                <p>
                  <span className="font-black">ลดแพ็กเกจจะมีผลวันที่ {thDate(preview.effectiveAt)}</span> —
                  ใช้แพ็กเกจเดิมได้เต็มรอบที่จ่ายไว้แล้ว ไม่มีการเรียกเก็บเพิ่มตอนนี้
                </p>
              )}
            </div>
          )}

          <button
            onClick={() =>
              run(
                'change-plan',
                () => changePlan({ tenantId: activeTenant.id, plan: targetPlan, billingCycle: targetCycle }),
                'เปลี่ยนแพ็กเกจเรียบร้อย'
              )
            }
            disabled={!planChanged || busy === 'change-plan'}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 disabled:opacity-40"
          >
            {busy === 'change-plan' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {planChanged
              ? preview?.isUpgrade
                ? `ยืนยันอัปเกรด (จ่ายเพิ่ม ฿${preview.amountDue.toLocaleString()})`
                : 'ยืนยันเปลี่ยนแพ็กเกจ'
              : `ใช้ ${targetPlan.toUpperCase()} ฿${targetPrice.toLocaleString()} อยู่แล้ว`}
          </button>
        </div>
      )}

      {/* บัตรที่ผูกไว้ */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            บัตรสำหรับตัดเงินอัตโนมัติ
          </h2>
          {!showCardForm && (
            <button
              onClick={() => setShowCardForm(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มบัตร
            </button>
          )}
        </div>

        {summary.paymentMethods.length === 0 && !showCardForm && (
          <p className="text-xs text-slate-500 py-3">ยังไม่ได้ผูกบัตร</p>
        )}

        <div className="space-y-2">
          {summary.paymentMethods.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-white border border-slate-200 rounded-md flex items-center justify-center text-[10px] font-black text-slate-600">
                  {c.brand?.slice(0, 4).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 font-mono">•••• •••• •••• {c.last4}</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    หมดอายุ {String(c.expMonth).padStart(2, '0')}/{c.expYear}
                    {c.isDefault && <span className="ml-2 text-emerald-700 font-bold">· ใช้ตัดเงิน</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {c.isExpiring && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">
                    ใกล้หมดอายุ
                  </span>
                )}
                <button
                  onClick={() => run(`del-${c.id}`, () => removeCard(activeTenant.id, c.id), 'ลบบัตรแล้ว')}
                  disabled={busy === `del-${c.id}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="ลบบัตร"
                >
                  {busy === `del-${c.id}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {showCardForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium bg-white border border-slate-200 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                เลขบัตรถูกส่งตรงไปยัง Omise Vault (PCI-DSS) ระบบเราเก็บแค่ token
                {billing.omiseTestMode && <span className="ml-1 font-black text-amber-600">— โหมดทดสอบ</span>}
              </span>
            </div>

            <input
              type="text"
              value={card.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })}
              placeholder="ชื่อบนบัตร"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs uppercase focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              inputMode="numeric"
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              placeholder="4242 4242 4242 4242"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={card.expiry}
                onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                placeholder="MM/YY"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <input
                type="password"
                value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                placeholder="CVC"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* ความยินยอม — บังคับตามกฎ Visa/Mastercard สำหรับการตัดเงินอัตโนมัติ */}
            <label className="flex items-start gap-2 text-[11px] text-slate-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={mandateAccepted}
                onChange={(e) => setMandateAccepted(e.target.checked)}
                className="rounded bg-white border-slate-300 text-emerald-600 mt-0.5 shrink-0"
              />
              <span>{MANDATE_TEXT}</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCardForm(false);
                  setError(null);
                }}
                className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddCard}
                disabled={busy === 'add-card' || !mandateAccepted}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === 'add-card' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                ผูกบัตร
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ประวัติการเรียกเก็บ */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">ประวัติการเรียกเก็บเงิน</h2>
        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">ยังไม่มีรายการ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 font-bold border-b border-slate-100">
                  <th className="py-2 pr-3">เลขที่</th>
                  <th className="py-2 pr-3">รายการ</th>
                  <th className="py-2 pr-3">ยอด</th>
                  <th className="py-2 pr-3">สถานะ</th>
                  <th className="py-2">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 pr-3 font-mono font-bold text-slate-700">{inv.invoiceNo}</td>
                    <td className="py-2.5 pr-3 text-slate-600 uppercase">
                      {inv.plan} / {inv.billingCycle === 'yearly' ? 'ปี' : 'เดือน'}
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-emerald-600">฿{inv.amount.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold uppercase text-[10px] border ${
                          inv.status === 'paid'
                            ? toneClasses.success
                            : inv.status === 'pending'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : toneClasses.danger
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">{new Date(inv.createdAt).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ข้อความสถานะ */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 text-xs font-bold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
};
