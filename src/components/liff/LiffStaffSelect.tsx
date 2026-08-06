import React, { useState } from 'react';
import { Service, Staff, SelectedAddon } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { getTenantTerminology } from '../../lib/tenant-terminology';
import { UserCheck, Star, ChevronRight, Sparkles, MapPin } from 'lucide-react';

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
  const { staffs, activeTenant } = useSaaS();
  const terms = getTenantTerminology(activeTenant);
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
    <div className="p-4 space-y-4 pb-28 font-prompt">
      {/* Selected Service Card */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-3xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block mb-1">
            บริการที่เลือก
          </span>
          <p className="text-[14px] font-black text-slate-900 line-clamp-1">{service.name}</p>
          {selectedAddons.length > 0 && (
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              รวมบริการเสริม ({selectedAddons.length} รายการ)
            </span>
          )}
        </div>
        <span className="text-lg font-black text-emerald-600">
          <span className="text-xs mr-0.5">฿</span>{totalPrice.toLocaleString()}
        </span>
      </div>

      {/* Header Section */}
      <div className="space-y-1 pt-1">
        <h2 className="text-[15px] font-black text-slate-900 flex items-center gap-2">
          {activeTenant?.businessType === 'sports' ? (
            <MapPin className="w-5 h-5 text-emerald-600" />
          ) : (
            <UserCheck className="w-5 h-5 text-emerald-600" />
          )}
          <span>{terms.resourceSelectTitle}</span>
        </h2>
        <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
          {terms.resourceSelectDesc}
        </p>
      </div>

      {/* Option: Any Available Court / Staff */}
      <div
        onClick={() => setSelectedStaffId('any')}
        className={`p-4 rounded-3xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
          selectedStaffId === 'any'
            ? 'bg-emerald-50/80 border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20 scale-[1.01]'
            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
        }`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
          selectedStaffId === 'any' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
        }`}>
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13.5px] font-black text-slate-900">{terms.autoAssignTitle}</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
            {terms.autoAssignDesc}
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
          selectedStaffId === 'any' ? 'border-emerald-600' : 'border-slate-300'
        }`}>
          {selectedStaffId === 'any' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>}
        </div>
      </div>

      {/* Specific Resources / Staff / Courts List */}
      <div className="space-y-2.5">
        {qualifiedStaffs.map((staff) => {
          const isSelected = selectedStaffId === staff.id;
          return (
            <div
              key={staff.id}
              onClick={() => setSelectedStaffId(staff.id)}
              className={`p-4 rounded-3xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                isSelected
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20 scale-[1.01]'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}
            >
              <img
                src={staff.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={staff.name}
                className={`w-12 h-12 rounded-2xl object-cover border-2 flex-shrink-0 transition-colors ${
                  isSelected ? 'border-emerald-500' : 'border-slate-200'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-[13.5px] font-black text-slate-900 truncate">
                    {staff.name}
                  </h4>
                  {staff.rating > 0 && (
                    <span className="text-[10px] font-black text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {staff.rating}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                  {staff.bio || `รายละเอียดของ ${staff.name}`}
                </p>
              </div>
              
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                isSelected ? 'border-emerald-600' : 'border-slate-300'
              }`}>
                {isSelected && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/96 backdrop-blur-md rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] border border-slate-200 z-30 p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">
              {terms.selectedResourceLabel}
            </p>
            <p className="text-[14px] font-black text-slate-900 line-clamp-1">
              {selectedStaffId === 'any' ? terms.autoAssignTitle : qualifiedStaffs.find(s => s.id === selectedStaffId)?.name || '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">รวมทั้งหมด</p>
            <p className="text-[15px] font-black text-emerald-600">฿{totalPrice.toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-6 rounded-2xl text-[14px] shadow-lg shadow-emerald-600/20 flex items-center justify-between group transition-all"
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
