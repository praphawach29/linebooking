import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Service } from '../../types';
import { Clock, Search, Star, Sparkles, ChevronRight } from 'lucide-react';

interface LiffHomeProps {
  onSelectService: (service: Service) => void;
}

export const LiffHome: React.FC<LiffHomeProps> = ({ onSelectService }) => {
  const { activeTenant, services, staffs, currentUser } = useSaaS();
  const [selectedCategory, setSelectedCategory] = useState<string>('บริการทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['บริการทั้งหมด', ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices = services.filter((s) => {
    const matchesCat =
      selectedCategory === 'บริการทั้งหมด' ||
      selectedCategory === 'ทั้งหมด' ||
      s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full bg-slate-50 min-h-full pb-6">
      {/* Header Bar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <img
            src={activeTenant.logoUrl}
            alt={activeTenant.name}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
          />
          <h1 className="text-base font-bold text-slate-900 tracking-tight">หน้าแรก</h1>
        </div>
        <img
          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
          alt="Profile"
          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
        />
      </div>

      {/* Search & Category Filter Sticky Bar */}
      <div className="px-4 pt-3 pb-3 bg-white/95 backdrop-blur-md sticky top-[53px] z-10 border-b border-slate-200/80 space-y-2.5">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาบริการ..."
            className="w-full bg-slate-100/90 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`snap-start px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/20'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* Featured Staff Strip */}
        {staffs.length > 0 && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                ช่างผู้เชี่ยวชาญประจำร้าน
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {staffs.length} คนพร้อมให้บริการ
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {staffs.map((staff) => (
                <div key={staff.id} className="flex flex-col items-center min-w-[62px]">
                  <div className="relative mb-1">
                    <img
                      src={staff.avatarUrl}
                      alt={staff.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                    />
                    <div className="absolute -bottom-1 right-0 bg-amber-400 text-slate-900 text-[8px] font-bold px-1 rounded-full flex items-center">
                      <Star className="w-2 h-2 fill-current" />
                      {staff.rating}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-800 line-clamp-1">
                    {staff.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Services Section Title */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            บริการแนะนำ ({filteredServices.length})
          </h2>
        </div>

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center py-12">
            <p className="text-xs text-slate-500 font-medium">ไม่พบบริการที่คุณค้นหา</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredServices.map((service) => {
              return (
                <div
                  key={service.id}
                  onClick={() => onSelectService(service)}
                  className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden transition-all hover:shadow-md cursor-pointer group"
                >
                  {/* Service Image Cover with Rating Overlay */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        service.imageUrl ||
                        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={service.name}
                      className="w-full h-full object-cover transform group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-slate-200/80 flex items-center gap-1 shadow-2xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="text-xs font-bold text-slate-800">4.9</span>
                    </div>
                  </div>

                  {/* Service Info Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                        {service.name}
                      </h3>
                      <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap ml-2">
                        ฿{(service.price ?? 0).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Bottom Duration & Action Bar */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{service.durationMinutes} นาที</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectService(service);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        <span>จองเลย</span>
                        <span className="border-l border-white/30 pl-2 font-bold">
                          ฿{(service.price ?? 0).toLocaleString()}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
