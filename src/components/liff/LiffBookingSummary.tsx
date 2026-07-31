import React, { useState } from 'react';
import { Service, Staff, PaymentMethod, SelectedAddon, ServiceAddon } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import {
  Calendar,
  Clock,
  UserCheck,
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

interface LiffBookingSummaryProps {
  service: Service;
  staff: Staff | null;
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
  date,
  time,
  selectedAddons: initialSelectedAddons = [],
  onGoToPayment,
}) => {
  const { activeTenant, currentUser, serviceAddons } = useSaaS();

  const [customerName, setCustomerName] = useState(currentUser.displayName);
  const [customerPhone, setCustomerPhone] = useState(currentUser.phone || '081-234-5678');
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

  const totalPrice = service.price + addonsTotalPrice;
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
        return <Droplet className="w-4 h-4 text-cyan-600" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-amber-600" />;
      case 'Clock':
        return <Clock className="w-4 h-4 text-purple-600" />;
      case 'Smile':
        return <Smile className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const handleSubmit = () => {
    onGoToPayment({
      selectedAddons,
      customerName,
      customerPhone,
      notes,
      paymentMethod,
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold text-slate-900">สรุปรายละเอียดการจอง</h2>
        <p className="text-xs text-slate-500">เลือกบริการเสริม ชำระเงินมัดจำ ยืนยันคิวทันที</p>
      </div>

      {/* Main Booking Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {service.category}
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{service.name}</h3>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-extrabold text-slate-900 block">
              ฿{(service?.price ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">ราคาบริการหลัก</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">วันที่จอง</span>
              <span className="font-bold text-slate-800">{formatDateThai(date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">เวลารอบ & ระยะเวลา</span>
              <span className="font-bold text-slate-800">
                {time} น. ({totalDurationMinutes} นาที
                {addonsExtraDuration > 0 && (
                  <span className="text-emerald-600 font-normal text-[10px]"> +{addonsExtraDuration}น.</span>
                )})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
          <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-[10px] text-slate-400 block">ผู้ให้บริการ (ช่าง)</span>
            <span className="font-bold text-slate-800">
              {staff ? staff.name : 'ช่างคนใดก็ได้'}
            </span>
          </div>
        </div>
      </div>

      {/* Service Add-ons Section */}
      {serviceAddons.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  เลือกบริการเสริมพิเศษ (Optional Add-ons)
                </h3>
                <p className="text-[10px] text-slate-500">
                  เพิ่มประสบการณ์ความผ่อนคลายยิ่งขึ้น
                </p>
              </div>
            </div>
            {selectedAddons.length > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                เลือกแล้ว {selectedAddons.length} รายการ
              </span>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            {serviceAddons.map((addon) => {
              const selected = isAddonSelected(addon.id);
              const currentSelectedObj = selectedAddons.find((a) => a.addonId === addon.id);

              return (
                <div
                  key={addon.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    selected
                      ? 'bg-emerald-50/70 border-emerald-500/80 ring-2 ring-emerald-500/15 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs mt-0.5">
                        {getAddonIcon(addon.icon)}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {addon.name}
                          </span>
                          {addon.badge && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200/60">
                              {addon.badge}
                            </span>
                          )}
                          {addon.extraDurationMinutes && addon.extraDurationMinutes > 0 && (
                            <span className="text-[9px] font-medium bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-100">
                              +{addon.extraDurationMinutes} นาที
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {addon.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs font-extrabold text-slate-900">
                        +฿{(addon?.price ?? 0).toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleAddon(addon)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          selected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {selected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>เลือกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-slate-500" />
                            <span>เพิ่ม</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Addon Options Dropdown (if selected & has options) */}
                  {selected && addon.options && addon.options.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-emerald-600" />
                        เลือกสูตร/กลิ่นเพิ่มเติม:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {addon.options.map((opt) => {
                          const isOptSelected =
                            currentSelectedObj?.selectedOption === opt.name ||
                            (!currentSelectedObj?.selectedOption && opt.id === addon.options![0].id);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleOptionChange(addon, opt.name)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium text-left truncate transition-all ${
                                isOptSelected
                                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ข้อมูลผู้รับบริการ (ดึงข้อมูลจาก LINE)
        </h3>

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              ข้อความเพิ่มเติม/เน้นบริเวณพิเศษ (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น เน้นบ่าไหล่, แพ้น้ำมันหอมระเหยบางชนิด..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* Payment Summary Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900">ช่องทางชำระเงินมัดจำ</h3>

        <div className="space-y-2">
          {/* PromptPay QR */}
          <div
            onClick={() => setPaymentMethod('promptpay')}
            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              paymentMethod === 'promptpay'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">PromptPay QR Code (พร้อมเพย์)</p>
              <p className="text-[10px] text-slate-500">สแกนผ่านแอปธนาคาร ยืนยันคิวทันที</p>
            </div>
            <input
              type="radio"
              checked={paymentMethod === 'promptpay'}
              onChange={() => setPaymentMethod('promptpay')}
              className="w-4 h-4 text-emerald-600"
            />
          </div>

          {/* Credit Card */}
          <div
            onClick={() => setPaymentMethod('credit_card')}
            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              paymentMethod === 'credit_card'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">บัตรเครดิต / เดบิต (Omise Gateway)</p>
              <p className="text-[10px] text-slate-500">รองรับ Visa, Mastercard, JCB</p>
            </div>
            <input
              type="radio"
              checked={paymentMethod === 'credit_card'}
              onChange={() => setPaymentMethod('credit_card')}
              className="w-4 h-4 text-emerald-600"
            />
          </div>

          {/* Cash */}
          <div
            onClick={() => setPaymentMethod('cash')}
            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              paymentMethod === 'cash'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">ชำระเงินสดหน้างาน (Cash on Service)</p>
              <p className="text-[10px] text-slate-500">ชำระเต็มจำนวน ณ วันเข้าใช้บริการ</p>
            </div>
            <input
              type="radio"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
              className="w-4 h-4 text-emerald-600"
            />
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs pt-2">
          <div className="flex justify-between text-slate-600">
            <span>บริการหลัก ({service.name})</span>
            <span className="font-semibold">฿{(service?.price ?? 0).toLocaleString()}</span>
          </div>

          {selectedAddons.length > 0 && (
            <div className="space-y-1 py-1 border-t border-b border-slate-200/60 my-1">
              <div className="flex justify-between font-medium text-emerald-800">
                <span>บริการเสริม ({selectedAddons.length} รายการ)</span>
                <span>+฿{(addonsTotalPrice ?? 0).toLocaleString()}</span>
              </div>
              {selectedAddons.map((a) => (
                <div key={a.id} className="flex justify-between text-[11px] text-slate-500 pl-2">
                  <span>
                    • {a.name}
                    {a.selectedOption ? ` (${a.selectedOption})` : ''}
                  </span>
                  <span>+฿{(a?.price ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-slate-900 font-bold text-xs pt-1">
            <span>ยอดรวมทั้งสิ้น ({totalDurationMinutes} นาที)</span>
            <span>฿{(totalPrice ?? 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-emerald-700 font-extrabold pt-1">
            <span>ยอดชำระมัดจำวันนี้ ({depositPct}%)</span>
            <span>฿{(depositAmount ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
            <span>ชำระส่วนที่เหลือ ณ หน้าร้าน</span>
            <span>฿{(remainingAmount ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowSummaryModal(true)}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors text-xs border border-slate-200"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>🔍 ดูสรุปยอดค่าใช้จ่าย & บริการเสริม (Summary Breakdown Modal)</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <span>ไปที่หน้าชำระเงิน (฿{(depositAmount ?? 0).toLocaleString()})</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Modal Popup */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white max-w-sm w-full p-5 rounded-3xl shadow-2xl space-y-4 text-xs border border-slate-200">
            <div className="text-center space-y-1 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Booking Summary Breakdown
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm mt-1">สรุปรายละเอียดการจอง & ค่าใช้จ่าย</h3>
              <p className="text-[11px] text-slate-500">ตรวจสอบความถูกต้องก่อนเข้าสู่ขั้นตอนชำระมัดจำ</p>
            </div>

            {/* Service & Add-ons breakdown table */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">{service.name}</p>
                  <p className="text-[10px] text-slate-500">ระยะเวลา {service.durationMinutes} นาที</p>
                </div>
                <span className="font-bold text-slate-900">฿{(service?.price ?? 0).toLocaleString()}</span>
              </div>

              {selectedAddons.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold text-emerald-800">รายการบริการเสริมที่เลือก:</p>
                  {selectedAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between items-center text-[11px] text-slate-700 pl-2">
                      <span>• {addon.name} {addon.selectedOption ? `(${addon.selectedOption})` : ''}</span>
                      <span className="font-semibold text-slate-900">+฿{(addon?.price ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">ไม่ได้เลือกบริการเสริมเพิ่มเติม</p>
              )}

              <div className="pt-2 border-t border-slate-200 space-y-1 font-bold text-slate-900">
                <div className="flex justify-between text-xs">
                  <span>ราคารวมทั้งสิ้น ({totalDurationMinutes} นาที):</span>
                  <span>฿{(totalPrice ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 pt-1">
                  <span>ยอดชำระมัดจำวันนี้ ({depositPct}%):</span>
                  <span className="text-sm font-extrabold">฿{(depositAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-normal">
                  <span>ยอดคงเหลือชำระหน้าร้าน:</span>
                  <span>฿{(remainingAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Customer & Slot details */}
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 text-[11px] space-y-1">
              <p className="text-slate-700"><strong>วันที่นัดหมาย:</strong> {formatDateThai(date)} ({time} น.)</p>
              <p className="text-slate-700"><strong>ผู้ให้บริการ:</strong> {staff ? staff.name : 'ช่างคนใดก็ได้'}</p>
              <p className="text-slate-700"><strong>ผู้จอง:</strong> {customerName || 'ลูกค้าทั่วไป'} ({customerPhone || 'ไม่ระบุ'})</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                ย้อนกลับไปแก้ไข
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSummaryModal(false);
                  handleSubmit();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                ยืนยันชำระมัดจำ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
