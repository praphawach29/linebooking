import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Store, Loader2,
  CheckCircle2, AlertCircle, ChevronRight, ChevronLeft
} from 'lucide-react';

const BUSINESS_TYPES = [
  { value: 'spa', label: '💆 สปา / นวด' },
  { value: 'salon', label: '💇 ร้านเสริมสวย / ตัดผม' },
  { value: 'clinic', label: '🏥 คลินิก / สุขภาพ' },
  { value: 'fitness', label: '💪 ฟิตเนส / โยคะ' },
  { value: 'sports', label: '🏸 กีฬา / สนาม' },
  { value: 'restaurant', label: '🍽️ ร้านอาหาร' },
  { value: 'education', label: '📚 สอนพิเศษ / อบรม' },
  { value: 'other', label: '🏢 อื่นๆ' },
];

export const MerchantRegisterPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    shopName: '',
    businessType: '',
  });

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep1 = () => {
    if (!form.shopName) { setError('กรุณากรอกชื่อร้านค้า'); return false; }
    if (!form.businessType) { setError('กรุณาเลือกประเภทธุรกิจ'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.displayName) { setError('กรุณากรอกชื่อของคุณ'); return false; }
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) { setError('กรุณากรอกอีเมลให้ถูกต้อง'); return false; }
    if (!form.password || form.password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return false; }
    if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    setError(null);

    const { error: signUpError } = await signUp(
      form.email,
      form.password,
      form.displayName,
      form.shopName,
      form.businessType,
      form.phone,
    );

    setIsLoading(false);

    if (signUpError) {
      if (signUpError.includes('already registered')) {
        setError('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ');
      } else {
        setError(signUpError);
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/merchant'), 2500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">สมัครสำเร็จ! 🎉</h2>
          <p className="text-slate-400">กำลังพาคุณไปยังหน้าจัดการร้านค้า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 mb-3">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">เปิดร้านค้าใหม่</h1>
            <p className="text-slate-400 text-sm mt-0.5">ฟรี! ไม่ต้องใช้บัตรเครดิต</p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${s <= step ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>
          <p className="text-slate-400 text-xs text-center mb-5">
            ขั้นตอนที่ {step} จาก 2 — {step === 1 ? 'ข้อมูลร้านค้า' : 'ข้อมูลบัญชี'}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {step === 1 && (
              <div className="space-y-4">
                {/* Shop Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">ชื่อร้านค้า *</label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.shopName}
                      onChange={e => update('shopName', e.target.value)}
                      placeholder="เช่น สปา ลาวันเดอร์"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Business Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">ประเภทธุรกิจ *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSINESS_TYPES.map(bt => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => update('businessType', bt.value)}
                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                          form.businessType === bt.value
                            ? 'border-primary/60 bg-primary/10 text-white'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300'
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white font-bold py-3 rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
                >
                  ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">ชื่อของคุณ *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={e => update('displayName', e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">เบอร์โทรศัพท์</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="0812345678"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">อีเมล *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      placeholder="shop@example.com"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">รหัสผ่าน * (อย่างน้อย 8 ตัว)</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => update('password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">ยืนยันรหัสผ่าน *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={e => update('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-white/10 hover:border-white/20 text-slate-300 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] bg-gradient-to-r from-primary to-emerald-500 text-white font-bold py-3 rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้างบัญชี...</>
                    ) : (
                      'สร้างบัญชีและเปิดร้าน 🚀'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-slate-500 text-xs mt-5">
            มีบัญชีแล้ว?{' '}
            <Link to="/merchant/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
