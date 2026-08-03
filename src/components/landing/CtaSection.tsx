import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

export const CtaSection: React.FC = () => {
  const ref = useScrollReveal();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
      <div ref={ref} className="max-w-5xl mx-auto opacity-0 transition-all duration-700">
        <div className="relative rounded-3xl p-10 sm:p-16 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 overflow-hidden shadow-2xl text-center">
          {/* Decorative shapes */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              พร้อมเปลี่ยนระบบจองคิวร้านคุณแล้วหรือยัง?
            </div>
            <h2 className="text-2.5xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              เริ่มต้นเปิดร้านและรับคิวผ่าน LINE ฟรีวันนี้
            </h2>
            <p className="text-white/90 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-8 font-medium">
              ทดลองใช้งานระบบจัดการคิวงานผ่าน LINE OA ได้ฟรี 14 วัน ไม่ต้องกรอกบัตรเครดิต เซ็ตอัพเสร็จใน 5 นาที
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/merchant/register"
                className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-base"
              >
                🚀 สมัครเปิดร้านค้าฟรี <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-xs sm:text-sm text-white/80 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> ปลอดภัย 100%
              </span>
              <span>•</span>
              <span>ไม่ต้องใช้บัตรเครดิต</span>
              <span>•</span>
              <span>ยกเลิกได้ตลอดเวลา</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
