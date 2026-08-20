import React, { useCallback, useEffect, useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { getLineQuotaWithSession, type LineQuotaStatus } from '../../lib/line-notification-api';
import {
  MessageSquare,
  Key,
  Link as LinkIcon,
  Check,
  Copy,
  Bell,
  Clock,
  Sparkles,
  Send,
  Megaphone,
  Users,
  Smartphone,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const MerchantLineOASettings: React.FC = () => {
  const { activeTenant, updateTenantSettings } = useSaaS();

  const [channelId, setChannelId] = useState(activeTenant.lineChannelId || '');
  const [channelSecret, setChannelSecret] = useState(activeTenant.lineChannelSecret || '');
  const [channelAccessToken, setChannelAccessToken] = useState(activeTenant.lineChannelAccessToken || '');
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

  const [quota, setQuota] = useState<LineQuotaStatus | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const loadQuota = useCallback(async () => {
    setQuotaLoading(true);
    setQuotaError(null);
    try {
      setQuota(await getLineQuotaWithSession(activeTenant.id));
    } catch (error) {
      setQuotaError(error instanceof Error ? error.message : 'ไม่สามารถอ่านโควต้า LINE ได้');
    } finally {
      setQuotaLoading(false);
    }
  }, [activeTenant.id]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  const pushCount = quota?.usage ?? 0;
  const pushLimit = quota?.limit;
  const pushPercentage = Math.min(100, quota?.percentage ?? 0);
  const quotaCritical = quota?.warningLevel === 'critical' || quota?.warningLevel === 'exceeded';
  const quotaBarClass = quotaCritical
    ? 'bg-rose-500'
    : quota?.warningLevel === 'warning'
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  const quotaRemainingText = pushLimit === null || pushLimit === undefined
    ? 'แพ็กเกจไม่จำกัด'
    : (quota?.remaining ?? pushLimit).toLocaleString() + ' ข้อความคงเหลือ';

  // LINE Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'active' | 'vip'>('all');
  const [broadcastTitle, setBroadcastTitle] = useState('🔥 โปรโมชันพิเศษส่วนลด 20% ทุกบริการเมื่อจองผ่าน LINE!');
  const [broadcastMessage, setBroadcastMessage] = useState('เรียนคุณลูกค้า รับสิทธิ์ส่วนลดพิเศษทันทีเพียงกดจองคิวบริการผ่าน LINE OA วันนี้!');
  const [broadcastImage, setBroadcastImage] = useState('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<Array<{ id: string; title: string; sentAt: string; audience: string; count: number }>>([
    {
      id: 'bc-1',
      title: '🎉 แจ้งเตือนโปรโมชันส่วนลดประจำสัปดาห์',
      sentAt: '2026-08-01 10:30',
      audience: 'ลูกค้าทั้งหมด (All Customers)',
      count: 48,
    },
  ]);

  const [saved, setSaved] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testTokenResult, setTestTokenResult] = useState<{ success: boolean; botName?: string; error?: string } | null>(null);

  const handleTestToken = async () => {
    if (!channelAccessToken) return;
    setIsTestingToken(true);
    setTestTokenResult(null);
    try {
      const res = await fetch('/api/line-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: channelAccessToken.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.bot?.displayName) {
        setTestTokenResult({ success: true, botName: data.bot.displayName });
      } else {
        setTestTokenResult({
          success: false,
          error: data?.message || 'Token ไม่ถูกต้อง หรือเป็น Token ของ LINE Login Channel (ต้องใช้ Messaging API Token)',
        });
      }
    } catch (err: any) {
      setTestTokenResult({
        success: false,
        error: err?.message || 'ไม่สามารถเชื่อมต่อระบบทดสอบ LINE ได้',
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  const backendOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const webhookUrl = `${backendOrigin}/webhooks/line?tenant=${activeTenant.slug}`;

  const handleCopyWebhook = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

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
        lineChannelAccessToken: channelAccessToken,
        liffId,
      }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs relative">
      
      {/* Floating Top Notification Banner */}
      {saved && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 font-bold text-xs">
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-sm">บันทึกการตั้งค่าเรียบร้อยแล้ว!</p>
            <p className="text-[11px] text-emerald-100 font-medium">ข้อมูล LINE Channel ID, Secret, Access Token และ LIFF App ID ถูกบันทึกแล้ว</p>
          </div>
        </div>
      )}

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
          {/* Push Message Usage Limit */}
          <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-slate-800 text-xs">โควต้าส่งข้อความ (Push Message Limit)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">รีเซ็ตทุกสิ้นเดือน</span>
            </div>
            
            {quotaLoading && !quota ? (
              <div className="space-y-2 py-0.5">
                <div className="flex justify-between">
                  <span className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
                  <span className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 w-1/3 rounded-full bg-slate-200 animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-600">ใช้งานแล้ว {pushCount.toLocaleString()} ข้อความ</span>
                  <span className={quotaCritical ? 'text-rose-600 font-black' : 'text-emerald-600'}>
                    {quotaRemainingText} ({pushPercentage}%)
                  </span>
                </div>
                
                {/* Progress bar with threshold markers */}
                <div className="relative">
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={'h-2.5 rounded-full transition-all duration-500 ' + quotaBarClass}
                      style={{ width: `${pushPercentage}%` }}
                    ></div>
                  </div>
                  {/* Threshold Indicators */}
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5 mt-1">
                    <span>0%</span>
                    <span className={pushPercentage >= 70 ? 'text-amber-600 font-bold' : ''}>70%</span>
                    <span className={pushPercentage >= 85 ? 'text-orange-600 font-bold' : ''}>85%</span>
                    <span className={pushPercentage >= 95 ? 'text-rose-600 font-bold' : ''}>95%</span>
                    <span className={pushPercentage >= 100 ? 'text-red-700 font-black' : ''}>100%</span>
                  </div>
                </div>

                {/* Quota Alerts Banner */}
                {quota && quota.warningLevel !== 'normal' && (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    quota.warningLevel === 'exceeded'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : quota.warningLevel === 'critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    <Bell className="w-4 h-4 shrink-0" />
                    <div className="flex-1 text-[11px]">
                      <span>
                        {quota.warningLevel === 'exceeded' && '⚠️ โควต้าข้อความฟรีรายเดือนครบ 100% แล้ว'}
                        {quota.warningLevel === 'critical' && '⚠️ โควต้าข้อความใกล้หมด (95%+)'}
                        {quota.warningLevel === 'warning' && '⚡ โควต้าข้อความใช้งานถึง 85%'}
                        {quota.warningLevel === 'notice' && 'ℹ️ โควต้าข้อความใช้งานถึง 70%'}
                      </span>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        * ระบบแจ้งเตือนเพื่อบริหารโควต้า แต่จะไม่บล็อกการส่งข้อความแจ้งเตือนลูกค้า (Non-blocking)
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[10px] text-slate-500">
                    {quota?.source === 'line'
                      ? 'ข้อมูลโควต้าจริงจาก LINE Messaging API (Monthly Limit)'
                      : 'กำลังใช้ค่าประมาณ 300 ข้อความจนกว่าจะอ่านแพ็กเกจจริงจาก LINE ได้'}
                    {quotaError && ' (' + quotaError + ')'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadQuota()}
                    disabled={quotaLoading}
                    title="อัปเดตโควต้า"
                    className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 disabled:opacity-50"
                  >
                    {quotaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

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

      {/* Redesigned Premium Webhook URL Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-3xl border border-slate-700/60 shadow-lg relative overflow-hidden space-y-4">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-white">Webhook URL สำหรับ LINE Messaging API</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  ร้านค้า: {activeTenant.name} ({activeTenant.slug})
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                นำ URL นี้ไปใส่ใน LINE Developers Console &gt; Messaging API เพื่อเปิดระบบโต้ตอบอัตโนมัติ
              </p>
            </div>
          </div>

          <a
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors flex-shrink-0 self-start sm:self-auto"
          >
            <span>เปิด LINE Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        {/* Copy Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-700/80 font-mono text-xs shadow-inner">
            <span className="flex-1 truncate text-emerald-300 font-bold select-all">{webhookUrl}</span>
            <button
              type="button"
              onClick={handleCopyWebhook}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-md ${
                copySuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 scale-105'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95'
              }`}
            >
              {copySuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอก URL</span>
                </>
              )}
            </button>
          </div>

          {/* Toast Notification Banner (Replaces native browser alert) */}
          {copySuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-emerald-200 text-xs font-bold animate-in fade-in slide-in-from-top-1 duration-200">
              <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>✨ คัดลอก Webhook URL สำเร็จ! นำไปวางในช่อง Webhook URL ใน LINE Developers ได้ทันที</span>
            </div>
          )}
        </div>
      </div>

      {/* LINE Broadcast & Promotion Center Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ส่งบรอดแคสต์โปรโมชัน (LINE Official Broadcast & Push)
              </h2>
              <p className="text-[11px] text-slate-500">
                สร้างการ์ดข้อความ Flex Message โปรโมชันและบรอดแคสต์ตรงเข้า LINE ของลูกค้าใน 1 คลิก
              </p>
            </div>
          </div>

          {broadcastSuccessMsg && (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> ส่งบรอดแคสต์ให้ลูกค้าสำเร็จแล้ว!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Target Audience Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>เลือกกลุ่มเป้าหมาย (Audience Target)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastTarget('all')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    broadcastTarget === 'all'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold text-xs">ลูกค้าทั้งหมด</span>
                  <span className="text-[10px] text-slate-400 font-normal">ทุกบัญชีในระบบ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBroadcastTarget('active')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    broadcastTarget === 'active'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold text-xs">จองใน 30 วัน</span>
                  <span className="text-[10px] text-slate-400 font-normal">Active User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBroadcastTarget('vip')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    broadcastTarget === 'vip'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold text-xs">สมาชิก VIP</span>
                  <span className="text-[10px] text-slate-400 font-normal">สะสมแต้มสูง</span>
                </button>
              </div>
            </div>

            {/* Broadcast Title */}
            <div>
              <label className="font-bold text-slate-700 mb-1 block">หัวข้อข้อความโปรโมชัน *</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="เช่น ส่วนลดพิเศษ 20% เมื่อจองสัปดาห์นี้"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
              />
            </div>

            {/* Broadcast Message Body */}
            <div>
              <label className="font-bold text-slate-700 mb-1 block">รายละเอียดข้อความ *</label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
                placeholder="พิมพ์ข้อความที่ต้องการแจ้งลูกค้า..."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="font-bold text-slate-700 mb-1 block">URL รูปภาพการ์ดโปรโมชัน</label>
              <input
                type="url"
                value={broadcastImage}
                onChange={(e) => setBroadcastImage(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-xs"
              />
            </div>

            {/* Send Broadcast Action */}
            <button
              type="button"
              disabled={isSendingBroadcast || !broadcastTitle}
              onClick={() => {
                setIsSendingBroadcast(true);
                setTimeout(() => {
                  setIsSendingBroadcast(false);
                  setBroadcastSuccessMsg(true);
                  setBroadcastHistory((prev) => [
                    {
                      id: `bc-${Date.now()}`,
                      title: broadcastTitle,
                      sentAt: new Date().toLocaleString('th-TH'),
                      audience:
                        broadcastTarget === 'all'
                          ? 'ลูกค้าทั้งหมด (All Customers)'
                          : broadcastTarget === 'active'
                          ? 'ลูกค้าจองใน 30 วัน'
                          : 'สมาชิก VIP',
                      count: broadcastTarget === 'all' ? 48 : broadcastTarget === 'active' ? 22 : 8,
                    },
                    ...prev,
                  ]);
                  setTimeout(() => setBroadcastSuccessMsg(false), 3000);
                }, 1200);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSendingBroadcast ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังส่งข้อความบรอดแคสต์หาลูกค้า...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ส่งบรอดแคสต์หาลูกค้าทันที (Push Broadcast)</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Live Smartphone LINE Flex Message Simulator */}
          <div className="lg:col-span-5 bg-slate-100 p-4 rounded-3xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>ตัวอย่างหน้าจอบน LINE บนมือถือลูกค้า</span>
            </div>

            {/* Simulated Phone Screen Container */}
            <div className="bg-slate-900 rounded-[28px] p-3 w-full max-w-[260px] shadow-xl border-4 border-slate-800 space-y-2">
              {/* LINE Chat Header */}
              <div className="flex items-center gap-2 text-white pb-2 border-b border-slate-800">
                <img
                  src={activeTenant.logoUrl || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100'}
                  alt="Logo"
                  className="w-6 h-6 rounded-full object-cover border border-emerald-500"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate leading-tight">{activeTenant.name}</p>
                  <span className="text-[8px] text-emerald-400 font-mono">Official Account</span>
                </div>
              </div>

              {/* LINE Flex Message Card */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-md text-slate-900 space-y-2 pb-2">
                {broadcastImage && (
                  <img src={broadcastImage} alt="Promo Cover" className="w-full h-28 object-cover" />
                )}

                <div className="p-2.5 space-y-1">
                  <h4 className="font-black text-xs text-slate-900 leading-tight">
                    {broadcastTitle || 'หัวข้อโปรโมชัน'}
                  </h4>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-medium line-clamp-3">
                    {broadcastMessage || 'รายละเอียดข้อความที่จะแสดงบน LINE แชท'}
                  </p>
                </div>

                <div className="px-2.5 pt-1">
                  <div className="w-full bg-emerald-600 text-white font-extrabold text-[10px] py-1.5 rounded-xl text-center shadow-xs">
                    👉 จองคิวรับสิทธิ์ใน LIFF
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Broadcast History Table */}
        {broadcastHistory.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h3 className="font-bold text-xs text-slate-700">ประวัติการส่งบรอดแคสต์ล่าสุด (Broadcast Logs)</h3>
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden text-[11px]">
              {broadcastHistory.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-[10px] text-slate-400">กลุ่ม: {item.audience} • ส่งเมื่อ {item.sentAt}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                    ส่งแล้ว {item.count} บัญชี
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">LINE Channel Access Token (Long-lived) *</label>
              <button
                type="button"
                onClick={handleTestToken}
                disabled={isTestingToken || !channelAccessToken}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isTestingToken ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังทดสอบ...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ทดสอบเชื่อมต่อ LINE Token</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={channelAccessToken}
              onChange={(e) => {
                setChannelAccessToken(e.target.value);
                setTestTokenResult(null);
              }}
              placeholder="eyJhbGciOiJIUzI1NiJ9..."
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-xs"
            />
            {testTokenResult && (
              <div
                className={`mt-2 p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
                  testTokenResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {testTokenResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✅ เชื่อมต่อสำเร็จ! บัญชี LINE Official Account: <strong>{testTokenResult.botName}</strong> พร้อมส่ง Flex Message แล้ว</span>
                  </>
                ) : (
                  <>
                    <span className="text-rose-600 font-bold shrink-0">✕</span>
                    <span>❌ {testTokenResult.error}</span>
                  </>
                )}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              * ต้องเป็น Token จากแท็บ <strong>Messaging API</strong> (ไม่ใช่ LINE Login) เพื่อให้ระบบส่ง Flex Message หาผู้ใช้ได้
            </p>
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

        {saved && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-950 font-bold text-xs animate-in fade-in duration-200 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-900">บันทึกการตั้งค่า LINE OA สำเร็จแล้ว!</p>
              <p className="text-[11px] text-emerald-700 font-normal">ระบบพร้อมใช้งานสำหรับการแจ้งเตือนและการเปิดจองคิวผ่าน LIFF</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={`w-full font-bold py-3.5 px-4 rounded-2xl transition-all text-xs flex items-center justify-center gap-2 ${
            saved
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-[1.01]'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.99]'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{saved ? '✨ บันทึกการตั้งค่าเรียบร้อยแล้ว!' : 'บันทึกการตั้งค่า LINE OA & ข้อความแจ้งเตือน'}</span>
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
