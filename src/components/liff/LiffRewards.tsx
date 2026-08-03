import React, { useState } from 'react';
import { Gift, ChevronLeft, Search, Star, Clock, AlertCircle } from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';
import { Reward } from '../../types';

interface LiffRewardsProps {
  onBack: () => void;
}

const LiffRewards: React.FC<LiffRewardsProps> = ({ onBack }) => {
  const { activeTenant, currentUser, fetchMembership, rewards, redeemReward } = useSaaS();
  const membership = currentUser ? fetchMembership(currentUser.id) : undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const filteredRewards = rewards.filter(r => 
    r.isActive && 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRedeem = () => {
    if (!selectedReward || !currentUser) return;
    const success = redeemReward(selectedReward.id, currentUser.id);
    if (success) {
      setRedeemStatus('success');
    } else {
      setRedeemStatus('error');
    }
  };

  const currentPoints = membership?.points || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 pt-4 pb-16 sticky top-0 z-10 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/30"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-wide">สิทธิพิเศษ & รางวัล</h1>
          <div className="w-10 h-10" />
        </div>

        {/* Points Display Component */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/50">
              <Star className="text-yellow-300 drop-shadow-md" size={24} fill="currentColor" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">คะแนนสะสมของคุณ</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight">{currentPoints.toLocaleString()}</span>
                <span className="text-sm">pts</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider
              ${membership?.tier === 'platinum' ? 'bg-slate-800 text-slate-100' :
                membership?.tier === 'gold' ? 'bg-yellow-400 text-yellow-900' :
                membership?.tier === 'silver' ? 'bg-slate-300 text-slate-800' :
                'bg-amber-700 text-amber-100'}
            `}>
              {membership?.tier || 'Bronze'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 -mt-8 relative z-20 pb-20">
        
        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 mb-6 flex items-center gap-2 sticky top-2 z-30">
          <Search className="text-slate-400 ml-2" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหารางวัล..." 
            className="flex-1 bg-transparent outline-none text-slate-700 p-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">แลกของรางวัล</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRewards.length > 0 ? filteredRewards.map((reward) => {
            const canAfford = currentPoints >= reward.pointsRequired;
            return (
              <div 
                key={reward.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-md"
              >
                {reward.imageUrl && (
                  <div className="h-32 w-full overflow-hidden relative">
                    <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Star className="text-yellow-500" size={14} fill="currentColor" />
                      <span className="text-sm font-bold text-slate-800">{reward.pointsRequired}</span>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 mb-1">{reward.name}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{reward.description}</p>
                  
                  <button
                    disabled={!canAfford || (reward.stock !== undefined && reward.stock <= 0)}
                    onClick={() => {
                      setSelectedReward(reward);
                      setShowConfirm(true);
                      setRedeemStatus('idle');
                    }}
                    className={`w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                      canAfford && (reward.stock === undefined || reward.stock > 0)
                        ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Gift size={18} />
                    {reward.stock !== undefined && reward.stock <= 0 
                      ? 'สินค้าหมด' 
                      : canAfford ? 'แลกรางวัล' : 'คะแนนไม่พอ'}
                  </button>
                  {reward.stock !== undefined && reward.stock > 0 && reward.stock <= 10 && (
                     <p className="text-xs text-orange-500 mt-2 text-center">เหลือเพียง {reward.stock} สิทธิ์!</p>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              <Gift className="mx-auto text-slate-300 mb-3" size={48} />
              <p>ไม่มีรางวัลที่ค้นหา</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedReward && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 transform transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10"
          >
            {redeemStatus === 'idle' && (
              <>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
                <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm relative -mt-10 sm:mt-0">
                  <Gift size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">ยืนยันการแลกรางวัล?</h3>
                <p className="text-slate-500 text-center mb-6">
                  คุณต้องการใช้ <span className="font-bold text-violet-600">{selectedReward.pointsRequired} คะแนน</span> เพื่อแลก <br/>"{selectedReward.name}" ใช่หรือไม่?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleRedeem}
                    className="flex-1 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 shadow-md shadow-violet-200"
                  >
                    ยืนยันการแลก
                  </button>
                </div>
              </>
            )}

            {redeemStatus === 'success' && (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 relative -mt-10 sm:mt-0">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">แลกรางวัลสำเร็จ!</h3>
                <p className="text-slate-500 mb-6">คุณได้แลกของรางวัลเรียบร้อยแล้ว คูปองจะถูกเก็บไว้ในกระเป๋าของคุณ</p>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setSelectedReward(null);
                  }}
                  className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200"
                >
                  ปิด
                </button>
              </div>
            )}

            {redeemStatus === 'error' && (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 relative -mt-10 sm:mt-0">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h3>
                <p className="text-slate-500 mb-6">ไม่สามารถแลกรางวัลได้ กรุณาลองใหม่อีกครั้ง</p>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 shadow-md shadow-red-200"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiffRewards;
