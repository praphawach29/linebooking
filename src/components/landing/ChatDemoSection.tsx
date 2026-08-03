import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useScrollReveal } from './useScrollReveal';
import { scenarios, ChatMessage } from './chat-demo/scenarios';
import { Check, Sparkles } from 'lucide-react';

function TypingIndicator() {
  return (
    <div className="bg-white self-start rounded-2xl rounded-bl-xs px-4 py-3 flex gap-1.5 items-center shadow-md animate-pulse">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

type DisplayItem =
  | { kind: 'msg'; index: number; msg: ChatMessage }
  | { kind: 'typing'; id: number }
  | { kind: 'options'; index: number; options: string[]; selected?: string };

type TimelineEntry = {
  item: DisplayItem;
  showAt: number;
  hideAt?: number;
};

function buildTimeline(messages: ChatMessage[]): { entries: TimelineEntry[]; total: number } {
  const entries: TimelineEntry[] = [];
  let t = 300;
  let typingId = 0;

  messages.forEach((m, i) => {
    if (m.type === 'bot') {
      entries.push({ item: { kind: 'typing', id: typingId++ }, showAt: t, hideAt: t + 1000 });
      t += 1000;
      entries.push({ item: { kind: 'msg', index: i, msg: m }, showAt: t });
      t += 350;
      if (m.options && m.options.length > 0) {
        const nextUser = messages.slice(i + 1).find((x) => x.type === 'user');
        const selected = m.options.find((opt) => nextUser?.text.includes(opt));
        entries.push({
          item: { kind: 'options', index: i, options: m.options, selected },
          showAt: t,
        });
        t += 800;
      }
    } else {
      entries.push({ item: { kind: 'msg', index: i, msg: m }, showAt: t });
      t += 500;
    }
  });

  return { entries, total: t + 500 };
}

function OptionChips({
  options,
  selected,
}: {
  key?: React.Key;
  options: string[];
  selected?: string;
}) {
  return (
    <div className="self-start flex flex-wrap gap-2 max-w-[90%] mt-1">
      {options.map((opt, i) => {
        const isSelected = selected === opt;
        return (
          <button
            key={i}
            type="button"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 shadow-sm ${
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/40 scale-105'
                : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export const ChatDemoSection: React.FC = () => {
  const ref = useScrollReveal();
  const [active, setActive] = useState(0);
  const current = scenarios[active];
  const [elapsed, setElapsed] = useState(0);
  const [runKey, setRunKey] = useState(0);

  const { entries, total } = useMemo(() => buildTimeline(current.messages), [current.messages]);

  const resetAnimation = useCallback(() => {
    setElapsed(0);
    setRunKey((k) => k + 1);
  }, []);

  useEffect(() => {
    resetAnimation();
  }, [active, resetAnimation]);

  useEffect(() => {
    if (elapsed >= total) return;
    const timer = setTimeout(() => setElapsed((prev) => prev + 50), 50);
    return () => clearTimeout(timer);
  }, [elapsed, total]);

  return (
    <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
      <div ref={ref} className="max-w-xl mx-auto opacity-0 transition-all duration-700">
        {/* Section Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ตัวอย่างการทำงานจริง
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            จำลองหน้าจอ LINE LIFF ลูกค้า
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">{current.subtitle}</p>
        </div>

        {/* Business Scenario Tabs */}
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {scenarios.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                active === i
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-105'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* LINE Chat Window Simulator */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950">
          {/* Header */}
          <div className="bg-[#06C755] px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-inner">
                {current.botEmoji}
              </div>
              <div>
                <div className="text-white font-bold text-sm tracking-tight">{current.botName}</div>
                <div className="text-white/80 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  ออนไลน์ระบบ LINE OA
                </div>
              </div>
            </div>
            <button
              onClick={resetAnimation}
              className="text-xs bg-black/20 hover:bg-black/30 text-white px-2.5 py-1 rounded-lg transition-colors"
            >
              🔄 เล่นซ้ำ
            </button>
          </div>

          {/* Chat Body */}
          <div
            className="bg-[#8CABD9]/20 p-4 flex flex-col gap-3 min-h-[440px] max-h-[500px] overflow-y-auto backdrop-blur-md"
            key={`${current.key}-${runKey}`}
          >
            {entries.map((entry, idx) => {
              if (entry.item.kind === 'typing') {
                const visible = elapsed >= entry.showAt && elapsed < (entry.hideAt ?? Infinity);
                if (!visible) return null;
                return <TypingIndicator key={`typing-${entry.item.id}-${runKey}`} />;
              }

              if (entry.item.kind === 'options') {
                if (elapsed < entry.showAt) return null;
                return (
                  <OptionChips
                    key={`opts-${entry.item.index}-${runKey}`}
                    options={entry.item.options}
                    selected={entry.item.selected}
                  />
                );
              }

              const msg = entry.item.msg;
              if (elapsed < entry.showAt) return null;

              return (
                <div
                  key={`${current.key}-${entry.item.index}-${runKey}`}
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-md animate-in fade-in slide-in-from-bottom-2 ${
                    msg.type === 'bot'
                      ? 'bg-white text-slate-900 self-start rounded-bl-xs border border-slate-100'
                      : 'bg-[#85F49B] text-slate-950 self-end rounded-br-xs font-medium'
                  }`}
                >
                  {msg.text}
                  <div className="text-[10px] text-slate-400 text-right mt-1 font-sans">{msg.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
