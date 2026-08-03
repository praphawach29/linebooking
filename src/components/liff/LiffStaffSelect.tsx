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
    <div className="p-4 space-y-5 pb-[240px]">
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-3xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-primary/80 font-black uppercase tracking-wider block mb-1">
            บริการที่เลือก
          </span>
          <p className="text-[13px] font-black text-foreground line-clamp-1">{service.name}</p>
          {selectedAddons.length > 0 && (
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              รวมบริการเสริม ({selectedAddons.length} รายการ)
            </span>
          )}
        </div>
        <span className="text-lg font-black text-primary">
          <span className="text-xs mr-0.5">฿</span>{totalPrice.toLocaleString()}
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-[15px] font-black text-foreground flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          เลือกผู้ให้บริการ (ช่าง)
        </h2>
        <p className="text-[11px] text-slate-500 font-medium">
          คุณสามารถเลือกช่างคนโปรด หรือเลือกช่างคนใดก็ได้ที่มีคิวว่าง
        </p>
      </div>

      {/* Option: Any Available Staff */}
      <div
        onClick={() => setSelectedStaffId('any')}
        className={`p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
          selectedStaffId === 'any'
            ? 'bg-primary/5 border-primary shadow-[0_4px_12px_rgba(79,70,229,0.1)] ring-2 ring-primary/20 scale-[1.02]'
            : 'bg-white border-border hover:border-slate-300 shadow-sm'
        }`}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
           selectedStaffId === 'any' ? 'bg-primary/20 border-2 border-primary/30 text-primary' : 'bg-slate-100 border-2 border-slate-200 text-slate-400'
        }`}>
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h3 className="text-[13px] font-black text-foreground">ช่างคนใดก็ได้ (แนะนำ)</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            ระบบจะจัดคิวช่างที่มีความเชี่ยวชาญและว่างตรงเวลานั้นให้อัตโนมัติ
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selectedStaffId === 'any' ? 'border-primary' : 'border-slate-300'
        }`}>
            {selectedStaffId === 'any' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
        </div>
      </div>

      {/* Specific Staff Members List */}
      <div className="space-y-3">
        {qualifiedStaffs.map((staff) => {
          const isSelected = selectedStaffId === staff.id;
          return (
            <div
              key={staff.id}
              onClick={() => setSelectedStaffId(staff.id)}
              className={`p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
                isSelected
                  ? 'bg-primary/5 border-primary shadow-[0_4px_12px_rgba(79,70,229,0.1)] ring-2 ring-primary/20 scale-[1.02]'
                  : 'bg-white border-border hover:border-slate-300 shadow-sm'
              }`}
            >
              <img
                src={staff.avatarUrl}
                alt={staff.name}
                className={`w-14 h-14 rounded-full object-cover border-2 flex-shrink-0 transition-colors ${
                  isSelected ? 'border-primary' : 'border-slate-200'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[13px] font-black text-foreground truncate">
                    {staff.name}
                  </h4>
                  <span className="text-[10px] font-black text-amber-700 flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {staff.rating} ({staff.reviewsCount})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                  {staff.bio}
                </p>
              </div>
              
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                isSelected ? 'border-primary' : 'border-slate-300'
              }`}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar with Summary */}
      <div className="fixed bottom-[90px] left-4 right-4 p-4 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 max-w-[368px] mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">ช่างที่เลือก</p>
            <p className="text-[14px] font-black text-slate-900 line-clamp-1">
              {selectedStaffId === 'any' ? 'ช่างคนใดก็ได้' : qualifiedStaffs.find(s => s.id === selectedStaffId)?.name || '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">รวมทั้งหมด</p>
            <p className="text-[14px] font-black text-primary">฿{totalPrice.toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          className="w-full btn-primary py-3.5 px-6 text-[14px] shadow-premium flex items-center justify-between group rounded-2xl"
        >
          <span>ถัดไป: เลือกวันและเวลา</span>
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};
