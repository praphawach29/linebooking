import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Booking } from '../../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { MerchantBookingDetailModal } from './MerchantBookingDetailModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const MerchantDashboard: React.FC = () => {
  const { activeTenant, bookings, services, setMerchantTab } = useSaaS();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.bookingDate === todayStr);

  const confirmedCount = todayBookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in').length;
  const pendingCount = todayBookings.filter((b) => b.status === 'pending').length;
  const cancelledCount = todayBookings.filter((b) => b.status === 'cancelled').length;

  const todayRevenue = todayBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.finalPrice, 0);

  // Popular Services Data for Recharts
  const serviceStats = services.map((svc) => {
    const svcBookings = bookings.filter((b) => b.serviceId === svc.id);
    return {
      name: svc.name.length > 20 ? svc.name.slice(0, 18) + '...' : svc.name,
      fullName: svc.name,
      count: svcBookings.length,
      revenue: svcBookings.reduce((sum, b) => sum + b.finalPrice, 0),
      color: svc.colorCode,
    };
  });

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">ยืนยันแล้ว</span>;
      case 'checked_in':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">เช็คอินแล้ว</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">เสร็จสิ้น</span>;
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">รอชำระเงิน</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-200">ยกเลิก</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              ภาพรวมแดชบอร์ด ({activeTenant.name})
            </h1>
            <span className="bg-emerald-500/10 text-emerald-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {activeTenant.businessType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            สรุปยอดคิวจอง รายได้ประจำวัน และสถิติบริการแบบ Real-time
          </p>
        </div>

        <button
          onClick={() => setMerchantTab('walkin')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ ลงคิว Walk-in ใหม่</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today's Bookings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">คิวจองวันนี้ทั้งหมด</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{todayBookings.length} คิว</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>อัปเดตล่าสุด ณ ปัจจุบัน</span>
          </p>
        </div>

        {/* Card 2: Confirmed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ยืนยันคิวแล้ว</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{confirmedCount} คิว</p>
          <p className="text-[11px] text-slate-500">พร้อมเข้ารับบริการตามนัด</p>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">รอชำระมัดจำ</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingCount} คิว</p>
          <p className="text-[11px] text-slate-500">รอสแกน PromptPay QR</p>
        </div>

        {/* Card 4: Today Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">รายได้วันนี้</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">฿{(todayRevenue ?? 0).toLocaleString()}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            รวมมัดจำออนไลน์ & หน้าร้าน
          </p>
        </div>

      </div>

      {/* Main Grid: Today's Timeline & Popular Services Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Appointments Feed (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              ตารางคิวจองวันนี้ ({todayStr})
            </h3>
            <button
              onClick={() => setMerchantTab('calendar')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
            >
              ดูในรูปแบบปฏิทิน &rarr;
            </button>
          </div>

          {todayBookings.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-500 font-medium">ยังไม่มีคิวจองสำหรับวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-500 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group bg-slate-50/50 hover:bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-center flex-shrink-0">
                      <span className="text-xs font-bold block">{booking.startTime}</span>
                      <span className="text-[9px] text-slate-300">ถึง {booking.endTime}</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {booking.userName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({booking.userPhone})</span>
                      </div>
                      <p className="text-xs font-medium text-slate-700">{booking.serviceName}</p>
                      <p className="text-[11px] text-slate-500">
                        ช่าง: <strong className="text-slate-800">{booking.staffName}</strong> | แหล่งที่มา: {booking.source}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-900">
                        ฿{(booking?.finalPrice ?? booking?.price ?? 0).toLocaleString()}
                      </p>
                      {getStatusBadge(booking.status)}
                    </div>
                    <button className="p-2 text-slate-400 group-hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Services Chart (1 col) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">
              บริการยอดนิยม (Most Popular Services)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              จำนวนการจองแยกตามหมวดหมู่บริการ
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val} คิว`, 'จำนวนจอง']}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {serviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>จำนวนบริการทั้งหมดในระบบ</span>
              <span>{services.length} บริการ</span>
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
