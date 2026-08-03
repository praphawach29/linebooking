import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Staff } from '../../types';
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
} from 'lucide-react';

import { getTenantQuotaInfo } from '../../lib/quota-manager';
import { MerchantSubscriptionModal } from './MerchantSubscriptionModal';

const DAYS_OF_WEEK = [
  { id: 1, label: 'จันทร์', short: 'จ.' },
  { id: 2, label: 'อังคาร', short: 'อ.' },
  { id: 3, label: 'พุธ', short: 'พ.' },
  { id: 4, label: 'พฤหัสบดี', short: 'พฤ.' },
  { id: 5, label: 'ศุกร์', short: 'ศ.' },
  { id: 6, label: 'เสาร์', short: 'ส.' },
  { id: 0, label: 'อาทิตย์', short: 'อา.' },
];

export const MerchantStaffManager: React.FC = () => {
  const { activeTenant, staffs, services, saveStaff, deleteStaff, bookings, courts } = useSaaS();
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const quotaInfo = activeTenant ? getTenantQuotaInfo(activeTenant, bookings, staffs, courts) : null;

  const handleOpenAdd = () => {
    if (quotaInfo && quotaInfo.isStaffQuotaReached) {
      setIsSubscriptionModalOpen(true);
      return;
    }
    setEditingStaff({
      name: '',
      phone: '081-000-0000',
      email: '',
      bio: 'ช่างผู้เชี่ยวชาญให้บริการด้วยความประณีต',
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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            จัดการทีมช่าง & เวลาปฏิบัติงาน (Staff & Availability)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            มอบหมายบริการที่รับผิดชอบ กำหนดวันปฏิบัติงาน และช่วงเวลาว่างให้บริการประจำบุคคล
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ เพิ่มช่างใหม่</span>
        </button>
      </div>

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
                  <label className="block text-slate-700 font-bold mb-1">เบอร์โทรศัพท์ *</label>
                  <input
                    type="tel"
                    required
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
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

      {/* Subscription Upgrade Modal */}
      <MerchantSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
};
