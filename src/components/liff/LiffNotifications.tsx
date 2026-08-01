import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Bell, MessageSquare, Clock } from 'lucide-react';

export const LiffNotifications: React.FC = () => {
  const { notifications, markNotificationAsRead } = useSaaS();

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          การแจ้งเตือน
        </h2>
        <span className="text-[11px] text-white font-black bg-primary px-2.5 py-1 rounded-full shadow-sm">
          {notifications.length} รายการ
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {notifications.length === 0 ? (
          <div className="premium-card p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Bell className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-base text-slate-500 font-bold">ไม่มีการแจ้งเตือนในขณะนี้</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationAsRead(n.id)}
              className={`premium-card p-5 transition-all duration-300 cursor-pointer space-y-2.5 relative overflow-hidden group ${
                n.status === 'unread'
                  ? 'bg-primary/5 border-primary shadow-[0_4px_12px_rgba(79,70,229,0.1)] ring-2 ring-primary/10'
                  : 'bg-white border-slate-200/80 hover:border-primary/30 hover:shadow-md'
              }`}
            >
              {n.status === 'unread' && (
                  <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      n.status === 'unread' ? 'bg-primary text-white' : 'bg-slate-100 text-primary'
                  }`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-black text-[15px] leading-snug ${n.status === 'unread' ? 'text-primary-dark' : 'text-foreground'}`}>
                        {n.title}
                    </h3>
                  </div>
                </div>
                {n.status === 'unread' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5 shadow-[0_0_8px_rgba(79,70,229,0.6)]"></span>
                )}
              </div>

              <p className={`text-[13px] leading-relaxed pl-13 ${n.status === 'unread' ? 'text-slate-700 font-bold' : 'text-slate-500 font-medium'}`}>
                  {n.message}
              </p>

              <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 font-bold pt-2 border-t border-slate-100/80">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
