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
  Smartphone,
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
  | 'profile';

export const LiffLayout: React.FC = () => {
  const { activeTenant, notifications } = useSaaS();
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

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedAddons([]);
    setCurrentStep('staff_select');
  };

  const handleStartBooking = () => {
    setCurrentStep('staff_select');
  };

  const handleSelectStaff = (staff: Staff | null) => {
    setSelectedStaff(staff);
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950 py-6 px-2 sm:px-4 flex justify-center items-start">
      
      {/* Smartphone Viewport Simulation Frame */}
      <div className="w-full max-w-[420px] bg-white text-slate-900 rounded-[38px] shadow-2xl overflow-hidden border-[8px] border-slate-900 min-h-[820px] flex flex-col relative font-sans">
        
        {/* Phone Speaker Notch */}
        <div className="bg-slate-900 h-6 w-full flex justify-center items-center relative z-40">
          <div className="w-20 h-3.5 bg-slate-900 rounded-b-xl flex items-center justify-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></div>
            <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
          </div>
        </div>

        {/* LIFF Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
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
                className="p-1 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <img
              src={activeTenant.logoUrl}
              alt={activeTenant.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div>
              <h1 className="font-bold text-sm text-slate-900 truncate max-w-[170px]">
                {activeTenant.name}
              </h1>
              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LINE Official Account LIFF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <button
              onClick={() => alert(`แชร์ลิงก์ LIFF App: https://liff.line.me/${activeTenant.liffId || '2001234567-AbCdEfGh'}`)}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              title="แชร์ลิงก์"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStep('home')}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              title="ปิด LIFF"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LIFF Main Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-20 scrollbar-none">
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
            />
          )}

          {currentStep === 'my_bookings' && (
            <LiffMyBookings onNewBooking={() => handleTabChange('home')} />
          )}

          {currentStep === 'notifications' && <LiffNotifications />}

          {currentStep === 'profile' && <LiffProfile />}
        </div>

        {/* LIFF Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 flex justify-around items-center z-40 shadow-lg">
          <button
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>หน้าหลัก</span>
          </button>

          <button
            onClick={() => handleTabChange('my_bookings')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'my_bookings' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>การจองของฉัน</span>
          </button>

          <button
            onClick={() => handleTabChange('notifications')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors relative ${
              activeTab === 'notifications' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <span>แจ้งเตือน</span>
          </button>

          <button
            onClick={() => handleTabChange('profile')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'profile' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span>โปรไฟล์</span>
          </button>
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="bg-white h-4 w-full flex justify-center items-center pb-1">
          <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
        </div>

      </div>
    </div>
  );
};
