import React from 'react';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-white/10 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-extrabold text-base tracking-tight">
            LINE Booking SaaS Platform
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          <a href="#features" className="hover:text-emerald-400 transition-colors">ฟีเจอร์</a>
          <a href="#demo" className="hover:text-emerald-400 transition-colors">ตัวอย่างการทำงาน</a>
          <a href="#pricing" className="hover:text-emerald-400 transition-colors">ราคา</a>
          <Link to="/merchant/login" className="hover:text-emerald-400 transition-colors">เข้าสู่ระบบร้านค้า</Link>
          <Link to="/merchant/register" className="hover:text-emerald-400 transition-colors">สมัครสมาชิก</Link>
        </div>

        {/* Copyright */}
        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} LINE Booking SaaS. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
