import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
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

export const MerchantShopSettings: React.FC = () => {
  const { activeTenant, updateTenant } = useSaaS();

  const [name, setName] = useState(activeTenant?.name || '');
  const [logoUrl, setLogoUrl] = useState(activeTenant?.logoUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(activeTenant?.coverImageUrl || '');
  const [description, setDescription] = useState(activeTenant?.description || '');
  const [phone, setPhone] = useState(activeTenant?.phone || '');
  const [email, setEmail] = useState(activeTenant?.email || '');
  const [address, setAddress] = useState(activeTenant?.address || '');
  const [businessType, setBusinessType] = useState<any>(activeTenant?.businessType || 'other');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!activeTenant) return null;

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
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              ตั้งค่าข้อมูลร้านค้า & โลโก้
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              จัดการชื่อร้าน, โลโก้, ข้อมูลติดต่อ และรายละเอียดของร้านค้าที่แสดงบน LINE OA
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
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-extrabold">
            บันทึกข้อมูลและโลโก้ร้านค้าสำเร็จเรียบร้อยแล้ว! 🚀
          </span>
        </div>
      )}

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-xs font-extrabold">{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Logo & Cover Image */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            รูปโลโก้และภาพปกของร้านค้า (Shop Logo & Cover)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Preview & Custom Upload */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                โลโก้ร้านค้า (Shop Logo) *
              </label>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Shop Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <label className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-sm shadow-emerald-600/20 active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>อัปโหลดรูปจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400">รองรับไฟล์ JPG, PNG, WEBP (ไม่เกิน 5MB)</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  หรือวาง URL รูปภาพโลโก้:
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Preset Sample Logos */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 mb-2">เลือกใช้ตัวอย่างโลโก้สำเร็จรูป:</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_LOGOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLogoUrl(preset.url)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                        logoUrl === preset.url
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      <span className="text-[10px] truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                รูปภาพปกหน้าร้าน (Cover Image)
              </label>

              <div className="h-28 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center relative shadow-sm">
                {coverImageUrl ? (
                  <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[11px]">ยังไม่มีรูปปกหน้าร้าน</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-sm active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>อัปโหลดรูปปก</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileUpload}
                    className="hidden"
                  />
                </label>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="text-xs text-red-500 hover:underline px-2 py-1"
                  >
                    ลบรูปปก
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  หรือวาง URL รูปปก:
                </label>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
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
