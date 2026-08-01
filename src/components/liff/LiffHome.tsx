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
      <div className="bg-white px-5 py-4 border-b border-border/60 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={activeTenant.logoUrl}
            alt={activeTenant.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 shadow-sm"
          />
          <div>
            <h1 className="text-[15px] font-extrabold text-foreground tracking-tight leading-tight">
              {activeTenant.name}
            </h1>
            <span className="text-[10px] text-success font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
              จองคิวออนไลน์ผ่าน LINE
            </span>
          </div>
        </div>
        <img
          src={
            currentUser.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
          }
          alt="Profile"
          className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shadow-sm"
        />
      </div>

      {/* Search & Category Filter Section */}
      <div className="px-4 pt-4 pb-3 bg-white/95 backdrop-blur-xl sticky top-[73px] z-10 border-b border-border/50 space-y-3 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        {/* Search Input */}
        <div className="relative w-full group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTenant.businessType === 'sports'
                ? 'ค้นหาสนามกีฬา, ฟุตซอล...'
                : 'ค้นหาบริการ, หมวดหมู่...'
            }
            className="w-full bg-slate-100/80 border border-transparent hover:border-slate-300 rounded-2xl py-3 pl-10 pr-10 text-[13px] text-foreground placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="space-y-2">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x pt-1">
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
                  className={`snap-start px-4 py-2 rounded-2xl text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-white shadow-[0_8px_16px_-6px_var(--color-primary)] ring-2 ring-primary/20 scale-[1.02]'
                      : 'bg-white border border-border text-slate-600 hover:bg-slate-50 hover:text-primary hover:border-primary/30 shadow-sm'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
      <div className="p-4 space-y-6">
        {/* Active Filter Indicator Banner */}
        {selectedCategory !== 'ทั้งหมด' && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-[10px] text-primary/80 font-bold block">
                  กำลังกรองข้อมูล
                </span>
                <span className="text-xs font-black text-primary">
                  หมวดหมู่: {selectedCategory}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedCategory('ทั้งหมด')}
              className="text-[11px] font-bold text-primary hover:text-primary-hover bg-white border border-primary/20 px-3 py-1.5 rounded-xl shadow-sm transition-colors"
            >
              แสดงทั้งหมด
            </button>
          </div>
        )}

        {/* Featured Staff Strip */}
        {staffs.length > 0 && (
          <div className="premium-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-extrabold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {activeTenant.businessType === 'sports'
                  ? 'ผู้ดูแลสนาม / โค้ช'
                  : 'ช่างผู้เชี่ยวชาญ'}
              </span>
              <span className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                {staffs.length} คน
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {staffs.map((staff) => (
                <div key={staff.id} className="flex flex-col items-center min-w-[64px] group">
                  <div className="relative mb-2">
                    <img
                      src={staff.avatarUrl}
                      alt={staff.name}
                      className="w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-md group-hover:border-primary transition-colors"
                    />
                    <div className="absolute -bottom-1.5 right-0 bg-foreground text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-sm border border-slate-700">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 mr-0.5" />
                      {staff.rating}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 line-clamp-1 group-hover:text-primary transition-colors">
                    {staff.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Services Section Title */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-sm font-black text-foreground tracking-tight flex items-center gap-2">
            <Grid className="w-4 h-4 text-primary" />
            รายการบริการ ({filteredServices.length})
          </h2>
        </div>

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <div className="premium-card text-center py-12 px-6 flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
              <Filter className="w-7 h-7" />
            </div>
            <p className="text-[13px] text-slate-700 font-extrabold mb-1">
              ไม่พบบริการในหมวดหมู่ "{selectedCategory}"
            </p>
            <p className="text-[11px] text-slate-500 font-medium mb-5">
              ลองเปลี่ยนคำค้นหาหรือดูบริการทั้งหมดแทน
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ทั้งหมด');
                setSearchQuery('');
              }}
              className="btn-primary py-2 px-5 text-xs w-auto"
            >
              ล้างการกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredServices.map((service) => {
              return (
                <div
                  key={service.id}
                  onClick={() => onSelectService(service)}
                  className="flex flex-col bg-white border border-border/60 rounded-3xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-premium hover:-translate-y-1 hover:border-primary/30 cursor-pointer group"
                >
                  {/* Service Image Cover with Category Badge & Rating Overlay */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        service.imageUrl ||
                        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={service.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                    
                    {/* Dark Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/10"></div>

                    {/* Category Tag Badge */}
                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl border border-white/30 flex items-center gap-1.5 shadow-sm">
                      <Tag className="w-3 h-3 text-white" />
                      <span>{service.category}</span>
                    </div>

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/50 flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="text-[11px] font-black text-foreground">4.9</span>
                    </div>
                    
                    {/* Title overlay on image */}
                    <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-lg font-black text-white line-clamp-1 leading-tight drop-shadow-md">
                          {service.name}
                        </h3>
                    </div>
                  </div>

                  {/* Service Info Content */}
                  <div className="p-4 flex flex-col flex-1">
                    
                    <p className="text-[13px] text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">
                      {service.description}
                    </p>

                    {/* Bottom Duration & Action Bar */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{service.durationMinutes} นาที</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectService(service);
                        }}
                        className="btn-primary py-2 px-4 text-[13px] flex items-center gap-2 group-hover:scale-105 transition-transform"
                      >
                        <span>จอง</span>
                        <span className="border-l border-white/30 pl-2 font-black">
                          ฿{(service.price ?? 0).toLocaleString()}
                        </span>
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
