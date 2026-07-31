import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Service, ServiceAddon } from '../../types';
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
} from 'lucide-react';

export const MerchantServiceManager: React.FC = () => {
  const {
    services,
    serviceAddons,
    saveService,
    deleteService,
    saveServiceAddon,
    deleteServiceAddon,
  } = useSaaS();

  const [activeTab, setActiveTab] = useState<'services' | 'addons'>('services');
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingAddon, setEditingAddon] = useState<Partial<ServiceAddon> | null>(null);

  const handleOpenAddService = () => {
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
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: svc.colorCode || '#3B82F6' }}
              ></div>

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
                  <span className="text-[10px] text-slate-400">ราคาค่าบริการ</span>
                  <p className="text-base font-black text-slate-900">
                    ฿{(svc?.price ?? 0).toLocaleString()}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

            <form onSubmit={handleSaveService} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">หมวดหมู่ *</label>
                  <input
                    type="text"
                    required
                    value={editingService.category || 'ทั่วไป'}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                    placeholder="เช่น นวดไทย, สปา"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">สีประจำบริการ</label>
                  <input
                    type="color"
                    value={editingService.colorCode || '#3B82F6'}
                    onChange={(e) => setEditingService({ ...editingService, colorCode: e.target.value })}
                    className="w-full h-9 p-1 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ระยะเวลา (นาที) *</label>
                  <input
                    type="number"
                    required
                    value={editingService.durationMinutes || 60}
                    onChange={(e) =>
                      setEditingService({ ...editingService, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">พัก (Buffer m)</label>
                  <input
                    type="number"
                    value={editingService.bufferMinutes || 15}
                    onChange={(e) =>
                      setEditingService({ ...editingService, bufferMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ราคา (บาท) *</label>
                  <input
                    type="number"
                    required
                    value={editingService.price || 500}
                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

            <form onSubmit={handleSaveAddon} className="space-y-3">
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
                    value={editingAddon.price || 150}
                    onChange={(e) => setEditingAddon({ ...editingAddon, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">เพิ่มเวลาบริการ (นาที)</label>
                  <input
                    type="number"
                    value={editingAddon.extraDurationMinutes || 0}
                    onChange={(e) =>
                      setEditingAddon({ ...editingAddon, extraDurationMinutes: Number(e.target.value) })
                    }
                    placeholder="0 ถ้าไม่เพิ่มเวลา"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAddon(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
                >
                  บันทึกบริการเสริม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
