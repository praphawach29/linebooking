import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Settings, Save, Plus, Trash2, ShieldAlert, Clock, CalendarDays } from 'lucide-react';
import { CancellationPolicy } from '../../types';

export const MerchantBookingSettings: React.FC = () => {
  const { activeTenant, updateTenantSettings, cancellationPolicies, updateCancellationPolicies } = useSaaS();
  
  const [autoConfirm, setAutoConfirm] = useState(activeTenant.settings.autoConfirm ?? true);
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState(activeTenant.settings.maxAdvanceBookingDays ?? 30);
  const [maxAdvanceBookingUnit, setMaxAdvanceBookingUnit] = useState<'days'|'hours'>(activeTenant.settings.maxAdvanceBookingUnit ?? 'days');
  const [minLeadTimeHours, setMinLeadTimeHours] = useState(activeTenant.settings.minLeadTimeHours ?? 0);
  const [googleMapUrl, setGoogleMapUrl] = useState(activeTenant.settings.googleMapUrl || '');
  
  // Booking Limit State
  const [bookingLimitEnabled, setBookingLimitEnabled] = useState(activeTenant.settings.bookingLimit?.enabled ?? false);
  const [bookingLimitAmount, setBookingLimitAmount] = useState(activeTenant.settings.bookingLimit?.amount ?? 1);
  const [bookingLimitPeriod, setBookingLimitPeriod] = useState(activeTenant.settings.bookingLimit?.period ?? 'day');
  
  const [policies, setPolicies] = useState<CancellationPolicy[]>(cancellationPolicies);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleAddPolicy = () => {
    const newPolicy: CancellationPolicy = {
      id: Math.random().toString(36).substring(7), // Temp ID
      tenantId: activeTenant.id,
      name: `กฎการยกเลิก ${policies.length + 1}`,
      hoursBefore: 24,
      refundPercentage: 50,
      isDefault: policies.length === 0
    };
    setPolicies([...policies, newPolicy]);
  };

  const handleRemovePolicy = (id: string) => {
    setPolicies(policies.filter(p => p.id !== id));
  };

  const handlePolicyChange = (id: string, field: keyof CancellationPolicy, value: any) => {
    setPolicies(policies.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      autoConfirm,
      maxAdvanceBookingDays: Number(maxAdvanceBookingDays),
      maxAdvanceBookingUnit,
      minLeadTimeHours: Number(minLeadTimeHours),
      googleMapUrl,
      bookingLimit: {
        enabled: bookingLimitEnabled,
        amount: Number(bookingLimitAmount),
        period: bookingLimitPeriod
      }
    });
    updateCancellationPolicies(policies);
    
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ตั้งค่าการจองและยกเลิก</h2>
          <p className="text-slate-500 mt-1">ตั้งค่าเงื่อนไขการจองและนโยบายการยกเลิกของร้าน</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Booking Settings */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">ตั้งค่าการจองพื้นฐาน</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800">ยืนยันการจองอัตโนมัติ</h4>
                <p className="text-sm text-slate-500 mt-1">รับคิวทันทีโดยไม่ต้องกดยืนยัน</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={autoConfirm}
                  onChange={(e) => setAutoConfirm(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                <Clock className="w-5 h-5 text-indigo-500" />
                ระยะเวลาเปิดรับจองล่วงหน้าสูงสุด
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    อนุญาตให้ลูกค้าจองล่วงหน้าได้ไม่เกิน
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    value={maxAdvanceBookingDays}
                    onChange={(e) => setMaxAdvanceBookingDays(Number(e.target.value))}
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-slate-700 mb-1">หน่วย</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    value={maxAdvanceBookingUnit}
                    onChange={(e) => setMaxAdvanceBookingUnit(e.target.value as 'days' | 'hours')}
                  >
                    <option value="days">วัน</option>
                    <option value="hours">ชั่วโมง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  ลูกค้าต้องจองล่วงหน้าอย่างน้อย (ชั่วโมง)
                </label>
                <input
                  type="number"
                  min="0"
                  max="72"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={minLeadTimeHours}
                  onChange={(e) => setMinLeadTimeHours(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  ลิงก์ Google Maps แผนที่ร้าน
                </label>
                <input
                  type="url"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  value={googleMapUrl}
                  onChange={(e) => setGoogleMapUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Policies */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">นโยบายการยกเลิก</h3>
                <p className="text-sm text-slate-500">เงื่อนไขการคืนเงินเมื่อลูกค้ายกเลิกคิว</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddPolicy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              เพิ่มกฎ
            </button>
          </div>

          <div className="space-y-4">
            {policies.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500">ยังไม่มีนโยบายการยกเลิก ลูกค้าจะไม่สามารถยกเลิกได้เอง</p>
                <button
                  type="button"
                  onClick={handleAddPolicy}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  เพิ่มนโยบายการยกเลิก
                </button>
              </div>
            ) : (
              policies.map((policy, index) => (
                <div key={policy.id} className="p-4 bg-white border border-slate-200 rounded-2xl relative shadow-sm hover:border-primary/30 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleRemovePolicy(policy.id)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-12">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อกฎ</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        value={policy.name}
                        onChange={(e) => handlePolicyChange(policy.id, 'name', e.target.value)}
                        placeholder="เช่น ยกเลิกก่อน 24 ชม."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ยกเลิกล่วงหน้า (ชม.)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        value={policy.hoursBefore}
                        onChange={(e) => handlePolicyChange(policy.id, 'hoursBefore', Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">คืนเงินมัดจำ (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        value={policy.refundPercentage}
                        onChange={(e) => handlePolicyChange(policy.id, 'refundPercentage', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm flex gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p>
              <strong>หมายเหตุ:</strong> หากไม่มีนโยบายการยกเลิก ลูกค้าจะไม่สามารถกดยกเลิกการจองได้ด้วยตนเอง
              ระบบจะเลือกใช้นโยบายที่สอดคล้องกับเวลาที่ลูกค้ายกเลิกมากที่สุด
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-lg shadow-slate-900/20"
          >
            <Save className="w-5 h-5" />
            บันทึกการตั้งค่า
          </button>
          
          {savedMsg && (
            <span className="text-success font-bold text-sm animate-fade-in flex items-center gap-1.5">
              <span className="w-2 h-2 bg-success rounded-full animate-ping"></span>
              บันทึกข้อมูลเรียบร้อยแล้ว
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
