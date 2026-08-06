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
  const { activeTenant, staffs, courts } = useSaaS();

  // Calculate minimum price among active courts for this service
  const serviceCourts = courts.filter((c) => c.serviceId === service.id && c.isActive);
  const minPrice = serviceCourts.length > 0 
    ? Math.min(...serviceCourts.map(c => Math.max(0, service.price + (c.extraPricePerHour || 0)))) 
    : service.price;

  const qualifiedStaffs = staffs.filter((s) => s.serviceIds.includes(service.id));
  const depositPct = activeTenant?.settings?.depositPercentage ?? 50;
  const depositAmount = (minPrice * depositPct) / 100;

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Service Cover Image */}
      {service.imageUrl && (
        <div className="rounded-[24px] overflow-hidden shadow-premium border border-border/50 relative">
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
          
          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-[10px] font-extrabold text-white bg-primary/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 mb-2 inline-block shadow-sm">
              {service.category}
            </span>
            <h2 className="text-xl font-black text-white leading-tight drop-shadow-md">
              {service.name}
            </h2>
          </div>
        </div>
      )}

      {/* Service Info Box */}
      <div className="premium-card p-5 space-y-4">
        
        <div className="flex items-center gap-2 text-[13px] text-slate-600 font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <Clock className="w-4 h-4 text-primary" />
          <span>{service.durationMinutes} นาที (+พัก {service.bufferMinutes} นาที)</span>
        </div>

        {!service.imageUrl && (
          <h2 className="text-xl font-black text-foreground leading-snug">
            {service.name}
          </h2>
        )}

        <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
          {service.description}
        </p>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
              <span className="text-[11px] text-slate-400 font-bold">ราคาเริ่มต้น</span>
              <p className="text-2xl font-black text-primary drop-shadow-sm">
                <span className="text-sm text-primary/70 mr-1">฿</span>
                {minPrice.toLocaleString()}
              </p>
          </div>
          {depositPct > 0 && (
            <div className="text-right bg-warning/10 border border-warning/20 px-3 py-2 rounded-2xl shadow-inner">
              <span className="text-[10px] text-warning-dark font-extrabold block">
                มัดจำออนไลน์ ({depositPct}%)
              </span>
              <span className="text-sm font-black text-warning-dark">
                ฿{(depositAmount ?? 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Benefits List */}
      <div className="premium-card p-5 space-y-3">
        <h3 className="text-[13px] font-black text-foreground mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          สิ่งที่คุณจะได้รับ
        </h3>
        <div className="space-y-3 text-[13px] text-slate-600 font-medium">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <span>บริการโดยผู้เชี่ยวชาญมืออาชีพผ่านการรับรองมาตรฐาน</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <span>รับประกันคิวแน่นอน ไม่ต้องรอนาน ล็อกเวลาให้บริการเฉพาะคุณ</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <span>การันตีความสะอาดและใช้อุปกรณ์คุณภาพพรีเมียม 100%</span>
          </div>
        </div>
      </div>

      {/* Available Staff Members */}
      <div className="premium-card p-5 space-y-4">
        <h3 className="text-[13px] font-black text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {qualifiedStaffs.length > 0 ? `ผู้ให้บริการที่รองรับ (${qualifiedStaffs.length} คน)` : 'ยังไม่มีผู้ให้บริการ'}
        </h3>
        <div className="space-y-3">
          {qualifiedStaffs.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 transition-colors rounded-2xl border border-slate-100 shadow-sm"
            >
              <img
                src={staff.avatarUrl}
                alt={staff.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/10 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[13px] font-extrabold text-foreground truncate">
                    {staff.name}
                  </p>
                  <span className="text-[10px] font-black text-amber-700 flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {staff.rating}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{staff.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-[64px] left-0 right-0 bg-white/96 backdrop-blur-md rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] border border-slate-200 z-30 p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">ราคาเริ่มต้น</p>
            <p className="text-[13px] font-black text-slate-900">฿{minPrice.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">มัดจำออนไลน์ ({depositPct}%)</p>
            <p className="text-[13px] font-black text-primary">฿{(depositAmount ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={onStartBooking}
          className="w-full btn-primary py-3.5 px-6 text-[14px] shadow-premium flex items-center justify-between group rounded-2xl"
        >
          <span>ถัดไป: เลือกช่างและเวลา</span>
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};
