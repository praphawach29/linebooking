import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Loader2, LogIn, AlertCircle } from 'lucide-react';

export const MerchantLoginPage: React.FC = () => {
  const { signIn, authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  React.useEffect(() => {
    if (authUser) {
      if (authUser.role === 'platform_admin') navigate('/admin', { replace: true });
      else navigate('/merchant', { replace: true });
    }
  }, [authUser, navigate]);

  const from = (location.state as any)?.from?.pathname || '/merchant';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('กรุณากรอกอีเมลและรหัสผ่าน'); return; }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        if (signInError.includes('Invalid login credentials')) {
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือสมัครสมาชิกใหม่');
        } else {
          setError(signInError);
        }
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.77 3.34 8.76 7.82 9.74v-6.9H7.5V12h2.32V9.8c0-2.29 1.37-3.55 3.45-3.55.99 0 2.03.18 2.03.18V8.7h-1.14c-1.13 0-1.48.7-1.48 1.41V12h2.52l-.4 2.84h-2.12v6.9C18.66 20.76 22 16.77 22 12c0-5.52-4.48-10-10-10z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">เข้าสู่ระบบร้านค้า</h1>
            <p className="text-slate-400 text-sm mt-1">LINE OA Booking Platform</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="shop@example.com"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-bold py-3 rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเข้าสู่ระบบ...</>
              ) : (
                <><LogIn className="w-4 h-4" /> เข้าสู่ระบบ</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs">หรือ</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Register link */}
          <Link
            to="/merchant/register"
            className="block w-full text-center border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-semibold py-3 rounded-xl transition-all duration-300 text-sm"
          >
            สมัครใช้งานฟรี — เริ่มต้นเปิดร้าน
          </Link>

          <p className="text-center text-slate-500 text-xs mt-4">
            ระบบจัดการนัดหมายผ่าน LINE OA สำหรับธุรกิจ
          </p>
        </div>
      </div>
    </div>
  );
};
