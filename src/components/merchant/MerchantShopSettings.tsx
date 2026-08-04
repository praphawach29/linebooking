import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { BusinessHour } from '../../types';
import {
  Store,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Phone,
  Mail,
  MapPin,
  Tag,
  FileText,
  Sparkles,
  Clock,
  Copy,
} from 'lucide-react';

// Preset sample logo avatars for quick selection
const PRESET_LOGOS = [
  { name: 'บาร์เบอร์ / ตัดผม', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=150&auto=format&fit=crop&q=80' },
  { name: 'ร้านเสริมสวย / ซาลอน', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=150&auto=format&fit=crop&q=80' },
  { name: 'สปา & นวดแผนไทย', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&auto=format&fit=crop&q=80' },
  { name: 'คลินิกความงาม', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80' },
  { name: 'สนามฟุตบอล / กีฬา', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150&auto=format&fit=crop&q=80' },
  { name: 'ร้านกาแฟ / คาเฟ่', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=80' },
];

const DAYS_LIST = [
  { id: 1, name: 'วันจันทร์' },
  { id: 2, name: 'วันอังคาร' },
  { id: 3, name: 'วันพุธ' },
  { id: 4, name: 'วันพฤหัสบดี' },
  { id: 5, name: 'วันศุกร์' },
  { id: 6, name: 'วันเสาร์' },
  { id: 0, name: 'วันอาทิตย์' },
];

export const MerchantShopSettings: React.FC = () => {
  const { activeTenant, updateTenant, businessHours, updateBusinessHours } = useSaaS();

  const [name, setName] = useState(activeTenant?.name || '');
  const [logoUrl, setLogoUrl] = useState(activeTenant?.logoUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(activeTenant?.coverImageUrl || '');
  const [description, setDescription] = useState(activeTenant?.description || '');
  const [phone, setPhone] = useState(activeTenant?.phone || '');
  const [email, setEmail] = useState(activeTenant?.email || '');
  const [address, setAddress] = useState(activeTenant?.address || '');
  const [businessType, setBusinessType] = useState<any>(activeTenant?.businessType || 'other');

  // Business Hours State
  const [localHours, setLocalHours] = useState<BusinessHour[]>(() => {
    return [1, 2, 3, 4, 5, 6, 0].map((dow) => {
      const existing = businessHours.find((h) => h.dayOfWeek === dow && (!h.tenantId || h.tenantId === activeTenant?.id));
      if (existing) return existing;
      return {
        id: `bh-${dow}`,
        tenantId: activeTenant?.id || '',
        dayOfWeek: dow,
        openTime: '08:00',
        closeTime: '23:00',
        isOpen: true,
      };
    });
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!activeTenant) return null;

  const handleHourChange = (dow: number, field: keyof BusinessHour, value: any) => {
    setLocalHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dow ? { ...h, [field]: value } : h))
    );
  };

  const applyPresetHours = (openTime: string, closeTime: string) => {
    setLocalHours((prev) =>
      prev.map((h) => ({ ...h, openTime, closeTime, isOpen: true }))
    );
  };

  const copyToAllDays = (source: BusinessHour) => {
    setLocalHours((prev) =>
      prev.map((h) => ({
        ...h,
        openTime: source.openTime,
        closeTime: source.closeTime,
        isOpen: source.isOpen,
      }))
    );
  };

  // Handle local file upload & convert to Data URL
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปต้องไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปต้องไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError('กรุณาระบุชื่อร้านค้า');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateTenant(activeTenant.id, {
        name: name.trim(),
        logoUrl: logoUrl.trim(),
        coverImageUrl: coverImageUrl.trim(),
        description: description.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        businessType,
      });

      if (updateBusinessHours) {
        await updateBusinessHours(localHours);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-3xl text-white shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Store className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black">{activeTenant.name}</h1>
            <p className="text-slate-300 text-xs mt-0.5 font-medium">
              ตั้งค่าชื่อร้าน โลโก้ รูปหน้าปก เวลาเปิด-ปิด และข้อมูลการติดต่อหน้าร้าน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">
            Slug: <span className="text-emerald-400 font-mono">{activeTenant.slug}</span>
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>บันทึกข้อมูลร้านค้า โลโก้ และเวลาทำการเรียบร้อยแล้ว</span>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Logo & Cover Image */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            โลโก้ & ภาพหน้าปก (Brand Assets)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                โลโก้ร้านค้า (Logo Avatar)
              </label>
              <div className="flex items-center gap-4 mb-3">
                <img
                  src={logoUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&auto=format&fit=crop&q=80'}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลดโลโก้ใหม่</span>
                    <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">เลือกใช้ตัวอย่างโลโก้สำเร็จรูป:</span>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_LOGOS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setLogoUrl(p.url)}
                      className="p-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 text-[10px] font-bold text-slate-600 hover:text-emerald-700 flex flex-col items-center gap-1 transition-colors"
                    >
                      <img src={p.url} className="w-8 h-8 rounded-lg object-cover" alt={p.name} />
                      <span className="truncate w-full text-center">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                รูปภาพหน้าปก (Cover Banner)
              </label>
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-24 rounded-2xl object-cover border border-slate-200 shadow-sm mb-2"
                />
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดรูปหน้าปก</span>
                <input type="file" accept="image/*" onChange={handleCoverFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: General Shop Information */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Tag className="w-4 h-4 text-emerald-600" />
            รายละเอียดข้อมูลร้านค้า (Shop Details)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อร้านค้า *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Barbershop & Spa"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทธุรกิจ *
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="barbershop">ร้านตัดผมชาย (Barbershop)</option>
                <option value="salon">ร้านเสริมสวย / ทำผม (Salon)</option>
                <option value="spa">สปา & นวดแผนไทย (Spa / Massage)</option>
                <option value="clinic">คลินิกเสริมความงาม (Beauty Clinic)</option>
                <option value="sports">สนามซ้อม / สนามกีฬา (Sports Venue)</option>
                <option value="other">ธุรกิจบริการอื่นๆ (Other Business)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                คำอธิบาย / สโลแกนร้านค้า
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="สโลแกน บริการเน้นคุณภาพ ช่างผู้เชี่ยวชาญ ยินดีต้อนรับครับ..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact Details */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="w-4 h-4 text-emerald-600" />
            ข้อมูลการติดต่อหน้าร้าน (Contact Details)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081-234-5678"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                อีเมลติดต่อ
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shop@example.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                ที่อยู่ร้านค้า / พิกัดที่ตั้ง
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Business Hours Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                เวลาเปิด - ปิดทำการร้านค้า (Business Hours)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                กำหนดเวลาให้บริการในแต่ละวันของสัปดาห์ (ระบบนำไปปล่อยสล็อตจองให้อัตโนมัติ)
              </p>
            </div>
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => applyPresetHours('08:00', '23:00')}
                className="text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200 transition-colors"
              >
                ⚽ 08:00 - 23:00 น. (สนามกีฬา)
              </button>
              <button
                type="button"
                onClick={() => applyPresetHours('09:00', '19:00')}
                className="text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 rounded-xl border border-slate-200 transition-colors"
              >
                💈 09:00 - 19:00 น. (สปา/ตัดผม)
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {DAYS_LIST.map((day) => {
              const bh = localHours.find((h) => h.dayOfWeek === day.id) || {
                id: `bh-${day.id}`,
                tenantId: activeTenant.id,
                dayOfWeek: day.id,
                openTime: '08:00',
                closeTime: '23:00',
                isOpen: true,
              };

              return (
                <div
                  key={day.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    bh.isOpen ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-100/60 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 w-36 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bh.isOpen}
                        onChange={(e) => handleHourChange(day.id, 'isOpen', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                    <span className="font-extrabold text-xs text-slate-800">{day.name}</span>
                  </div>

                  {bh.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 justify-start sm:justify-center text-xs">
                      <span className="text-slate-500 font-bold text-[11px]">เปิด:</span>
                      <input
                        type="time"
                        value={bh.openTime}
                        onChange={(e) => handleHourChange(day.id, 'openTime', e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-2 py-1 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <span className="text-slate-500 font-bold text-[11px]">ปิด:</span>
                      <input
                        type="time"
                        value={bh.closeTime}
                        onChange={(e) => handleHourChange(day.id, 'closeTime', e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-2 py-1 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                      ปิดทำการประจำวัน
                    </span>
                  )}

                  {bh.isOpen && (
                    <button
                      type="button"
                      onClick={() => copyToAllDays(bh)}
                      title="คัดลอกเวลาเปิด-ปิดนี้ไปยังทุกวัน"
                      className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex items-center gap-1 shrink-0 self-end sm:self-center"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>ใช้เวลานี้ทุกวัน</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกข้อมูลร้านค้า & โลโก้</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
