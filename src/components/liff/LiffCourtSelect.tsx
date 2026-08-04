import React, { useState } from 'react';
import { Service, Court, SelectedAddon } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { Trophy, CheckCircle2, ChevronRight, Sparkles, MapPin, ShieldCheck } from 'lucide-react';

interface LiffCourtSelectProps {
  service: Service;
  selectedAddons?: SelectedAddon[];
  onSelectCourt: (court: Court | null) => void;
}

export const LiffCourtSelect: React.FC<LiffCourtSelectProps> = ({
  service,
  selectedAddons = [],
  onSelectCourt,
}) => {
  const { courts, activeTenant } = useSaaS();
  
  // Filter courts belonging to this service (or all active courts for tenant if none specific)
  const serviceCourts = courts.filter((c) => c.serviceId === service.id && c.isActive);
  const displayCourts = serviceCourts.length > 0 ? serviceCourts : courts.filter((c) => c.isActive);

  const [selectedCourtId, setSelectedCourtId] = useState<string | 'any'>('any');

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const basePrice = service.price ?? 0;
  
  const selectedCourtObj = displayCourts.find((c) => c.id === selectedCourtId);
  const extraPrice = selectedCourtObj?.extraPricePerHour || 0;
  const totalPrice = basePrice + addonsTotal + extraPrice;

  const handleConfirm = () => {
    if (selectedCourtId === 'any') {
      onSelectCourt(null);
    } else {
      const found = displayCourts.find((c) => c.id === selectedCourtId) || null;
      onSelectCourt(found);
    }
  };

  const getCourtBadge = (type?: string) => {
    switch (type) {
      case 'indoor':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Indoor ในร่ม 🏟️</span>;
      case 'outdoor':
        return <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Outdoor กลางแจ้ง ☀️</span>;
      case 'air_conditioned':
        return <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">VIP ติดแอร์ ❄️</span>;
      case 'clay':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">คอร์ทดิน 🎾</span>;
      case 'parquet':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">ปาร์เก้ FIBA 🏀</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">มาตรฐาน</span>;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Selected Service Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-300" />
            กีฬา / บริการที่เลือก
          </span>
          <p className="text-xs font-bold line-clamp-1">{service.name}</p>
          <span className="text-[10px] text-emerald-200 block mt-0.5">
            {service.durationMinutes} นาที / รอบ
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-extrabold text-amber-300 block">
            ฿{totalPrice.toLocaleString()}
          </span>
          <span className="text-[9px] text-emerald-200">รวมมัดจำ 50%</span>
        </div>
      </div>

      {/* Step Title */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-emerald-600" />
          เลือกสนาม / คอร์ทการแข่งขัน
        </h2>
        <p className="text-xs text-slate-500">
          ระบุสนามที่ต้องการเล่น เช่น สนาม A, สนาม B หรือคอร์ทติดแอร์
        </p>
      </div>

      {/* Option: Any Available Court */}
      <div
        onClick={() => setSelectedCourtId('any')}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
          selectedCourtId === 'any'
            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-slate-900">สนามใดก็ได้ (ระบบสุ่มคอร์ทว่าง)</h3>
            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">แนะนำ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            จัดคิวสนามที่ว่างตรงกับเวลาที่คุณเลือกให้อัตโนมัติ
          </p>
        </div>
        <input
          type="radio"
          name="court"
          checked={selectedCourtId === 'any'}
          onChange={() => setSelectedCourtId('any')}
          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
        />
      </div>

      {/* Specific Courts List */}
      <div className="space-y-2.5">
        {displayCourts.map((court) => {
          const isSelected = selectedCourtId === court.id;
          const courtEffectivePrice = Math.max(0, basePrice + (court.extraPricePerHour || 0));
          return (
            <div
              key={court.id}
              onClick={() => setSelectedCourtId(court.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                isSelected
                  ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {court.imageUrl && (
                <img
                  src={court.imageUrl}
                  alt={court.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {court.name}
                  </h4>
                  {getCourtBadge(court.type)}
                </div>

                {court.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                    {court.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    รหัส: {court.code}
                  </span>
                  <div className="text-right">
                    <span className="text-[13px] font-black text-emerald-600">
                      ฿{courtEffectivePrice.toLocaleString()} <span className="text-[9px] text-slate-500 font-normal">/ชม.</span>
                    </span>
                    {court.extraPricePerHour ? (
                      court.extraPricePerHour < 0 ? (
                        <span className="block text-[9px] text-emerald-600 font-bold">
                          (ส่วนลด ฿{Math.abs(court.extraPricePerHour)})
                        </span>
                      ) : (
                        <span className="block text-[9px] text-amber-600 font-bold">
                          (+฿{court.extraPricePerHour} VIP)
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
              </div>

              <input
                type="radio"
                name="court"
                checked={isSelected}
                onChange={() => setSelectedCourtId(court.id)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 mt-1"
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors text-sm mt-4"
      >
        <span>ถัดไป: เลือกวันและเวลวจอง</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
