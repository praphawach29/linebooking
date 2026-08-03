import React from 'react';
import { useScrollReveal } from './useScrollReveal';
import { Store, Sliders, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    step: '01',
    icon: Store,
    title: 'สมัครเปิดร้านค้าใน 1 นาที',
    desc: 'กรอกชื่อร้านค้าและเลือกประเภทธุรกิจของคุณ (สปา, ร้านตัดผม, คลินิก, ฟิตเนส, สนามกีฬา) ได้ฟรีทันที',
  },
  {
    step: '02',
    icon: Sliders,
    title: 'ตั้งค่าบริการและขั้นตอนการจอง',
    desc: 'เลือก Preset หรือเปิด-ปิดสเต็ปจองคิวเอง กำหนดโหมดมัดจำ/ชำระเงิน และผูกกับ LINE Channel ID',
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'เปิดรับคิวนัดหมายอัตโนมัติ 24 ชม.',
    desc: 'นำลิงก์ LIFF ไปใส่ใน LINE OA ให้ลูกค้ากดจองคิวบนมือถือ ระบบจัดการแจ้งเตือนและรับเงินมัดจำให้อัตโนมัติ',
  },
];

export const HowItWorksSection: React.FC = () => {
  const ref = useScrollReveal();

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
      <div ref={ref} className="max-w-7xl mx-auto opacity-0 transition-all duration-700">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ง่ายที่สุดใน 3 ขั้นตอน
          </div>
          <h2 className="text-2.5xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            เริ่มต้นใช้งานง่ายๆ ภายในไม่กี่นาที
          </h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            ไม่ต้องมีความรู้เขียนโค้ด ระบบพร้อมใช้งานทันทีรองรับทุกขนาดธุรกิจ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl sm:text-4xl font-extrabold text-white/10 font-mono">{s.step}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/merchant/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all text-base"
          >
            เริ่มเปิดร้านค้าของคุณเลย <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
