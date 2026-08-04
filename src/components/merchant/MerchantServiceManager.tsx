import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Service, ServiceAddon, TimePricingRule } from '../../types';
import { getServicePriceRangeText } from '../../lib/pricing-calculator';
import {
  Scissors,
  Plus,
  Clock,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Gift,
  Tag,
  Image as ImageIcon,
  Upload,
  Link
} from 'lucide-react';
import { getTenantQuotaInfo } from '../../lib/quota-manager';
import { MerchantSubscriptionModal } from './MerchantSubscriptionModal';

const PRESET_SERVICE_IMAGES = [
  { label: '🧖‍♀️ นวด/สปา', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80' },
  { label: '💇‍♂️ ตัดผม/ทำผม', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80' },
  { label: '💅 ทำเล็บ', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=80' },
  { label: '⚽ สนามกีฬา', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80' },
  { label: '🩺 คลินิก/ความงาม', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80' },
  { label: '🚗 ล้างรถ/คาร์แคร์', url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop&q=80' },
];

const DEFAULT_CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  sports: ['สนามฟุตบอล', 'สนามหญ้าเทียม', 'สนามแบดมินตัน', 'สนามเทนนิส', 'อุปกรณ์กีฬา', 'โค้ช/ผู้ฝึกสอน'],
  spa: ['นวดไทย', 'นวดอโรมา', 'นวดเท้า', 'สปาผิว', 'ขัดผิว', 'ทรีตเมนต์'],
  salon: ['สระ-ไดร์', 'ตัดผมชาย', 'ตัดผมหญิง', 'ทำสีผม', 'ดัดผม', 'ทรีตเมนต์ผม'],
  barbershop: ['ตัดผมชาย', 'โกนหนวด', 'เซ็ตทรงผม', 'ทำสีผม', 'สปาหนังศีรษะ'],
  clinic: ['ตรวจสุขภาพ', 'ทรีตเมนต์หน้า', 'โบท็อกซ์/ฟิลเลอร์', 'เลเซอร์', 'กระชับสัดส่วน'],
  other: ['บริการทั่วไป', 'โปรโมชั่น', 'แพ็กเกจพิเศษ', 'VIP'],
};

export const MerchantServiceManager: React.FC = () => {
  const {
    activeTenant,
    services,
    serviceAddons,
    saveService,
    deleteService,
    saveServiceAddon,
    deleteServiceAddon,
    staffs,
    courts,
    bookings,
  } = useSaaS();

  const [activeTab, setActiveTab] = useState<'services' | 'addons'>('services');
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingAddon, setEditingAddon] = useState<Partial<ServiceAddon> | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const existingCategories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean))
  ) as string[];

  const handleDeleteCategoryGlobally = async (categoryToDelete: string) => {
    if (confirm(`คุณต้องการลบหมวดหมู่ "${categoryToDelete}" และเปลี่ยนบริการในหมวดหมู่นี้เป็น "ทั่วไป" ใช่หรือไม่?`)) {
      const servicesToUpdate = services.filter((s) => s.category === categoryToDelete);
      for (const s of servicesToUpdate) {
        await saveService({ ...s, category: 'ทั่วไป' });
      }
      if (editingService && editingService.category === categoryToDelete) {
        setEditingService({ ...editingService, category: 'ทั่วไป' });
      }
    }
  };

  const quotaInfo = activeTenant ? getTenantQuotaInfo(activeTenant, bookings, staffs, courts, services) : null;

  const handleOpenAddService = () => {
    if (quotaInfo && quotaInfo.isServiceQuotaReached) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    setEditingService({
      name: '',
      description: '',
      category: 'ทั่วไป',
      durationMinutes: 60,
      bufferMinutes: 15,
      price: 1000,
      colorCode: '#3B82F6',
    });
  };

  const handleOpenAddAddon = () => {
    setEditingAddon({
      name: '',
      description: '',
      category: 'ทั่วไป',
      price: 150,
      extraDurationMinutes: 0,
      badge: '',
      icon: 'Sparkles',
    });
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      saveService(editingService);
      setEditingService(null);
    }
  };

  const handleSaveAddon = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAddon) {
      saveServiceAddon(editingAddon);
      setEditingAddon(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-emerald-600" />
            เมนูบริการ & บริการเสริม (Service & Add-on Catalog)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการบริการหลักและบริการเสริมสำหรับให้ลูกค้าเลือกใน LIFF Booking Flow
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'services' ? (
            <button
              type="button"
              onClick={handleOpenAddService}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มบริการหลัก</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddAddon}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ เพิ่มบริการเสริม</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl max-w-md font-bold text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'services'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scissors className="w-4 h-4 text-emerald-600" />
          <span>บริการหลัก ({services.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addons')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'addons'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-600" />
          <span>บริการเสริมพิเศษ ({serviceAddons.length})</span>
        </button>
      </div>

      {/* TAB 1: SERVICES LIST */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
            >
              {svc.imageUrl ? (
                <div className="h-32 -mx-4 -mt-4 mb-1 overflow-hidden relative bg-slate-100 border-b border-slate-100">
                  <img src={svc.imageUrl} alt={svc.name} className="w-full h-full object-cover" />
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: svc.colorCode || '#3B82F6' }}
                  />
                </div>
              ) : (
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: svc.colorCode || '#3B82F6' }}
                />
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                    {svc.category}
                  </span>
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {svc.durationMinutes} นาที (+พัก {svc.bufferMinutes}m)
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-sm">{svc.name}</h3>
                <p className="text-slate-500 line-clamp-2">{svc.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">ราคาค่าบริการ</span>
                    {svc.timePricingRules && svc.timePricingRules.length > 0 && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        ⏰ ตามช่วงเวลา ({svc.timePricingRules.length} ช่วง)
                      </span>
                    )}
                  </div>
                  <p className="text-base font-black text-slate-900">
                    {getServicePriceRangeText(svc)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingService(svc)}
                    className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="แก้ไข"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteService(svc.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SERVICE ADDONS LIST */}
      {activeTab === 'addons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviceAddons.length === 0 ? (
            <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-200/80 text-center space-y-2">
              <Gift className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium">ยังไม่มีรายการบริการเสริม</p>
              <button
                type="button"
                onClick={handleOpenAddAddon}
                className="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                + เพิ่มบริการเสริมแรก
              </button>
            </div>
          ) : (
            serviceAddons.map((addon) => (
              <div
                key={addon.id}
                className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        {addon.category}
                      </span>
                      {addon.badge && (
                        <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-100">
                          {addon.badge}
                        </span>
                      )}
                    </div>
                    {addon.extraDurationMinutes ? (
                      <span className="text-purple-700 font-bold text-[10px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        +{addon.extraDurationMinutes} นาที
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">ไม่เพิ่มเวลา</span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{addon.name}</span>
                  </h3>
                  <p className="text-slate-500 line-clamp-2">{addon.description}</p>

                  {addon.options && addon.options.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        ตัวเลือกย่อย ({addon.options.length} สูตร):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {addon.options.map((opt) => (
                          <span
                            key={opt.id}
                            className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-md"
                          >
                            {opt.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400">ราคาบริการเสริม</span>
                    <p className="text-base font-black text-amber-700">
                      +฿{(addon?.price ?? 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingAddon(addon)}
                      className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                      title="แก้ไข"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteServiceAddon(addon.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit / Add Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white max-w-lg w-full max-h-[90vh] rounded-3xl shadow-2xl p-6 border border-slate-200 flex flex-col justify-between my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-sm text-slate-900">
                {editingService.id ? 'แก้ไขบริการหลัก' : 'เพิ่มบริการหลักใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 my-2 pr-1">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อบริการ *</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="เช่น นวดไทยอโรมาผ่อนคลาย"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* หมวดหมู่บริการ & สีประจำบริการ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 font-bold">หมวดหมู่บริการ *</label>
                    <span className="text-[10px] text-slate-400 font-medium">พิมพ์เอง หรือเลือกจากชิป</span>
                  </div>

                  <input
                    type="text"
                    required
                    value={editingService.category || ''}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                    placeholder="พิมพ์ชื่อหมวดหมู่ เช่น สนามหญ้าเทียม, นวดไทย"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900 text-xs"
                  />

                  {/* Existing Category Chips */}
                  {existingCategories.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">หมวดหมู่ที่มีในร้าน (คลิกเพื่อเลือก / กด ✕ เพื่อลบ):</span>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-xl">
                        {existingCategories.map((cat) => {
                          const isSelected = editingService.category === cat;
                          return (
                            <div
                              key={cat}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setEditingService({ ...editingService, category: cat })}
                                className="hover:underline"
                              >
                                {cat}
                              </button>

                              {cat !== 'ทั่วไป' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategoryGlobally(cat);
                                  }}
                                  className={`p-0.5 rounded hover:bg-red-500 hover:text-white transition-colors ${
                                    isSelected ? 'text-white/80' : 'text-slate-400'
                                  }`}
                                  title={`ลบหมวดหมู่ ${cat}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preset Suggestions */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">แนะนำสำหรับประเภทธุรกิจคุณ:</span>
                    <div className="flex flex-wrap gap-1">
                      {(
                        DEFAULT_CATEGORY_SUGGESTIONS[(activeTenant?.businessType || 'other') as string] ||
                        DEFAULT_CATEGORY_SUGGESTIONS.other
                      ).map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setEditingService({ ...editingService, category: sug })}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                            editingService.category === sug
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">สีประจำบริการ</label>
                  <input
                    type="color"
                    value={editingService.colorCode || '#3B82F6'}
                    onChange={(e) => setEditingService({ ...editingService, colorCode: e.target.value })}
                    className="w-full h-10 p-1 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ระยะเวลา (นาที) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingService.durationMinutes === 0 || editingService.durationMinutes === undefined ? '' : editingService.durationMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingService({
                        ...editingService,
                        durationMinutes: val === '' ? 0 : Number(val),
                      });
                    }}
                    onBlur={() => {
                      if (!editingService.durationMinutes || editingService.durationMinutes < 1) {
                        setEditingService({ ...editingService, durationMinutes: 60 });
                      }
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">พัก (Buffer m)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingService.bufferMinutes === undefined ? '' : editingService.bufferMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingService({
                        ...editingService,
                        bufferMinutes: val === '' ? 0 : Number(val),
                      });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ราคา (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingService.price === 0 || editingService.price === undefined ? '' : editingService.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingService({
                        ...editingService,
                        price: val === '' ? 0 : Number(val),
                      });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* รูปภาพบริการ (Service Image) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-slate-700 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>รูปภาพบริการ (แสดงบน LIFF)</span>
                  </span>
                  {editingService.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingService({ ...editingService, imageUrl: '' })}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </label>

                {/* Image Preview & Upload Row */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                    {editingService.imageUrl ? (
                      <img
                        src={editingService.imageUrl}
                        alt="Service Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-1 text-slate-400">
                        <ImageIcon className="w-5 h-5 mx-auto" />
                        <span className="text-[8px] font-bold block">ไม่มีรูป</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {/* File Upload Button */}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>อัปโหลดรูปภาพ</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingService({ ...editingService, imageUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>

                    {/* URL Input */}
                    <div className="relative">
                      <Link className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={editingService.imageUrl || ''}
                        onChange={(e) => setEditingService({ ...editingService, imageUrl: e.target.value })}
                        placeholder="หรือวาง URL รูปภาพ (https://...)"
                        className="w-full text-xs pl-7 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Preset Selector */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">เลือกรูปตัวอย่างด่วน:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SERVICE_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEditingService({ ...editingService, imageUrl: preset.url })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          editingService.imageUrl === preset.url
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Time-Based Pricing Rules Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100 bg-amber-50/50 p-3 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <h4 className="font-extrabold text-xs text-amber-950">กำหนดราคาตามช่วงเวลา (Peak / Off-Peak)</h4>
                      <p className="text-[10px] text-amber-700">เช่น กลางวัน ฿1,000 / กลางคืน ฿1,500</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const currentRules = editingService.timePricingRules || [];
                      const newRule: TimePricingRule = {
                        id: `rule-${Date.now()}`,
                        name: currentRules.length === 0 ? 'ช่วงกลางวัน (Off-Peak)' : 'ช่วงเย็น/กลางคืน (Peak)',
                        startTime: currentRules.length === 0 ? '08:00' : '17:00',
                        endTime: currentRules.length === 0 ? '17:00' : '23:00',
                        price: (editingService.price || 500) + (currentRules.length > 0 ? 200 : 0),
                      };
                      setEditingService({
                        ...editingService,
                        timePricingRules: [...currentRules, newRule],
                      });
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ เพิ่มช่วงเวลา</span>
                  </button>
                </div>

                {/* Presets Row */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-amber-800">เทมเพลตด่วน:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const baseP = editingService.price || 1000;
                      setEditingService({
                        ...editingService,
                        timePricingRules: [
                          { id: `r1-${Date.now()}`, name: '☀️ กลางวัน (Off-Peak)', startTime: '08:00', endTime: '17:00', price: baseP },
                          { id: `r2-${Date.now()}`, name: '🌙 เย็น/กลางคืน (Peak)', startTime: '17:00', endTime: '23:00', price: baseP + 300 },
                        ],
                      });
                    }}
                    className="text-[10px] font-bold bg-white text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    ☀️ กลางวัน ➔ 🌙 กลางคืน (+฿300)
                  </button>
                </div>

                {/* List of active rules */}
                {editingService.timePricingRules && editingService.timePricingRules.length > 0 ? (
                  <div className="space-y-2">
                    {editingService.timePricingRules.map((rule, idx) => (
                      <div
                        key={rule.id}
                        className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={rule.name}
                            onChange={(e) => {
                              const updated = [...(editingService.timePricingRules || [])];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditingService({ ...editingService, timePricingRules: updated });
                            }}
                            placeholder="ชื่อช่วงเวลา เช่น ช่วงเย็น"
                            className="flex-1 font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingService.timePricingRules || []).filter((_, i) => i !== idx);
                              setEditingService({ ...editingService, timePricingRules: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">เวลาเริ่ม</span>
                            <input
                              type="time"
                              value={rule.startTime}
                              onChange={(e) => {
                                const updated = [...(editingService.timePricingRules || [])];
                                updated[idx] = { ...updated[idx], startTime: e.target.value };
                                setEditingService({ ...editingService, timePricingRules: updated });
                              }}
                              className="w-full font-mono font-bold text-xs p-1 border border-slate-200 rounded-lg"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">เวลาสิ้นสุด</span>
                            <input
                              type="time"
                              value={rule.endTime}
                              onChange={(e) => {
                                const updated = [...(editingService.timePricingRules || [])];
                                updated[idx] = { ...updated[idx], endTime: e.target.value };
                                setEditingService({ ...editingService, timePricingRules: updated });
                              }}
                              className="w-full font-mono font-bold text-xs p-1 border border-slate-200 rounded-lg"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">ราคาช่วงนี้ (฿)</span>
                            <input
                              type="number"
                              value={rule.price}
                              onChange={(e) => {
                                const updated = [...(editingService.timePricingRules || [])];
                                updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                                setEditingService({ ...editingService, timePricingRules: updated });
                              }}
                              className="w-full font-mono font-bold text-xs p-1 border border-amber-300 bg-amber-50 rounded-lg text-amber-900"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-700 italic">
                    ยังไม่มีการตั้งค่าช่วงเวลา (ระบบจะคิดราคาปกติ ฿{(editingService.price || 0).toLocaleString()} ทุกช่วงเวลา)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">คำอธิบายบริการ</label>
                <textarea
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="รายละเอียดสิ่งที่จะได้รับ..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-xs"
                >
                  บันทึกบริการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Add ServiceAddon Modal */}
      {editingAddon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white max-w-lg w-full max-h-[90vh] rounded-3xl shadow-2xl p-6 border border-slate-200 flex flex-col justify-between my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-sm text-slate-900">
                {editingAddon.id ? 'แก้ไขบริการเสริมพิเศษ' : 'เพิ่มบริการเสริมพิเศษใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAddon(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddon} className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 my-2 pr-1">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อบริการเสริม *</label>
                <input
                  type="text"
                  required
                  value={editingAddon.name || ''}
                  onChange={(e) => setEditingAddon({ ...editingAddon, name: e.target.value })}
                  placeholder="เช่น ขยายเวลานวด +30 นาที, น้ำมันอโรมาออร์แกนิก"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">หมวดหมู่ *</label>
                  <input
                    type="text"
                    required
                    value={editingAddon.category || 'ทั่วไป'}
                    onChange={(e) => setEditingAddon({ ...editingAddon, category: e.target.value })}
                    placeholder="เช่น เพิ่มเวลา, น้ำมันหอมระเหย"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ป้ายกำกับ (Badge)</label>
                  <input
                    type="text"
                    value={editingAddon.badge || ''}
                    onChange={(e) => setEditingAddon({ ...editingAddon, badge: e.target.value })}
                    placeholder="เช่น ยอดนิยม 🔥, Organic 🌱"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ราคาเพิ่มเติม (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingAddon.price === 0 || editingAddon.price === undefined ? '' : editingAddon.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingAddon({ ...editingAddon, price: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">เพิ่มเวลาบริการ (นาที)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingAddon.extraDurationMinutes === 0 || editingAddon.extraDurationMinutes === undefined ? '' : editingAddon.extraDurationMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingAddon({ ...editingAddon, extraDurationMinutes: val === '' ? 0 : Number(val) });
                    }}
                    placeholder="0 ถ้าไม่เพิ่มเวลา"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">คำอธิบายบริการเสริม</label>
                <textarea
                  value={editingAddon.description || ''}
                  onChange={(e) => setEditingAddon({ ...editingAddon, description: e.target.value })}
                  placeholder="รายละเอียดสิทธิประโยชน์เสริม..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingAddon(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-sm text-xs"
                >
                  บันทึกบริการเสริม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Payment Modal */}
      <MerchantSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
};
