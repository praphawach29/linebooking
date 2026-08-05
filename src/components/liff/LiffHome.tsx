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
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { LiffProfileData } from '../../hooks/useLiffProfile';
import { SkeletonCard } from '../common/SkeletonCard';

interface LiffHomeProps {
  onSelectService: (service: Service) => void;
  liffProfile?: LiffProfileData;
}

export const LiffHome: React.FC<LiffHomeProps> = ({ onSelectService, liffProfile }) => {
  const { activeTenant, services, staffs, courts, currentUser, isLoading, reviews, bookings } = useSaaS();
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Safe service list matching active tenant
  const activeTenantServices = services.filter((s) => {
    if (!s) return false;
    return s.tenantId === activeTenant?.id || !s.tenantId || services.length <= 1;
  });

  const displayServices = activeTenantServices.length > 0 ? activeTenantServices : services;

  // Extract unique categories dynamically with null protection
  const rawCategories: string[] = Array.from(
    new Set(
      displayServices
        .map((s) => s?.category)
        .filter((c): c is string => Boolean(c && typeof c === 'string'))
    )
  );
  const categories: string[] = ['ทั้งหมด', ...rawCategories];

  // Quick category helper mapping to assign domain-friendly icons/labels
  const getCategoryIcon = (catName: string) => {
    const lower = (catName || '').toLowerCase();
    if (lower.includes('massage') || lower.includes('นวด')) return <Heart className="w-3.5 h-3.5" />;
    if (lower.includes('facial') || lower.includes('หน้า') || lower.includes('สกิน')) return <Smile className="w-3.5 h-3.5" />;
    if (lower.includes('hair') || lower.includes('ผม') || lower.includes('ตัด')) return <Scissors className="w-3.5 h-3.5" />;
    if (lower.includes('สปา') || lower.includes('spa')) return <Sparkles className="w-3.5 h-3.5" />;
    if (lower.includes('สนาม') || lower.includes('ฟุตซอล') || lower.includes('แบด') || lower.includes('เทนนิส') || lower.includes('บาส') || lower.includes('sports') || lower.includes('court')) return <Trophy className="w-3.5 h-3.5 text-amber-500" />;
    return <Grid className="w-3.5 h-3.5" />;
  };

  // Robust Filtering Logic: Match both selected Category and Search Query safely
  const filteredServices = displayServices.filter((s) => {
    if (!s) return false;
    const categoryName = s.category || 'บริการทั่วไป';
    const matchesCategory =
      selectedCategory === 'ทั้งหมด' ||
      selectedCategory === 'บริการทั้งหมด' ||
      categoryName === selectedCategory;

    const sName = (s.name || '').toLowerCase();
    const sDesc = (s.description || '').toLowerCase();
    const sCat = (categoryName || '').toLowerCase();
    const q = (searchQuery || '').trim().toLowerCase();

    const matchesSearch =
      !q ||
      sName.includes(q) ||
      sDesc.includes(q) ||
      sCat.includes(q);

    return matchesCategory && matchesSearch;
  });

  // Auto-generate court booking options if merchant created courts but services array is empty
  let finalServicesList = filteredServices;
  if (finalServicesList.length === 0 && courts && courts.length > 0) {
    finalServicesList = courts.map((court, idx) => ({
      id: `court-svc-${court.id}`,
      tenantId: court.tenantId || activeTenant?.id || 'tenant-001',
      name: `เช่า${court.name} (${court.type || 'สนามหญ้าเทียม'})`,
      description: `สนามคุณภาพมาตรฐาน บริการเช่ารายชั่วโมง ราคา ฿${(1200 + (court.extraPricePerHour || 0)).toLocaleString()}/ชั่วโมง`,
      durationMinutes: 60,
      price: 1200 + (court.extraPricePerHour || 0),
      currency: 'THB',
      maxCapacity: 1,
      bufferMinutes: 15,
      colorCode: idx % 2 === 0 ? '#10B981' : '#3B82F6',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
      category: 'สนามกอล์ฟ/สนามกีฬา',
      isActive: true,
    }));
  }

  return (
    <div className="flex flex-col w-full bg-slate-50 min-h-full pb-6">
      {/* Premium Store Header Banner */}
      <div className="relative w-full bg-slate-900 text-white overflow-hidden pb-6">
        {/* Background Cover Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={
              activeTenant?.coverImageUrl ||
              'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80'
            }
            alt={activeTenant?.name || 'Store Cover'}
            className="w-full h-full object-cover opacity-40 filter blur-[0.5px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>

        {/* Store Profile Content Overlay */}
        <div className="relative z-10 px-5 pt-6 space-y-4">
          <div className="flex items-center gap-3.5">
            <img
              src={
                activeTenant?.logoUrl ||
                'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150&auto=format&fit=crop&q=80'
              }
              alt={activeTenant?.name || 'Logo'}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400/60 shadow-xl ring-4 ring-emerald-500/20 bg-slate-800"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {activeTenant?.businessType === 'sports' ? '⚽ สนามกีฬามาตรฐาน' : '✨ ร้านค้าอย่างเป็นทางการ'}
                </span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight drop-shadow-md truncate">
                {activeTenant?.name || 'JackSports สนามหญ้าเทียม'}
              </h1>
            </div>
          </div>

          <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed font-medium">
            {activeTenant?.description || 'ศูนย์บริการเช่าสนามหญ้าเทียมและระบบจองคิวออนไลน์ เลือกเวลาและทำรายการจองได้ทันที 24 ชม.'}
          </p>

          {/* Store Quick Status Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-slate-300">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>เปิดบริการวันนี้</span>
            </div>
            {courts && courts.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-300">
                <Trophy className="w-3.5 h-3.5" />
                <span>{courts.length} สนามย่อย</span>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>ยืนยันสิทธิ์ทันที</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Greeting Bar */}
      <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {liffProfile?.pictureUrl ? (
            <img
              src={liffProfile.pictureUrl}
              alt={liffProfile.displayName}
              className="w-6 h-6 rounded-full object-cover border border-emerald-500/30 shadow-sm"
            />
          ) : null}
          <span className="text-xs font-bold text-slate-500">สวัสดี,</span>
          <span className="text-sm font-black text-slate-900">
            {liffProfile?.displayName && liffProfile.displayName !== 'ลูกค้า LINE User'
              ? liffProfile.displayName
              : (currentUser?.displayName || currentUser?.name || 'คุณลูกค้า')}
          </span>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="px-5 py-3.5 bg-white sticky top-0 z-10 border-b border-slate-100/50 space-y-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)]">
        {/* Search Input */}
        <div className="relative w-full group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTenant?.businessType === 'sports'
                ? 'ค้นหาสนามกีฬา, ฟุตซอล, แบดมินตัน...'
                : 'ค้นหาบริการ, หมวดหมู่...'
            }
            className="w-full bg-slate-50 border border-slate-200/60 hover:border-emerald-500/40 rounded-2xl py-2.5 pl-11 pr-10 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all shadow-sm"
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

        {/* Category Pills Slider - Only display if there are 2 or more distinct categories */}
        {rawCategories.length > 1 && (
          <div className="space-y-2">
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
              {categories.map((cat: string) => {
                const isActive = selectedCategory === cat;
                const count =
                  cat === 'ทั้งหมด'
                    ? finalServicesList.length
                    : finalServicesList.filter((s) => s.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`snap-start px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-sm'
                    }`}
                  >
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-6">
        {/* Recommended Services Section Title */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Grid className="w-4 h-4 text-emerald-600" />
            รายการบริการและสนาม ({finalServicesList.length})
          </h2>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="flex flex-col gap-5">
            {[1, 2].map((n) => (
              <SkeletonCard key={n} />
            ))}
          </div>
        ) : finalServicesList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Filter className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-[14px] text-slate-800 font-black mb-1">
              ไม่พบบริการในหมวดหมู่ "{selectedCategory}"
            </p>
            <p className="text-[12px] text-slate-500 font-medium mb-5 max-w-xs">
              ลองเปลี่ยนคำค้นหาหรือเลือกดูรายการบริการทั้งหมดของร้านค้า
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ทั้งหมด');
                setSearchQuery('');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-md shadow-emerald-600/20"
            >
              ล้างการกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {finalServicesList.map((service) => {
              return (
                <div
                  key={service.id}
                  onClick={() => onSelectService(service)}
                  className="flex flex-col bg-white border border-slate-200/80 rounded-[28px] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500/50 cursor-pointer group"
                >
                  {/* Service Image Cover with Category Tag */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={
                        service.imageUrl ||
                        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={service.name || 'Service'}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-90"
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>

                    {/* Category Tag Badge */}
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 shadow-sm">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>{service.category || 'สนามฟุตซอล'}</span>
                    </div>

                    {/* Pricing Badge Top Right */}
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[12px] font-black px-3 py-1 rounded-xl shadow-lg flex items-center gap-1">
                      <span>฿{(service.price ?? 1200).toLocaleString()}</span>
                      <span className="text-[10px] font-medium opacity-90">/รอบ</span>
                    </div>

                    {/* Service Name Title */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-base font-black text-white line-clamp-1 leading-tight drop-shadow-md">
                        {service.name || 'บริการจองสนาม'}
                      </h3>
                    </div>
                  </div>

                  {/* Service Details & Action Bar */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[12px] text-slate-600 line-clamp-2 mb-4 leading-relaxed font-medium">
                      {service.description || 'สนามคุณภาพมาตรฐาน บริการเช่ารายชั่วโมง พร้อมสิ่งอำนวยความสะดวกครบครัน'}
                    </p>

                    {/* Duration & Select Button */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-extrabold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{service.durationMinutes || 60} นาที</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectService(service);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-xl text-[13px] flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700"
                      >
                        <span>เลือกจอง</span>
                        <ChevronRight className="w-4 h-4" />
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
