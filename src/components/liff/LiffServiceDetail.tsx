import React from 'react';
import { Service } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { Clock, ShieldCheck, CheckCircle2, ChevronRight, Star } from 'lucide-react';

interface LiffServiceDetailProps {
  service: Service;
  onStartBooking: () => void;
}

export const LiffServiceDetail: React.FC<LiffServiceDetailProps> = ({
  service,
  onStartBooking,
}) => {
  const { activeTenant, staffs } = useSaaS();

  const qualifiedStaffs = staffs.filter((s) => s.serviceIds.includes(service.id));
  const depositPct = activeTenant.settings.depositPercentage ?? 50;
  const depositAmount = (service.price * depositPct) / 100;

  return (
    <div className="p-4 space-y-4">
      {/* Service Cover Image */}
      {service.imageUrl && (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-44 object-cover"
          />
        </div>
      )}

      {/* Service Info Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            {service.category}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{service.durationMinutes} นาที (+พัก {service.bufferMinutes} นาที)</span>
          </div>
        </div>

        <h2 className="text-base font-bold text-slate-900 leading-snug">
          {service.name}
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed">
          {service.description}
        </p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">ราคาค่าบริการ</span>
            <p className="text-xl font-extrabold text-slate-900">
              ฿{(service.price ?? 0).toLocaleString()}
            </p>
          </div>
          {depositPct > 0 && (
            <div className="text-right bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-amber-700 font-medium block">
                มัดจำออนไลน์ ({depositPct}%)
              </span>
              <span className="text-xs font-bold text-amber-900">
                ฿{(depositAmount ?? 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Benefits List */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-slate-900 mb-2">สิ่งที่คุณจะได้รับ</h3>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>บริการโดยเทอราพิสมืออาชีพผ่านการรับรองมาตรฐาน</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>รับประกันคิวแน่นอน ไม่ต้องรอนาน ล็อกเวลาให้บริการเฉพาะคุณ</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>การันตีความสะอาดและใช้อุปกรณ์และน้ำมันหอมธรรมชาติ 100%</span>
          </div>
        </div>
      </div>

      {/* Available Staff Members */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ช่าง/ผู้ให้บริการสำหรับบริการนี้ ({qualifiedStaffs.length} คน)
        </h3>
        <div className="space-y-2.5">
          {qualifiedStaffs.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100"
            >
              <img
                src={staff.avatarUrl}
                alt={staff.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {staff.name}
                  </p>
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                    {staff.rating}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{staff.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onStartBooking}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors text-sm"
      >
        <span>ถัดไป: เลือกช่างและเวลา</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
