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
} from 'lucide-react';
import { LiffHome } from './LiffHome';
import { LiffServiceDetail } from './LiffServiceDetail';
import { LiffStaffSelect } from './LiffStaffSelect';
import { LiffDateTimePicker } from './LiffDateTimePicker';
import { LiffBookingSummary } from './LiffBookingSummary';
import { LiffPromptPayPayment } from './LiffPromptPayPayment';
import { LiffBookingConfirmation } from './LiffBookingConfirmation';
import { LiffMyBookings } from './LiffMyBookings';
import { LiffNotifications } from './LiffNotifications';
import { LiffProfile } from './LiffProfile';
import LiffRewards from './LiffRewards';
import LiffPointHistory from './LiffPointHistory';
import { autoAssignStaff, autoAssignResource } from './BookingStepEngine';
import { Service, Staff, Booking, SelectedAddon, PaymentMethod } from '../../types';

export type LiffStep =
  | 'home'
  | 'service_detail'
  | 'staff_select'
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
  const { activeTenant, services, staffs, courts, notifications, reviews } = useSaaS();
  const [currentStep, setCurrentStep] = useState<LiffStep>('home');
  const [activeTab, setActiveTab] = useState<'home' | 'my_bookings' | 'notifications' | 'profile'>('home');

  // Booking Flow State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : '0';

  if (!activeTenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white font-prompt">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading Shop Data...</p>
        </div>
      </div>
    );
  }

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedAddons([]);

    // Check merchant step configuration
    const flowConfig = activeTenant.settings?.bookingFlowConfig;
    const requireStaff = flowConfig?.steps?.requireStaff ?? activeTenant.settings?.enableStaffSelection ?? true;

    if (requireStaff) {
      setCurrentStep('staff_select');
    } else {
      // Auto assign staff if turned off
      const assigned = autoAssignStaff(staffs);
      setSelectedStaff(assigned);
      setCurrentStep('date_time_select');
    }
  };

  const handleStartBooking = () => {
    const flowConfig = activeTenant.settings?.bookingFlowConfig;
    const requireStaff = flowConfig?.steps?.requireStaff ?? activeTenant.settings?.enableStaffSelection ?? true;

    if (requireStaff) {
      setCurrentStep('staff_select');
    } else {
      const assigned = autoAssignStaff(staffs);
      setSelectedStaff(assigned);
      setCurrentStep('date_time_select');
    }
  };

  const handleSelectStaff = (staff: Staff | null) => {
    setSelectedStaff(staff || autoAssignStaff(staffs));
    setCurrentStep('date_time_select');
  };

  const handleSelectSlot = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
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
    <div className="min-h-[calc(100vh-5rem)] bg-transparent py-4 sm:py-8 px-2 sm:px-4 flex justify-center items-start">
      
      {/* Smartphone Viewport Simulation Frame */}
      <div className="w-full max-w-[400px] bg-slate-50 text-slate-900 rounded-[44px] shadow-2xl overflow-hidden border-[10px] border-slate-900 min-h-[820px] max-h-[850px] flex flex-col relative font-sans ring-4 ring-white/10 transform-gpu">
        
        {/* Phone Speaker Notch */}
        <div className="bg-slate-900 h-7 w-full flex justify-center items-center relative z-40">
          <div className="w-28 h-5 bg-slate-900 rounded-b-2xl flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-700 shadow-inner"></div>
            <div className="w-12 h-1.5 bg-slate-800 rounded-full"></div>
          </div>
        </div>

        {/* LIFF Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            {currentStep !== 'home' && currentStep !== 'my_bookings' && currentStep !== 'notifications' && currentStep !== 'profile' && (
              <button
                onClick={() => {
                  if (currentStep === 'service_detail') setCurrentStep('home');
                  else if (currentStep === 'staff_select') setCurrentStep('service_detail');
                  else if (currentStep === 'date_time_select') setCurrentStep('staff_select');
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
            <LiffHome onSelectService={handleSelectService} />
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

          {currentStep === 'date_time_select' && selectedService && (
            <LiffDateTimePicker
              service={selectedService}
              staff={selectedStaff}
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
              date={selectedDate}
              time={selectedTime}
              selectedAddons={selectedAddons}
              onGoToPayment={handleGoToPayment}
            />
          )}

          {currentStep === 'promptpay_payment' && selectedService && (
            <LiffPromptPayPayment
              service={selectedService}
              staff={selectedStaff}
              date={selectedDate}
              time={selectedTime}
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
            <LiffMyBookings onNewBooking={() => handleTabChange('home')} />
          )}

          {currentStep === 'notifications' && <LiffNotifications />}

          {currentStep === 'profile' && <LiffProfile onNavigate={(step) => setCurrentStep(step)} />}

          {currentStep === 'rewards' && <LiffRewards onBack={() => setCurrentStep('profile')} />}
          
          {currentStep === 'point_history' && <LiffPointHistory onBack={() => setCurrentStep('profile')} />}
        </div>

        {/* Floating Bottom Navigation Bar */}
        {!['promptpay_payment', 'booking_confirmation'].includes(currentStep) && (
          <div className="absolute bottom-6 left-5 right-5 glass-panel px-3 py-2.5 flex justify-around items-center z-40 !rounded-[24px]">
          <button
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-all duration-300 ${
              activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'fill-primary/20' : ''}`} />
            <span className={`text-[10px] ${activeTab === 'home' ? 'font-bold' : 'font-medium'}`}>หน้าแรก</span>
          </button>

          <button
            onClick={() => handleTabChange('my_bookings')}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-all duration-300 ${
              activeTab === 'my_bookings' ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'my_bookings' ? 'fill-primary/20' : ''}`} />
            <span className={`text-[10px] ${activeTab === 'my_bookings' ? 'font-bold' : 'font-medium'}`}>คิวของฉัน</span>
          </button>

          <button
            onClick={() => handleTabChange('notifications')}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-all duration-300 relative ${
              activeTab === 'notifications' ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Bell className={`w-5 h-5 ${activeTab === 'notifications' ? 'fill-primary/20' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[9px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${activeTab === 'notifications' ? 'font-bold' : 'font-medium'}`}>แจ้งเตือน</span>
          </button>

          <button
            onClick={() => handleTabChange('profile')}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-all duration-300 ${
              activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-primary/20' : ''}`} />
            <span className={`text-[10px] ${activeTab === 'profile' ? 'font-bold' : 'font-medium'}`}>ฉัน</span>
          </button>
          </div>
        )}

        {/* Bottom Home Indicator Bar */}
        <div className="bg-transparent absolute bottom-0 h-4 w-full flex justify-center items-center pb-1 z-50 pointer-events-none">
          <div className="w-32 h-1.5 bg-slate-900 rounded-full"></div>
        </div>

      </div>
    </div>
  );
};
