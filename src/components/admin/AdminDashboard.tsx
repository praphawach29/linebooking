import React, { useState, useEffect } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useAuth } from '../../context/AuthContext';
import { PlatformBillingSettings, SubscriptionInvoice, TenantPlan } from '../../types';
import {
  DEFAULT_BILLING_SETTINGS,
  fetchInvoices,
  fetchPlatformBillingSettings,
  savePlatformBillingSettings,
} from '../../lib/billing';
import {
  formatPromptPayDisplay,
  generatePromptPayPayload,
  isValidPromptPayTarget,
  promptPayQrImageUrl,
} from '../../utils/promptpay';
import { countPendingSlips } from '../../lib/slips';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminSlipReview } from './AdminSlipReview';
import {
  ShieldCheck,
  Building2,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  Zap,
  Users,
  CreditCard,
  Settings,
  MoreVertical,
  LogOut,
  Sparkles,
  Search,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  Ban,
  Megaphone,
  Sliders,
  BellRing,
  FileText,
  X,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { tenants, bookings, updateTenant, deleteTenant } = useSaaS();
  const { authUser } = useAuth();
  const [activeSubTab, setActiveTab] = useState<AdminTab>('overview');
  const [pendingSlipCount, setPendingSlipCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>('pro');

  // Delete Confirmation Modal State
  const [tenantToDelete, setTenantToDelete] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [isDeletingTenant, setIsDeletingTenant] = useState(false);

  // Gateway Settings State (เก็บใน Supabase ตาราง platform_settings)
  const [gateway, setGateway] = useState<PlatformBillingSettings>(DEFAULT_BILLING_SETTINGS);
  const [isLoadingGateway, setIsLoadingGateway] = useState(true);
  const [isSavingGateway, setIsSavingGateway] = useState(false);
  const [savedGatewayMsg, setSavedGatewayMsg] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingSlipCount, setIsLoadingSlipCount] = useState(true);

  // จำนวนสลิปรอตรวจ — ใช้ทำ badge บนเมนู โหลดตั้งแต่เข้าหน้า
  useEffect(() => {
    countPendingSlips()
      .then(setPendingSlipCount)
      .finally(() => setIsLoadingSlipCount(false));
  }, []);

  useEffect(() => {
    if (activeSubTab !== 'gateway' && activeSubTab !== 'invoices') return;
    let cancelled = false;

    if (activeSubTab === 'gateway') {
      setIsLoadingGateway(true);
      fetchPlatformBillingSettings()
        .then(s => { if (!cancelled) setGateway(s); })
        .finally(() => { if (!cancelled) setIsLoadingGateway(false); });
    }

    setIsLoadingInvoices(true);
    fetchInvoices()
      .then(list => { if (!cancelled) setInvoices(list); })
      .finally(() => { if (!cancelled) setIsLoadingInvoices(false); });
    return () => { cancelled = true; };
  }, [activeSubTab]);

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayError(null);

    if (gateway.activeProvider === 'promptpay' && !isValidPromptPayTarget(gateway.promptpayNumber || '')) {
      setGatewayError('หมายเลขพร้อมเพย์ไม่ถูกต้อง — ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขผู้เสียภาษี 13 หลัก');
      return;
    }
    if (gateway.omiseEnabled && !gateway.omisePublicKey) {
      setGatewayError('เปิดใช้ Omise ต้องกรอก Public Key อย่างน้อย 1 ค่า');
      return;
    }

    setIsSavingGateway(true);
    const res = await savePlatformBillingSettings(gateway);
    setIsSavingGateway(false);

    if (!res.ok) {
      setGatewayError(`บันทึกลงฐานข้อมูลไม่สำเร็จ: ${res.error} (ยังบันทึกไว้ในเครื่องชั่วคราวแล้ว — ตรวจว่ารัน migration 0004 และล็อกอินเป็น platform_admin หรือยัง)`);
      return;
    }
    setSavedGatewayMsg(true);
    setTimeout(() => setSavedGatewayMsg(false), 2500);
  };

  // ตัวอย่าง QR จริงตามเลขพร้อมเพย์ที่กรอก (ยอด 990 บาท)
  const previewQr = (() => {
    try {
      if (!gateway.promptpayNumber) return null;
      return promptPayQrImageUrl(generatePromptPayPayload(gateway.promptpayNumber, gateway.pricePro.monthly), 220);
    } catch {
      return null;
    }
  })();

  // Announcement state (Super admin broadcast feature)
  const [announcementText, setAnnouncementText] = useState('ยินดีต้อนรับสู่ระบบ LINE OA Booking SaaS — พร้อมใช้งานเต็มรูปแบบ!');
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const totalMRR = tenants.reduce((sum, t) => {
    if (t.plan === 'enterprise') return sum + 2990;
    if (t.plan === 'pro') return sum + 990;
    return sum;
  }, 0);

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlanFilter === 'all' || t.plan === selectedPlanFilter;
    return matchesSearch && matchesPlan;
  });

  const handleUpdatePlan = (tenantId: string, newPlan: TenantPlan) => {
    updateTenant(tenantId, { plan: newPlan });
    setEditingTenantId(null);
  };

  const handleToggleTenantStatus = (tenantId: string, currentStatus: boolean) => {
    updateTenant(tenantId, { isActive: !currentStatus });
  };

  const handleDeleteTenant = (tenantId: string, tenantName: string) => {
    if (confirm(`คุณต้องการลบร้านค้า "${tenantName}" ออกจากระบบถาวรใช่หรือไม่?`)) {
      deleteTenant(tenantId);
    }
  };

  const pageTitles: Record<AdminTab, { title: string; subtitle: string }> = {
    overview: { title: 'ภาพรวมแพลตฟอร์ม', subtitle: 'สรุปผู้เช่า รายได้ และการใช้งานทั้งระบบ' },
    tenants: { title: 'ร้านค้าทั้งหมด', subtitle: 'จัดการผู้เช่า เปลี่ยนแพ็กเกจ และระงับการใช้งาน' },
    users: { title: 'ผู้ใช้งานระบบ', subtitle: 'บัญชีทุกประเภทในระบบ' },
    plans: { title: 'แพ็กเกจค่าบริการ', subtitle: 'รายละเอียดแพ็กเกจที่เปิดขาย' },
    gateway: { title: 'ตั้งค่ารับชำระเงิน', subtitle: 'PromptPay, Omise, ราคาแพ็กเกจ และการตรวจสลิป' },
    invoices: { title: 'ใบแจ้งหนี้', subtitle: 'ประวัติการเรียกเก็บค่าแพ็กเกจของทุกร้าน' },
    slips: { title: 'รออนุมัติสลิป', subtitle: 'ตรวจสอบสลิปโอนเงินที่ร้านค้าแนบเข้ามา' },
    system: { title: 'System Health', subtitle: 'สถานะเซิร์ฟเวอร์ Database และ Backend Services' },
  };

  return (
    <AdminLayout
      activeTab={activeSubTab}
      onTabChange={setActiveTab}
      pendingSlipCount={pendingSlipCount}
      onOpenAnnouncement={() => setShowAnnouncementModal(true)}
    >
      {/* Global Super Admin Announcement Banner */}
      {isAnnouncementActive && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
          <BellRing className="w-4 h-4 text-slate-950 shrink-0" />
          <span>{announcementText}</span>
          <button onClick={() => setIsAnnouncementActive(false)} className="text-slate-900 hover:text-black ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {pageTitles[activeSubTab].title}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{pageTitles[activeSubTab].subtitle}</p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          Multi-tenant SaaS Control
        </span>
      </div>

      <>
        {/* KPI Cards Grid (Light Theme White Cards) */}
        {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {/* Tenant Count */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">จำนวนผู้เช่าทั้งหมด</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {tenants.length} <span className="text-sm text-slate-400 font-bold">ร้านค้า</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active {tenants.filter(t => t.isActive !== false).length} ร้าน</span>
            </div>
          </div>

          {/* MRR */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายได้ประจำ (MRR)</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">
                  ฿{totalMRR.toLocaleString()} <span className="text-sm text-slate-400 font-bold">/เดือน</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>คำนวณจากค่าสมัครสมาชิก SaaS</span>
            </div>
          </div>

          {/* Bookings */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ยอดคิวจองรวม</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {bookings.length} <span className="text-sm text-slate-400 font-bold">รายการ</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100 shadow-sm">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>รวมจากผู้เช่าทุกร้านในระบบ</span>
            </div>
          </div>

          {/* Paid Subscribers Ratio */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid Subscribers</p>
                <h3 className="text-3xl font-black text-indigo-600 mt-1">
                  {tenants.filter(t => t.plan !== 'free').length} <span className="text-sm text-slate-400 font-bold">ร้าน (Pro/Ent)</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 w-fit">
              <Zap className="w-3.5 h-3.5" />
              <span>อัตราแปลงสมาชิกร้านค้า</span>
            </div>
          </div>
        </div>
        )}

        {/* แดชบอร์ด: ทางลัดไปคิวสลิปที่รอตรวจ */}
        {activeSubTab === 'overview' && !isLoadingSlipCount && pendingSlipCount > 0 && (
          <button
            onClick={() => setActiveTab('slips')}
            className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 hover:bg-amber-100 transition-colors text-left"
          >
            <span className="text-sm font-bold">
              มีสลิปโอนเงินรอตรวจสอบ {pendingSlipCount} รายการ
            </span>
            <span className="text-xs font-black bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl shrink-0">
              ไปตรวจสอบ →
            </span>
          </button>
        )}

        {/* Tab 1: Tenants List (Clean Light Card & Table) */}
        {(activeSubTab === 'tenants' || activeSubTab === 'overview') && (
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            {/* Header Controls */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-black text-slate-900">รวมรายชื่อร้านค้าในระบบ (Tenants Management)</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาร้านค้า..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>

                <select
                  value={selectedPlanFilter}
                  onChange={e => setSelectedPlanFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="all">ทุกแพ็กเกจ</option>
                  <option value="free">Free Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100">
              {filteredTenants.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">ไม่พบร้านค้าตรงตามเงื่อนไข</div>
              ) : (
                filteredTenants.map((t) => (
                  <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="relative shrink-0">
                        <img src={t.logoUrl} alt={t.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${t.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-black text-slate-900 text-base truncate">{t.name}</h3>
                          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {t.slug}.booking.app
                          </span>
                          {t.isActive === false && (
                            <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-md border border-red-200">
                              ถูกระงับ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2">
                          <span className="capitalize">{t.businessType}</span>
                          <span>•</span>
                          <span>{t.phone || '08x-xxx-xxxx'}</span>
                          <span>•</span>
                          <span className="truncate">{t.email || 'shop@example.com'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Plan Pill */}
                      <div className="flex items-center gap-1">
                        <span className={`px-3 py-1 rounded-xl font-black uppercase text-[10px] font-mono tracking-wider ${
                          t.plan === 'enterprise'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm'
                            : t.plan === 'pro'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {t.plan} PLAN
                        </span>
                        <button
                          onClick={() => { setEditingTenantId(t.id); setSelectedPlan(t.plan); }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="เปลี่ยนแพ็กเกจ"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Toggle Active/Suspend */}
                      <button
                        onClick={() => handleToggleTenantStatus(t.id, t.isActive !== false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          t.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {t.isActive !== false ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        <span>{t.isActive !== false ? 'Active' : 'Suspended'}</span>
                      </button>

                      {/* View Tenant */}
                      <a
                        href={`/merchant?tenant=${t.id}`}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span>เข้าดูร้าน</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>

                      {/* Delete Tenant */}
                      <button
                        onClick={() => setTenantToDelete({ id: t.id, name: t.name, slug: t.slug })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors"
                        title="ลบร้านค้านี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeSubTab === 'users' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-black text-slate-900">จัดการบัญชีผู้ใช้งานระบบ (User Accounts)</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">รวมบัญชีทุกประเภท</span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
                    SA
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Super Admin (คุณ)</h4>
                    <p className="text-xs text-slate-500">{authUser?.email || 'admin@yourdomain.com'}</p>
                  </div>
                </div>
                <span className="bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-indigo-200 uppercase">
                  platform_admin
                </span>
              </div>

              {tenants.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={t.logoUrl} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">เจ้าของร้าน {t.name}</h4>
                      <p className="text-xs text-slate-500">{t.email || 'owner@' + t.slug + '.com'}</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase">
                    merchant_admin
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Subscription Plans */}
        {activeSubTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Starter Plan</span>
                <h3 className="text-3xl font-black text-slate-900 mb-4">Free <span className="text-base text-slate-400 font-normal">/เดือน</span></h3>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-600 font-medium pt-4 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> รองรับ 45 คิว/เดือน</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> ทีมช่าง 1 คน</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> PromptPay QR Payment</li>
                </ul>
              </div>
              <button className="w-full py-3 mt-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors border border-slate-200">
                จัดการแพ็กเกจ
              </button>
            </div>

            <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-xl shadow-emerald-500/10">
              <span className="absolute -top-3.5 right-6 bg-emerald-600 text-white text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                POPULAR
              </span>
              <div>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 block">Professional Plan</span>
                <h3 className="text-3xl font-black text-slate-900 mb-4">฿990 <span className="text-base text-slate-400 font-normal">/เดือน</span></h3>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 font-bold pt-4 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> คิวจองไม่จำกัด</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> ทีมช่างสูงสุด 10 คน</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> LINE Rich Menu Auto-Setup</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Export Excel & Analytics</li>
                </ul>
              </div>
              <button className="w-full py-3 mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all">
                จัดการแพ็กเกจ
              </button>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-black text-purple-600 uppercase tracking-widest mb-2 block">Enterprise Plan</span>
                <h3 className="text-3xl font-black text-slate-900 mb-4">฿2,990 <span className="text-base text-slate-400 font-normal">/เดือน</span></h3>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-600 font-medium pt-4 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-600 shrink-0" /> ทุกฟีเจอร์ใน Pro Plan</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-600 shrink-0" /> Custom Domain (CNAME)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-600 shrink-0" /> รองรับหลายสาขา (Multi-branch)</li>
                </ul>
              </div>
              <button className="w-full py-3 mt-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors border border-slate-200">
                จัดการแพ็กเกจ
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Omise & Payment Gateway Settings */}
        {activeSubTab === 'gateway' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">ตั้งค่าระบบชำระเงินแพลตฟอร์ม (SaaS Gateway Settings)</h2>
                  <p className="text-xs text-slate-500 font-medium">ตั้งค่า Omise / Opn Payments API Keys & เลขพร้อมเพย์บริษัทสำหรับรับชำระค่าสมาชิกร้านค้า</p>
                </div>
              </div>

              {savedGatewayMsg && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> บันทึกตั้งค่า Gateway สำเร็จ
                </span>
              )}
            </div>

            {isLoadingGateway ? (
              <div className="py-16 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <Activity className="w-4 h-4 animate-pulse" /> กำลังโหลดการตั้งค่าจากฐานข้อมูล...
              </div>
            ) : (
            <form onSubmit={handleSaveGateway} className="space-y-6">
              {/* เลือกช่องทางหลักที่ใช้เก็บเงินค่าแพ็กเกจ */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  1. ช่องทางหลักที่ใช้รับเงินค่าแพ็กเกจจากร้านค้า
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGateway({ ...gateway, activeProvider: 'promptpay' })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      gateway.activeProvider === 'promptpay'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">PromptPay ของผมเอง</span>
                      {gateway.activeProvider === 'promptpay' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      เงินเข้าบัญชีโดยตรง ไม่มีค่าธรรมเนียม gateway — ร้านค้าสแกน QR ที่ระบุยอดแล้วกดยืนยัน
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGateway({ ...gateway, activeProvider: 'omise', omiseEnabled: true })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      gateway.activeProvider === 'omise'
                        ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Omise / Opn Payments</span>
                      {gateway.activeProvider === 'omise' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      ตัดบัตรเครดิต/เดบิตอัตโนมัติ ยืนยันผลทันทีผ่าน Webhook (ต้องมี Backend)
                    </p>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={gateway.autoRenewOnPayment}
                    onChange={e => setGateway({ ...gateway, autoRenewOnPayment: e.target.checked })}
                    className="rounded bg-white border-slate-300 text-emerald-600"
                  />
                  ต่ออายุแพ็กเกจให้ร้านค้าอัตโนมัติทันทีที่ชำระเงินสำเร็จ
                </label>
              </div>

              {/* Platform PromptPay Number */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  2. เลขพร้อมเพย์รับเงินประจำแพลตฟอร์ม (Platform PromptPay)
                </h3>

                <div className="flex flex-col lg:flex-row gap-5">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือเลขผู้เสียภาษี 13 หลัก)</label>
                      <input
                        type="text"
                        value={gateway.promptpayNumber || ''}
                        onChange={e => setGateway({ ...gateway, promptpayNumber: e.target.value })}
                        placeholder="0812345678"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                      {gateway.promptpayNumber ? (
                        isValidPromptPayTarget(gateway.promptpayNumber) ? (
                          <p className="text-[11px] text-emerald-600 font-bold mt-1">
                            ✓ ใช้ได้ — แสดงเป็น {formatPromptPayDisplay(gateway.promptpayNumber)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-red-600 font-bold mt-1">✗ รูปแบบไม่ถูกต้อง</p>
                        )
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อบัญชีรับเงิน (แสดงในหน้าชำระเงินของร้านค้า)</label>
                      <input
                        type="text"
                        value={gateway.promptpayName || ''}
                        onChange={e => setGateway({ ...gateway, promptpayName: e.target.value })}
                        placeholder="บริษัท ไลน์ โอเอ บุกกิ้ง จำกัด"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* พรีวิว QR จริง */}
                  <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center w-full lg:w-56">
                    {previewQr ? (
                      <>
                        <img src={previewQr} alt="ตัวอย่าง QR" className="w-32 h-32 object-contain" />
                        <span className="text-[10px] font-bold text-slate-500 mt-2 text-center">
                          ตัวอย่าง QR จริง (ยอด ฿{gateway.pricePro.monthly.toLocaleString()})
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium text-center py-10 px-2">
                        กรอกเลขพร้อมเพย์ที่ถูกต้องเพื่อดูตัวอย่าง QR
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ราคาแพ็กเกจ */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  3. ราคาแพ็กเกจที่เรียกเก็บจากร้านค้า (บาท)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {([
                    { label: 'Pro รายเดือน', key: 'pro', cycle: 'monthly' },
                    { label: 'Pro รายปี', key: 'pro', cycle: 'yearly' },
                    { label: 'Enterprise รายเดือน', key: 'enterprise', cycle: 'monthly' },
                    { label: 'Enterprise รายปี', key: 'enterprise', cycle: 'yearly' },
                  ] as const).map(({ label, key, cycle }) => (
                    <div key={label}>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={key === 'pro' ? gateway.pricePro[cycle] : gateway.priceEnterprise[cycle]}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setGateway(
                            key === 'pro'
                              ? { ...gateway, pricePro: { ...gateway.pricePro, [cycle]: val } }
                              : { ...gateway, priceEnterprise: { ...gateway.priceEnterprise, [cycle]: val } }
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Omise (Opn Payments) Integration */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    4. Omise / Opn Payments API Keys (ตัดบัตรเครดิตอัตโนมัติ)
                  </h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={gateway.omiseEnabled}
                        onChange={e => setGateway({ ...gateway, omiseEnabled: e.target.checked })}
                        className="rounded bg-white border-slate-300 text-indigo-600"
                      />
                      เปิดใช้งาน Omise
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={gateway.omiseTestMode}
                        onChange={e => setGateway({ ...gateway, omiseTestMode: e.target.checked })}
                        className="rounded bg-white border-slate-300 text-amber-500"
                      />
                      Test Mode
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Omise Public Key (pkey_test_... หรือ pkey_live_...)</label>
                    <input
                      type="text"
                      value={gateway.omisePublicKey || ''}
                      onChange={e => setGateway({ ...gateway, omisePublicKey: e.target.value })}
                      placeholder="pkey_test_..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">ใช้ในเบราว์เซอร์เพื่อสร้าง token บัตร — เปิดเผยได้ ปลอดภัย</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Omise Secret Key (skey_test_... หรือ skey_live_...)</label>
                    <input
                      type="password"
                      value={gateway.omiseSecretKey || ''}
                      onChange={e => setGateway({ ...gateway, omiseSecretKey: e.target.value })}
                      placeholder="skey_test_..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      ⚠️ แนะนำให้ตั้งใน backend/.env (OMISE_SECRET_KEY) แทน — ค่าที่กรอกที่นี่อ่านได้เฉพาะ platform_admin
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  💡 ดูคีย์และสมัคร Omise Account ได้ที่: <a href="https://dashboard.omise.co" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">https://dashboard.omise.co</a>
                  {' '}| การตัดบัตรจริงทำที่ Backend endpoint <code className="font-mono bg-slate-200 px-1 rounded">POST /billing/charge</code>
                </p>
              </div>

              {/* ตรวจสอบสลิปโอนเงิน */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    5. ตรวจสอบสลิปโอนเงิน (สำหรับช่องทาง PromptPay)
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={gateway.slipAutoApprove}
                      onChange={e => setGateway({ ...gateway, slipAutoApprove: e.target.checked })}
                      className="rounded bg-white border-slate-300 text-emerald-600"
                    />
                    อนุมัติอัตโนมัติเมื่อตรวจผ่านครบทุกข้อ
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">บริการตรวจสลิป</label>
                    <select
                      value={gateway.slipVerifyProvider}
                      onChange={e => setGateway({ ...gateway, slipVerifyProvider: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="manual">ตรวจด้วยเจ้าหน้าที่ (ไม่มีค่าใช้จ่าย)</option>
                      <option value="slipok">SlipOK</option>
                      <option value="easyslip">EasySlip</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">API Key</label>
                    <input
                      type="password"
                      value={gateway.slipVerifyApiKey || ''}
                      onChange={e => setGateway({ ...gateway, slipVerifyApiKey: e.target.value })}
                      placeholder={gateway.slipVerifyProvider === 'manual' ? 'ไม่จำเป็นในโหมดตรวจด้วยคน' : 'ใส่ API key'}
                      disabled={gateway.slipVerifyProvider === 'manual'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Branch ID (SlipOK เท่านั้น)</label>
                    <input
                      type="text"
                      value={gateway.slipVerifyBranchId || ''}
                      onChange={e => setGateway({ ...gateway, slipVerifyBranchId: e.target.value })}
                      disabled={gateway.slipVerifyProvider !== 'slipok'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      ชื่อบัญชีผู้รับที่ถูกต้อง (ใช้เทียบกับสลิป)
                    </label>
                    <input
                      type="text"
                      value={gateway.expectedReceiverName || ''}
                      onChange={e => setGateway({ ...gateway, expectedReceiverName: e.target.value })}
                      placeholder="เว้นว่างได้ = ใช้ชื่อบัญชีพร้อมเพย์ด้านบน"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">สลิปมีอายุ (ชั่วโมง)</label>
                      <input
                        type="number"
                        min={1}
                        value={gateway.slipTimeWindowHours}
                        onChange={e => setGateway({ ...gateway, slipTimeWindowHours: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ยอมรับส่วนต่าง (บาท)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={gateway.slipAmountTolerance}
                        onChange={e => setGateway({ ...gateway, slipAmountTolerance: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  🔒 ระบบตรวจ 4 ข้อทุกใบ: ยอดเงินตรง · โอนเข้าบัญชีเราจริง · เวลาโอนอยู่ในช่วงที่ถูกต้อง ·
                  <span className="font-bold"> เลขอ้างอิงไม่ซ้ำ (กันใช้สลิปเดิมซ้ำ)</span>
                </p>
              </div>

              {gatewayError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{gatewayError}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingGateway}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md transition-all text-xs flex items-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingGateway ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Gateway'}</span>
                </button>
              </div>
            </form>
            )}

          </div>
        )}

        {/* Tab: ใบแจ้งหนี้ */}
        {activeSubTab === 'invoices' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  ประวัติการชำระค่าแพ็กเกจล่าสุด (Subscription Invoices)
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {isLoadingInvoices ? '...' : `${invoices.length} รายการ`}
                </span>
              </div>

              {isLoadingInvoices ? (
                <div className="py-16 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Activity className="w-4 h-4 animate-pulse" /> กำลังโหลดรายการใบแจ้งหนี้...
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  ยังไม่มีรายการชำระเงิน (หรือยังไม่ได้รัน migration 0004_platform_billing.sql)
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 font-bold border-b border-slate-100">
                        <th className="py-2 pr-3">เลขที่</th>
                        <th className="py-2 pr-3">ร้านค้า</th>
                        <th className="py-2 pr-3">แพ็กเกจ</th>
                        <th className="py-2 pr-3">ยอด</th>
                        <th className="py-2 pr-3">ช่องทาง</th>
                        <th className="py-2 pr-3">สถานะ</th>
                        <th className="py-2">วันที่</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pr-3 font-mono font-bold text-slate-700">{inv.invoiceNo}</td>
                          <td className="py-2.5 pr-3 text-slate-700 font-medium">
                            {tenants.find(t => t.id === inv.tenantId)?.name || inv.tenantId.slice(0, 8)}
                          </td>
                          <td className="py-2.5 pr-3 uppercase font-bold text-slate-600">
                            {inv.plan} / {inv.billingCycle === 'yearly' ? 'ปี' : 'เดือน'}
                          </td>
                          <td className="py-2.5 pr-3 font-bold text-emerald-600">฿{inv.amount.toLocaleString()}</td>
                          <td className="py-2.5 pr-3 text-slate-600">
                            {inv.method === 'promptpay' ? 'PromptPay' : 'บัตรเครดิต'}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={`px-2 py-0.5 rounded-lg font-bold uppercase text-[10px] border ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : inv.status === 'pending'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString('th-TH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: ตรวจสอบสลิปโอนเงิน */}
        {activeSubTab === 'slips' && (
          <AdminSlipReview onCountChange={setPendingSlipCount} />
        )}

        {/* Tab 4: System Health */}
        {activeSubTab === 'system' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-500" />
              <div>
                <h2 className="text-lg font-black text-slate-900">System Infrastructure & Database Health</h2>
                <p className="text-xs text-slate-500 font-medium">สถานะเซิร์ฟเวอร์ Database และ Backend Services</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-xs text-slate-500 font-bold block mb-1">PostgreSQL DB</span>
                <span className="text-xl font-black text-emerald-600">ONLINE</span>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-xs text-slate-500 font-bold block mb-1">RLS Security</span>
                <span className="text-xl font-black text-emerald-600">ENFORCED</span>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-xs text-slate-500 font-bold block mb-1">LINE Webhooks</span>
                <span className="text-xl font-black text-indigo-600">READY</span>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-xs text-slate-500 font-bold block mb-1">Queue (BullMQ)</span>
                <span className="text-xl font-black text-emerald-600">ACTIVE</span>
              </div>
            </div>
          </div>
        )}
      </>

      {/* Plan Upgrade Modal */}
      {editingTenantId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">ปรับเปลี่ยน Plan ร้านค้า</h3>
            <div className="space-y-2">
              {(['free', 'pro', 'enterprise'] as TenantPlan[]).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPlan(p)}
                  className={`w-full p-3 rounded-xl font-bold text-sm border text-left flex items-center justify-between ${
                    selectedPlan === p ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span className="uppercase">{p} Plan</span>
                  {selectedPlan === p && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingTenantId(null)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl text-xs border border-slate-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleUpdatePlan(editingTenantId, selectedPlan)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20"
              >
                บันทึกการเปลี่ยน Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              ประกาศข้อความถึงทุกร้านค้า
            </h3>
            <textarea
              value={announcementText}
              onChange={e => setAnnouncementText(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activeAnn"
                checked={isAnnouncementActive}
                onChange={e => setIsAnnouncementActive(e.target.checked)}
                className="rounded bg-slate-100 border-slate-300 text-emerald-600"
              />
              <label htmlFor="activeAnn" className="text-xs text-slate-700 font-medium">เปิดแสดงข้อความประกาศบนระบบ</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl text-xs border border-slate-200"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/20"
              >
                บันทึกประกาศ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tenant Confirmation Modal */}
      {tenantToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setTenantToDelete(null)}
              disabled={isDeletingTenant}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Warning Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  ยืนยันลบร้านค้าออกจากระบบ
                </h3>
                <p className="text-xs text-red-600 font-bold mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>การดำเนินการนี้ไม่สามารถกู้คืนได้</span>
                </p>
              </div>
            </div>

            {/* Target Tenant Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ร้านค้าที่จะถูกลบ:
              </span>
              <p className="text-sm font-black text-slate-900 truncate">{tenantToDelete.name}</p>
              <p className="text-xs font-mono text-slate-500 font-semibold">{tenantToDelete.slug}.booking.app</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              ข้อมูลร้านค้า, รายการจองคิวทั้งหมด, ข้อมูลช่าง, และการตั้งค่าของร้านค้านี้จะถูกลบออกจากฐานข้อมูล Supabase โดยสมบูรณ์
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                disabled={isDeletingTenant}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isDeletingTenant}
                onClick={async () => {
                  setIsDeletingTenant(true);
                  try {
                    await deleteTenant(tenantToDelete.id);
                    setTenantToDelete(null);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsDeletingTenant(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold transition-all shadow-md shadow-red-600/25 flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isDeletingTenant ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังลบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบร้านค้าถาวร</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
