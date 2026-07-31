import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
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
  Filter,
} from 'lucide-react';
import {
  AreaChart,
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
  LineChart,
  Line,
  Legend,
  ComposedChart,
} from 'recharts';

export const MerchantAnalytics: React.FC = () => {
  const { activeTenant, bookings, services, staffs } = useSaaS();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m'>('7d');

  // Trend Data based on selected range
  const revenueTrendData7D = [
    { period: '25 ก.ค.', revenue: 8500, bookings: 7, deposit: 4250 },
    { period: '26 ก.ค.', revenue: 12000, bookings: 10, deposit: 6000 },
    { period: '27 ก.ค.', revenue: 9500, bookings: 8, deposit: 4750 },
    { period: '28 ก.ค.', revenue: 14000, bookings: 12, deposit: 7000 },
    { period: '29 ก.ค.', revenue: 11000, bookings: 9, deposit: 5500 },
    { period: '30 ก.ค.', revenue: 16500, bookings: 14, deposit: 8250 },
    { period: '31 ก.ค.', revenue: 18700, bookings: 16, deposit: 9350 },
  ];

  const revenueTrendData30D = [
    { period: 'สัปดาห์ที่ 1', revenue: 62000, bookings: 52, deposit: 31000 },
    { period: 'สัปดาห์ที่ 2', revenue: 74500, bookings: 61, deposit: 37250 },
    { period: 'สัปดาห์ที่ 3', revenue: 81000, bookings: 68, deposit: 40500 },
    { period: 'สัปดาห์ที่ 4', revenue: 90200, bookings: 76, deposit: 45100 },
  ];

  const revenueTrendData3M = [
    { period: 'พฤษภาคม', revenue: 240000, bookings: 195, deposit: 120000 },
    { period: 'มิถุนายน', revenue: 285000, bookings: 230, deposit: 142500 },
    { period: 'กรกฎาคม', revenue: 307700, bookings: 257, deposit: 153850 },
  ];

  const currentTrendData =
    timeRange === '7d'
      ? revenueTrendData7D
      : timeRange === '30d'
      ? revenueTrendData30D
      : revenueTrendData3M;

  // Calculate Aggregates
  const totalRevenue = currentTrendData.reduce((sum, item) => sum + item.revenue, 0);
  const totalBookingsCount = currentTrendData.reduce((sum, item) => sum + item.bookings, 0);
  const avgOrderValue = Math.round(totalRevenue / (totalBookingsCount || 1));
  const totalDepositsCollected = currentTrendData.reduce((sum, item) => sum + item.deposit, 0);

  // Service Category Breakdown
  const serviceCategoryData = [
    { name: 'บริการนวด & สปา', revenue: Math.round(totalRevenue * 0.48), count: 38, color: '#10B981' },
    { name: 'สระ-ไดร์ & ทำผม', revenue: Math.round(totalRevenue * 0.28), count: 24, color: '#3B82F6' },
    { name: 'สกินแคร์ & สปาหน้า', revenue: Math.round(totalRevenue * 0.16), count: 12, color: '#F59E0B' },
    { name: 'ทรีตเมนต์หนังศีรษะ', revenue: Math.round(totalRevenue * 0.08), count: 6, color: '#8B5CF6' },
  ];

  // Booking Status Distribution
  const statusDistributionData = [
    { name: 'เสร็จสิ้นแล้ว (Completed)', value: 68, color: '#10B981' },
    { name: 'ยืนยันแล้ว (Confirmed)', value: 24, color: '#3B82F6' },
    { name: 'รอตรวจสอบ (Pending)', value: 5, color: '#F59E0B' },
    { name: 'ยกเลิก (Cancelled)', value: 3, color: '#EF4444' },
  ];

  // Peak Hours Data
  const peakHoursData = [
    { time: '09:00', count: 4, revenue: 4200 },
    { time: '10:00', count: 9, revenue: 10800 },
    { time: '11:00', count: 8, revenue: 9600 },
    { time: '13:00', count: 11, revenue: 13200 },
    { time: '14:00', count: 15, revenue: 18500 },
    { time: '15:00', count: 13, revenue: 15600 },
    { time: '16:00', count: 8, revenue: 9200 },
    { time: '17:00', count: 6, revenue: 7100 },
  ];

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
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-2xl text-emerald-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                ศูนย์วิเคราะห์สถิติร้านค้า (Merchant Analytics)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามแนวโน้มการจองคิว การเติบโตของรายได้ และประสิทธิภาพทีมช่างในร้าน
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel/CSV</span>
          </button>
        </div>
      </div>

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
            <span>+18.4% จากช่วงที่แล้ว</span>
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

      {/* Main Charts Row: Revenue Growth & Booking Volume (Composed Area + Line Chart) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              การเติบโตของรายได้และปริมาณการจอง (Revenue & Booking Trends)
            </h2>
            <p className="text-xs text-slate-500">
              เปรียบเทียบยอดขายสุทธิ (Area) และจำนวนคิวบริการ (Line) ตามช่วงเวลาที่เลือก
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-slate-700">รายได้สุทธิ (฿)</span>
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
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                formatter={(value: any, name: any) => {
                  if (name === 'revenue') return [`฿${Number(value).toLocaleString()}`, 'รายได้สุทธิ'];
                  if (name === 'bookings') return [`${value} คิว`, 'จำนวนการจอง'];
                  return [value, name];
                }}
              />
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
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookings"
                name="bookings"
                stroke="#3B82F6"
                strokeWidth={3}
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
