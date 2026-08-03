import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, ArrowRight, CheckCircle2, ShieldCheck, Zap, Users, Play } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

const stats = [
  { num: '5 นาที', label: 'ติดตั้งเสร็จพร้อมใช้' },
  { num: '24 ชม.', label: 'รับคิวอัตโนมัติ' },
  { num: '0 บาท', label: 'เริ่มต้นทดลองฟรี' },
  { num: '100%', label: 'เชื่อมต่อ LINE OA' },
];

export const HeroSection: React.FC = () => {
  const ref = useScrollReveal();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-950">
      {/* Background Glow Blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto text-center opacity-0 transition-all duration-700">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold mb-8 backdrop-blur-md animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>ระบบจองคิวผ่าน LINE OA อันดับ 1 สำหรับธุรกิจไทย</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
          เปลี่ยน LINE OA ให้เป็น <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            พนักงานจองคิวอัตโนมัติ 24 ชั่วโมง
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-400 font-normal leading-relaxed mb-10">
          ลูกค้าจองคิวได้ง่ายผ่าน LINE LIFF ไม่ต้องดาวน์โหลดแอป รองรับการเลือกช่าง/สนาม ปรับสเต็ปตามประเภทธุรกิจ ออก QR Code มัดจำอัตโนมัติ
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/merchant/register"
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
          >
            🚀 เริ่มต้นเปิดร้านฟรี 14 วัน
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            ดูตัวอย่างการทำงาน
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
          {stats.map((s, idx) => (
            <div key={idx} className="p-3 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mb-1">{s.num}</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
