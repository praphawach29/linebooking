import React, { useEffect, useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Booking, BookingStatus } from '../../types';
import { generateICSFile } from '../../utils/calendar';
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  XCircle,
  PlusCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  QrCode,
  CheckCircle2,
  Building2,
  X,
  Copy,
  Check,
  Star,
} from 'lucide-react';
import { SkeletonCard } from '../common/SkeletonCard';

interface LiffMyBookingsProps {
  onNewBooking: () => void;
  lineUserId?: string;
}

export const LiffMyBookings: React.FC<LiffMyBookingsProps> = ({ onNewBooking, lineUserId }) => {
  const {
    cancellationPolicies,
    updateBookingStatus,
    activeTenant,
    isLoading,
    addReview,
    reviews,
    fetchMyBookings,
    currentUser,
  } = useSaaS();

  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoadingMine, setIsLoadingMine] = useState(true);

  // ตาราง bookings อ่านสาธารณะไม่ได้แล้ว (RLS) — ต้องดึงคิวของตัวเองผ่าน RPC
  useEffect(() => {
    let cancelled = false;
    setIsLoadingMine(true);
    fetchMyBookings(lineUserId)
      .then((list) => {
        if (!cancelled) setMyBookings(list);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMine(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.lineUserId, lineUserId]);

  // Always render the customer-specific RPC result, even when it returns zero rows.
  const visibleBookings = (isLoadingMine ? [] : myBookings).filter(b => !activeTenant || b.tenantId === activeTenant.id);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [selectedBookingForQr, setSelectedBookingForQr] = useState<Booking | null>(null);
  
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isSimulatingCheckin, setIsSimulatingCheckin] = useState(false);
  const [downloadedIcsFor, setDownloadedIcsFor] = useState<string | null>(null);

  const handleDownloadCalendar = (booking: Booking) => {
    if (!activeTenant) return;
    
    // Parse times for date objects (assuming bookingDate is YYYY-MM-DD and time is HH:mm)
    const startDate = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
    const endDate = new Date(`${booking.bookingDate}T${booking.endTime}:00`);
    
    const isCourt = activeTenant.settings?.enableCourtSelection || activeTenant.bookingFlowConfig?.steps?.requireResource;
    const resourceLabel = activeTenant.settings?.resourceTerm || (isCourt ? 'สนาม' : 'ช่างผู้ให้บริการ');
    const locationInfo = `${resourceLabel}: ${booking.courtName || booking.staffName || '-'}`;
    const icsUrl = generateICSFile({
      title: `${booking.serviceName} - ${activeTenant.name}`,
      description: `อ้างอิง: ${booking.refNo}\n${locationInfo}\nโทร: ${activeTenant.phone}`,
      location: activeTenant.address || activeTenant.name,
      startDate,
      endDate
    });

    const link = document.createElement('a');
    link.href = icsUrl;
    link.download = `booking-${booking.refNo}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedIcsFor(booking.id);
    setTimeout(() => setDownloadedIcsFor(null), 3000);
  };

  const filteredBookings = visibleBookings.filter((b) => {
    if (activeTab === 'upcoming') {
      return b.status === 'pending' || b.status === 'confirmed' || b.status === 'checked_in';
    }
    if (activeTab === 'completed') {
      return b.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return b.status === 'cancelled' || b.status === 'no_show';
    }
    return true;
  });

  const formatDateThai = (dStr: string) => {
    const d = new Date(dStr);
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-success/10 text-success-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-success/20 shadow-sm">ยืนยันแล้ว</span>;
      case 'pending':
        return <span className="bg-warning/10 text-warning-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-warning/20 shadow-sm">รอชำระเงิน</span>;
      case 'checked_in':
        return <span className="bg-primary/10 text-primary-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5" /> เช็คอินแล้ว</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">เสร็จสิ้น</span>;
      case 'cancelled':
        return <span className="bg-danger/10 text-danger-dark text-[10px] font-black px-2.5 py-1 rounded-lg border border-danger/20 shadow-sm">ยกเลิกแล้ว</span>;
      case 'no_show':
        return <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-300 shadow-sm">ไม่มาตามนัด</span>;
    }
  };

  // Calculate cancellation policy refund percentage
  const calculateRefundPct = (booking: Booking): number => {
    const bookingTime = new Date(`${booking.bookingDate}T${booking.startTime}:00`).getTime();
    const now = new Date().getTime();
    const hoursDiff = (bookingTime - now) / (1000 * 3600);

    const sorted = [...cancellationPolicies].sort((a, b) => b.hoursBefore - a.hoursBefore);

    for (const pol of sorted) {
      if (hoursDiff >= pol.hoursBefore) {
        return pol.refundPercentage;
      }
    }
    return 0;
  };

  const handleConfirmCancel = () => {
    if (selectedBookingForCancel) {
      updateBookingStatus(selectedBookingForCancel.id, 'cancelled', cancelReason || 'ลูกค้าขอยกเลิกผ่าน LIFF');
      setSelectedBookingForCancel(null);
      setCancelReason('');
    }
  };

  const handleSimulateCheckIn = (bookingId: string) => {
    setIsSimulatingCheckin(true);
    setTimeout(() => {
      updateBookingStatus(bookingId, 'checked_in', 'ลูกค้าเช็คอิน QR หน้าร้านเรียบร้อยแล้ว');
      setIsSimulatingCheckin(false);
      // Update selected booking in modal to show checked_in state
      if (selectedBookingForQr) {
        setSelectedBookingForQr({
          ...selectedBookingForQr,
          status: 'checked_in',
        });
      }
    }, 800);
  };

  const handleCopyRef = (refNo: string) => {
    navigator.clipboard.writeText(refNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleSubmitReview = () => {
    if (selectedBookingForReview && activeTenant) {
      addReview({
        tenantId: activeTenant.id,
        bookingId: selectedBookingForReview.id,
        rating: reviewRating,
        comment: reviewComment,
        customerName: selectedBookingForReview.customerName
      });
      setSelectedBookingForReview(null);
      setReviewRating(5);
      setReviewComment('');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
      <div className="flex items-center justify-between mt-2 px-4">
        <h2 className="text-lg font-black text-foreground">การจองคิวของฉัน</h2>
        <button
          onClick={onNewBooking}
          className="text-[11px] text-primary font-black flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>จองเพิ่ม</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1.5 m-4 rounded-2xl text-[13px] font-black shadow-inner border border-slate-200/50">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'upcoming'
              ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          กำลังจะถึง ({visibleBookings.filter((b) => b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in').length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'completed'
              ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          เสร็จสิ้น ({visibleBookings.filter((b) => b.status === 'completed').length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'cancelled'
              ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          ยกเลิก
        </button>
      </div>

      {/* Booking List */}
      <div className="space-y-4 px-4">
        {(isLoading || isLoadingMine) ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((n) => (
              <SkeletonCard key={n} />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="premium-card p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-base text-slate-500 font-bold mb-4">ไม่มีรายการจองในหมวดนี้</p>
            <button
              onClick={onNewBooking}
              className="btn-primary py-3 px-6 text-[13px]"
            >
              ค้นหาและจองคิวเลย
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              className="premium-card p-5 space-y-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg group"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                b.status === 'confirmed' ? 'bg-success' :
                b.status === 'pending' ? 'bg-warning' :
                b.status === 'checked_in' ? 'bg-primary' :
                b.status === 'cancelled' ? 'bg-danger' : 'bg-slate-300'
              }`}></div>

              <div className="flex items-start justify-between pb-3 border-b border-border/60">
                <div>
                  <span className="text-[10px] font-mono font-black text-slate-400 block mb-1">
                    #{b.refNo}
                  </span>
                  <h3 className="font-black text-foreground text-[15px] line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                    {b.serviceName}
                  </h3>
                </div>
                <div className="shrink-0 ml-2">
                   {getStatusBadge(b.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600 text-[13px] font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-bold">{formatDateThai(b.bookingDate)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-bold">{b.startTime?.slice(0, 5)} - {b.endTime?.slice(0, 5)} น.</span>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <User className="w-4 h-4 text-primary" />
                  {activeTenant?.settings?.enableCourtSelection || activeTenant?.settings?.bookingFlowConfig?.steps?.requireResource ? (
                    <span>{activeTenant?.settings?.resourceTerm || 'สนาม'}: <strong className="text-foreground font-black ml-1">{b.courtName || b.staffName || '-'}</strong></span>
                  ) : (
                    <span>ช่างผู้ให้บริการ: <strong className="text-foreground font-black ml-1">{b.staffName || b.courtName || '-'}</strong></span>
                  )}
                </div>
              </div>

              {b.addons && b.addons.length > 0 && (
                <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200/40 text-[11px] text-amber-900 space-y-1.5 shadow-inner">
                  <span className="font-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    บริการเสริม ({b.addons.length} รายการ):
                  </span>
                  {b.addons.map((a) => (
                    <div key={a.id} className="flex justify-between pl-5 pr-1 font-bold">
                      <span className="text-slate-600">• {a.name}{a.selectedOption ? ` (${a.selectedOption})` : ''}</span>
                      <span className="text-amber-700">+฿{(a.price ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {b.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl italic border border-slate-100 font-medium leading-relaxed shadow-inner">
                  "{b.notes}"
                </p>
              )}

              {(b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in') && (
                <div className="pt-4 border-t border-slate-100 space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForQr(b)}
                    className="w-full bg-[#113566] hover:bg-[#0b2447] text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-[13px]"
                  >
                    <QrCode className="w-5 h-5 text-[#60a5fa]" />
                    <span>แสดง QR Code เช็คอินหน้าร้าน</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDownloadCalendar(b)}
                    className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm border border-slate-200 text-[13px]"
                  >
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{downloadedIcsFor === b.id ? 'บันทึกแล้ว' : 'เพิ่มลงปฏิทิน (Calendar)'}</span>
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    {cancellationPolicies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBookingForCancel(b)}
                        className="text-danger-dark bg-danger/5 hover:bg-danger/10 px-3 py-2.5 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 border border-danger/20 flex-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>ยกเลิกคิว</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onNewBooking}
                      className="text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-2.5 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 border border-primary/20 flex-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>เลื่อนคิว</span>
                    </button>
                  </div>
                </div>
              )}

              {b.status === 'completed' && !reviews.some(r => r.bookingId === b.id) && (
                <div className="pt-4 border-t border-slate-100 space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForReview(b)}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-600 font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm border border-amber-200 text-[13px]"
                  >
                    <Star className="w-4 h-4" />
                    <span>ให้คะแนนและรีวิว</span>
                  </button>
                </div>
              )}
              {b.status === 'completed' && reviews.some(r => r.bookingId === b.id) && (
                 <div className="pt-4 border-t border-slate-100 mt-2 flex items-center gap-2 text-amber-500 font-black text-[12px] bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span>ให้คะแนนแล้ว ({reviews.find(r => r.bookingId === b.id)?.rating} ดาว)</span>
                 </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedBookingForQr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white max-w-[360px] w-full p-6 rounded-[32px] shadow-2xl space-y-5 text-[13px] relative border border-slate-200 transform animate-slideUp">
            <button
              type="button"
              onClick={() => setSelectedBookingForQr(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase tracking-wider shadow-sm">
                Storefront Check-In QR
              </span>
              <h3 className="font-black text-foreground text-lg">QR Code สำหรับเช็คอิน</h3>
            </div>

            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-center space-y-4 shadow-inner">
              <div className="inline-block bg-white p-4 border-2 border-[#113566]/20 rounded-3xl shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=CHECKIN-${selectedBookingForQr.refNo}`}
                  alt="Check-in QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="flex items-center justify-center gap-2 bg-white py-2 px-4 rounded-xl border border-slate-200 font-mono text-[13px] shadow-sm">
                <span className="font-black text-slate-800">Ref: #{selectedBookingForQr.refNo}</span>
                <button
                  type="button"
                  onClick={() => handleCopyRef(selectedBookingForQr.refNo)}
                  className="p-1.5 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                >
                  {copiedRef ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBookingForQr(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-[13px]"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {selectedBookingForCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white max-w-[360px] w-full p-6 rounded-[32px] shadow-2xl space-y-5 text-[13px] border border-slate-200 transform animate-slideUp">
            <div className="flex flex-col items-center gap-2 text-danger pb-2 border-b border-slate-100">
              <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-black text-lg text-foreground text-center leading-tight">คุณต้องการยกเลิก<br/>การจองคิวใช่หรือไม่?</h3>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-600 font-bold text-[11px]">เหตุผลในการยกเลิก (ไม่บังคับ)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="โปรดระบุเหตุผล..."
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-[13px] font-medium"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
                <button
                    type="button"
                    onClick={handleConfirmCancel}
                    className="w-full py-3.5 bg-danger text-white font-black rounded-xl hover:bg-danger-dark transition-colors shadow-md"
                >
                    ยืนยันยกเลิกคิว
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedBookingForCancel(null)}
                    className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                    กลับไปหน้าเดิม
                </button>
            </div>
          </div>
        </div>
      )}

        {/* Review Modal Dialog */}
        {selectedBookingForReview && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white max-w-[360px] w-full p-6 rounded-[32px] shadow-2xl space-y-5 text-[13px] border border-slate-200 transform animate-slideUp">
              <div className="flex flex-col items-center gap-2 text-amber-500 pb-2 border-b border-slate-100">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-2">
                    <Star className="w-8 h-8 fill-amber-500" />
                </div>
                <h3 className="font-black text-lg text-foreground text-center leading-tight">ให้คะแนนการบริการ</h3>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 shadow-inner text-center">
                <p className="font-black text-foreground text-[15px]">{selectedBookingForReview.serviceName}</p>
                <p className="text-slate-500 font-bold text-[11px]">
                  {activeTenant?.settings?.resourceTerm || 'ผู้ให้บริการ'}: {selectedBookingForReview.courtName || selectedBookingForReview.staffName || '-'}
                </p>
              </div>

              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 focus:outline-none transform transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star 
                      className={`w-8 h-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} 
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 font-bold text-[11px]">ความคิดเห็น (ไม่บังคับ)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="ความประทับใจ หรือข้อเสนอแนะ..."
                  rows={3}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all bg-slate-50 focus:bg-white resize-none text-[13px] font-medium"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                  <button
                      type="button"
                      onClick={handleSubmitReview}
                      className="w-full py-3.5 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition-colors shadow-md"
                  >
                      ส่งความเห็น
                  </button>
                  <button
                      type="button"
                      onClick={() => setSelectedBookingForReview(null)}
                      className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                      ไว้คราวหน้า
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

