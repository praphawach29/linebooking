import React, { useState } from 'react';
import { Service, Staff, Court, PaymentMethod, SelectedAddon, ServiceAddon } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { getTenantTerminology } from '../../lib/tenant-terminology';
import {
  Calendar,
  Clock,
  UserCheck,
  Trophy,
  CreditCard,
  QrCode,
  Banknote,
  ChevronRight,
  FileText,
  ShieldCheck,
  Sparkles,
  Plus,
  Check,
  Droplet,
  Flame,
  Smile,
  ChevronDown,
  Gift,
} from 'lucide-react';

import { calculateServicePrice } from '../../lib/pricing-calculator';

interface LiffBookingSummaryProps {
  service: Service;
  staff: Staff | null;
  court?: Court | null;
  date: string;
  time: string;
  selectedAddons?: SelectedAddon[];
  onGoToPayment: (data: {
    selectedAddons: SelectedAddon[];
    customerName: string;
    customerPhone: string;
    notes: string;
    paymentMethod: PaymentMethod;
  }) => void;
}

export const LiffBookingSummary: React.FC<LiffBookingSummaryProps> = ({
  service,
  staff,
  court,
  date,
  time,
  selectedAddons: initialSelectedAddons = [],
  onGoToPayment,
}) => {
  const { activeTenant, currentUser, serviceAddons } = useSaaS();
  const terms = getTenantTerminology(activeTenant);

  const [customerName, setCustomerName] = useState(currentUser?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '081-234-5678');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay');

  // Selected Add-ons State
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>(initialSelectedAddons);
  const [addonOptionChoice, setAddonOptionChoice] = useState<Record<string, string>>({});

  const toggleAddon = (addon: ServiceAddon) => {
    const existingIndex = selectedAddons.findIndex((a) => a.addonId === addon.id);

    if (existingIndex >= 0) {
      // Remove
      setSelectedAddons((prev) => prev.filter((a) => a.addonId !== addon.id));
    } else {
      // Add
      const defaultOption = addon.options && addon.options.length > 0
        ? addonOptionChoice[addon.id] || addon.options[0].name
        : undefined;

      const newAddon: SelectedAddon = {
        id: `sel-addon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        addonId: addon.id,
        name: addon.name,
        price: addon.price,
        extraDurationMinutes: addon.extraDurationMinutes || 0,
        selectedOption: defaultOption,
      };

      setSelectedAddons((prev) => [...prev, newAddon]);
    }
  };

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleOptionChange = (addon: ServiceAddon, optionName: string) => {
    setAddonOptionChoice((prev) => ({ ...prev, [addon.id]: optionName }));
    setSelectedAddons((prev) =>
      prev.map((a) =>
        a.addonId === addon.id ? { ...a, selectedOption: optionName } : a
      )
    );
  };

  const isAddonSelected = (addonId: string) => {
    return selectedAddons.some((a) => a.addonId === addonId);
  };

  // Financial & Duration Calculations
  const addonsTotalPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const addonsExtraDuration = selectedAddons.reduce((sum, a) => sum + (a.extraDurationMinutes || 0), 0);

  const calculated = calculateServicePrice(service, time, date);
  const courtExtra = court?.extraPricePerHour || 0;
  const baseServicePrice = calculated.finalPrice;
  const totalPrice = Math.max(0, baseServicePrice + addonsTotalPrice + courtExtra);
  const totalDurationMinutes = service.durationMinutes + addonsExtraDuration;

  const depositPct = activeTenant.settings.depositPercentage ?? 50;
  const depositAmount = (totalPrice * depositPct) / 100;
  const remainingAmount = totalPrice - depositAmount;

  const formatDateThai = (dStr: string) => {
    const d = new Date(dStr);
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const getAddonIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Droplet':
        return <Droplet className="w-5 h-5 text-cyan-500" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-purple-500" />;
      case 'Smile':
        return <Smile className="w-5 h-5 text-primary" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  const handleSubmit = () => {
    if (!customerName?.trim() || !customerPhone?.trim()) {
      const errorMsg = 'กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์ติดต่อให้ครบถ้วน';
      setValidationError(errorMsg);
      setShowSummaryModal(false);
      // Fallback alert just in case
      window.alert(errorMsg);
      // Scroll to top so the user sees the inputs
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationError('');

    onGoToPayment({
      selectedAddons,
      customerName,
      customerPhone,
      notes,
      paymentMethod,
    });
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      <div className="text-center space-y-1 mt-2">
        <h2 className="text-lg font-black text-foreground">สรุปรายละเอียดการจอง</h2>
        <p className="text-[13px] text-slate-500 font-medium">เลือกบริการเสริม ชำระเงินมัดจำ ยืนยันคิวทันที</p>
      </div>

      {/* Main Booking Card */}
      <div className="premium-card p-5 space-y-4 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="pb-4 border-b border-border/60 flex items-start justify-between gap-3 relative z-10">
          <div>
            <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
              {service.category}
            </span>
            <h3 className="text-[15px] font-black text-foreground mt-2">{service.name}</h3>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xl font-black text-primary block">
              <span className="text-sm text-primary/70 mr-0.5">฿</span>{(service?.price ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-bold">ราคาบริการหลัก</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[13px] text-slate-600 pt-1 relative z-10">
          <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5">
                <Calendar className="w-4 h-4 flex-shrink-0" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-0.5">วันที่จอง</span>
              <span className="font-black text-foreground">{formatDateThai(date)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
             <div className="bg-primary/10 p-1.5 rounded-lg text-primary mt-0.5">
                <Clock className="w-4 h-4 flex-shrink-0" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-0.5">เวลารอบ & ระยะเวลา</span>
              <span className="font-black text-foreground block">
                {time} น.
              </span>
              <span className="text-[10px] font-bold text-primary block mt-0.5">
                ({totalDurationMinutes} นาที
                {addonsExtraDuration > 0 && ` +${addonsExtraDuration}น.`})
              </span>
            </div>
          </div>
        </div>

        {court ? (
          <div className="flex items-center gap-3 bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-[13px] shadow-sm relative z-10">
            <div className="bg-emerald-600 p-2 rounded-xl text-white flex-shrink-0 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-emerald-800 font-extrabold block">{terms.selectedResourceLabel}</span>
              <span className="font-black text-slate-900">
                {court.name} {court.extraPricePerHour ? <span className="text-emerald-600">(+฿{court.extraPricePerHour})</span> : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[13px] relative z-10">
            <div className="bg-white border border-slate-200 p-2 rounded-xl text-emerald-600 flex-shrink-0">
              {activeTenant?.businessType === 'sports' ? <Trophy className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-slate-500 font-bold block">{terms.selectedResourceLabel}</span>
              <span className="font-black text-slate-900">
                {staff ? staff.name : terms.autoAssignTitle}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Service Add-ons Section */}
      {serviceAddons.length > 0 && (
        <div className="premium-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl border border-amber-100">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-foreground">
                  บริการเสริมพิเศษ (Add-ons)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  เพิ่มประสบการณ์ความผ่อนคลายยิ่งขึ้น
                </p>
              </div>
            </div>
            {selectedAddons.length > 0 && (
              <span className="text-[10px] font-black bg-primary text-white px-2.5 py-1 rounded-xl shadow-sm">
                เลือกแล้ว {selectedAddons.length}
              </span>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {serviceAddons.map((addon) => {
              const selected = isAddonSelected(addon.id);
              const currentSelectedObj = selectedAddons.find((a) => a.addonId === addon.id);

              return (
                <div
                  key={addon.id}
                  className={`p-4 rounded-3xl border transition-all duration-300 ${
                    selected
                      ? 'bg-primary/5 border-primary shadow-[0_4px_12px_rgba(79,70,229,0.1)] ring-2 ring-primary/10'
                      : 'bg-slate-50/50 border-slate-200/80 hover:border-primary/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2.5 rounded-2xl flex-shrink-0 transition-colors ${
                          selected ? 'bg-white border-2 border-primary shadow-sm' : 'bg-white border border-slate-200 shadow-sm'
                      }`}>
                        {getAddonIcon(addon.icon)}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-black text-foreground">
                            {addon.name}
                          </span>
                          {addon.badge && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200/60 shadow-sm">
                              {addon.badge}
                            </span>
                          )}
                          {addon.extraDurationMinutes && addon.extraDurationMinutes > 0 && (
                            <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">
                              +{addon.extraDurationMinutes} นาที
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug font-medium">
                          {addon.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-[13px] font-black text-foreground">
                        +฿{(addon?.price ?? 0).toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleAddon(addon)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all duration-300 ${
                          selected
                            ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                            : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary'
                        }`}
                      >
                        {selected ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>เลือกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>เพิ่ม</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Addon Options Dropdown (if selected & has options) */}
                  {selected && addon.options && addon.options.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-primary/10 flex flex-col gap-2">
                      <label className="text-[11px] font-black text-primary/80 flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 text-primary" />
                        เลือกสูตร/กลิ่นเพิ่มเติม:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {addon.options.map((opt) => {
                          const isOptSelected =
                            currentSelectedObj?.selectedOption === opt.name ||
                            (!currentSelectedObj?.selectedOption && opt.id === addon.options![0].id);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleOptionChange(addon, opt.name)}
                              className={`px-3 py-2 rounded-xl text-[11px] font-bold text-left truncate transition-all duration-300 ${
                                isOptSelected
                                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40'
                              }`}
                            >
                              {opt.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Customer Information Inputs */}
      <div className="premium-card p-5 space-y-4">
        <h3 className="text-[13px] font-black text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          ข้อมูลผู้รับบริการ
        </h3>

        <div className="space-y-3.5 text-[13px]">
          <div>
            <label className="block text-slate-600 font-bold mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 border ${validationError && !customerName?.trim() ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium text-foreground shadow-inner`}
            />
            {validationError && !customerName?.trim() && (
              <p className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[10px]">!</span>
                กรุณากรอกชื่อ-นามสกุล
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1.5">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 border ${validationError && !customerPhone?.trim() ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-mono font-bold text-foreground shadow-inner`}
            />
            {validationError && !customerPhone?.trim() && (
              <p className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[10px]">!</span>
                กรุณากรอกเบอร์โทรศัพท์ติดต่อ
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              ข้อความเพิ่มเติม (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น เน้นบ่าไหล่, แพ้น้ำมันหอมระเหยบางชนิด..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium text-foreground shadow-inner resize-none"
            />
          </div>
        </div>
      </div>

      {/* Payment Summary Box */}
      <div className="premium-card p-5 space-y-4">
        <h3 className="text-[13px] font-black text-foreground">ช่องทางชำระเงินมัดจำ</h3>

        <div className="space-y-3">
          {/* PromptPay QR */}
          <div
            onClick={() => setPaymentMethod('promptpay')}
            className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all duration-300 ${
              paymentMethod === 'promptpay'
                ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-sm scale-[1.01]'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-black text-foreground">PromptPay QR Code</p>
              <p className="text-[11px] text-slate-500 font-medium">สแกนผ่านแอปธนาคาร ยืนยันคิวทันที</p>
            </div>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                paymentMethod === 'promptpay' ? 'border-primary' : 'border-slate-300'
              }`}>
                  {paymentMethod === 'promptpay' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
          </div>

          {/* Credit Card */}
          <div
            onClick={() => setPaymentMethod('credit_card')}
            className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all duration-300 ${
              paymentMethod === 'credit_card'
                ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-sm scale-[1.01]'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-black text-foreground">บัตรเครดิต / เดบิต</p>
              <p className="text-[11px] text-slate-500 font-medium">รองรับ Visa, Mastercard, JCB</p>
            </div>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                paymentMethod === 'credit_card' ? 'border-primary' : 'border-slate-300'
              }`}>
                  {paymentMethod === 'credit_card' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
          </div>

          {/* Cash */}
          <div
            onClick={() => setPaymentMethod('cash')}
            className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all duration-300 ${
              paymentMethod === 'cash'
                ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-sm scale-[1.01]'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-success text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-black text-foreground">ชำระเงินสดหน้างาน</p>
              <p className="text-[11px] text-slate-500 font-medium">ชำระเต็มจำนวน ณ วันเข้าใช้บริการ</p>
            </div>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                paymentMethod === 'cash' ? 'border-primary' : 'border-slate-300'
              }`}>
                  {paymentMethod === 'cash' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-[13px] pt-3 shadow-inner mt-2">
          <div className="flex justify-between text-slate-600 font-bold">
            <span>
              บริการหลัก ({service.name})
              {calculated.appliedRule ? ` [${calculated.appliedRule.name}]` : ''}
            </span>
            <span>฿{(baseServicePrice ?? 0).toLocaleString()}</span>
          </div>

          {selectedAddons.length > 0 && (
            <div className="space-y-2 py-2 border-t border-b border-slate-200/60 my-2">
              <div className="flex justify-between font-black text-primary">
                <span>บริการเสริม ({selectedAddons.length} รายการ)</span>
                <span>+฿{(addonsTotalPrice ?? 0).toLocaleString()}</span>
              </div>
              {selectedAddons.map((a) => (
                <div key={a.id} className="flex justify-between text-[11px] text-slate-500 font-bold pl-2">
                  <span>
                    • {a.name}
                    {a.selectedOption ? ` (${a.selectedOption})` : ''}
                  </span>
                  <span>+฿{(a?.price ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-foreground font-black text-[13px] pt-1">
            <span>ยอดรวมทั้งสิ้น ({totalDurationMinutes} นาที)</span>
            <span className="text-primary">฿{(totalPrice ?? 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-warning-dark font-black pt-2">
            <span className="bg-warning/20 px-2 py-0.5 rounded-md">ยอดชำระมัดจำวันนี้ ({depositPct}%)</span>
            <span className="text-lg">฿{(depositAmount ?? 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-slate-500 font-bold text-[11px] pt-2 border-t border-slate-200 mt-2">
            <span>ชำระส่วนที่เหลือ ณ หน้าร้าน</span>
            <span>฿{(remainingAmount ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-[64px] left-0 right-0 bg-white/96 backdrop-blur-md rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] border border-slate-200 z-30 p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">ยอดชำระมัดจำ ({depositPct}%)</p>
            <p className="text-[14px] font-black text-primary">฿{(depositAmount ?? 0).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">ยอดรวมทั้งหมด</p>
            <p className="text-[13px] font-black text-slate-900">฿{(totalPrice ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {validationError && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl border border-red-100 text-[12px] font-bold flex items-center gap-2 animate-fadeIn">
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-red-600 text-sm leading-none">!</span>
            </div>
            {validationError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full btn-primary py-3.5 px-6 text-[14px] shadow-premium flex items-center justify-between group rounded-2xl"
        >
          <span>ยืนยันและชำระเงิน</span>
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* Summary Modal Popup */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white max-w-[360px] w-full p-6 rounded-[32px] shadow-2xl space-y-5 border border-slate-200 transform animate-slideUp">
            <div className="text-center space-y-2 pb-4 border-b border-slate-100">
              <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                Booking Summary Breakdown
              </span>
              <h3 className="font-black text-foreground text-[17px] mt-2">สรุปรายละเอียดการจอง</h3>
              <p className="text-[11px] text-slate-500 font-medium">ตรวจสอบความถูกต้องก่อนชำระมัดจำ</p>
            </div>

            {/* Service & Add-ons breakdown table */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <p className="font-black text-[13px] text-foreground">{service.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">ระยะเวลา {service.durationMinutes} นาที</p>
                </div>
                <span className="font-black text-[13px] text-foreground">฿{(service?.price ?? 0).toLocaleString()}</span>
              </div>

              {selectedAddons.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-black text-primary">รายการบริการเสริมที่เลือก:</p>
                  {selectedAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between items-center text-[11px] text-slate-700 font-bold pl-2">
                      <span>• {addon.name} {addon.selectedOption ? `(${addon.selectedOption})` : ''}</span>
                      <span className="font-black text-slate-900">+฿{(addon?.price ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic font-medium">ไม่ได้เลือกบริการเสริมเพิ่มเติม</p>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-2 font-black text-slate-900">
                <div className="flex justify-between text-[13px]">
                  <span>ราคารวมทั้งสิ้น:</span>
                  <span className="text-primary">฿{(totalPrice ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[13px] text-warning-dark pt-1 bg-warning/10 p-2 rounded-xl">
                  <span>มัดจำ ({depositPct}%):</span>
                  <span className="text-[15px]">฿{(depositAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-bold pt-1">
                  <span>ยอดคงเหลือชำระหน้าร้าน:</span>
                  <span>฿{(remainingAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Customer & Slot details */}
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 text-[11px] space-y-1.5 font-medium">
              <p className="text-slate-700 flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary mt-0.5" />
                <span><strong className="text-foreground">วันที่นัด:</strong> {formatDateThai(date)} ({time} น.)</span>
              </p>
              <p className="text-slate-700 flex items-start gap-2">
                 <UserCheck className="w-3.5 h-3.5 text-primary mt-0.5" />
                <span><strong className="text-foreground">{terms.selectedResourceLabel}:</strong> {staff ? staff.name : terms.autoAssignedText}</span>
              </p>
              <p className="text-slate-700 flex items-start gap-2">
                 <FileText className="w-3.5 h-3.5 text-primary mt-0.5" />
                <span><strong className="text-foreground">ผู้จอง:</strong> {customerName || 'ลูกค้าทั่วไป'} ({customerPhone || 'ไม่ระบุ'})</span>
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSummaryModal(false);
                  handleSubmit();
                }}
                className="w-full btn-primary py-3.5 rounded-xl text-[13px] shadow-md flex items-center justify-center gap-2"
              >
                <span>ยืนยันชำระมัดจำ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-[13px]"
              >
                ย้อนกลับไปแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
