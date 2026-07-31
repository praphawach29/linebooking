import React, { useState } from 'react';
import { Service, Staff, SelectedAddon } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { UserCheck, Star, ChevronRight, Sparkles } from 'lucide-react';

interface LiffStaffSelectProps {
  service: Service;
  selectedAddons?: SelectedAddon[];
  onSelectStaff: (staff: Staff | null) => void;
}

export const LiffStaffSelect: React.FC<LiffStaffSelectProps> = ({
  service,
  selectedAddons = [],
  onSelectStaff,
}) => {
  const { staffs } = useSaaS();
  const qualifiedStaffs = staffs.filter((s) => s.serviceIds.includes(service.id));
  const [selectedStaffId, setSelectedStaffId] = useState<string | 'any'>('any');

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalPrice = (service.price ?? 0) + addonsTotal;

  const handleConfirm = () => {
    if (selectedStaffId === 'any') {
      onSelectStaff(null);
    } else {
      const found = staffs.find((s) => s.id === selectedStaffId) || null;
      onSelectStaff(found);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
            บริการที่เลือก
          </span>
          <p className="text-xs font-bold text-slate-900 line-clamp-1">{service.name}</p>
          {selectedAddons.length > 0 && (
            <span className="text-[10px] text-slate-500 font-medium block">
              รวมบริการเสริม ({selectedAddons.length} รายการ)
            </span>
          )}
        </div>
        <span className="text-xs font-extrabold text-emerald-700">
          ฿{totalPrice.toLocaleString()}
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          เลือกผู้ให้บริการ (ช่าง)
        </h2>
        <p className="text-xs text-slate-500">
          คุณสามารถเลือกช่างคนโปรด หรือเลือกช่างคนใดก็ได้ที่มีคิวว่าง
        </p>
      </div>

      {/* Option: Any Available Staff */}
      <div
        onClick={() => setSelectedStaffId('any')}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
          selectedStaffId === 'any'
            ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-slate-900">ช่างคนใดก็ได้ (แนะนำ)</h3>
          <p className="text-[11px] text-slate-500">
            ระบบจะจัดคิวช่างที่มีความเชี่ยวชาญและว่างตรงเวลานั้นให้อัตโนมัติ
          </p>
        </div>
        <input
          type="radio"
          name="staff"
          checked={selectedStaffId === 'any'}
          onChange={() => setSelectedStaffId('any')}
          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
        />
      </div>

      {/* Specific Staff Members List */}
      <div className="space-y-2.5">
        {qualifiedStaffs.map((staff) => {
          const isSelected = selectedStaffId === staff.id;
          return (
            <div
              key={staff.id}
              onClick={() => setSelectedStaffId(staff.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                isSelected
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <img
                src={staff.avatarUrl}
                alt={staff.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {staff.name}
                  </h4>
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                    {staff.rating} ({staff.reviewsCount})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {staff.bio}
                </p>
              </div>
              <input
                type="radio"
                name="staff"
                checked={isSelected}
                onChange={() => setSelectedStaffId(staff.id)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors text-sm mt-4"
      >
        <span>ถัดไป: เลือกวันและเวลา</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
