import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { BlackoutScope } from '../../types';
import { CalendarOff, Plus, Trash2, Info } from 'lucide-react';
import { toLocalDateStr } from '../../lib/date-utils';
import { getTenantTerminology } from '../../lib/tenant-terminology';

export const MerchantBlackoutDates: React.FC = () => {
  const { activeTenant, services, courts, blackoutDates, addBlackoutDate, deleteBlackoutDate } = useSaaS();

  // Every business has services, so "tenant"/"service" scope always apply.
  // The 3rd scope (a bookable resource — a court for sports venues, a
  // room for a clinic, etc.) only makes sense — and only shows — for
  // businesses that actually use resource/court booking. The label comes
  // from the same centralized terminology map the booking flow itself
  // uses, so a new business type never requires touching this component.
  const terminology = getTenantTerminology(activeTenant);
  const hasResources = courts.length > 0;
  const resourceScopeLabel = `เฉพาะ${terminology.resourceName}`;

  const scopeLabel = (scope: BlackoutScope) =>
    scope === 'tenant' ? 'ทั้งร้าน' : scope === 'service' ? terminology.serviceLabel : terminology.resourceName;

  const today = toLocalDateStr(new Date());
  const [scope, setScope] = useState<BlackoutScope>('tenant');
  const [serviceId, setServiceId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedBlackoutDates = [...blackoutDates].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const describeTarget = (b: (typeof blackoutDates)[number]) => {
    if (b.scope === 'service') {
      return services.find((s) => s.id === b.serviceId)?.name || `${terminology.serviceLabel}ที่ถูกลบไปแล้ว`;
    }
    if (b.scope === 'court') {
      return courts.find((c) => c.id === b.courtId)?.name || `${terminology.resourceName}ที่ถูกลบไปแล้ว`;
    }
    return `ทุกบริการ/ทุก${terminology.resourceName}`;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (endDate < startDate) {
      setFormError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น');
      return;
    }
    if (scope === 'service' && !serviceId) {
      setFormError(`กรุณาเลือก${terminology.serviceLabel}ที่ต้องการปิดรับจอง`);
      return;
    }
    if (scope === 'court' && !courtId) {
      setFormError(`กรุณาเลือก${terminology.resourceName}ที่ต้องการปิดรับจอง`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addBlackoutDate({
        scope,
        serviceId: scope === 'service' ? serviceId : null,
        courtId: scope === 'court' ? courtId : null,
        startDate,
        endDate,
        reason: reason.trim() || null,
      });
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="premium-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
          <CalendarOff className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">วันหยุดล่วงหน้า (ปิดรับจอง)</h3>
          <p className="text-sm text-slate-500">
            ปิดรับจองทั้งวันในช่วงวันที่กำหนด — เลือกได้ทั้งร้าน เฉพาะ{terminology.serviceLabel}
            {hasResources ? ` หรือ${resourceScopeLabel}` : ''}
          </p>
        </div>
      </div>

      {!hasResources && (
        <div className="mb-4 p-3.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 text-xs flex gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            ถ้าต้องการให้{terminology.resourceName}คนใดคนหนึ่งหยุดเป็นวันๆ ไป (เช่น ลาพักร้อน) ให้ตั้งค่าที่หน้า
            "บริการ &amp; ส่วนเสริม" → แก้ไขข้อมูล/เวลาทำงานของ{terminology.resourceName}คนนั้นแทน —
            ส่วนนี้ใช้สำหรับปิดรับจองทั้งร้านหรือทั้งบริการเท่านั้น
          </p>
        </div>
      )}

      <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">ขอบเขต</label>
            <select
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as BlackoutScope);
                setServiceId('');
                setCourtId('');
              }}
            >
              <option value="tenant">ปิดทั้งร้าน</option>
              <option value="service">เฉพาะ{terminology.serviceLabel}</option>
              {hasResources && <option value="court">{resourceScopeLabel}</option>}
            </select>
          </div>

          {scope === 'service' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">เลือกบริการ</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">-- เลือกบริการ --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {scope === 'court' && hasResources && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">เลือก{terminology.resourceName}</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
              >
                <option value="">-- เลือก{terminology.resourceName} --</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">เหตุผล (ถ้ามี)</label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ปิดปรับปรุง, วันหยุดสงกรานต์"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">วันที่เริ่มต้น</label>
            <input
              type="date"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={startDate}
              min={today}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">วันที่สิ้นสุด</label>
            <input
              type="date"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {formError && <p className="text-sm text-rose-600 font-bold">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {isSubmitting ? 'กำลังบันทึก...' : 'เพิ่มวันหยุด'}
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {sortedBlackoutDates.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 text-sm">ยังไม่มีการตั้งวันหยุดล่วงหน้า</p>
          </div>
        ) : (
          sortedBlackoutDates.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">
                    {b.startDate === b.endDate ? b.startDate : `${b.startDate} – ${b.endDate}`}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {scopeLabel(b.scope)}
                  </span>
                  {b.scope !== 'tenant' && (
                    <span className="text-[11px] text-slate-500">{describeTarget(b)}</span>
                  )}
                </div>
                {b.reason && <p className="text-xs text-slate-500 mt-0.5 truncate">{b.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => deleteBlackoutDate(b.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="ลบวันหยุดนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
