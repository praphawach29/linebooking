import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Service } from '../../types';
import {
  Clock,
  Search,
  Star,
  Sparkles,
  ChevronRight,
  Filter,
  Scissors,
  Smile,
  Heart,
  Grid,
  Tag,
  X,
  Trophy,
} from 'lucide-react';

interface LiffHomeProps {
  onSelectService: (service: Service) => void;
}

export const LiffHome: React.FC<LiffHomeProps> = ({ onSelectService }) => {
  const { activeTenant, services, staffs, currentUser } = useSaaS();
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories dynamically from active tenant services with explicit type guard
  const rawCategories: string[] = Array.from(
    new Set(services.map((s) => s.category).filter((c): c is string => Boolean(c)))
  );
  const categories: string[] = ['ทั้งหมด', ...rawCategories];

  // Quick category helper mapping to assign domain-friendly icons/labels
  const getCategoryIcon = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('massage') || lower.includes('นวด')) return <Heart className="w-3.5 h-3.5" />;
    if (lower.includes('facial') || lower.includes('หน้า') || lower.includes('สกิน')) return <Smile className="w-3.5 h-3.5" />;
    if (lower.includes('hair') || lower.includes('ผม') || lower.includes('ตัด')) return <Scissors className="w-3.5 h-3.5" />;
    if (lower.includes('สปา') || lower.includes('spa')) return <Sparkles className="w-3.5 h-3.5" />;
    if (lower.includes('สนาม') || lower.includes('ฟุตซอล') || lower.includes('แบด') || lower.includes('เทนนิส') || lower.includes('บาส') || lower.includes('sports') || lower.includes('court')) return <Trophy className="w-3.5 h-3.5 text-amber-500" />;
    return <Grid className="w-3.5 h-3.5" />;
  };

  // Filtering Logic: Match both selected Category and Search Query
  const filteredServices = services.filter((s) => {
    const categoryName = s.category || '';
    const matchesCategory =
      selectedCategory === 'ทั้งหมด' ||
      selectedCategory === 'บริการทั้งหมด' ||
      categoryName === selectedCategory ||
      (selectedCategory === 'Massage' && (categoryName.includes('นวด') || categoryName.toLowerCase().includes('massage'))) ||
      (selectedCategory === 'Facial' && (categoryName.includes('หน้า') || categoryName.toLowerCase().includes('facial'))) ||
      (selectedCategory === 'Haircut' && (categoryName.includes('ผม') || categoryName.toLowerCase().includes('hair')));

    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
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
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
              {activeTenant.name}
            </h1>
            <span className="text-[10px] text-emerald-700 font-bold block">
              ● จองคิวออนไลน์ผ่าน LINE
            </span>
          </div>
        </div>
        <img
          src={
            currentUser.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
          }
          alt="Profile"
          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
        />
      </div>

      {/* Search & Category Filter Section */}
      <div className="px-4 pt-3 pb-3 bg-white/95 backdrop-blur-md sticky top-[53px] z-10 border-b border-slate-200/80 space-y-2.5">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTenant.businessType === 'sports'
                ? 'ค้นหาสนามกีฬา, ฟุตซอล, แบดมินตัน, คอร์ทเทนนิส...'
                : 'ค้นหาบริการ, หมวดหมู่, นวด, สปา, ทำผม...'
            }
            className="w-full bg-slate-100/90 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-600" />
              หมวดหมู่บริการ (Categories)
            </span>
            <span className="text-[10px] text-slate-400">
              พบ {filteredServices.length} บริการ
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x pt-0.5">
            {categories.map((cat: string) => {
              const isActive = selectedCategory === cat;
              // Calculate item count in category
              const count =
                cat === 'ทั้งหมด'
                  ? services.length
                  : services.filter((s) => s.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`snap-start px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/25 ring-2 ring-emerald-600/20'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* Active Filter Indicator Banner */}
        {selectedCategory !== 'ทั้งหมด' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-emerald-700 font-medium block">
                  กำลังกรองข้อมูลตามหมวดหมู่
                </span>
                <span className="text-xs font-extrabold text-slate-900">
                  {selectedCategory}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedCategory('ทั้งหมด')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl shadow-2xs"
            >
              แสดงทั้งหมด
            </button>
          </div>
        )}

        {/* Featured Staff Strip */}
        {staffs.length > 0 && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {activeTenant.businessType === 'sports'
                  ? 'ผู้ดูแลสนาม / โค้ชผู้เชี่ยวชาญ'
                  : 'ช่างผู้เชี่ยวชาญประจำร้าน'}
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
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-emerald-600" />
            รายการบริการ ({filteredServices.length})
          </h2>
        </div>

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600 font-bold">
              ไม่พบบริการในหมวดหมู่ "{selectedCategory}"
            </p>
            <p className="text-[11px] text-slate-400">
              ลองเปลี่ยนการค้นหาหรือกดปุ่มเพื่อดูบริการทั้งหมดในร้าน
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ทั้งหมด');
                setSearchQuery('');
              }}
              className="mt-2 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
            >
              ล้างการกรองทั้งหมด
            </button>
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
                  {/* Service Image Cover with Category Badge & Rating Overlay */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        service.imageUrl ||
                        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={service.name}
                      className="w-full h-full object-cover transform group-hover:scale-102 transition-transform duration-300"
                    />

                    {/* Category Tag Badge */}
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-xs">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>{service.category}</span>
                    </div>

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
