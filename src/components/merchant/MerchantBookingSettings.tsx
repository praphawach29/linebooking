import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Settings, Save, Plus, Trash2, ShieldAlert, Clock, CalendarDays, Eraser, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { CancellationPolicy } from '../../types';
import { MerchantBlackoutDates } from './MerchantBlackoutDates';

export const MerchantBookingSettings: React.FC = () => {
  const { activeTenant, updateTenantSettings, cancellationPolicies, updateCancellationPolicies, cleanStalePendingBookings } = useSaaS();
  
  const [autoConfirm, setAutoConfirm] = useState(activeTenant.settings.autoConfirm ?? true);
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState(activeTenant.settings.maxAdvanceBookingDays ?? 30);
  const [maxAdvanceBookingUnit, setMaxAdvanceBookingUnit] = useState<'days'|'hours'>(activeTenant.settings.maxAdvanceBookingUnit ?? 'days');
  const [minLeadTimeHours, setMinLeadTimeHours] = useState(activeTenant.settings.minLeadTimeHours ?? 0);
  const [googleMapUrl, setGoogleMapUrl] = useState(activeTenant.settings.googleMapUrl || '');
  const [autoCleanDays, setAutoCleanDays] = useState<number>(activeTenant.settings.autoCleanStaleBookingsDays ?? 1);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanCount, setCleanCount] = useState<number | null>(null);
  
  // LINE Settings
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(activeTenant.lineChannelAccessToken || '');
  const [lineBookingConfirmationEnabled, setLineBookingConfirmationEnabled] = useState(activeTenant.settings.lineBookingConfirmationEnabled ?? false);
  
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

  const handleManualClean = async () => {
    setIsCleaning(true);
    setCleanCount(null);
    try {
      const deleted = await cleanStalePendingBookings(autoCleanDays);
      setCleanCount(deleted);
      setTimeout(() => setCleanCount(null), 4000);
    } catch (e) {
      console.error('Manual clean error:', e);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      autoConfirm,
      maxAdvanceBookingDays: Number(maxAdvanceBookingDays),
      maxAdvanceBookingUnit,
      minLeadTimeHours: Number(minLeadTimeHours),
      googleMapUrl,
      autoCleanStaleBookingsDays: Number(autoCleanDays),
      bookingLimit: {
        enabled: bookingLimitEnabled,
        amount: Number(bookingLimitAmount),
        period: bookingLimitPeriod
      },
      lineBookingConfirmationEnabled,
    }, {
      lineChannelAccessToken,
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

            {/* LINE Message Settings */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </span>
                  แจ้งเตือนผ่าน LINE
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={lineBookingConfirmationEnabled}
                    onChange={(e) => setLineBookingConfirmationEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              {lineBookingConfirmationEnabled && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Channel Access Token</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      value={lineChannelAccessToken}
                      onChange={(e) => setLineChannelAccessToken(e.target.value)}
                      placeholder="กรอก Channel Access Token (Long-lived) จาก LINE Developers"
                    />
                    <p className="text-xs text-slate-500 mt-1">ใช้สำหรับส่งข้อความยืนยันการจองคิวไปยังลูกค้าอัตโนมัติ (Flex Message)</p>
                  </div>
                </div>
              )}
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

            {/* Booking Limit Section */}
            <div className="pt-6 border-t border-slate-100 space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <CalendarDays className="w-5 h-5 text-indigo-500" />
                  จำกัดจำนวนการจองต่อลูกค้า
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={bookingLimitEnabled}
                    onChange={(e) => setBookingLimitEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              {bookingLimitEnabled && (
                <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      จองได้สูงสุด (ครั้ง)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value={bookingLimitAmount}
                      onChange={(e) => setBookingLimitAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-sm font-bold text-slate-700 mb-1">ต่อ</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value={bookingLimitPeriod}
                      onChange={(e) => setBookingLimitPeriod(e.target.value as 'day' | 'week' | 'month' | 'year')}
                    >
                      <option value="day">วัน</option>
                      <option value="week">สัปดาห์</option>
                      <option value="month">เดือน</option>
                      <option value="year">ปี</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-clean Stale Pending Bookings Section */}
            <div className="pt-6 border-t border-slate-100 space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Eraser className="w-5 h-5 text-amber-500" />
                  <span>ลบการจองที่ค้างรอยืนยันที่เลยกำหนดอัตโนมัติ (Auto-clean Expired Queues)</span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  ลดความแออัดของคิว
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                ระบบจะลบหรือล้างรายการจองที่ค้างอยู่ในสถานะ <span className="font-semibold text-amber-600">"รอยืนยัน (Pending)"</span> ที่เลยวันนัดหมายมาแล้วออกให้โดยอัตโนมัติ เพื่อไม่ให้ยอดตัวเลขค้างบนแดชบอร์ด
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700">
                    ระยะเวลาที่เลยกำหนดก่อนลบออก:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { val: 1, label: '1 วัน (แนะนำ)' },
                      { val: 2, label: '2 วัน' },
                      { val: 3, label: '3 วัน' },
                      { val: 7, label: '7 วัน' },
                      { val: 0, label: 'ปิดใช้งาน' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setAutoCleanDays(opt.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          autoCleanDays === opt.val
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {autoCleanDays > 0
                      ? `✨ ระบบจะเคลียร์คิวที่เลยกำหนด ${autoCleanDays} วันขึ้นไปทุกครั้งที่เปิดหน้าแดชบอร์ด`
                      : '⚠️ ระบบจะไม่ลบคิวเก่าอัตโนมัติ'}
                  </span>
                  <button
                    type="button"
                    onClick={handleManualClean}
                    disabled={isCleaning}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-xs disabled:opacity-50"
                  >
                    {isCleaning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        กำลังล้างคิวเก่า...
                      </>
                    ) : (
                      <>
                        <Eraser className="w-3.5 h-3.5" />
                        ล้างคิวที่ค้างเลยกำหนดตอนนี้
                      </>
                    )}
                  </button>
                </div>

                {cleanCount !== null && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {cleanCount > 0
                        ? `ล้างรายการจองที่ค้างเลยกำหนดสำเร็จ ${cleanCount} รายการเรียบร้อยแล้ว!`
                        : 'ไม่พบรายการจองที่ค้างเลยกำหนด ทุกรายการเป็นปัจจุบันแล้วครับ'}
                    </span>
                  </div>
                )}
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

      <MerchantBlackoutDates />
    </div>
  );
};
