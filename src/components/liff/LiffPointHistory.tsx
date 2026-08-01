import React from 'react';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, Gift, Star, Clock } from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';

interface LiffPointHistoryProps {
  onBack: () => void;
}

const LiffPointHistory: React.FC<LiffPointHistoryProps> = ({ onBack }) => {
  const { activeTenant, currentUser, pointTransactions, fetchMembership } = useSaaS();
  
  const userTransactions = pointTransactions.filter(
    tx => tx.tenantId === activeTenant.id && tx.userId === currentUser.id
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const membership = fetchMembership(currentUser.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-4 pt-4 pb-8 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-wide">ประวัติคะแนนสะสม</h1>
          <div className="w-10 h-10" />
        </div>

        <div className="text-center text-white mb-2">
          <p className="text-sm text-slate-300 mb-1">คะแนนคงเหลือ</p>
          <div className="flex items-center justify-center gap-2">
            <Star className="text-yellow-400 drop-shadow-md" size={32} fill="currentColor" />
            <span className="text-4xl font-extrabold tracking-tight">{membership?.points.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 rounded-t-3xl -mt-6 relative z-20 px-4 pt-6 pb-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        
        {userTransactions.length > 0 ? (
          <div className="space-y-4">
            {userTransactions.map(tx => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'earned' ? 'bg-emerald-100 text-emerald-600' :
                  tx.type === 'redeemed' ? 'bg-violet-100 text-violet-600' :
                  'bg-rose-100 text-rose-600'
                }`}>
                  {tx.type === 'earned' ? <ArrowDownLeft size={24} /> :
                   tx.type === 'redeemed' ? <Gift size={24} /> :
                   <ArrowUpRight size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-800 font-medium truncate">{tx.description}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Clock size={12} />
                    <span>{formatDate(tx.createdAt)} เวลา {formatTime(tx.createdAt)} น.</span>
                  </div>
                </div>
                <div className={`font-bold flex-shrink-0 text-right ${
                  tx.type === 'earned' ? 'text-emerald-500' : 'text-slate-600'
                }`}>
                  {tx.type === 'earned' ? '+' : ''}{tx.amount}
                  <div className="text-[10px] text-slate-400 font-normal">pts</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">ยังไม่มีประวัติคะแนน</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">ใช้บริการเพื่อสะสมคะแนน และแลกรับของรางวัลพิเศษมากมาย</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiffPointHistory;
