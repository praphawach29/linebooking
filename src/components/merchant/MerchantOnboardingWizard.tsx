import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Building2, MessageSquare, Scissors, Clock, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';

export const MerchantOnboardingWizard: React.FC = () => {
  const { addOnboardingTenant } = useSaaS();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form States
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState<'spa' | 'barbershop' | 'clinic' | 'salon'>('spa');
  const [phone, setPhone] = useState('02-123-4567');
  const [address, setAddress] = useState('กรุงเทพมหานคร');

  const [channelId, setChannelId] = useState('2009876543');
  const [channelSecret, setChannelSecret] = useState('secret_abc123');

  const [serviceName, setServiceName] = useState('บริการนวดและสปาเพื่อสุขภาพ');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(1200);

  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('19:00');

  const handleFinish = () => {
    addOnboardingTenant(
      {
        name: shopName || 'ร้านค้าบริการใหม่',
        slug: slug || `shop-${Math.floor(Math.random() * 1000)}`,
        businessType,
        phone,
        address,
        lineChannelId: channelId,
        lineChannelSecret: channelSecret,
      },
      {
        name: serviceName,
        durationMinutes: duration,
        price,
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6 text-xs">
      
      {/* Step Indicator Header */}
      <div className="border-b border-slate-100 pb-4 space-y-2">
        <div className="flex items-center justify-between text-slate-500 font-bold">
          <span className="text-emerald-600">ขั้นตอนการตั้งค่าร้านค้า [ Step {step} / 4 ]</span>
          <span className="text-[11px] font-mono">Multi-tenant Onboarding Wizard</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
          <div className={`h-full ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
          <div className={`h-full ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
          <div className={`h-full ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
          <div className={`h-full ${step >= 4 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            ขั้นตอนที่ 1: ข้อมูลร้านค้าและชื่อโดเมน (Tenant Info)
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อร้านค้า / แบรนด์บริการ *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                }}
                placeholder="เช่น Happy Spa & Wellness"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">URL Subdomain (Slug) *</label>
              <div className="flex items-center gap-2 bg-slate-50 p-2 border border-slate-200 rounded-xl font-mono text-slate-700 font-bold">
                <span>https://</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="happy-spa"
                  className="bg-transparent border-b border-emerald-500 focus:outline-none flex-1 text-emerald-700"
                />
                <span>.booking.app</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ประเภทธุรกิจ *</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="spa">สปา / นวดแผนไทย (Spa)</option>
                  <option value="barbershop">ร้านตัดผมชาย (Barbershop)</option>
                  <option value="clinic">คลินิกความงาม (Clinic)</option>
                  <option value="salon">ร้านทำผม / ทำเล็บ (Salon)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์ติดต่อ *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ที่อยู่หน้าร้าน</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <button
            disabled={!shopName}
            onClick={() => setStep(2)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>ถัดไป: ขั้นตอนที่ 2 (LINE OA Setup)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: LINE Connection */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            ขั้นตอนที่ 2: เชื่อมต่อ LINE Official Account (Messaging API)
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">LINE Channel ID *</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">LINE Channel Secret *</label>
              <input
                type="password"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              className="py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200"
            >
              ย้อนกลับ
            </button>

            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-1.5"
            >
              <span>ถัดไป: ขั้นตอนที่ 3 (ตั้งค่าบริการแรก)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: First Service */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-600" />
            ขั้นตอนที่ 3: ตั้งค่าบริการแรกของร้าน (Initial Service)
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อบริการ *</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ระยะเวลา (นาที) *</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ราคาค่าบริการ (บาท) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(2)}
              className="py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200"
            >
              ย้อนกลับ
            </button>

            <button
              onClick={() => setStep(4)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-1.5"
            >
              <span>ถัดไป: ขั้นตอนที่ 4 (เวลาเปิด-ปิดร้าน)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Business Hours */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            ขั้นตอนที่ 4: เวลาเปิด-ปิดให้บริการ (Business Hours)
          </h2>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">เวลาเปิดร้าน *</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เวลาปิดร้าน *</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(3)}
              className="py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200"
            >
              ย้อนกลับ
            </button>

            <button
              onClick={handleFinish}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>เสร็จสิ้นและเปิดใช้งานร้านค้าใหม่</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
