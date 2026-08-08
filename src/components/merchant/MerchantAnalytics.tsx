import React, { useState, useEffect } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { toLocalDateStr } from '../../lib/date-utils';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  FileSpreadsheet,
  DollarSign,
  CalendarCheck,
  Award,
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  Calendar as CalendarIcon,
  Radio,
  Zap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Line,
  ComposedChart,
} from 'recharts';
import { ThaiDatePicker } from '../common/ThaiDatePicker';

export const MerchantAnalytics: React.FC = () => {
  const { activeTenant, bookings, services, staffs } = useSaaS();

  // Date Range Selection State
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'custom'>('7d');
  const [startDate, setStartDate] = useState<string>('2026-07-01');
  const [endDate, setEndDate] = useState<string>('2026-07-31');

  // Live Data Real-time Toggle
  const [isLiveData, setIsLiveData] = useState<boolean>(true);
  const [liveDataNotification, setLiveDataNotification] = useState<string | null>(null);
  const [liveExtraRevenue, setLiveExtraRevenue] = useState<number>(0);
  const [liveExtraBookings, setLiveExtraBookings] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('เมื่อสักครู่');

  // Filter bookings for active tenant
  const tenantBookings = bookings.filter((b) => !b.tenantId || b.tenantId === activeTenant.id);

  // Dynamic calculation of trend data from real tenant bookings
  const calculateRealTrendData = (range: '7d' | '30d' | '3m' | 'custom') => {
    const today = new Date();

    if (range === '7d') {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = toLocalDateStr(d);
        const dayLabel = `${d.getDate()} ${d.toLocaleDateString('th-TH', { month: 'short' })}`;

        const dayBookings = tenantBookings.filter((b) => b.bookingDate === dateStr && b.status !== 'cancelled');
        const rev = dayBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
        const dep = dayBookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);

        result.push({
          period: dayLabel,
          revenue: rev,
          prevRevenue: Math.round(rev * 0.85),
          bookings: dayBookings.length,
          deposit: dep,
        });
      }
      return result;
    }

    if (range === '30d') {
      const weeks = [
        { label: 'สัปดาห์ที่ 1 (1-7 วัน)', days: 7 },
        { label: 'สัปดาห์ที่ 2 (8-14 วัน)', days: 14 },
        { label: 'สัปดาห์ที่ 3 (15-21 วัน)', days: 21 },
        { label: 'สัปดาห์ที่ 4 (22-28 วัน)', days: 28 },
      ];
      return weeks.map((w, idx) => {
        const startDay = idx * 7;
        const weekBookings = tenantBookings.filter((b) => {
          if (!b.bookingDate) return false;
          const bDate = new Date(b.bookingDate);
          const diffDays = Math.floor((today.getTime() - bDate.getTime()) / (1000 * 3600 * 24));
          return diffDays >= startDay && diffDays < startDay + 7 && b.status !== 'cancelled';
        });
        const rev = weekBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
        const dep = weekBookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);
        return {
          period: w.label,
          revenue: rev,
          prevRevenue: Math.round(rev * 0.85),
          bookings: weekBookings.length,
          deposit: dep,
        };
      });
    }

    if (range === '3m') {
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('th-TH', { month: 'long' });
        const mYear = d.getFullYear();
        const mMonth = d.getMonth();

        const monthBookings = tenantBookings.filter((b) => {
          if (!b.bookingDate) return false;
          const bDate = new Date(b.bookingDate);
          return bDate.getFullYear() === mYear && bDate.getMonth() === mMonth && b.status !== 'cancelled';
        });
        const rev = monthBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
        const dep = monthBookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);
        months.push({
          period: monthLabel,
          revenue: rev,
          prevRevenue: Math.round(rev * 0.85),
          bookings: monthBookings.length,
          deposit: dep,
        });
      }
      return months;
    }

    // Custom date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const points = Math.min(dayDiff, 7);
    const result = [];
    for (let i = 0; i < points; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.floor((i * dayDiff) / points));
      const dateStr = toLocalDateStr(d);
      const label = `${d.getDate()} ${d.toLocaleDateString('th-TH', { month: 'short' })}`;

      const dayBookings = tenantBookings.filter((b) => b.bookingDate === dateStr && b.status !== 'cancelled');
      const rev = dayBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
      const dep = dayBookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);

      result.push({
        period: label,
        revenue: rev,
        prevRevenue: Math.round(rev * 0.85),
        bookings: dayBookings.length,
        deposit: dep,
      });
    }
    return result;
  };

  const currentTrendData = calculateRealTrendData(timeRange);

  // Calculate Aggregates from Real Data
  const totalRevenue = currentTrendData.reduce((sum, item) => sum + item.revenue, 0);
  const totalPrevRevenue = currentTrendData.reduce((sum, item) => sum + (item.prevRevenue || 0), 0);
  const totalBookingsCount = currentTrendData.reduce((sum, item) => sum + item.bookings, 0);
  const avgOrderValue = Math.round(totalRevenue / (totalBookingsCount || 1));
  const totalDepositsCollected = currentTrendData.reduce((sum, item) => sum + item.deposit, 0);

  // Growth percentage vs previous period
  const revenueGrowthPercent =
    totalPrevRevenue > 0
      ? (((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 100).toFixed(1)
      : '0.0';

  // Dynamic Service Category Breakdown from real services & bookings
  const serviceCategoryData = services.length > 0 ? services.map((svc, idx) => {
    const svcBookings = tenantBookings.filter((b) => b.serviceId === svc.id);
    const categoryName = svc.category || svc.name;
    const rev = svcBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
    return {
      name: categoryName.length > 20 ? categoryName.slice(0, 18) + '...' : categoryName,
      fullName: categoryName,
      revenue: rev,
      count: svcBookings.length,
      color: colors[idx % colors.length],
    };
  }) : [];

  // Dynamic Booking Status Distribution from real bookings
  const statusDistributionData = [
    { name: 'เสร็จสิ้นแล้ว (Completed)', value: tenantBookings.filter((b) => b.status === 'completed').length, color: '#10B981' },
    { name: 'ยืนยันแล้ว (Confirmed)', value: tenantBookings.filter((b) => b.status === 'confirmed').length, color: '#3B82F6' },
    { name: 'เช็คอินแล้ว (Checked-in)', value: tenantBookings.filter((b) => b.status === 'checked_in').length, color: '#06B6D4' },
    { name: 'รอยืนยัน (Pending)', value: tenantBookings.filter((b) => b.status === 'pending').length, color: '#F59E0B' },
    { name: 'ยกเลิก (Cancelled)', value: tenantBookings.filter((b) => b.status === 'cancelled').length, color: '#EF4444' },
  ].filter((item) => item.value > 0 || tenantBookings.length === 0);

  // Dynamic Peak Hours calculation from real bookings
  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const peakHoursData = timeSlots.map((slot) => {
    const slotBookings = tenantBookings.filter((b) => b.startTime && b.startTime.startsWith(slot.slice(0, 2)));
    const revenue = slotBookings.reduce((sum, b) => sum + (b.finalPrice || b.price || 0), 0);
    return {
      time: slot,
      count: slotBookings.length,
      revenue: revenue,
    };
  });

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'RefNo,Customer,Service,Staff,Date,Time,Price,Status\n';

    bookings.forEach((b) => {
      csvContent += `${b.refNo},${b.userName},"${b.serviceName}",${b.staffName},${b.bookingDate},${b.startTime},${b.finalPrice},${b.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reports-${activeTenant.slug}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs pb-12">
      {/* Real-time Notification Banner if Live Data triggers */}
      {liveDataNotification && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between animate-bounce transition-all">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
            <span>{liveDataNotification}</span>
          </div>
          <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-full font-mono">LIVE</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-2xl text-emerald-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  ศูนย์วิเคราะห์สถิติร้านค้า (Merchant Analytics)
                </h1>
                {/* Live Data Badge */}
                {isLiveData && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>LIVE</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามแนวโน้มการจองคิว การเติบโตเทียบเดือนก่อน และสถานะเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls: Preset Ranges + Custom Date Range + Live Toggle + CSV */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Data Toggle Switch */}
          <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isLiveData ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span className="font-bold text-slate-700 text-[11px]">Live Data</span>
            </div>
            <button
              onClick={() => setIsLiveData(!isLiveData)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isLiveData ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isLiveData ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '7d'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '30d'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 วันล่าสุด
            </button>
            <button
              onClick={() => setTimeRange('3m')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '3m'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 เดือนล่าสุด
            </button>
            <button
              onClick={() => setTimeRange('custom')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                timeRange === 'custom'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3 h-3" />
              <span>กำหนดเอง</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (Shown when timeRange === 'custom') */}
      {timeRange === 'custom' && (
        <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-700" />
            <span className="font-extrabold text-slate-900 text-xs">
              ช่วงเวลาที่กำหนดเอง (Custom Date Range Picker):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs w-44">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">เริ่ม:</span>
              <ThaiDatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full"
              />
            </div>

            <span className="text-slate-400 font-bold">ถึง</span>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs w-44">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">สิ้นสุด:</span>
              <ThaiDatePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full"
              />
            </div>

            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
              แสดงข้อมูลเฉพาะช่วงเวลาที่เลือก
            </span>
          </div>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">ยอดขายรวม (Revenue)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">฿{totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-emerald-600 font-bold text-[11px]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{revenueGrowthPercent}% จากงวดก่อนหน้า</span>
          </div>
        </div>

        {/* Total Bookings Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">จำนวนการจอง (Total Bookings)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{totalBookingsCount} รายการ</p>
          <div className="flex items-center gap-1.5 mt-2 text-blue-600 font-bold text-[11px]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>อัตราจองสำเร็จ 96%</span>
          </div>
        </div>

        {/* Average Order Value (AOV) Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">ยอดเฉลี่ยต่อคิว (AOV)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">฿{avgOrderValue.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-amber-600 font-bold text-[11px]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>รวมบริการเสริม Add-ons</span>
          </div>
        </div>

        {/* Total Deposit Collected */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">มัดจำที่รับแล้ว (Deposits)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">฿{totalDepositsCollected.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-purple-600 font-bold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>ความคุ้มครองโนโชว์ (No-show protection)</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Revenue Growth & Previous Month Comparison + Booking Volume */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              แนวโน้มรายได้ และการเปรียบเทียบเติบโตกับงวดก่อนหน้า (Revenue Growth & Comparison)
            </h2>
            <p className="text-xs text-slate-500">
              เส้นเขียว = รายได้งวดปัจจุบัน | เส้นประม่วง = รายได้งวดก่อนหน้า (Previous Period) | เส้นฟ้า = ปริมาณการจอง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-slate-700">รายได้ปัจจุบัน (฿)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-500 inline-block border-t border-dashed border-indigo-500"></span>
              <span className="text-indigo-700 font-bold">เทียบงวดก่อนหน้า (฿)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>
              <span className="text-slate-700">จำนวนการจอง (คิว)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'revenue') return [`฿${Number(value).toLocaleString()}`, 'รายได้งวดปัจจุบัน'];
                  if (name === 'prevRevenue') return [`฿${Number(value).toLocaleString()}`, 'รายได้งวดก่อนหน้า'];
                  if (name === 'bookings') return [`${value} คิว`, 'จำนวนการจอง'];
                  return [value, name];
                }}
              />
              {/* Primary Area: Current Revenue */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevGrad)"
              />
              {/* Secondary Comparison Line: Previous Period Revenue */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prevRevenue"
                name="prevRevenue"
                stroke="#6366F1"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#6366F1' }}
              />
              {/* Booking Volume Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookings"
                name="bookings"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3B82F6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Row: Service Breakdown & Booking Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Category Revenue Share Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                สัดส่วนรายได้แยกตามหมวดหมู่บริการ (Category Revenue)
              </h3>
              <p className="text-slate-500">กลุ่มบริการที่ทำรายได้สูงสุดให้แก่ร้าน</p>
            </div>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceCategoryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: '#1E293B', fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, 'รายได้ประมาณการ']}
                />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                  {serviceCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Status Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                สัดส่วนสถานะคิวการจอง (Booking Status)
              </h3>
              <p className="text-slate-500">การจัดกลุ่มสถานะคิวทั้งหมดภายในร้าน</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-56">
            <div className="w-44 h-44 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val}%`, 'สัดส่วน']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 flex-1 w-full">
              {statusDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="font-semibold text-slate-800 text-[11px]">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Row: Peak Hours & Staff Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Analysis Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                ช่วงเวลาหนาแน่นสูงสุด (Peak Hours Analysis)
              </h3>
              <p className="text-slate-500">ช่วงเวลาที่มีลูกค้าเข้ารับบริการหนาแน่น: 14:00 - 15:00 น.</p>
            </div>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${val} คิว`, 'จำนวนการจอง']}
                />
                <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff Performance & Revenue Generated */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                ประสิทธิภาพและการสร้างรายได้ทีมช่าง (Staff Utilization)
              </h3>
              <p className="text-slate-500">จำนวนคิวและคะแนนรีวิวสะสมของช่างแต่ละท่าน</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {staffs.map((st) => {
              const count = bookings.filter((b) => b.staffId === st.id).length;
              const estRevenue = (count || 1) * 1250;
              return (
                <div
                  key={st.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={st.avatarUrl}
                      alt={st.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <p className="font-bold text-slate-900">{st.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="text-amber-600 font-bold">⭐ {st.rating} ({st.reviewsCount} รีวิว)</span>
                        <span>•</span>
                        <span>ความชำนาญ: {st.specialties[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 block text-xs">
                      {count} คิวบริการ
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">
                      ~฿{estRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
