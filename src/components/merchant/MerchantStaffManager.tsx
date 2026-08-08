import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Staff, Court, OperatingSchedule } from '../../types';
import {
  Users,
  UserPlus,
  Star,
  Edit2,
  Trash2,
  Phone,
  Clock,
  Calendar,
  X,
  Check,
  Scissors,
  Sparkles,
  Trophy,
  ShieldCheck,
  MapPin,
  PlusCircle,
  Upload,
  ImageIcon,
  Link
} from 'lucide-react';

import { getTenantQuotaInfo } from '../../lib/quota-manager';
import { MerchantSubscriptionModal } from './MerchantSubscriptionModal';

const PRESET_COURT_IMAGES = [
  { label: 'สนามฟุตบอล ⚽', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=60' },
  { label: 'คอร์ทแบดมินตัน 🏸', url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&auto=format&fit=crop&q=60' },
  { label: 'สนามบาสเกตบอล 🏀', url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&auto=format&fit=crop&q=60' },
  { label: 'สนามเทนนิส 🎾', url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=500&auto=format&fit=crop&q=60' },
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'จันทร์', short: 'จ.' },
  { id: 2, label: 'อังคาร', short: 'อ.' },
  { id: 3, label: 'พุธ', short: 'พ.' },
  { id: 4, label: 'พฤหัสบดี', short: 'พฤ.' },
  { id: 5, label: 'ศุกร์', short: 'ศ.' },
  { id: 6, label: 'เสาร์', short: 'ส.' },
  { id: 0, label: 'อาทิตย์', short: 'อา.' },
];

// Default operating schedule (all days, 08:00-22:00)
const DEFAULT_OPERATING_SCHEDULE: OperatingSchedule = {
  isCustom: false,
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: '08:00',
  endTime: '22:00',
};

export const MerchantStaffManager: React.FC = () => {
  const { activeTenant, staffs, services, saveStaff, deleteStaff, bookings, courts, saveCourt, deleteCourt, setMerchantTab } = useSaaS();
  const [activeTab, setActiveTab] = useState<'courts' | 'staffs'>(
    activeTenant?.businessType === 'sports' ? 'courts' : 'staffs'
  );
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
  const [editingCourt, setEditingCourt] = useState<Partial<Court> | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const quotaInfo = activeTenant ? getTenantQuotaInfo(activeTenant, bookings, staffs, courts) : null;

  const handleOpenAdd = () => {
    if (quotaInfo && quotaInfo.isStaffQuotaReached) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    setEditingStaff({
      name: '',
      phone: '',
      email: '',
      bio: 'ผู้ให้บริการ / ประจำจุดบริการ',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      serviceIds: services.map((s) => s.id),
      workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
      workStartTime: '09:00',
      workEndTime: '18:00',
      colorCode: '#10B981',
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      saveStaff(editingStaff);
      setEditingStaff(null);
    }
  };

  const toggleServiceAssignment = (svcId: string) => {
    if (!editingStaff) return;
    const currentList = editingStaff.serviceIds || [];
    if (currentList.includes(svcId)) {
      setEditingStaff({
        ...editingStaff,
        serviceIds: currentList.filter((id) => id !== svcId),
      });
    } else {
      setEditingStaff({
        ...editingStaff,
        serviceIds: [...currentList, svcId],
      });
    }
  };

  const toggleWorkingDay = (dayId: number) => {
    if (!editingStaff) return;
    const currentDays = editingStaff.workingDays || [1, 2, 3, 4, 5, 6];
    if (currentDays.includes(dayId)) {
      setEditingStaff({
        ...editingStaff,
        workingDays: currentDays.filter((d) => d !== dayId),
      });
    } else {
      setEditingStaff({
        ...editingStaff,
        workingDays: [...currentDays, dayId].sort(),
      });
    }
  };

  const formatWorkingDaysText = (workingDays?: number[]) => {
    if (!workingDays || workingDays.length === 0) return 'ไม่เปิดรับคิว';
    if (workingDays.length === 7) return 'เปิดบริการทุกวัน (จ.-อา.)';
    const dayMap: Record<number, string> = {
      0: 'อา.', 1: 'จ.', 2: 'อ.', 3: 'พ.', 4: 'พฤ.', 5: 'ศ.', 6: 'ส.'
    };
    return workingDays.map((d) => dayMap[d]).join(', ');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs">
      
      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('courts')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'courts'
                ? 'bg-white text-emerald-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span>🏟️ จัดการสนาม / คอร์ท ({courts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staffs')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'staffs'
                ? 'bg-white text-emerald-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>👥 ทีมช่าง / ผู้ดูแล ({staffs.length})</span>
          </button>
        </div>

        {activeTab === 'courts' ? (
          <button
            type="button"
            onClick={() =>
              setEditingCourt({
                name: '',
                code: `COURT-${courts.length + 1}`,
                serviceId: services[0]?.id || '',
                type: 'indoor',
                extraPricePerHour: 0,
                description: 'สนามคุณภาพมาตรฐาน สะอาด ปลอดภัย',
                imageUrl:
                  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80',
                isActive: true,
              })
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มสนามใหม่</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ เพิ่มช่างใหม่</span>
          </button>
        )}
      </div>

      {/* TAB 1: COURTS MANAGEMENT VIEW */}
      {activeTab === 'courts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600 text-sm">ยังไม่มีสนามในระบบ</p>
              <p className="text-slate-400 text-xs">
                กดปุ่ม "+ เพิ่มสนามใหม่" ด้านบนเพื่อสร้างรายการสนาม (เช่น สนามฟุตซอล 1, คอร์ทแบดมินตัน A)
              </p>
            </div>
          ) : (
            courts.map((court) => {
              const assignedSvc = services.find((s) => s.id === court.serviceId);
              return (
                <div
                  key={court.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {court.imageUrl && (
                      <img
                        src={court.imageUrl}
                        alt={court.name}
                        className="w-full h-36 object-cover"
                      />
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200">
                          {court.type === 'air_conditioned'
                            ? 'VIP ติดแอร์ ❄️'
                            : court.type === 'parquet'
                            ? 'ปาร์เก้ FIBA 🏀'
                            : court.type === 'clay'
                            ? 'คอร์ทดิน 🎾'
                            : court.type === 'outdoor'
                            ? 'Outdoor กลางแจ้ง ☀️'
                            : court.type === 'indoor'
                            ? 'Indoor ในร่ม 🏟️'
                            : court.type || 'มาตรฐาน'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {court.code}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {court.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {court.description || 'สนามมาตรฐาน'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-600">ประเภทกีฬา:</span>
                        <span className="font-extrabold text-emerald-700">
                          {assignedSvc?.name || 'ทุกประเภทกีฬา'}
                        </span>
                      </div>

                      {(court.extraPricePerHour || 0) !== 0 && (
                        <div
                          className={`flex items-center justify-between text-[11px] p-2 rounded-xl border ${
                            (court.extraPricePerHour || 0) > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          <span className="font-bold">
                            {(court.extraPricePerHour || 0) > 0 ? 'ค่าสนาม VIP บวกเพิ่ม:' : 'ส่วนลดสนามนี้:'}
                          </span>
                          <span className="font-extrabold">
                            {(court.extraPricePerHour || 0) > 0
                              ? `+฿${court.extraPricePerHour}/ชม.`
                              : `-฿${Math.abs(court.extraPricePerHour || 0)}/ชม.`}
                          </span>
                        </div>
                      )}

                      {/* Operating Schedule Badge */}
                      {court.operatingSchedule?.isCustom && (
                        <div className="flex items-center gap-1.5 text-[10px] mt-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl">
                          <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-800">
                            {court.operatingSchedule.startTime}–{court.operatingSchedule.endTime} น.
                          </span>
                          <span className="text-emerald-600 font-medium">
                            ({court.operatingSchedule.days.length === 7 ? 'ทุกวัน' : `${court.operatingSchedule.days.length} วัน/สัปดาห์`})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCourt(court)}
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`คุณต้องการลบสนาม "${court.name}" ใช่หรือไม่?`)) {
                          deleteCourt(court.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: STAFFS MANAGEMENT VIEW */}
      {activeTab === 'staffs' && (
        <>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staffs.map((staff) => {
          const assignedSvcs = services.filter((s) => staff.serviceIds.includes(s.id));
          return (
            <div
              key={staff.id}
              className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
            >
              <div className="flex gap-3.5 items-start">
                <img
                  src={staff.avatarUrl}
                  alt={staff.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 flex-shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate">
                      {staff.name}
                    </h3>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-current text-amber-500" />
                      {staff.rating} ({staff.reviewsCount})
                    </span>
                  </div>

                  <p className="text-slate-500 line-clamp-1 text-[11px]">{staff.bio}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" /> {staff.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Working Hours & Service Assignment Info Box */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold flex items-center gap-1 text-emerald-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    เวลาปฏิบัติงาน:
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {staff.workStartTime || '09:00'} - {staff.workEndTime || '18:00'} น.
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    วันเข้างาน:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatWorkingDaysText(staff.workingDays)}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60">
                  <span className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <Scissors className="w-3.5 h-3.5 text-slate-500" />
                    บริการที่รับผิดชอบ ({assignedSvcs.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {assignedSvcs.length > 0 ? (
                      assignedSvcs.map((s) => (
                        <span
                          key={s.id}
                          className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold px-2 py-0.5 rounded-md"
                        >
                          {s.name.split(' ')[0]}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[10px]">ยังไม่ได้มอบหมายบริการ</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingStaff(staff)}
                  className="px-3 py-1.5 text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors font-bold flex items-center gap-1 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูล / เวลาทำงาน</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteStaff(staff.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="ลบช่าง"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                {editingStaff.id ? 'แก้ไขข้อมูลช่าง & เวลาปฏิบัติงาน' : 'เพิ่มช่างใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อ-นามสกุล / ชื่อเรียก *</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  placeholder="เช่น คุณสายฝน (หมอฝน)"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">เบอร์โทรศัพท์ (ถ้ามี)</label>
                  <input
                    type="tel"
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    placeholder="เช่น 081-234-5678"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">รูปโปรไฟล์ (URL)</label>
                  <input
                    type="text"
                    value={editingStaff.avatarUrl || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, avatarUrl: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ประวัติย่อ / ความเชี่ยวชาญ</label>
                <textarea
                  value={editingStaff.bio || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, bio: e.target.value })}
                  rows={2}
                  placeholder="รายละเอียดความเชี่ยวชาญ..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Working Hours & Days Configuration */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  กำหนดเวลาปฏิบัติงาน (Availability Hours)
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">เวลาเริ่มงาน</label>
                    <input
                      type="time"
                      value={editingStaff.workStartTime || '09:00'}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, workStartTime: e.target.value })
                      }
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">เวลาเลิกงาน</label>
                    <input
                      type="time"
                      value={editingStaff.workEndTime || '18:00'}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, workEndTime: e.target.value })
                      }
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5">
                    วันเปิดเข้างานในสัปดาห์ (Working Days)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = (editingStaff.workingDays || [1,2,3,4,5,6]).includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleWorkingDay(d.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Assigned Services Checkbox List */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                  <span>มอบหมายบริการที่รับผิดชอบ ({editingStaff.serviceIds?.length || 0} บริการ)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingStaff({
                        ...editingStaff,
                        serviceIds: services.map((s) => s.id),
                      })
                    }
                    className="text-[10px] text-emerald-600 hover:underline font-bold"
                  >
                    เลือกทั้งหมด
                  </button>
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  {services.map((svc) => {
                    const isChecked = editingStaff.serviceIds?.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50/80 border border-emerald-200/80' : 'hover:bg-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">{svc.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {svc.category} • {svc.durationMinutes} นาที
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleServiceAssignment(svc.id)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  บันทึกข้อมูลช่าง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

      {/* Edit / Create Court Modal */}
      {editingCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-xl animate-in fade-in zoom-in duration-150 text-xs flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-3 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                <span>{editingCourt.id ? 'แก้ไขข้อมูลสนาม' : 'เพิ่มสนาม/คอร์ทใหม่'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCourt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingCourt) {
                  saveCourt(editingCourt);
                  setEditingCourt(null);
                }
              }}
              className="space-y-3 overflow-y-auto px-6 pt-4 pb-6"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">ชื่อสนาม *</label>
                  <input
                    type="text"
                    required
                    value={editingCourt.name || ''}
                    onChange={(e) => setEditingCourt({ ...editingCourt, name: e.target.value })}
                    placeholder="เช่น สนาม 1 หรือ คอร์ท A"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">รหัสสนาม (Code) *</label>
                  <input
                    type="text"
                    required
                    value={editingCourt.code || ''}
                    onChange={(e) => setEditingCourt({ ...editingCourt, code: e.target.value })}
                    placeholder="เช่น COURT-1"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block flex items-center justify-between">
                  <span>ประเภทกีฬา/บริการ *</span>
                  {services.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourt(null);
                        setMerchantTab('services');
                      }}
                      className="text-[10px] text-emerald-600 hover:underline font-bold"
                    >
                      + ไปที่เมนูสร้างบริการ
                    </button>
                  )}
                </label>

                {services.length > 0 ? (
                  <select
                    required
                    value={
                      services.find((s) => s.id === editingCourt.serviceId || s.name === editingCourt.serviceId)?.id ||
                      editingCourt.serviceId ||
                      services[0]?.id ||
                      ''
                    }
                    onChange={(e) => setEditingCourt({ ...editingCourt, serviceId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-xs bg-white text-slate-900"
                  >
                    <option value="" disabled>-- เลือกบริการประเภทกีฬา --</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        ⚽ {svc.name} (฿{svc.price}/รอบ)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-2">
                    <p className="text-amber-800 font-medium">
                      ⚠️ ยังไม่มีรายการบริการในระบบ กรุณาสร้างบริการหลัก (เช่น เช่าสนามหญ้าเทียม, คอร์ทแบดมินตัน) ก่อนสร้างสนามย่อย
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourt(null);
                        setMerchantTab('services');
                      }}
                      className="w-full py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors text-xs"
                    >
                      👉 กดที่นี่เพื่อสร้างบริการประเภทกีฬาแรก
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block flex items-center justify-between text-xs">
                    <span>
                      {activeTenant?.businessType === 'sports'
                        ? 'ประเภทสนาม / คอร์ท'
                        : activeTenant?.businessType === 'spa' || activeTenant?.businessType === 'salon' || activeTenant?.businessType === 'clinic'
                        ? 'ประเภทห้อง / เตียงบริการ'
                        : 'ประเภทสถานที่ / โต๊ะ'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">เลือกหรือพิมพ์เองได้</span>
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={
                        ['indoor', 'outdoor', 'air_conditioned', 'parquet', 'clay', 'VIP ติดแอร์ ❄️', 'Indoor ในร่ม 🏟️', 'Outdoor กลางแจ้ง ☀️', 'สนามหญ้าจริง 🌿', 'ห้องส่วนตัว VIP 🚪', 'เตียงนวดคู่ (Couple Room) 💑', 'เก้าอี้ทำผม/ตัดผม 🪑', 'ห้องทรีตเมนต์ 💆', 'โต๊ะส่วนตัว (Private Table) 🍷', 'โซนระเบียงริมน้ำ 🌊', 'เคาน์เตอร์บาร์ 🍸'].includes(editingCourt.type || '')
                          ? editingCourt.type
                          : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setEditingCourt({ ...editingCourt, type: '' });
                        } else {
                          setEditingCourt({ ...editingCourt, type: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-xs bg-white text-slate-900"
                    >
                      <optgroup label="🏆 สนาม / คอร์ทกีฬา">
                        <option value="indoor">Indoor ในร่ม 🏟️</option>
                        <option value="outdoor">Outdoor กลางแจ้ง ☀️</option>
                        <option value="air_conditioned">VIP ติดแอร์ ❄️</option>
                        <option value="parquet">พื้นไม้ FIBA 🏀</option>
                        <option value="clay">คอร์ทดิน 🎾</option>
                        <option value="สนามหญ้าจริง 🌿">สนามหญ้าจริง 🌿</option>
                      </optgroup>

                      <optgroup label="🛋️ ห้อง / เตียงบริการ (สปา/คลินิก/ร้านตัดผม)">
                        <option value="ห้องส่วนตัว VIP 🚪">ห้องส่วนตัว VIP 🚪</option>
                        <option value="เตียงนวดคู่ (Couple Room) 💑">เตียงนวดคู่ (Couple Room) 💑</option>
                        <option value="เก้าอี้ทำผม/ตัดผม 🪑">เก้าอี้ทำผม/ตัดผม 🪑</option>
                        <option value="ห้องทรีตเมนต์ 💆">ห้องทรีตเมนต์ 💆</option>
                      </optgroup>

                      <optgroup label="🍽️ สถานที่ / โต๊ะ (ร้านอาหาร & ทั่วไป)">
                        <option value="โต๊ะส่วนตัว (Private Table) 🍷">โต๊ะส่วนตัว (Private Table) 🍷</option>
                        <option value="โซนระเบียงริมน้ำ 🌊">โซนระเบียงริมน้ำ 🌊</option>
                        <option value="เคาน์เตอร์บาร์ 🍸">เคาน์เตอร์บาร์ 🍸</option>
                      </optgroup>

                      <option value="custom">✍️ พิมพ์กำหนดประเภทเอง...</option>
                    </select>

                    {(!['indoor', 'outdoor', 'air_conditioned', 'parquet', 'clay', 'VIP ติดแอร์ ❄️', 'Indoor ในร่ม 🏟️', 'Outdoor กลางแจ้ง ☀️', 'สนามหญ้าจริง 🌿', 'ห้องส่วนตัว VIP 🚪', 'เตียงนวดคู่ (Couple Room) 💑', 'เก้าอี้ทำผม/ตัดผม 🪑', 'ห้องทรีตเมนต์ 💆', 'โต๊ะส่วนตัว (Private Table) 🍷', 'โซนระเบียงริมน้ำ 🌊', 'เคาน์เตอร์บาร์ 🍸'].includes(editingCourt.type || '')) && (
                      <input
                        type="text"
                        value={editingCourt.type || ''}
                        onChange={(e) => setEditingCourt({ ...editingCourt, type: e.target.value })}
                        placeholder="พิมพ์ระบุประเภทเอง เช่น สนามหญ้าเทียมไร้เม็ดยาง, ห้อง VIP..."
                        className="w-full p-2.5 border border-emerald-300 bg-emerald-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-800 animate-in fade-in duration-150"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">ส่วนต่างราคาบวก/ลบ (฿/ชม.)</label>
                  <input
                    type="number"
                    value={
                      editingCourt.extraPricePerHour !== undefined && editingCourt.extraPricePerHour !== null
                        ? editingCourt.extraPricePerHour
                        : ''
                    }
                    onChange={(e) =>
                      setEditingCourt({
                        ...editingCourt,
                        extraPricePerHour: e.target.value === '' ? ('' as any) : Number(e.target.value),
                      })
                    }
                    placeholder="เช่น 200 หรือ -200"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    💡 ใส่ <span className="text-amber-600 font-bold">200</span> เพื่อเพิ่มราคา (VIP) หรือใส่ <span className="text-emerald-600 font-bold">-200</span> เพื่อลดราคา (เช่น จาก 1,200 เหลือ 1,000 บาท)
                  </p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">รายละเอียดเพิ่มเติม</label>
                <input
                  type="text"
                  value={editingCourt.description || ''}
                  onChange={(e) => setEditingCourt({ ...editingCourt, description: e.target.value })}
                  placeholder="เช่น สนามหญ้าเทียมเกรด A, ไฟสปอร์ตไลท์ LED"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                />
              </div>

              {/* รูปภาพสนาม (Court Image with local device upload) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-slate-700 font-bold flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>รูปภาพสนาม / คอร์ท (แสดงบน LIFF)</span>
                  </span>
                  {editingCourt.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingCourt({ ...editingCourt, imageUrl: '' })}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </label>

                {/* Image Preview & Upload Row */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                    {editingCourt.imageUrl ? (
                      <img
                        src={editingCourt.imageUrl}
                        alt="Court Preview"
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
                    {/* Local Storage / Device Memory File Upload Button */}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>อัปโหลดรูปจากความจำเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingCourt({ ...editingCourt, imageUrl: reader.result as string });
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
                        value={editingCourt.imageUrl || ''}
                        onChange={(e) => setEditingCourt({ ...editingCourt, imageUrl: e.target.value })}
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
                    {PRESET_COURT_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEditingCourt({ ...editingCourt, imageUrl: preset.url })}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                          editingCourt.imageUrl === preset.url
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>


              {/* Operating Schedule Section for Court */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    ตารางเวลาเปิด-ปิดเฉพาะของสนามนี้
                  </label>
                  <div
                    onClick={() => {
                      const curr = editingCourt.operatingSchedule || DEFAULT_OPERATING_SCHEDULE;
                      setEditingCourt({
                        ...editingCourt,
                        operatingSchedule: { ...curr, isCustom: !curr.isCustom },
                      });
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {editingCourt.operatingSchedule?.isCustom ? 'กำหนดเอง' : 'ใช้ตามร้านค้า'}
                    </span>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      editingCourt.operatingSchedule?.isCustom ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        editingCourt.operatingSchedule?.isCustom ? 'translate-x-[18px]' : 'translate-x-[2px]'
                      }`} />
                    </div>
                  </div>
                </div>

                {editingCourt.operatingSchedule?.isCustom && (
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-slate-600 mb-1.5">วันที่เปิดให้บริการ:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS_OF_WEEK.map((d) => {
                          const schedule = editingCourt.operatingSchedule || DEFAULT_OPERATING_SCHEDULE;
                          const isOn = (schedule.days || []).includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                const curr = editingCourt.operatingSchedule || DEFAULT_OPERATING_SCHEDULE;
                                const days = isOn
                                  ? curr.days.filter((x) => x !== d.id)
                                  : [...curr.days, d.id].sort();
                                setEditingCourt({ ...editingCourt, operatingSchedule: { ...curr, days } });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isOn ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">เวลาเปิดบริการ</label>
                        <input
                          type="time"
                          value={editingCourt.operatingSchedule?.startTime || '08:00'}
                          onChange={(e) => {
                            const curr = editingCourt.operatingSchedule || DEFAULT_OPERATING_SCHEDULE;
                            setEditingCourt({ ...editingCourt, operatingSchedule: { ...curr, startTime: e.target.value } });
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">เวลาปิดบริการ</label>
                        <input
                          type="time"
                          value={editingCourt.operatingSchedule?.endTime || '22:00'}
                          onChange={(e) => {
                            const curr = editingCourt.operatingSchedule || DEFAULT_OPERATING_SCHEDULE;
                            setEditingCourt({ ...editingCourt, operatingSchedule: { ...curr, endTime: e.target.value } });
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      ⚡ ลูกค้าจะจองได้เฉพาะช่วง {editingCourt.operatingSchedule?.startTime || '08:00'}–{editingCourt.operatingSchedule?.endTime || '22:00'} น. ตามวันที่กำหนด
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourt(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-xs"
                >
                  บันทึกข้อมูลสนาม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Upgrade Modal */}
      <MerchantSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
};
