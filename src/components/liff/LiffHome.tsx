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
  Flame,
  ThumbsUp,
  Eye,
} from 'lucide-react';
import { SkeletonCard } from '../common/SkeletonCard';

interface LiffHomeProps {
  onSelectService: (service: Service) => void;
}

export const LiffHome: React.FC<LiffHomeProps> = ({ onSelectService }) => {
  const { activeTenant, services, staffs, currentUser, isLoading, reviews, bookings } = useSaaS();
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
      {/* User Welcome Section */}
      <div className="px-5 py-6 bg-gradient-to-b from-slate-50 to-white flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-500">ยินดีต้อนรับ,</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {currentUser?.name || 'ลูกค้า'}
          </h1>
        </div>
        <div className="relative">
          <img
            src={
              currentUser?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
            }
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg ring-2 ring-primary/20"
          />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
            <span className="flex w-3.5 h-3.5 bg-success rounded-full border-2 border-white"></span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="px-5 pb-4 bg-white sticky top-0 z-10 border-b border-slate-100/50 space-y-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)]">
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
            className="w-full bg-slate-50 border border-slate-200/60 hover:border-primary/40 rounded-2xl py-3.5 pl-11 pr-10 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all shadow-sm"
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
                  className={`snap-start px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02] ring-1 ring-primary/80'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm'
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
        {isLoading ? (
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((n) => (
              <SkeletonCard key={n} />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
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
                  className="flex flex-col bg-white border border-slate-100 rounded-[28px] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-slate-200 cursor-pointer group"
                >
                  {/* Service Image Cover with Category Badge & Rating Overlay */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        service.imageUrl ||
                        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={service.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Dark Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/10"></div>

                    {/* Category Tag Badge */}
                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl border border-white/30 flex items-center gap-1.5 shadow-sm">
                      <Tag className="w-3 h-3 text-white" />
                      <span>{service.category}</span>
                    </div>

                    {/* Dynamic Urgency / Popularity Badge */}
                    {(() => {
                      // Deterministic pseudorandom based on service id length and characters
                      const hash = service.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const badgeType = hash % 4; // 0, 1, 2, 3
                      
                      if (badgeType === 0) {
                        return (
                          <div className="absolute top-12 left-3 bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm animate-pulse">
                            <Flame className="w-3 h-3 fill-white" />
                            ยอดนิยม
                          </div>
                        );
                      }
                      if (badgeType === 1) {
                        return (
                          <div className="absolute top-12 left-3 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                            <ThumbsUp className="w-3 h-3 fill-white" />
                            แนะนำ
                          </div>
                        );
                      }
                      if (badgeType === 2) {
                        return (
                          <div className="absolute top-12 left-3 bg-blue-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                            <Eye className="w-3 h-3" />
                            กำลังดูอยู่ {(hash % 5) + 2} คน
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Dynamic Rating */}
                    {(() => {
                      const serviceBookings = bookings.filter(b => b.serviceId === service.id);
                      const serviceReviews = reviews.filter(r => serviceBookings.some(b => b.id === r.bookingId));
                      const avgRating = serviceReviews.length > 0 
                        ? (serviceReviews.reduce((acc, curr) => acc + curr.rating, 0) / serviceReviews.length).toFixed(1)
                        : '5.0'; // Default to 5.0 if no reviews
                      
                      return (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/50 flex items-center gap-1 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="text-[11px] font-black text-foreground">{avgRating}</span>
                        </div>
                      );
                    })()}
                    
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
                    <div className="flex items-center justify-between mt-auto pt-4">
                      <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{service.durationMinutes} นาที</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectService(service);
                        }}
                        className="bg-primary text-primary-foreground font-bold py-2 px-5 rounded-xl text-[13px] flex items-center gap-2 hover:bg-primary-hover transition-colors shadow-md"
                      >
                        <span>จอง</span>
                        <span className="border-l border-white/20 pl-2 opacity-90">
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
