import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, LogIn, Sparkles, Menu, X, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
                LINE Booking <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">SaaS</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">ฟีเจอร์เด่น</a>
            <a href="#demo" className="hover:text-emerald-400 transition-colors">ฝั่งลูกค้า (LIFF)</a>
            <a href="#merchant-demo" className="hover:text-emerald-400 transition-colors">ฝั่งร้านค้า (Merchant)</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">ขั้นตอนใช้งาน</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">แพ็กเกจราคา</a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/merchant/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </Link>
            <Link
              to="/merchant/register"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              สมัครเปิดร้านฟรี
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 p-5 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4">
            <nav className="flex flex-col gap-3 text-sm font-medium text-slate-300">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-400 py-1">ฟีเจอร์เด่น</a>
              <a href="#demo" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-400 py-1">ฝั่งลูกค้า (LIFF)</a>
              <a href="#merchant-demo" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-400 py-1">ฝั่งร้านค้า (Merchant)</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-400 py-1">ขั้นตอนใช้งาน</a>
              <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-400 py-1">แพ็กเกจราคา</a>
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link
                to="/merchant/login"
                className="w-full text-center border border-white/10 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
              >
                เข้าสู่ระบบร้านค้า
              </Link>
              <Link
                to="/merchant/register"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-2.5 rounded-xl text-sm text-center shadow-lg shadow-emerald-500/20"
              >
                สมัครเปิดร้านฟรี
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
