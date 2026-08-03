import React, { useState } from 'react';
import { useScrollReveal } from './useScrollReveal';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter (ทดลองใช้งาน)',
    priceMonthly: 0,
    priceYearly: 0,
    badge: 'ฟรีตลอดชีพ',
    popular: false,
    features: [
      'รองรับสูงสุด 1 ร้านค้า',
      'บริการสูงสุด 5 รายการ',
      'ทีมช่าง/พนักงานสูงสุด 3 คน',
      'รองรับระบบจองผ่าน LINE LIFF',
      'สถิติคิวและแดชบอร์ดพื้นฐาน',
    ],
    ctaText: 'เริ่มต้นใช้งานฟรี',
    highlight: false,
  },
  {
    name: 'Professional (ร้านค้ามืออาชีพ)',
    priceMonthly: 990,
    priceYearly: 790,
    badge: 'คุ้มค่าที่สุด ⭐',
    popular: true,
    features: [
      'ไม่จำกัดจำนวนบริการและหมวดหมู่',
      'ไม่จำกัดจำนวนช่าง/สนาม/ห้อง',
      'เลือกเปิด-ปิดขั้นตอนการจองได้อิสระ (Modular Flow)',
      'โหมดชำระเงินมัดจำ / พรอมต์เพย์ QR อัตโนมัติ',
      'ระบบตรวจสลิปโอนเงินอัตโนมัติ',
      'ปุ่มกดคิว Walk-in ด่วนหน้าร้าน',
      'รายงานวิเคราะห์ยอดขายและ Export Excel',
    ],
    ctaText: 'ทดลองใช้ฟรี 14 วัน',
    highlight: true,
  },
  {
    name: 'Enterprise (ธุรกิจหลายสาขา)',
    priceMonthly: 2990,
    priceYearly: 2390,
    badge: 'องค์กร & เครือข่าย',
    popular: false,
    features: [
      'ทุกฟีเจอร์ในแพ็กเกจ Professional',
      'รองรับหลายสาขา (Multi-Branch)',
      'ระบบแต้มสะสม & สมาชิก VIP (Loyalty System)',
      'Custom Domain (Domain ของคุณเอง)',
      'ทีมงานดูแลและช่วยตั้งค่าระบบ 24/7',
      'SLA รับประกันความเสถียร 99.9%',
    ],
    ctaText: 'ติดต่อฝ่ายขาย',
    highlight: false,
  },
];

export const PricingSection: React.FC = () => {
  const ref = useScrollReveal();
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative">
      <div ref={ref} className="max-w-7xl mx-auto opacity-0 transition-all duration-700">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            แพ็กเกจราคาโปร่งใส
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            เลือกแพ็กเกจที่เหมาะกับธุรกิจของคุณ
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-8">
            ไม่มีค่าธรรมเนียมแอบแฝง สามารถยกเลิกหรืออัปเกรดได้ตลอดเวลา
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                !isYearly ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                isYearly ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              รายปี <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">ประหยัด 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((p, idx) => {
            const price = isYearly ? p.priceYearly : p.priceMonthly;
            return (
              <div
                key={idx}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  p.highlight
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-500/20 lg:-translate-y-2'
                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold text-xs px-4 py-1.5 rounded-full shadow-lg">
                    {p.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-1 my-4">
                    <span className="text-4xl sm:text-5xl font-extrabold text-white">
                      {price === 0 ? '0' : `฿${price}`}
                    </span>
                    <span className="text-slate-400 text-sm font-medium">/เดือน {isYearly && '(จ่ายรายปี)'}</span>
                  </div>

                  <ul className="space-y-3.5 my-8">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/merchant/register"
                  className={`w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm text-center transition-all flex items-center justify-center gap-2 ${
                    p.highlight
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {p.ctaText} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
