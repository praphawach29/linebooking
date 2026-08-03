import React, { useState } from 'react';
import { useScrollReveal } from './useScrollReveal';
import {
  Sparkles,
  LayoutDashboard,
  Sliders,
  CheckCircle2,
  Clock,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  FileCheck,
  DollarSign,
  ChevronRight,
  Store,
} from 'lucide-react';

export const MerchantDemoSection: React.FC = () => {
  const ref = useScrollReveal();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'slips' | 'walkin'>('overview');

  // Modular flow toggles state
  const [flowPreset, setFlowPreset] = useState<'spa' | 'barber' | 'sports'>('spa');
  const [requireStaff, setRequireStaff] = useState(true);
  const [depositMode, setDepositMode] = useState(true);
  const [lineNotify, setLineNotify] = useState(true);

  // Slip approval state
  const [slipApproved, setSlipApproved] = useState(false);

  return (
    <section id="merchant-demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative border-t border-white/5">
      <div ref={ref} className="max-w-7xl mx-auto opacity-0 transition-all duration-700">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ระบบสำหรับเจ้าของร้าน (Merchant Portal Experience)
          </div>
          <h2 className="text-2.5xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            จัดการคิวหน้าร้านง่ายๆ ผ่าน <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Merchant Dashboard</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            ควบคุมทุกอย่างได้ในที่เดียว ทั้งตารางคิวนัดหมาย ตรวจสลิปอัตโนมัติ และสลับสเต็ปการจองตามสไตล์ร้านคุณ
          </p>
        </div>

        {/* Dashboard Simulator Mockup Window */}
        <div className="rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Dashboard Window Header Bar */}
          <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs font-extrabold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-cyan-400" />
                Bliss Aura Spa — ระบบจัดการร้านค้า (Merchant Portal)
              </span>
            </div>

            {/* Dashboard Sub-Module Tabs */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                ภาพรวมคิววันนี้
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                ตั้งค่าสเต็ปการจอง
              </button>

              <button
                onClick={() => setActiveTab('slips')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'slips'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                ตรวจสลิปโอนเงิน <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">2</span>
              </button>

              <button
                onClick={() => setActiveTab('walkin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'walkin'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                เพิ่มคิว Walk-in
              </button>
            </div>
          </div>

          {/* Dashboard Window Main Content */}
          <div className="p-4 sm:p-8 min-h-[460px] bg-slate-900/60 font-prompt">
            {/* MODULE 1: Overview & Queue Table */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">คิวทั้งหมดวันนี้</p>
                      <h4 className="text-2xl font-extrabold text-white mt-1">12 คิว</h4>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                        <TrendingUp className="w-3 h-3" /> +20% จากเมื่อวาน
                      </span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">ยอดมัดจำรวม</p>
                      <h4 className="text-2xl font-extrabold text-emerald-400 mt-1">฿3,600</h4>
                      <span className="text-[10px] text-slate-400 mt-1">ผ่าน PromptPay QR</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">คิวรอยืนยันสลิป</p>
                      <h4 className="text-2xl font-extrabold text-amber-400 mt-1">2 คิว</h4>
                      <span className="text-[10px] text-amber-300 mt-1">ต้องการการตรวจสอบ</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <FileCheck className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">คะแนนความพึงพอใจ</p>
                      <h4 className="text-2xl font-extrabold text-white mt-1">4.9 / 5.0</h4>
                      <span className="text-[10px] text-emerald-400 font-bold mt-1">ลูกค้าประทับใจ 98%</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Queue Table */}
                <div className="rounded-2xl border border-white/10 bg-slate-950 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">ตารางคิวนัดหมายประจำวัน (Live Bookings)</h4>
                    <span className="text-xs text-cyan-400 font-medium cursor-pointer hover:underline">ดูทั้งหมด →</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/5 text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-5 py-3">รหัสคิว</th>
                          <th className="px-5 py-3">ชื่อลูกค้า</th>
                          <th className="px-5 py-3">บริการ</th>
                          <th className="px-5 py-3">เวลา</th>
                          <th className="px-5 py-3">ผู้ให้บริการ</th>
                          <th className="px-5 py-3">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 font-mono font-bold text-cyan-400">BK-8819</td>
                          <td className="px-5 py-3 font-medium text-white">คุณณัฐนันท์</td>
                          <td className="px-5 py-3">นวดอโรม่าผ่อนคลาย (90 นาที)</td>
                          <td className="px-5 py-3 text-emerald-400 font-bold">15:30 น.</td>
                          <td className="px-5 py-3">คุณมุก</td>
                          <td className="px-5 py-3">
                            <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-500/30">
                              ✓ ยืนยันแล้ว
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 font-mono font-bold text-cyan-400">BK-8820</td>
                          <td className="px-5 py-3 font-medium text-white">คุณกิตติศักดิ์</td>
                          <td className="px-5 py-3">ตัดผมชายเซ็ตทรง (45 นาที)</td>
                          <td className="px-5 py-3 text-white font-bold">16:15 น.</td>
                          <td className="px-5 py-3">⚡ สุ่มช่างอัตโนมัติ</td>
                          <td className="px-5 py-3">
                            <span className="bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-500/30">
                              ⏳ รอตรวจสอบสลิป
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 font-mono font-bold text-cyan-400">BK-8821</td>
                          <td className="px-5 py-3 font-medium text-white">คุณภัทรพล</td>
                          <td className="px-5 py-3">สนามแบด A1 (2 ชม.)</td>
                          <td className="px-5 py-3 text-white font-bold">19:00 น.</td>
                          <td className="px-5 py-3">Court A1</td>
                          <td className="px-5 py-3">
                            <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-500/30">
                              ✓ ยืนยันแล้ว
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 2: Modular Flow Settings Simulator */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold text-white mb-1">ตั้งค่าขั้นตอนการจองคิว (Modular Flow Settings)</h4>
                  <p className="text-xs text-slate-400">สลับ Preset ปรับแต่งสเต็ปการจองของร้านคุณได้อิสระทันที</p>
                </div>

                {/* Preset Switcher */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setFlowPreset('spa');
                      setRequireStaff(true);
                      setDepositMode(true);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                      flowPreset === 'spa'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🌸 สปา / นวดไทย <br />
                    <span className="text-[10px] text-slate-400 font-normal">คอร์ส + ช่าง + มัดจำ</span>
                  </button>

                  <button
                    onClick={() => {
                      setFlowPreset('barber');
                      setRequireStaff(false);
                      setDepositMode(false);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                      flowPreset === 'barber'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    💈 ร้านตัดผม Express <br />
                    <span className="text-[10px] text-slate-400 font-normal">ข้ามช่าง + ไม่มัดจำ</span>
                  </button>

                  <button
                    onClick={() => {
                      setFlowPreset('sports');
                      setRequireStaff(true);
                      setDepositMode(true);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                      flowPreset === 'sports'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🏸 สนามกีฬา <br />
                    <span className="text-[10px] text-slate-400 font-normal">เลือกรหัสสนาม + จ่ายเต็ม</span>
                  </button>
                </div>

                {/* Toggles Panel */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">1. สเต็ปเลือกช่าง / พนักงาน (Staff Selection Step)</h5>
                      <p className="text-[11px] text-slate-400">เมื่อปิด ระบบจะสุ่มช่างประจำกะให้อัตโนมัติ (Fast Queue)</p>
                    </div>
                    <button
                      onClick={() => setRequireStaff(!requireStaff)}
                      className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                        requireStaff ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                          requireStaff ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">2. โหมดเงินมัดจำ (Deposit Requirement)</h5>
                      <p className="text-[11px] text-slate-400">กำหนดเงินมัดจำคงที่หรือ % มัดจำเพื่อล็อคคิวการจอง</p>
                    </div>
                    <button
                      onClick={() => setDepositMode(!depositMode)}
                      className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                        depositMode ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                          depositMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">3. ส่งข้อความแจ้งเตือนอัตโนมัติเข้า LINE OA</h5>
                      <p className="text-[11px] text-slate-400">ส่งการ์ดแจ้งเตือนคิวนัดล่วงหน้าให้ลูกค้าและทีมช่าง</p>
                    </div>
                    <button
                      onClick={() => setLineNotify(!lineNotify)}
                      className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                        lineNotify ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                          lineNotify ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 3: PromptPay Slip Verification Simulator */}
            {activeTab === 'slips' && (
              <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-300">
                <div className="text-center mb-2">
                  <h4 className="text-lg font-bold text-white mb-1">ระบบตรวจสลิปโอนเงิน (Slip Verification)</h4>
                  <p className="text-xs text-slate-400">ตรวจสอบยอดโอนมัดจำผ่าน PromptPay QR อัตโนมัติ อนุมัติได้ใน 1 คลิก</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-xs font-extrabold text-cyan-400 font-mono">BK-8820</span>
                      <h5 className="text-sm font-bold text-white">คุณกิตติศักดิ์ — นวดไทย (120 นาที)</h5>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                      ยอดมัดจำ: ฿360.00
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    {/* Simulated Bank Slip Image */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                      <div className="w-full h-36 bg-gradient-to-br from-emerald-950 to-slate-900 rounded-lg border border-emerald-500/30 p-3 flex flex-col justify-between text-left text-[11px]">
                        <div className="flex justify-between items-center text-emerald-400 font-bold">
                          <span>สลิปโอนเงินสำเร็จ</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-slate-400">ผู้โอน: นายกิตติศักดิ์</p>
                          <p className="text-white font-bold text-sm">จำนวน ฿360.00 บาท</p>
                          <p className="text-[10px] text-slate-400">27 มี.ค. 2026 - 14:22 น.</p>
                        </div>
                      </div>
                    </div>

                    {/* Verification Action */}
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-xs text-emerald-300">
                        <ShieldCheck className="w-4 h-4 inline mr-1 text-emerald-400" />
                        ระบบตรวจสอบ QR Code ตรงกับยอดมัดจำถูกต้อง 100%
                      </div>

                      {slipApproved ? (
                        <div className="p-3 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl text-center shadow-lg">
                          ✓ อนุมัติคิวนัดหมายแล้ว! ส่ง LINE แจ้งเตือนลูกค้าเรียบร้อย
                        </div>
                      ) : (
                        <button
                          onClick={() => setSlipApproved(true)}
                          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all hover:scale-105"
                        >
                          ⚡ กดอนุมัติคิว & ส่ง LINE แจ้งเตือน
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 4: Walk-in Quick Add Simulator */}
            {activeTab === 'walkin' && (
              <div className="max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
                <div className="text-center mb-2">
                  <h4 className="text-lg font-bold text-white mb-1">เพิ่มคิว Walk-in ด่วนหน้าร้าน (Walk-in Quick Add)</h4>
                  <p className="text-xs text-slate-400">สำหรับพนักงานต้อนรับหน้าร้าน เพิ่มคิวนัดให้ลูกค้าที่ไม่ได้จองผ่าน LINE</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">ชื่อลูกค้า Walk-in</label>
                    <input
                      type="text"
                      defaultValue="คุณสมชาย (ลูกค้า Walk-in)"
                      className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">เลือกบริการ</label>
                      <select className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none">
                        <option>นวดอโรม่าผ่อนคลาย (90 นาที)</option>
                        <option>นวดไทยแบบราชสำนัก (120 นาที)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">เลือกช่างประจำกะ</label>
                      <select className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none">
                        <option>คุณมุก (ว่าง)</option>
                        <option>คุณเมย์ (ว่าง)</option>
                      </select>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all hover:scale-[1.02] mt-2">
                    + บันทึกคิว Walk-in หน้าร้าน
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
