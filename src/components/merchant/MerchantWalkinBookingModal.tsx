import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { PaymentMethod } from '../../types';
import { PlusCircle, User, Phone, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export const MerchantWalkinBookingModal: React.FC = () => {
  const {
    activeTenant,
    services,
    staffs,
    bookings,
    memberships,
    createBooking,
    setMerchantTab,
  } = useSaaS();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('11:00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerOptions = memberships
    .filter((membership) => membership.tenantId === activeTenant?.id)
    .filter(
      (membership, index, items) =>
        items.findIndex((item) => item.userId === membership.userId) === index,
    )
    .map((membership) => {
      const latestBooking = bookings.find(
        (booking) => booking.userId === membership.userId,
      );
      return {
        id: membership.userId,
        name: latestBooking?.userName,
        phone: latestBooking?.userPhone,
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !customerName || !selectedServiceId) return;

    setSubmitError(null);
    setIsSubmitting(true);
    const created = await createBooking({
        customerId: selectedCustomerId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId || undefined,
        bookingDate,
        startTime,
        notes,
        paymentMethod,
        source: 'walk_in',
        customerName,
        customerPhone: customerPhone || undefined,
      });
    setIsSubmitting(false);

    if (!created) {
      setSubmitError('ไม่สามารถสร้างการจองได้ กรุณาตรวจสอบลูกค้า เวลา และลองอีกครั้ง');
      return;
    }

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setMerchantTab('calendar');
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          สร้างรายการจอง Walk-in / ทางโทรศัพท์
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          สำหรับลูกค้าที่หน้าร้านหรือโทรเข้ามาสำรองคิวโดยตรง
        </p>
      </div>

      {successMsg ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-2 my-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">บันทึกการจอง Walk-in สำเร็จ!</h3>
          <p className="text-xs text-slate-500">กำลังนำคุณไปยังตารางคิวจอง...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                ลูกค้าที่มีอยู่ในร้าน *
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(event) => {
                  const customerId = event.target.value;
                  const customer = customerOptions.find((item) => item.id === customerId);
                  setSelectedCustomerId(customerId);
                  if (customer?.name) setCustomerName(customer.name);
                  if (customer?.phone) setCustomerPhone(customer.phone);
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">เลือกลูกค้า</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || `Customer ${customer.id.slice(0, 8)}`}
                    {customer.phone ? ` - ${customer.phone}` : ''}
                  </option>
                ))}
              </select>
              {customerOptions.length === 0 && (
                <p className="mt-1 text-[11px] font-medium text-amber-700">
                  ยังไม่มีลูกค้าที่เป็นสมาชิกของร้าน จึงยังสร้างรายการ walk-in ไม่ได้
                </p>
              )}
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                ชื่อลูกค้า *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="เช่น คุณกิตติศักดิ์"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="081-234-5678"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
            </div>
          </div>

          {/* Service & Staff Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">เลือกบริการ *</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              >
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} (฿{(svc?.price ?? 0).toLocaleString()} - {svc.durationMinutes} นาที)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เลือกช่าง/ผู้ให้บริการ</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              >
                <option value="">ช่างคนใดก็ได้ (Auto Assign)</option>
                {staffs.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                วันที่เข้าใช้บริการ *
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                เวลารอบ *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">วิธีการชำระเงิน</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <span className="font-bold text-slate-800">เงินสดหน้าร้าน (Cash)</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'promptpay'}
                  onChange={() => setPaymentMethod('promptpay')}
                />
                <span className="font-bold text-slate-800">PromptPay QR</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ข้อความถึงช่าง หรือหมายเหตุการจอง..."
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-2">
            {submitError && (
              <p className="mb-2 border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || customerOptions.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md transition-colors text-xs"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการจอง Walk-in'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
