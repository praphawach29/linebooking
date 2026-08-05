import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import {
  Calendar,
  Home,
  Bell,
  User as UserIcon,
  ChevronLeft,
  Share2,
  X,
  Star,
  Store,
} from 'lucide-react';
import { LiffHome } from './LiffHome';
import { LiffServiceDetail } from './LiffServiceDetail';
import { LiffStaffSelect } from './LiffStaffSelect';
import { LiffCourtSelect } from './LiffCourtSelect';
import { LiffDateTimePicker } from './LiffDateTimePicker';
import { LiffBookingSummary } from './LiffBookingSummary';
import { LiffPromptPayPayment } from './LiffPromptPayPayment';
import { LiffBookingConfirmation } from './LiffBookingConfirmation';
import { LiffMyBookings } from './LiffMyBookings';
import { LiffNotifications } from './LiffNotifications';
import { LiffProfile } from './LiffProfile';
import LiffRewards from './LiffRewards';
import LiffPointHistory from './LiffPointHistory';
import { useLiffProfile } from '../../hooks/useLiffProfile';
import { autoAssignStaff, autoAssignResource } from './BookingStepEngine';
import { Service, Staff, Court, Booking, SelectedAddon, PaymentMethod } from '../../types';

export type LiffStep =
  | 'home'
  | 'service_detail'
  | 'staff_select'
  | 'court_select'
  | 'date_time_select'
  | 'booking_summary'
  | 'promptpay_payment'
  | 'booking_confirmation'
  | 'my_bookings'
  | 'notifications'
  | 'profile'
  | 'rewards'
  | 'point_history';

export const LiffLayout: React.FC = () => {
  const { activeTenant: rawActiveTenant, tenants, services, staffs, courts, notifications, reviews, isLoading, currentUser } = useSaaS();
  const activeTenant = rawActiveTenant || (tenants && tenants.length > 0 ? tenants[0] : null);
  const liffProfile = useLiffProfile(activeTenant?.liffId);
  const [currentStep, setCurrentStep] = useState<LiffStep>('home');
  const [activeTab, setActiveTab] = useState<'home' | 'my_bookings' | 'notifications' | 'profile'>('home');

  // Booking Flow State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [selectedBookingHours, setSelectedBookingHours] = useState<number>(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [customerName, setCustomerName] = useState<string>(currentUser?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white font-prompt">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 text-sm">กำลังโหลดข้อมูลระบบ...</p>
        </div>
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-prompt p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
          <Store className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-extrabold mb-2 text-white">ยังไม่มีร้านค้าในระบบ</h2>
        <p className="text-slate-400 text-sm max-w-xs mb-6 leading-relaxed">
          กรุณาสมัครเปิดร้านค้าใหม่เพื่อเริ่มใช้งานระบบจองคิว LINE OA หรือเข้าสู่ระบบร้านค้า
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <a
            href="/merchant/register"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-lg shadow-emerald-500/25 text-sm flex items-center justify-center gap-2"
          >
            🚀 สมัครเปิดร้านค้าฟรี
          </a>
          <a
            href="/merchant/login"
            className="w-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold py-3 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            🔑 เข้าสู่ระบบร้านค้า
          </a>
        </div>
      </div>
    );
  }

  const shouldRequireResource = () => {
    const flowConfig = activeTenant.settings?.bookingFlowConfig;
    return flowConfig?.steps?.requireResource ?? activeTenant.settings?.enableCourtSelection ?? false;
  };

  const shouldRequireStaff = () => {
    const flowConfig = activeTenant.settings?.bookingFlowConfig;
    return flowConfig?.steps?.requireStaff ?? activeTenant.settings?.enableStaffSelection ?? true;
  };

  const goToNextSelectionStep = (requireStaff: boolean, requireResource: boolean) => {
    if (requireStaff) {
      setCurrentStep('staff_select');
      return;
    }

    const assigned = autoAssignStaff(staffs);
    setSelectedStaff(assigned);

    if (requireResource) {
      setCurrentStep('court_select');
      return;
    }

    setSelectedCourt(autoAssignResource(courts));
    setCurrentStep('date_time_select');
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedAddons([]);
    setSelectedStaff(null);
    setSelectedCourt(null);
    goToNextSelectionStep(shouldRequireStaff(), shouldRequireResource());
  };

  const handleStartBooking = () => {
    goToNextSelectionStep(shouldRequireStaff(), shouldRequireResource());
  };

  const handleSelectStaff = (staff: Staff | null) => {
    setSelectedStaff(staff || autoAssignStaff(staffs));
    if (shouldRequireResource()) {
      setCurrentStep('court_select');
      return;
    }
    setSelectedCourt(autoAssignResource(courts));
    setCurrentStep('date_time_select');
  };

  const handleSelectCourt = (court: Court | null) => {
    setSelectedCourt(
      court ||
      autoAssignResource(courts.filter((c) => c.serviceId === selectedService?.id || !c.serviceId))
    );
    setCurrentStep('date_time_select');
  };

  const handleSelectSlot = (date: string, time: string, hours: number = 1) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedBookingHours(hours);
    setCurrentStep('booking_summary');
  };

  const handleGoToPayment = (data: {
    selectedAddons: SelectedAddon[];
    customerName: string;
    customerPhone: string;
    notes: string;
    paymentMethod: PaymentMethod;
  }) => {
    setSelectedAddons(data.selectedAddons);
    setCustomerName(data.customerName);
    setCustomerPhone(data.customerPhone);
    setNotes(data.notes);
    setPaymentMethod(data.paymentMethod);
    setCurrentStep('promptpay_payment');
  };

  const handleBookingComplete = (booking: Booking) => {
    setConfirmedBooking(booking);
    setCurrentStep('booking_confirmation');
  };

  const handleTabChange = (tab: 'home' | 'my_bookings' | 'notifications' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'home') setCurrentStep('home');
    if (tab === 'my_bookings') setCurrentStep('my_bookings');
    if (tab === 'notifications') setCurrentStep('notifications');
    if (tab === 'profile') setCurrentStep('profile');
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 flex justify-center items-start font-prompt">
      
      {/* Responsive Mobile Web Container */}
      <div className="w-full max-w-md bg-slate-50 text-slate-900 min-h-screen flex flex-col relative shadow-xl overflow-hidden">

        {/* LIFF Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            {currentStep !== 'home' && currentStep !== 'my_bookings' && currentStep !== 'notifications' && currentStep !== 'profile' && (
              <button
                onClick={() => {
                  if (currentStep === 'service_detail') setCurrentStep('home');
                  else if (currentStep === 'staff_select') setCurrentStep('service_detail');
                  else if (currentStep === 'court_select') setCurrentStep(shouldRequireStaff() ? 'staff_select' : 'service_detail');
                  else if (currentStep === 'date_time_select') setCurrentStep(shouldRequireResource() ? 'court_select' : shouldRequireStaff() ? 'staff_select' : 'service_detail');
                  else if (currentStep === 'booking_summary') setCurrentStep('date_time_select');
                  else if (currentStep === 'promptpay_payment') setCurrentStep('booking_summary');
                  else setCurrentStep('home');
                }}
                className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="relative">
              <img
                src={activeTenant.logoUrl}
                alt={activeTenant.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/10 shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </div>
            <div>
              <h1 className="font-extrabold text-[15px] truncate max-w-[150px] tracking-tight">
                {activeTenant.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                  Official Account
                </p>
                {reviews.length > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <span>{averageRating}</span>
                      <span className="text-slate-400 font-normal">({reviews.length})</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-300">
            <button
              onClick={() => alert(`แชร์ลิงก์ LIFF App: https://liff.line.me/${activeTenant.liffId || '2001234567-AbCdEfGh'}`)}
              className="p-2 hover:bg-white/10 hover:text-white rounded-full transition-colors"
              title="แชร์ลิงก์"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStep('home')}
              className="p-2 hover:bg-white/10 hover:text-white rounded-full transition-colors"
              title="ปิด LIFF"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LIFF Main Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-24 scrollbar-none">
          {currentStep === 'home' && (
            <LiffHome liffProfile={liffProfile} onSelectService={handleSelectService} />
          )}

          {currentStep === 'service_detail' && selectedService && (
            <LiffServiceDetail
              service={selectedService}
              onStartBooking={handleStartBooking}
            />
          )}

          {currentStep === 'staff_select' && selectedService && (
            <LiffStaffSelect
              service={selectedService}
              selectedAddons={selectedAddons}
              onSelectStaff={handleSelectStaff}
            />
          )}

          {currentStep === 'court_select' && selectedService && (
            <LiffCourtSelect
              service={selectedService}
              selectedAddons={selectedAddons}
              onSelectCourt={handleSelectCourt}
            />
          )}

          {currentStep === 'date_time_select' && selectedService && (
            <LiffDateTimePicker
              service={selectedService}
              staff={selectedStaff}
              court={selectedCourt}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedAddons={selectedAddons}
              onSelectSlot={handleSelectSlot}
            />
          )}

          {currentStep === 'booking_summary' && selectedService && (
            <LiffBookingSummary
              service={selectedService}
              staff={selectedStaff}
              court={selectedCourt}
              date={selectedDate}
              time={selectedTime}
              bookingHours={selectedBookingHours}
              selectedAddons={selectedAddons}
              onGoToPayment={handleGoToPayment}
            />
          )}

          {currentStep === 'promptpay_payment' && selectedService && (
            <LiffPromptPayPayment
              service={selectedService}
              staff={selectedStaff}
              court={selectedCourt}
              date={selectedDate}
              time={selectedTime}
              bookingHours={selectedBookingHours}
              selectedAddons={selectedAddons}
              customerName={customerName}
              customerPhone={customerPhone}
              notes={notes}
              paymentMethod={paymentMethod}
              onBookingComplete={handleBookingComplete}
            />
          )}

          {currentStep === 'booking_confirmation' && confirmedBooking && (
            <LiffBookingConfirmation
              booking={confirmedBooking}
              onViewMyBookings={() => handleTabChange('my_bookings')}
              onGoHome={() => handleTabChange('home')}
            />
          )}

          {currentStep === 'my_bookings' && (
            <LiffMyBookings onNewBooking={() => handleTabChange('home')} lineUserId={liffProfile.lineUserId} />
          )}

          {currentStep === 'notifications' && <LiffNotifications />}

          {currentStep === 'profile' && <LiffProfile onNavigate={(step) => setCurrentStep(step)} />}

          {currentStep === 'rewards' && <LiffRewards onBack={() => setCurrentStep('profile')} />}
          
          {currentStep === 'point_history' && <LiffPointHistory onBack={() => setCurrentStep('profile')} />}
        </div>

        {/* Sticky Bottom Navigation Bar */}
        {!['promptpay_payment', 'booking_confirmation'].includes(currentStep) && (
          <div className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-1 flex items-center justify-around shadow-[0_-2px_15px_rgba(0,0,0,0.05)] pb-safe">
            <button
              onClick={() => handleTabChange('home')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'home'
                  ? 'text-emerald-600 bg-emerald-50 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[11px]">หน้าแรก</span>
            </button>

            <button
              onClick={() => handleTabChange('my_bookings')}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'my_bookings'
                  ? 'text-emerald-600 bg-emerald-50 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Calendar className={`w-5 h-5 ${activeTab === 'my_bookings' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[11px]">คิวของฉัน</span>
            </button>

            <button
              onClick={() => handleTabChange('notifications')}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 relative ${
                activeTab === 'notifications'
                  ? 'text-emerald-600 bg-emerald-50 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Bell className={`w-5 h-5 ${activeTab === 'notifications' ? 'text-emerald-600' : 'text-slate-400'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px]">แจ้งเตือน</span>
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'text-emerald-600 bg-emerald-50 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[11px]">ฉัน</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

