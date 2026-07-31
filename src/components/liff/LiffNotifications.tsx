import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Bell, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

export const LiffNotifications: React.FC = () => {
  const { notifications, markNotificationAsRead } = useSaaS();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
          <Bell className="w-5 h-5 text-emerald-600" />
          การแจ้งเตือนจาก LINE Official Account
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          {notifications.length} รายการ
        </span>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center py-10">
            <p className="text-xs text-slate-500 font-medium">ไม่มีการแจ้งเตือนในขณะนี้</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationAsRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs ${
                n.status === 'unread'
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900">{n.title}</h3>
                </div>
                {n.status === 'unread' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </div>

              <p className="text-slate-600 leading-relaxed pl-9">{n.message}</p>

              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
