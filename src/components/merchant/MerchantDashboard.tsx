import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Booking } from '../../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Eye,
  PlusCircle,
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import { MerchantBookingDetailModal } from './MerchantBookingDetailModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const MerchantDashboard: React.FC = () => {
  const { activeTenant, bookings, services, setMerchantTab, updateBookingStatus } = useSaaS();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [filterMode, setFilterMode] = useState<'today' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();
  const tenantBookings = bookings.filter((b) => !activeTenant || b.tenantId === activeTenant.id);
  const todayBookings = tenantBookings.filter((b) => (b.bookingDate ? b.bookingDate.split('T')[0] : '') === todayStr);

  const baseBookings = filterMode === 'today'
    ? todayBookings
    : [...tenantBookings].sort((a, b) => new Date(b.createdAt || b.bookingDate).getTime() - new Date(a.createdAt || a.bookingDate).getTime());

  const displayedBookings = baseBookings.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      b.userName?.toLowerCase().includes(term) ||
      b.userPhone?.toLowerCase().includes(term) ||
      b.refNo?.toLowerCase().includes(term) ||
      b.serviceName?.toLowerCase().includes(term)
    );
  });

  const activeMetricsBookings = filterMode === 'today' ? todayBookings : tenantBookings;

  const confirmedCount = activeMetricsBookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in').length;
  const pendingCount = activeMetricsBookings.filter((b) => b.status === 'pending').length;
  
  const displayedRevenue = activeMetricsBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.finalPrice ?? b.price ?? 0), 0);

  const handleQuickStatusUpdate = async (e: React.MouseEvent, bookingId: string, newStatus: Booking['status']) => {
    e.stopPropagation();
    setUpdatingId(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
    } catch (err) {
      console.error('Quick status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Popular Services Data for Recharts
  const serviceStats = services.map((svc) => {
    const svcBookings = tenantBookings.filter((b) => b.serviceId === svc.id);
    return {
      name: svc.name.length > 20 ? svc.name.slice(0, 18) + '...' : svc.name,
      fullName: svc.name,
      count: svcBookings.length,
      revenue: svcBookings.reduce((sum, b) => sum + b.finalPrice, 0),
      color: svc.colorCode || '#4F46E5', // Use primary as fallback
    };
  });

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm">ยืนยันแล้ว</span>;
      case 'checked_in':
        return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm">เช็คอินแล้ว</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">เสร็จสิ้น</span>;
      case 'pending':
        return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm">รอชำระเงิน</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-red-200 shadow-sm">ยกเลิก</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 sm:px-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              ภาพรวมแดชบอร์ด
            </h1>
            <span className="bg-primary/10 text-primary text-xs font-extrabold px-3 py-1 rounded-full border border-primary/20 shadow-sm">
              {activeTenant.businessType}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            สรุปยอดคิวจอง รายได้ประจำวัน และสถิติบริการของร้าน {activeTenant.name} แบบ Real-time
          </p>
        </div>

        <button
          onClick={() => setMerchantTab('walkin')}
          className="btn-primary flex items-center justify-center gap-2 py-3 px-6 text-sm"
        >
          <PlusCircle className="w-5 h-5" />
          <span>เพิ่มคิวใหม่ (Walk-in)</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">
              {filterMode === 'today' ? 'คิวจองวันนี้ทั้งหมด' : 'คิวจองทั้งหมด'}
            </span>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">
              {activeMetricsBookings.length} <span className="text-base font-bold text-slate-400">คิว</span>
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2 font-medium">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-success font-semibold">อัปเดตล่าสุด ณ ปัจจุบัน</span>
            </p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">
              {filterMode === 'today' ? 'ยืนยันคิววันนี้แล้ว' : 'ยืนยันคิวแล้ว'}
            </span>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-success">
              {confirmedCount} <span className="text-base font-bold text-slate-400">คิว</span>
            </p>
            <p className="text-xs text-slate-500 mt-2 font-medium">พร้อมเข้ารับบริการตามนัด</p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">
              {filterMode === 'today' ? 'รอชำระมัดจำวันนี้' : 'รอชำระมัดจำ'}
            </span>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-warning">
              {pendingCount} <span className="text-base font-bold text-slate-400">คิว</span>
            </p>
            <p className="text-xs text-slate-500 mt-2 font-medium">รอสแกน PromptPay QR</p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">
              {filterMode === 'today' ? 'รายได้วันนี้ (โดยประมาณ)' : 'รายได้รวม (โดยประมาณ)'}
            </span>
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-inner">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">
              <span className="text-xl text-slate-400">฿</span>
              {(displayedRevenue ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-primary font-bold mt-2">
              รวมมัดจำออนไลน์ & หน้าร้าน
            </p>
          </div>
        </div>

      </div>

      {/* Main Grid: Today's Timeline & Popular Services Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Appointments Feed (2 cols) */}
        <div className="lg:col-span-2 premium-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-extrabold text-foreground">
                {filterMode === 'today' ? `ตารางคิวจองวันนี้ (${todayStr})` : 'รายการคิวจองทั้งหมด'}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === 'today'
                      ? 'bg-white text-emerald-700 shadow-xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  คิววันนี้ ({todayBookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === 'all'
                      ? 'bg-white text-emerald-700 shadow-xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  คิวทั้งหมด ({tenantBookings.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMerchantTab('calendar')}
                className="text-xs text-primary hover:text-primary-hover font-bold transition-colors bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl"
              >
                ดูปฏิทิน &rarr;
              </button>
            </div>
          </div>

          {/* Quick Search Box */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์, รหัสอ้างอิง..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {displayedBookings.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-slate-50/50">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-bold">
                {searchTerm
                  ? 'ไม่พบรายการคิวจองที่ตรงกับคำค้นหา'
                  : filterMode === 'today'
                  ? 'ยังไม่มีคิวจองสำหรับวันนี้'
                  : 'ยังไม่มีรายการคิวจองในระบบ'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {searchTerm ? 'ลองค้นหาด้วยคำอื่น หรือกดล้างการค้นหา' : 'เริ่มต้นโดยการเพิ่มคิว Walk-in ให้ลูกค้า'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="p-4 sm:p-5 rounded-2xl border border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group bg-white shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-foreground text-white px-4 py-3 rounded-xl text-center flex-shrink-0 min-w-[90px] shadow-sm">
                      <span className="text-xs font-bold text-slate-300 block mb-0.5">{booking.bookingDate}</span>
                      <span className="text-sm font-black block">{booking.startTime}</span>
                      <span className="text-[10px] text-slate-400 font-medium">ถึง {booking.endTime}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                          {booking.userName}
                        </span>
                        {booking.userPhone && (
                          <span className="text-[11px] font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {booking.userPhone}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-600">{booking.serviceName}</p>
                      <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                        {activeTenant?.settings?.enableCourtSelection || activeTenant?.settings?.bookingFlowConfig?.steps?.requireResource ? (
                          <span>{activeTenant?.settings?.resourceTerm || 'สนาม'}: <strong className="text-foreground">{booking.courtName || booking.staffName || '-'}</strong></span>
                        ) : (
                          <span>ช่าง/พนักงาน: <strong className="text-foreground">{booking.staffName || booking.courtName || '-'}</strong></span>
                        )}
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>ช่องทาง: <strong className="text-slate-700">{booking.source === 'line_liff' ? 'LINE OA / LIFF' : booking.source}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 min-w-[210px] shrink-0">
                    {/* Price & Status Badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 text-right">
                      <p className="text-base font-black text-slate-900">
                        ฿{(booking?.finalPrice ?? booking?.price ?? 0).toLocaleString()}
                      </p>
                      {getStatusBadge(booking.status)}
                    </div>

                    {/* Action Buttons Group */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {booking.status === 'pending' && (
                        <button
                          type="button"
                          disabled={updatingId === booking.id}
                          onClick={(e) => handleQuickStatusUpdate(e, booking.id, 'confirmed')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                          title="กดยืนยันคิว"
                        >
                          {updatingId === booking.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>ยืนยันคิว</span>
                        </button>
                      )}

                      {booking.status === 'confirmed' && (
                        <button
                          type="button"
                          disabled={updatingId === booking.id}
                          onClick={(e) => handleQuickStatusUpdate(e, booking.id, 'checked_in')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                          title="เช็คอินหน้าร้าน"
                        >
                          {updatingId === booking.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>เช็คอิน</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200/80 hover:border-slate-300"
                        title="ดูรายละเอียดคิว"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Services Chart (1 col) */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-foreground mb-1">
              บริการยอดนิยม
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              สถิติการถูกจองแยกตามหมวดหมู่บริการ
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceStats} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748B' }} interval={0} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [`${val} คิว`, 'จำนวนจอง']}
                    cursor={{fill: '#F1F5F9'}}
                  />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={32}>
                    {serviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-border text-sm text-slate-500 space-y-1 mt-4">
            <div className="flex justify-between font-bold text-slate-700 bg-slate-50 p-3 rounded-xl">
              <span>บริการในระบบทั้งหมด</span>
              <span className="text-primary">{services.length} บริการ</span>
            </div>
          </div>
        </div>

      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <MerchantBookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

    </div>
  );
};
