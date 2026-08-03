import React, { useState, useEffect } from 'react';
import { useScrollReveal } from './useScrollReveal';
import {
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  CheckCircle2,
  QrCode,
  ChevronRight,
  Star,
  Zap,
  ArrowLeft,
  X,
  Share2,
} from 'lucide-react';

interface LiffDemoScenario {
  id: string;
  name: string;
  badge: string;
  shopName: string;
  description: string;
  services: {
    name: string;
    duration: string;
    price: string;
    category: string;
    image: string;
  }[];
  staffList: {
    name: string;
    role: string;
    rating: string;
    avatar: string;
    isImageUrl?: boolean;
  }[];
  timeSlots: string[];
  paymentNotice: string;
}

const scenarios: LiffDemoScenario[] = [
  {
    id: 'spa',
    name: '🌸 สปา & นวดไทย',
    badge: 'Service + Staff + Deposit',
    shopName: 'Bliss Aura Spa (สาขาสุขุมวิท)',
    description: 'ลูกค้าเห็นรูปบริการการ์ดสวยงาม เลือกช่างดาวเด่น และเวลาจอง พร้อมรับ PromptPay QR มัดจำ 30%',
    services: [
      {
        name: 'นวดอโรม่าผ่อนคลาย (Aroma Therapy)',
        duration: '90 นาที',
        price: '฿1,200',
        category: 'นวดน้ำมัน',
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'นวดไทยแบบราชสำนัก (Traditional Thai)',
        duration: '120 นาที',
        price: '฿900',
        category: 'นวดไทย',
        image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80',
      },
    ],
    staffList: [
      {
        name: 'คุณมุก (หมอนวดมืออาชีพ)',
        role: 'ความเชี่ยวชาญ 8 ปี',
        rating: '5.0 ★',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        isImageUrl: true,
      },
      {
        name: 'คุณเมย์ (เทอราพิส)',
        role: 'นวดอโรม่า & สปาหน้า',
        rating: '4.9 ★',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
        isImageUrl: true,
      },
      {
        name: '⚡ สุ่มช่างให้อัตโนมัติ',
        role: 'ระบบคัดช่างที่ว่างที่สุดให้ด่วน',
        rating: 'Fast Track',
        avatar: '✨',
        isImageUrl: false,
      },
    ],
    timeSlots: ['10:30 น.', '13:00 น.', '15:30 น. (ว่าง)', '18:00 น.'],
    paymentNotice: '💰 มัดจำ 30% (฿360) เพื่อล็อคคอร์สนวด',
  },
  {
    id: 'barber',
    name: '💈 ร้านตัดผมชาย (Express)',
    badge: 'Express Queue — 2 Clicks',
    shopName: 'Vintage Cut Barber Shop',
    description: 'การ์ดรูปทรงผมหล่อๆ ข้ามขั้นตอนการเลือกช่าง (Auto-Assign) จองคิวด่วนเสร็จใน 2 คลิก',
    services: [
      {
        name: 'ตัดผมชายเซ็ตทรง (Haircut & Style)',
        duration: '45 นาที',
        price: '฿350',
        category: 'ตัดผม',
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'ตัดผม + ดัดวอลลุ่ม (Perm & Cut)',
        duration: '90 นาที',
        price: '฿1,500',
        category: 'ทำสี/ดัด',
        image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
      },
    ],
    staffList: [
      {
        name: '⚡ สุ่มช่างให้อัตโนมัติ',
        role: 'ระบบเลือกช่างประจำกะที่ว่างที่สุดให้อัตโนมัติ',
        rating: 'Fast Queue',
        avatar: '✂️',
        isImageUrl: false,
      },
    ],
    timeSlots: ['13:00 น. (คิวด่วน)', '14:30 น.', '16:00 น.', '17:30 น.'],
    paymentNotice: '👍 ชำระหน้าร้านได้เลย ไม่ต้องโอนมัดจำ',
  },
  {
    id: 'sports',
    name: '🏸 สนามกีฬา (Courts)',
    badge: 'Resource + Full Payment',
    shopName: 'BMA Sports Arena (สนามแบด)',
    description: 'การ์ดรูปสนามแข่งมาตรฐาน เลือกรหัสสนาม A1 และช่วงเวลา พร้อมออก PromptPay QR อัตโนมัติ',
    services: [
      {
        name: 'สนามแบดมินตัน A1 (พื้นยางแข่งขัน)',
        duration: '60 นาที',
        price: '฿250/ชม.',
        category: 'คอร์ดแบด',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'สนามแบดมินตัน A2 (พื้นยางแข่งขัน)',
        duration: '60 นาที',
        price: '฿250/ชม.',
        category: 'คอร์ดแบด',
        image: 'https://images.unsplash.com/photo-1521537634581-0dced2efa2a3?auto=format&fit=crop&w=600&q=80',
      },
    ],
    staffList: [
      { name: 'สนาม A1 (โซนติดแอร์)', role: 'พื้นยาง BWF Standard', rating: 'Court A1', avatar: '🏸', isImageUrl: false },
      { name: 'สนาม A2 (โซนติดแอร์)', role: 'พื้นยาง BWF Standard', rating: 'Court A2', avatar: '🏸', isImageUrl: false },
    ],
    timeSlots: ['18:00 - 19:00 (1 ชม.)', '19:00 - 21:00 (2 ชม.)', '21:00 - 22:00 (1 ชม.)'],
    paymentNotice: '💳 ชำระเงินเต็มจำนวน ฿500 ออก QR Code อัตโนมัติ',
  },
];

export const LiffDemoSection: React.FC = () => {
  const ref = useScrollReveal();
  const [activeScenarioId, setActiveScenarioId] = useState('spa');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);
  const [selectedStaffIdx, setSelectedStaffIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const scenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  // Auto step animation
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev < 4 ? ((prev + 1) as any) : 1));
    }, 4500);
    return () => clearInterval(timer);
  }, [activeScenarioId]);

  return (
    <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
      <div ref={ref} className="max-w-6xl mx-auto opacity-0 transition-all duration-700">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ตัวอย่างหน้าจอจองคิวจริง (Real LINE LIFF Experience)
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            การ์ดบริการสวยงามใน <span className="text-emerald-400">LINE LIFF Mobile App</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            ลูกค้าเห็นรูปพรีวิวบริการชัดเจน กดเลือกบริการ เลือกช่าง และนัดเวลาได้เองอย่างสวยงามสะดวกรวดเร็ว
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex gap-2 justify-center mb-10 flex-wrap">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveScenarioId(s.id);
                setStep(1);
                setSelectedSlot(null);
              }}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-300 ${
                activeScenarioId === s.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-105'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Smartphone Simulator Mockup */}
        <div className="max-w-sm mx-auto rounded-[40px] border-[8px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden relative">
          {/* Phone Top Notch Bar */}
          <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-white/5">
            <span className="font-semibold text-slate-300">9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">5G</span>
              <div className="w-4 h-2 bg-slate-400 rounded-xs" />
            </div>
          </div>

          {/* LINE LIFF Header Bar */}
          <div className="bg-[#06C755] px-4 py-3 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button onClick={() => setStep((s) => (s - 1) as any)} className="p-1 hover:bg-black/10 rounded-lg">
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
              )}
              <div>
                <h4 className="font-bold text-xs truncate max-w-[180px]">{scenario.shopName}</h4>
                <p className="text-[10px] text-white/80">LINE LIFF Official App</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-white/80" />
              <X className="w-4 h-4 text-white/80" />
            </div>
          </div>

          {/* Step Progress Tracker */}
          <div className="bg-slate-900/90 px-4 py-2 flex items-center justify-between border-b border-white/10 text-[11px] font-medium text-slate-400">
            <span className={step === 1 ? 'text-emerald-400 font-bold' : ''}>1. เลือกบริการ</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className={step === 2 ? 'text-emerald-400 font-bold' : ''}>2. เลือกช่าง/สนาม</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className={step === 3 ? 'text-emerald-400 font-bold' : ''}>3. เวลา</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className={step === 4 ? 'text-emerald-400 font-bold' : ''}>4. สรุปคิว</span>
          </div>

          {/* Mobile Screen Body Content */}
          <div className="p-4 min-h-[460px] flex flex-col justify-between bg-slate-950 text-white font-prompt">
            {/* STEP 1: Service Cards With Rich Images */}
            {step === 1 && (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">เลือกบริการที่ต้องการ</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Step 1/4
                  </span>
                </div>

                {scenario.services.map((svc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedServiceIdx(i);
                      setStep(2);
                    }}
                    className={`rounded-2xl border overflow-hidden transition-all cursor-pointer group ${
                      selectedServiceIdx === i
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    {/* Service Image Header */}
                    <div className="relative h-28 w-full overflow-hidden">
                      <img
                        src={svc.image}
                        alt={svc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      <span className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                        {svc.category}
                      </span>
                      <span className="absolute bottom-2 right-2 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-xl shadow-md">
                        {svc.price}
                      </span>
                    </div>

                    {/* Service Details */}
                    <div className="p-3">
                      <h5 className="text-xs font-extrabold text-white mb-1.5">{svc.name}</h5>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" /> {svc.duration}
                        </span>
                        <span className="text-emerald-400 font-bold text-[11px] group-hover:translate-x-1 transition-transform flex items-center">
                          เลือกคอร์สนี้ <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 2: Staff / Court Cards With Photos */}
            {step === 2 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">เลือกผู้ให้บริการ / สนาม</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Step 2/4
                  </span>
                </div>

                {scenario.staffList.map((st, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedStaffIdx(i);
                      setStep(3);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedStaffIdx === i
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {st.isImageUrl ? (
                        <img src={st.avatar} alt={st.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                          {st.avatar}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">{st.name}</div>
                        <div className="text-[10px] text-slate-400">{st.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-1 rounded-lg border border-amber-400/30">
                      {st.rating}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3: Date & Time Picker */}
            {step === 3 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">เลือกวันและรอบเวลา</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Step 3/4
                  </span>
                </div>

                {/* Date Selector Pill */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-xs text-emerald-400 font-bold">
                  <CalendarIcon className="w-4 h-4 text-emerald-400" />
                  <span>วันศุกร์ที่ 27 มีนาคม 2026 (วันนี้)</span>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {scenario.timeSlots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep(4);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedSlot === slot
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-emerald-500/50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Confirmation & PromptPay QR */}
            {step === 4 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-1 animate-bounce">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-white">สร้างรายการจองคิวสำเร็จ!</h4>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-left text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>รหัสอ้างอิง:</span>
                    <span className="font-mono text-emerald-400 font-bold">BK-2026-8819</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>บริการ:</span>
                    <span>{scenario.services[selectedServiceIdx].name}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>รอบเวลา:</span>
                    <span className="text-white font-bold">{selectedSlot || scenario.timeSlots[0]}</span>
                  </div>
                </div>

                {/* PromptPay QR Preview */}
                <div className="p-3 bg-white rounded-2xl text-slate-900 text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-xl mx-auto flex items-center justify-center text-white mb-2">
                    <QrCode className="w-12 h-12 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-slate-600 font-bold">{scenario.paymentNotice}</p>
                </div>
              </div>
            )}

            {/* Interactive Step Nav Buttons */}
            <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s as any)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    step === s
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Step {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
