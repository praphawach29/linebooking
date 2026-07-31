import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import {
  Send,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Clock,
  Phone,
  MapPin,
  Code,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  type?: 'text' | 'flex_confirmation' | 'flex_reminder' | 'flex_menu';
  time: string;
}

export const LineSimulator: React.FC = () => {
  const { activeTenant, bookings, currentUser, setViewMode } = useSaaS();
  const [inputText, setInputText] = useState('');
  const [showRichMenu, setShowRichMenu] = useState(true);
  const [showPayloadInspector, setShowPayloadInspector] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: `สวัสดีครับคุณ ${currentUser.displayName}! 👋 ยินดีต้อนรับสู่ LINE Official Account ของ ${activeTenant.name}\n\nพิมพ์ "จองคิว" หรือกดปุ่มเมนูด้านล่างเพื่อเริ่มสำรองเวลาใช้บริการครับ`,
      time: '09:00',
    },
  ]);

  const handleSendText = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Process Bot Keyword Triggers (Matching PDF Spec Section 4.3)
    setTimeout(() => {
      const lower = text.toLowerCase();
      let botResponse: ChatMessage;

      if (lower.includes('จอง') || lower.includes('booking')) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          type: 'flex_menu',
          text: `กรุณากดปุ่มด้านล่างเพื่อเปิดระบบจองคิวออนไลน์ (LIFF App) ของ ${activeTenant.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('เช็ค') || lower.includes('คิวของฉัน')) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          type: 'flex_confirmation',
          text: `รายการจองล่าสุดของคุณ ${currentUser.displayName}:`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('ติดต่อ') || lower.includes('โทร') || lower.includes('แผนที่')) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `📍 ${activeTenant.name}\n\nที่อยู่: ${activeTenant.address}\n📞 โทรศัพท์: ${activeTenant.phone}\n✉️ อีเมล: ${activeTenant.email}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `บอทรับข้อความแล้วครับ! คุณสามารถพิมพ์ "จองคิว" เพื่อเปิดระบบจองออนไลน์ หรือเลือกเมนูด้านล่างได้เลยครับ`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const latestBooking = bookings[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950 py-6 px-2 sm:px-4 flex flex-col lg:flex-row justify-center items-start gap-6 max-w-6xl mx-auto">
      
      {/* Smartphone LINE Chat Viewport Frame */}
      <div className="w-full max-w-[400px] bg-emerald-950 text-white rounded-[38px] shadow-2xl overflow-hidden border-[8px] border-slate-900 min-h-[820px] flex flex-col relative font-sans mx-auto">
        
        {/* LINE Chat Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img
              src={activeTenant.logoUrl}
              alt={activeTenant.name}
              className="w-9 h-9 rounded-full object-cover border border-emerald-500"
            />
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-xs truncate max-w-[160px] text-white">
                  {activeTenant.name}
                </h1>
                <span className="bg-emerald-500 text-white text-[9px] font-bold px-1 rounded">
                  ✓ Verified
                </span>
              </div>
              <p className="text-[10px] text-slate-400">LINE Official Account Bot</p>
            </div>
          </div>

          <button
            onClick={() => setShowPayloadInspector(!showPayloadInspector)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700"
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>Payload</span>
          </button>
        </div>

        {/* LINE Chat Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#8492a6]/20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-xs space-y-2 ${
                  m.sender === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-2xs'
                    : 'bg-white text-slate-900 rounded-bl-2xs'
                }`}
              >
                {m.text && <p className="whitespace-pre-line leading-relaxed">{m.text}</p>}

                {/* Render LINE Flex Message: LIFF Menu Trigger */}
                {m.type === 'flex_menu' && (
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-3 mt-1 border border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-bold text-xs">จองคิวออนไลน์ผ่าน LIFF App</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      สะดวกรวดเร็ว เลือกช่าง รอบเวลา และชำระเงินมัดจำผ่าน PromptPay ได้ทันที
                    </p>
                    <button
                      onClick={() => setViewMode('liff')}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>เปิด LIFF App จองคิว</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Render LINE Flex Message: Booking Card */}
                {m.type === 'flex_confirmation' && latestBooking && (
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2.5 mt-1 border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        #{latestBooking.refNo}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ยืนยันคิวแล้ว
                      </span>
                    </div>

                    <p className="font-bold text-xs text-white">{latestBooking.serviceName}</p>

                    <div className="space-y-1 text-[11px] text-slate-300">
                      <p>📅 วันที่: {latestBooking.bookingDate}</p>
                      <p>⏰ เวลา: {latestBooking.startTime} - {latestBooking.endTime} น.</p>
                      <p>👤 ช่าง: {latestBooking.staffName}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-400">ยอดเงินมัดจำ</span>
                      <span className="font-bold text-emerald-400">฿{(latestBooking?.depositAmount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <span className={`text-[9px] block text-right font-mono ${m.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {m.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive LINE Rich Menu (Bottom Grid) */}
        {showRichMenu && (
          <div className="bg-slate-900 border-t border-slate-800 p-2 space-y-1 z-30">
            <div className="text-center">
              <span className="text-[9px] text-slate-400 font-mono">
                ▼ LINE Rich Menu Interactive Hotzones
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-center text-xs font-bold">
              <button
                onClick={() => setViewMode('liff')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors shadow-xs"
              >
                <Calendar className="w-5 h-5" />
                <span>📅 จองคิวบริการ (LIFF)</span>
              </button>

              <div className="grid grid-rows-2 gap-1">
                <button
                  onClick={() => handleSendText('เช็คคิวการจองของฉัน')}
                  className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl flex items-center justify-center gap-1 border border-slate-700 text-[11px]"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>📋 เช็คคิวการจอง</span>
                </button>

                <button
                  onClick={() => handleSendText('ขอทราบที่อยู่และเบอร์ติดต่อ')}
                  className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl flex items-center justify-center gap-1 border border-slate-700 text-[11px]"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>📞 ติดต่อร้าน / โลเคชัน</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="bg-slate-900 p-3 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setShowRichMenu(!showRichMenu)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            title="สลับการแสดง Rich Menu"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="พิมพ์ข้อความ (เช่น 'จองคิว', 'เช็คคิว')..."
            className="flex-1 bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleSendText()}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Webhook JSON Payload Inspector Panel */}
      {showPayloadInspector && (
        <div className="flex-1 bg-slate-900 text-slate-200 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3 font-mono text-xs max-w-lg w-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-emerald-400 flex items-center gap-2">
              <Code className="w-4 h-4" />
              LINE Messaging API Webhook Event Payload
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
              X-Line-Signature Validated
            </span>
          </div>

          <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] overflow-x-auto text-emerald-300">
{JSON.stringify(
  {
    destination: activeTenant.lineChannelId,
    events: [
      {
        type: 'message',
        message: {
          id: '325708',
          type: 'text',
          text: inputText || 'จองคิว',
        },
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: currentUser.lineUserId,
        },
        replyToken: 'nH854129037119028',
        mode: 'active',
      },
    ],
  },
  null,
  2
)}
          </pre>
          <p className="text-[11px] text-slate-400">
            * ระบบจำลองการตรวจสอบ HMAC-SHA256 signature ลายเซ็นดิจิทัลตรงตามสเปก LINE Developers
          </p>
        </div>
      )}

    </div>
  );
};
