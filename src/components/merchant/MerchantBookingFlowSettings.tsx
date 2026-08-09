import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { 
  Zap, 
  Scissors, 
  Trophy, 
  Sliders, 
  Check, 
  Smartphone, 
  CreditCard, 
  UserCheck, 
  Calendar, 
  FileText, 
  Sparkles,
  Info,
  Save
} from 'lucide-react';
import { BookingPresetTemplate, PaymentMode, BookingFlowConfig } from '../../types';
import { getTenantTerminology } from '../../lib/tenant-terminology';

export const MerchantBookingFlowSettings: React.FC = () => {
  const { activeTenant, updateTenantSettings } = useSaaS();
  const terminology = getTenantTerminology(activeTenant);

  // Load existing booking_flow_config or initialize defaults
  const initialFlowConfig: BookingFlowConfig = activeTenant.settings.bookingFlowConfig || {
    presetTemplate: 'SERVICE_AND_STAFF',
    paymentMode: 'DEPOSIT_ONLY',
    depositAmount: activeTenant.settings.depositPercentage || 20,
    steps: {
      requireService: true,
      requireStaff: activeTenant.settings.enableStaffSelection ?? true,
      requireResource: activeTenant.settings.enableCourtSelection ?? false,
      requireNotes: false
    },
    autoAssignStaff: true,
    autoAssignResource: true,
    slotIntervalMinutes: 30
  };

  const [flowConfig, setFlowConfig] = useState<BookingFlowConfig>(initialFlowConfig);
  const [savedMsg, setSavedMsg] = useState(false);

  // Apply Preset Templates
  const handleApplyPreset = (preset: BookingPresetTemplate) => {
    let newConfig: BookingFlowConfig = { ...flowConfig, presetTemplate: preset };

    switch (preset) {
      case 'EXPRESS_QUEUE':
        newConfig = {
          ...newConfig,
          paymentMode: 'NO_PAYMENT',
          steps: {
            requireService: false,
            requireStaff: false,
            requireResource: false,
            requireNotes: false
          },
          autoAssignStaff: true,
          autoAssignResource: true
        };
        break;

      case 'SERVICE_AND_STAFF':
        newConfig = {
          ...newConfig,
          paymentMode: 'DEPOSIT_ONLY',
          steps: {
            requireService: true,
            requireStaff: true,
            requireResource: false,
            requireNotes: false
          },
          autoAssignStaff: true,
          autoAssignResource: true
        };
        break;

      case 'RESOURCE_AND_SLOT':
        newConfig = {
          ...newConfig,
          paymentMode: 'DEPOSIT_ONLY',
          steps: {
            requireService: false,
            requireStaff: false,
            requireResource: true,
            requireNotes: false
          },
          autoAssignStaff: true,
          autoAssignResource: true
        };
        break;

      case 'CUSTOM':
        // Keeps current toggles
        break;
    }

    setFlowConfig(newConfig);
  };

  const handleStepToggle = (stepKey: keyof BookingFlowConfig['steps']) => {
    setFlowConfig(prev => ({
      ...prev,
      presetTemplate: 'CUSTOM',
      steps: {
        ...prev.steps,
        [stepKey]: !prev.steps[stepKey]
      }
    }));
  };

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setFlowConfig(prev => ({
      ...prev,
      paymentMode: mode
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      bookingFlowConfig: flowConfig,
      enableStaffSelection: flowConfig.steps.requireStaff,
      enableCourtSelection: flowConfig.steps.requireResource,
      depositPercentage: flowConfig.paymentMode === 'DEPOSIT_ONLY' ? (flowConfig.depositAmount || 20) : 0
    });

    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  // Compute Active Steps for Live Preview
  const activeStepsPreview = [];
  if (flowConfig.steps.requireService) activeStepsPreview.push({ name: `เลือก${terminology.serviceLabel}`, icon: Scissors });
  if (flowConfig.steps.requireStaff) activeStepsPreview.push({ name: 'เลือกช่าง/พนักงาน', icon: UserCheck });
  if (flowConfig.steps.requireResource) activeStepsPreview.push({ name: `เลือก${terminology.resourceName}`, icon: Trophy });
  activeStepsPreview.push({ name: 'เลือกวัน & เวลา', icon: Calendar });
  if (flowConfig.paymentMode !== 'NO_PAYMENT') activeStepsPreview.push({ name: 'ชำระเงิน/มัดจำ', icon: CreditCard });
  activeStepsPreview.push({ name: 'ยืนยันการจอง', icon: Sparkles });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">ตั้งค่าสเต็ปขั้นตอนการจอง (Modular Booking Flow)</h2>
        <p className="text-slate-500 mt-1">เลือกรูปแบบธุรกิจ หรือปรับแต่งเปิด-ปิดขั้นตอนการจองคิวตามที่ร้านต้องการ</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Preset Selector */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">1. เลือกรูปแบบเริ่มต้น (Presets Template)</h3>
              <p className="text-sm text-slate-500">เลือกเทมเพลตที่ตรงกับธุรกิจเพื่อตั้งค่าด่วนใน 1 คลิก</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Express Queue Preset */}
            <button
              type="button"
              onClick={() => handleApplyPreset('EXPRESS_QUEUE')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                flowConfig.presetTemplate === 'EXPRESS_QUEUE'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {flowConfig.presetTemplate === 'EXPRESS_QUEUE' && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">⚡ จองด่วน (Express)</h4>
              <p className="text-xs text-slate-500 mt-1">2 คลิกจบ แค่เลือกวันเวลาแล้วกรอกชื่อ ไม่ต้องเลือกช่าง/บริการ</p>
            </button>

            {/* Service & Staff Preset */}
            <button
              type="button"
              onClick={() => handleApplyPreset('SERVICE_AND_STAFF')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                flowConfig.presetTemplate === 'SERVICE_AND_STAFF'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {flowConfig.presetTemplate === 'SERVICE_AND_STAFF' && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Scissors className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">💈 ร้านเสริมสวย / สปา</h4>
              <p className="text-xs text-slate-500 mt-1">เลือกบริการ ➔ เลือกช่าง ➔ เลือกเวลา ➔ โอนเงินมัดจำ</p>
            </button>

            {/* Resource & Slot Preset */}
            <button
              type="button"
              onClick={() => handleApplyPreset('RESOURCE_AND_SLOT')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                flowConfig.presetTemplate === 'RESOURCE_AND_SLOT'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {flowConfig.presetTemplate === 'RESOURCE_AND_SLOT' && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">⚽ สนามกีฬา / คอร์ท</h4>
              <p className="text-xs text-slate-500 mt-1">เลือกสนาม ➔ เลือกช่วงเวลา (18:00-19:00) ➔ มัดจำ</p>
            </button>

            {/* Custom Mode */}
            <button
              type="button"
              onClick={() => handleApplyPreset('CUSTOM')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                flowConfig.presetTemplate === 'CUSTOM'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {flowConfig.presetTemplate === 'CUSTOM' && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
                <Sliders className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">⚙️ กำหนดเอง (Custom)</h4>
              <p className="text-xs text-slate-500 mt-1">เปิด-ปิดสวิตช์ขั้นตอนการจองอิสระตามที่คุณต้องการ</p>
            </button>

          </div>
        </div>

        {/* Step Toggles + Live Preview Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Step Toggles (Left Column 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step Toggles Card */}
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 mb-2">2. เปิด/ปิด ขั้นตอนการจอง (Step Switches)</h3>
              
              {/* Toggle Require Service */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">หน้าเลือก{terminology.serviceLabel} (Services)</h4>
                    <p className="text-xs text-slate-500">ให้ลูกค้าเลือกแพ็กเกจหรือประเภท{terminology.serviceLabel}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={flowConfig.steps.requireService}
                    onChange={() => handleStepToggle('requireService')}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Require Staff */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">หน้าเลือกช่าง/พนักงาน (Staff)</h4>
                    <p className="text-xs text-slate-500">
                      {flowConfig.steps.requireStaff ? 'ลูกค้าเลือกช่างได้เอง' : 'ปิดอยู่ ➔ ระบบจะสุ่มช่างที่ว่างให้อัตโนมัติ (Auto-assign)'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={flowConfig.steps.requireStaff}
                    onChange={() => handleStepToggle('requireStaff')}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Require Resource/Court */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">หน้าเลือก{terminology.resourceName} (Resource)</h4>
                    <p className="text-xs text-slate-500">
                      {flowConfig.steps.requireResource ? `ลูกค้าเลือก${terminology.resourceName}เอง` : `ปิดอยู่ ➔ ระบบจะจัด${terminology.resourceName}ว่างให้อัตโนมัติ`}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={flowConfig.steps.requireResource}
                    onChange={() => handleStepToggle('requireResource')}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Require Customer Notes */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">ช่องกรอกหมายเหตุเพิ่มเติม</h4>
                    <p className="text-xs text-slate-500">ให้ลูกค้าพิมพ์ข้อความหรือคำขอพิเศษเพิ่มเติม</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={flowConfig.steps.requireNotes}
                    onChange={() => handleStepToggle('requireNotes')}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

            </div>

            {/* Payment Mode Card */}
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 mb-2">3. รูปแบบการชำระเงิน/มัดจำ (Payment & Deposit)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handlePaymentModeChange('NO_PAYMENT')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    flowConfig.paymentMode === 'NO_PAYMENT'
                      ? 'border-primary bg-primary/5 font-bold text-primary ring-2 ring-primary/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold">🟢 ไม่ต้องจ่ายก่อน</div>
                  <div className="text-xs text-slate-500 font-normal mt-1">จองคิวได้ทันที จ่ายเงินหน้าร้าน</div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentModeChange('DEPOSIT_ONLY')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    flowConfig.paymentMode === 'DEPOSIT_ONLY'
                      ? 'border-primary bg-primary/5 font-bold text-primary ring-2 ring-primary/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold">🟡 วางเงินมัดจำบางส่วน</div>
                  <div className="text-xs text-slate-500 font-normal mt-1">โอนเงินมัดจำล่วงหน้าเพื่อล็อคคิว</div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentModeChange('FULL_PAYMENT')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    flowConfig.paymentMode === 'FULL_PAYMENT'
                      ? 'border-primary bg-primary/5 font-bold text-primary ring-2 ring-primary/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold">🔵 ชำระเงินเต็มจำนวน</div>
                  <div className="text-xs text-slate-500 font-normal mt-1">จ่ายยอดรวมเต็มจำนวนก่อนยืนยัน</div>
                </button>
              </div>

              {flowConfig.paymentMode === 'DEPOSIT_ONLY' && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-purple-900">จำนวนเงินมัดจำ (% ของราคาบริการ)</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      className="w-20 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-center font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      value={flowConfig.depositAmount === 0 || flowConfig.depositAmount === undefined ? '' : flowConfig.depositAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFlowConfig(prev => ({
                          ...prev,
                          depositAmount: val === '' ? 0 : Math.min(100, Math.max(0, Number(val)))
                        }));
                      }}
                      onBlur={() => {
                        if (!flowConfig.depositAmount || flowConfig.depositAmount < 1) {
                          setFlowConfig(prev => ({ ...prev, depositAmount: 20 }));
                        }
                      }}
                    />
                    <span className="font-bold text-purple-900">%</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Live Mobile Preview (Right Column 5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 premium-card p-6 bg-slate-900 text-white overflow-hidden relative">
              <div className="flex items-center gap-2 mb-4 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                Live Preview (ตัวอย่างสเต็ปบน LINE OA)
              </div>

              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-xs text-slate-400 font-bold">จำนวนสเต็ปทั้งหมด</span>
                  <span className="text-sm font-black text-emerald-400">{activeStepsPreview.length} สเต็ป</span>
                </div>

                <div className="space-y-2">
                  {activeStepsPreview.map((step, idx) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-700/50">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <IconComponent className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">{step.name}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 text-xs text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    {!flowConfig.steps.requireStaff && !flowConfig.steps.requireResource
                      ? '✨ โหมดจองด่วน: ระบบจะสุ่มจัดช่าง/สนามที่ว่างให้อัตโนมัติเมื่อลูกค้าจองสำเร็จ'
                      : 'ลูกค้าจะได้ทำรายการตามขั้นตอนข้างบนบนแอป LINE OA'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Submit Bar */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-lg shadow-slate-900/20"
          >
            <Save className="w-5 h-5" />
            บันทึกการตั้งค่าสเต็ป
          </button>
          
          {savedMsg && (
            <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5 animate-fade-in">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              บันทึกการตั้งค่าสเต็ปเรียบร้อยแล้ว
            </span>
          )}
        </div>

      </form>
    </div>
  );
};
