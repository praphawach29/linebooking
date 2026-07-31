import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { MessageSquare, Key, Link as LinkIcon, Check, Copy, Bell, Clock, Sparkles } from 'lucide-react';

export const MerchantLineOASettings: React.FC = () => {
  const { activeTenant, updateTenantSettings } = useSaaS();

  const [channelId, setChannelId] = useState(activeTenant.lineChannelId || '');
  const [channelSecret, setChannelSecret] = useState(activeTenant.lineChannelSecret || '');
  const [liffId, setLiffId] = useState(activeTenant.liffId || '');

  // Reminder Notification Settings
  const [lineReminderEnabled, setLineReminderEnabled] = useState<boolean>(
    activeTenant.settings.lineReminderEnabled ?? true
  );
  const [lineReminderHoursBefore, setLineReminderHoursBefore] = useState<number>(
    activeTenant.settings.lineReminderHoursBefore ?? 24
  );
  const [lineBookingConfirmationEnabled, setLineBookingConfirmationEnabled] = useState<boolean>(
    activeTenant.settings.lineBookingConfirmationEnabled ?? true
  );

  const [saved, setSaved] = useState(false);

  const webhookUrl = `https://api.booking-saas.app/v1/webhooks/line?tenant=${activeTenant.slug}`;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings(
      {
        lineReminderEnabled,
        lineReminderHoursBefore,
        lineBookingConfirmationEnabled,
      },
      {
        lineChannelId: channelId,
        lineChannelSecret: channelSecret,
        liffId,
      }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            ตั้งค่าการแจ้งเตือน LINE Official Account & LIFF
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการการเชื่อมต่อ Messaging API และการส่งข้อความแจ้งเตือนอัตโนมัติหาลูกค้า
          </p>
        </div>

        {saved && (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> บันทึกการตั้งค่าสำเร็จ
          </span>
        )}
      </div>

      {/* Automated LINE Notification Reminders Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ระบบส่งข้อความแจ้งเตือนอัตโนมัติ (Automated LINE Reminders)
              </h2>
              <p className="text-[11px] text-slate-500">
                กำหนดการส่งแจ้งเตือนเตือนความจำล่วงหน้า 24 ชั่วโมง เพื่อลดการขาดนัด (No-Show)
              </p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>

        <div className="space-y-3.5">
          {/* 24-Hour Reminder Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                ส่งข้อความเตือนความจำก่อนเวลานัดหมาย {lineReminderHoursBefore} ชั่วโมง
              </label>
              <p className="text-[11px] text-slate-500">
                ระบบจะส่ง Flex Message เตือนความจำอัตโนมัติไปยัง LINE ของลูกค้าก่อนถึงเวลาจอง
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={lineReminderEnabled}
                onChange={(e) => setLineReminderEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Reminder Hours Selector */}
          {lineReminderEnabled && (
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-emerald-900">ระยะเวลาเตือนล่วงหน้า:</span>
              <div className="flex items-center gap-2 font-bold">
                <button
                  type="button"
                  onClick={() => setLineReminderHoursBefore(12)}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    lineReminderHoursBefore === 12
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  12 ชั่วโมงก่อน
                </button>
                <button
                  type="button"
                  onClick={() => setLineReminderHoursBefore(24)}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    lineReminderHoursBefore === 24
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  24 ชั่วโมงก่อน (แนะนำ)
                </button>
                <button
                  type="button"
                  onClick={() => setLineReminderHoursBefore(48)}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    lineReminderHoursBefore === 48
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  48 ชั่วโมงก่อน
                </button>
              </div>
            </div>
          )}

          {/* Instant Confirmation Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-900">
                ส่งข้อความยืนยันการจองคิวทันทีหลังชำระมัดจำ (Instant Booking Confirmation)
              </label>
              <p className="text-[11px] text-slate-500">
                ส่งสลิปอิเล็กทรอนิกส์พร้อมปุ่มบันทึกลงปฏิทินใน LINE แชทของลูกค้า
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={lineBookingConfirmationEnabled}
                onChange={(e) => setLineBookingConfirmationEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Message Preview Banner */}
          <div className="bg-emerald-950 text-emerald-100 p-3.5 rounded-2xl font-mono text-[11px] space-y-1.5 border border-emerald-800">
            <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-emerald-800/80 pb-1">
              <span>💬 ตัวอย่างข้อความ LINE Reminder ({lineReminderHoursBefore} ชม. ก่อนนัด):</span>
              <span className="text-[9px] bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-300">
                Flex Message Card
              </span>
            </div>
            <p>🔔 [แจ้งเตือนคิวนัดหมายวันพรุ่งนี้]</p>
            <p>เรียนคุณลูกค้า, ร้าน {activeTenant.name} ขอแจ้งเตือนคิวนัดหมายบริการของคุณในวันพรุ่งนี้เวลา 10:00 น.</p>
            <p className="text-emerald-300">📍 Location: {activeTenant.address}</p>
            <p className="text-emerald-400">📱 เปิด LIFF เพื่อดูรายละเอียด หรือ QR Code เช็คอินหน้าร้าน</p>
          </div>
        </div>
      </div>

      {/* Webhook URL Copy Box */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl space-y-2">
        <label className="font-bold text-emerald-900 block">Webhook URL สำหรับนำไปใส่ใน LINE Developers Console</label>
        <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-300 font-mono text-xs">
          <span className="flex-1 truncate text-slate-800 font-bold">{webhookUrl}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              alert('คัดลอก Webhook URL เรียบร้อยแล้ว!');
            }}
            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>คัดลอก</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key className="w-4 h-4 text-emerald-600" />
          LINE Credentials Config
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">LINE Channel ID *</label>
            <input
              type="text"
              required
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="เช่น 2001234567"
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">LINE Channel Secret *</label>
            <input
              type="password"
              required
              value={channelSecret}
              onChange={(e) => setChannelSecret(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">LIFF App ID *</label>
            <input
              type="text"
              required
              value={liffId}
              onChange={(e) => setLiffId(e.target.value)}
              placeholder="เช่น 2001234567-AbCdEfGh"
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md transition-colors text-xs flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>บันทึกการตั้งค่า LINE OA & ข้อความแจ้งเตือน</span>
        </button>
      </form>

      {/* Rich Menu Builder Preview */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <LinkIcon className="w-4 h-4 text-emerald-600" />
          ตัวอย่างภาพ Rich Menu ใน LINE OA (LINE OA Rich Menu Canvas)
        </h2>
        
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-2xl text-white text-center font-bold">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 hover:border-emerald-400 transition-colors">
            <span className="text-xs text-emerald-400">ปุ่มที่ 1 (2500x1686)</span>
            <p className="text-sm font-extrabold">📅 จองคิวบริการ</p>
            <span className="text-[10px] text-slate-400 font-mono">Open LIFF App</span>
          </div>

          <div className="grid grid-rows-2 gap-2">
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-1 hover:border-emerald-400 transition-colors">
              <span className="text-xs font-bold">📋 เช็ครายการจอง</span>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-1 hover:border-emerald-400 transition-colors">
              <span className="text-xs font-bold">📞 ติดต่อหน้าร้าน</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
