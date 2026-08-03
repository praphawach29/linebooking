import React from 'react';
import { useScrollReveal } from './useScrollReveal';
import { Smartphone, Sliders, QrCode, Shield, LayoutDashboard, UserCheck, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Smartphone,
    title: 'LINE LIFF Booking Instant',
    desc: 'ลูกค้าเปิดจองคิวผ่านแอป LINE บนมือถือได้ทันที สะดวก ไม่ต้องโหลดแอปเพิ่ม',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Sliders,
    title: 'Modular Step Flow Router',
    desc: 'สลับ Preset ปรับขั้นตอนจองคิวให้เหมาะกับธุรกิจคุณ เช่น ร้านตัดผมข้ามการเลือกช่าง หรือสนามแบดเลือกคอร์ด',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: UserCheck,
    title: 'Auto-Assign Staff & Resource',
    desc: 'เลือกระบบสุ่มช่าง/ลาน/เตียง ให้อัตโนมัติในเบื้องหลังเมื่อปิดสเต็ปการเลือก ช่วยให้คิวนัดเดินหน้าไวที่สุด',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: QrCode,
    title: 'PromptPay QR Code & Slip Check',
    desc: 'กำหนดโหมดชำระเงินได้ทั้ง 0 บาท (ไม่มัดจำ), มัดจำคงที่/เปอร์เซ็นต์, หรือชำระเต็มจำนวน พร้อมออก QR Code อัตโนมัติ',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: LayoutDashboard,
    title: 'Real-time Merchant Dashboard',
    desc: 'ดูแดชบอร์ดสรุปรายได้ คิววันนี้ ตารางงานปฏิทิน และมีปุ่มกดเพิ่มคิว Walk-in หน้าร้านได้สะดวกรวดเร็ว',
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'Enterprise RLS Security',
    desc: 'ระบบความปลอดภัยมาตรฐานสูงสุด ควบคุมสิทธิ์ข้อมูลส่วนบุคคลของลูกค้าและแยกคีย์ร้านค้าปลอดภัย 100%',
    color: 'from-emerald-400 to-cyan-500',
  },
];

export const FeaturesSection: React.FC = () => {
  const ref = useScrollReveal();

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative">
      <div ref={ref} className="max-w-7xl mx-auto opacity-0 transition-all duration-700">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ฟีเจอร์เด่นระบบ SaaS
          </div>
          <h2 className="text-2.5xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            ทุกสิ่งที่คุณต้องการเพื่อ <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              ยกระดับระบบจองคิวหน้าร้าน
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            ออกแบบโครงสร้างรองรับทุกประเภทธุรกิจ ใช้งานง่ายทั้งฝั่งเจ้าของร้านและลูกค้า
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 group shadow-xl"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
