import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Reward, Membership } from '../../types';
import {
  Gift,
  Award,
  PlusCircle,
  Edit2,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  Star,
  Sparkles,
  TrendingUp,
  Plus,
  Minus,
  X,
  Check,
  Settings,
  Package
} from 'lucide-react';

const getValidAvatar = (avatar: string | null | undefined, name: string) => {
  if (!avatar || avatar === 'null' || avatar === 'undefined' || avatar.trim() === '') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  }
  return avatar;
};

export const MerchantLoyaltyManager: React.FC = () => {
  const {
    activeTenant,
    bookings,
    rewards,
    memberships,
    saveReward,
    deleteReward,
    adjustCustomerPoints,
    loyaltySettings,
    saveLoyaltySettings,
    customerPackages,
    addCustomerPackage,
  } = useSaaS();

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'rewards' | 'settings'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReward, setEditingReward] = useState<Partial<Reward> | null>(null);

  // Points Adjustment Modal state
  const [pointAdjustUser, setPointAdjustUser] = useState<{ id: string; name: string; currentPoints: number } | null>(null);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState<number | ''>(50);
  const [adjustReason, setAdjustReason] = useState<string>('โบนัสพิเศษจากร้านค้า');

  // Package Management Modal state
  const [packageUser, setPackageUser] = useState<{ id: string; name: string } | null>(null);
  const [newPackage, setNewPackage] = useState<{ name: string; quota: number | ''; serviceId: string }>({ name: '', quota: 10, serviceId: '' });

  // Settings State
  const [editingSettings, setEditingSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<{pointStrategy: string; pointsPerVisit: number | ''; pointsPerCurrency: number | ''; currencyAmount: number | ''; enablePackageDeduction: boolean}>({
    pointStrategy: loyaltySettings?.pointStrategy || 'DISABLED',
    pointsPerVisit: loyaltySettings?.pointsPerVisit || 0,
    pointsPerCurrency: loyaltySettings?.pointsPerCurrency || 0,
    currencyAmount: loyaltySettings?.currencyAmount || 100,
    enablePackageDeduction: loyaltySettings?.enablePackageDeduction || false
  });


  // Derive registered unique customers from bookings & memberships
  const tenantBookings = bookings.filter((b) => !b.tenantId || b.tenantId === activeTenant.id);

  // Map unique customer list
  const uniqueUserMap = new Map<string, { id: string; name: string; phone: string; avatar?: string }>();
  tenantBookings.forEach((b) => {
    if (b.userId && !uniqueUserMap.has(b.userId)) {
      uniqueUserMap.set(b.userId, {
        id: b.userId,
        name: b.userName || 'ลูกค้า',
        phone: b.userPhone || '-',
        avatar: b.userAvatar,
      });
    }
  });

  // Convert to array
  const customerList = Array.from(uniqueUserMap.values()).map((user) => {
    const mem = memberships.find((m) => m.userId === user.id && (!m.tenantId || m.tenantId === activeTenant.id));
    const completedCount = tenantBookings.filter((b) => b.userId === user.id && b.status === 'completed').length;
    const points = mem?.points || completedCount * 10;
    const tier = mem?.tier || (completedCount >= 10 ? 'Platinum' : completedCount >= 5 ? 'Gold' : 'Silver');

    return {
      ...user,
      points,
      tier,
      completedCount,
    };
  });

  const filteredCustomers = customerList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const filteredRewards = rewards.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;
    saveReward(editingReward);
    setEditingReward(null);
  };

  const handleConfirmPointAdjust = () => {
    if (!pointAdjustUser) return;
    adjustCustomerPoints(pointAdjustUser.id, adjustPointsDelta, adjustReason);
    setPointAdjustUser(null);
  };

  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum':
      case 'vip':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">👑 VIP Platinum</span>;
      case 'gold':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">🥇 Gold Member</span>;
      case 'silver':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">🥈 Silver Member</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">🥉 Bronze Member</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl border border-amber-200 shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>ระบบสมาชิก & ตั้งค่าของรางวัล (Memberships & Rewards)</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                Loyalty Hub
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดการแต้มสะสมของลูกค้า ตรวจสอบระดับสมาชิก และตั้งค่ารายการของรางวัลแลกคูปองบน LINE LIFF
            </p>
          </div>
        </div>

        {activeSubTab === 'rewards' && (
          <button
            onClick={() =>
              setEditingReward({
                name: '',
                description: 'คูปองแลกรับสิทธิ์ส่วนลดพิเศษหน้าร้าน',
                pointsRequired: 100,
                imageUrl:
                  'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&auto=format&fit=crop&q=80',
                isActive: true,
              })
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มของรางวัลใหม่</span>
          </button>
        )}
      </div>

      {/* Main Sub-Tab Switcher */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-slate-100 p-1.5 lg:p-2 rounded-2xl border border-slate-200 gap-2">
        <div className="flex overflow-x-auto hide-scrollbar items-center gap-1.5 lg:gap-2 pb-1 lg:pb-0 w-full lg:w-auto">
          <button
            onClick={() => setActiveSubTab('members')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeSubTab === 'members'
                ? 'bg-white text-emerald-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>👥 รายชื่อสมาชิก & แต้มสะสม ({customerList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rewards')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeSubTab === 'rewards'
                ? 'bg-white text-emerald-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-500" />
            <span>🎁 ตั้งค่ารายการของรางวัล ({rewards.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeSubTab === 'settings'
                ? 'bg-white text-emerald-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>⚙️ ตั้งค่า Loyalty & Packages</span>
          </button>

        </div>

        {/* Search Box */}
        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeSubTab === 'members' ? 'ค้นหาชื่อลูกค้า/เบอร์โทร...' : 'ค้นหาของรางวัล...'}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
        </div>
      </div>

      {/* TAB 1: CUSTOMER MEMBERS LIST */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Summary Stat KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between col-span-2 md:col-span-1">
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">ลูกค้าสมาชิกในระบบ</span>
                <span className="text-2xl font-black text-slate-900">{customerList.length} คน</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">แต้มสะสมรวมทั้งร้าน</span>
                <span className="text-2xl font-black text-amber-500">
                  {customerList.reduce((sum, c) => sum + c.points, 0).toLocaleString()} pts
                </span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                <Star className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">คิวบริการที่สำเร็จแล้ว</span>
                <span className="text-2xl font-black text-blue-600">
                  {customerList.reduce((sum, c) => sum + c.completedCount, 0)} ครั้ง
                </span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-700">
                  <th className="p-3.5">ลูกค้า</th>
                  <th className="p-3.5">เบอร์โทร</th>
                  <th className="p-3.5">ระดับสมาชิก (Tier)</th>
                  <th className="p-3.5 text-center">ใช้บริการเสร็จ</th>
                  <th className="p-3.5 text-right">แต้มสะสม (Points)</th>
                  <th className="p-3.5 text-center">ปรับแต้ม</th>
                  <th className="p-3.5 text-center">แพ็กเกจ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      ไม่พบข้อมูลสมาชิกในระบบ
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={getValidAvatar(customer.avatar, customer.name)}
                          alt={customer.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-extrabold text-slate-900">{customer.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {customer.id.slice(0, 10)}...
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">{customer.phone}</td>
                      <td className="p-3.5">{getTierBadge(customer.tier)}</td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {customer.completedCount} ครั้ง
                      </td>
                      <td className="p-3.5 text-right font-black text-amber-600 text-sm">
                        {customer.points.toLocaleString()} pts
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() =>
                            setPointAdjustUser({
                              id: customer.id,
                              name: customer.name,
                              currentPoints: customer.points,
                            })
                          }
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-xl border border-amber-200 transition-colors inline-flex items-center gap-1 text-[11px]"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>ปรับแต้ม</span>
                        </button>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {customerPackages.filter(p => p.userId === customer.id).map(p => (
                            <span key={p.id} className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {p.packageName} ({p.remainingQuota} ครั้ง)
                            </span>
                          ))}
                          <button
                            onClick={() => setPackageUser({ id: customer.id, name: customer.name })}
                            className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" /> เพิ่มแพ็กเกจ
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REWARDS CATALOG SETTINGS */}
      {activeSubTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Gift className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600 text-sm">ยังไม่มีของรางวัลในระบบ</p>
              <p className="text-slate-400 text-xs">
                กดปุ่ม "+ เพิ่มของรางวัลใหม่" ด้านบนเพื่อสร้างรายการให้ลูกค้าแลกแต้มบน LINE LIFF
              </p>
            </div>
          ) : (
            filteredRewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {reward.imageUrl && (
                    <img
                      src={reward.imageUrl}
                      alt={reward.name}
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 border border-amber-200">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{reward.pointsRequired.toLocaleString()} pts</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          reward.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {reward.isActive ? 'เปิดให้แลก' : 'ปิดใช้งาน'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {reward.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {reward.description}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingReward(reward)}
                    className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold flex items-center gap-1 text-[11px]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`คุณต้องการลบของรางวัล "${reward.name}" ใช่หรือไม่?`)) {
                        deleteReward(reward.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      
      {/* TAB 3: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs max-w-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" /> ตั้งค่า Loyalty & Packages
            </h2>
            {!editingSettings ? (
              <button onClick={() => setEditingSettings(true)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                แก้ไข
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditingSettings(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">ยกเลิก</button>
                <button onClick={() => {
                  saveLoyaltySettings(localSettings);
                  setEditingSettings(false);
                }} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">
                  บันทึก
                </button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="font-bold text-slate-700 mb-1 block">รูปแบบการให้แต้มสะสม</label>
              <select 
                disabled={!editingSettings}
                value={localSettings.pointStrategy}
                onChange={(e) => setLocalSettings({...localSettings, pointStrategy: e.target.value as any})}
                className="w-full p-2.5 border border-slate-200 rounded-xl disabled:bg-slate-50"
              >
                <option value="DISABLED">ปิดใช้งานระบบแต้ม</option>
                <option value="PER_VISIT">ให้แต้มตามจำนวนครั้งที่มาใช้บริการ</option>
                <option value="AMOUNT_BASED">ให้แต้มตามยอดใช้จ่าย (บาท)</option>
              </select>
            </div>

            {localSettings.pointStrategy === 'PER_VISIT' && (
              <div>
                <label className="font-bold text-slate-700 mb-1 block">ได้รับกี่แต้ม ต่อการมาใช้บริการ 1 ครั้ง</label>
                <input 
                  type="number" disabled={!editingSettings}
                  value={localSettings.pointsPerVisit}
                  onChange={(e) => setLocalSettings({...localSettings, pointsPerVisit: (e.target.value === '' ? '' : Number(e.target.value)) as any})}
                  className="w-full p-2.5 border border-slate-200 rounded-xl disabled:bg-slate-50"
                />
              </div>
            )}

            {localSettings.pointStrategy === 'AMOUNT_BASED' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">ยอดใช้จ่าย (บาท)</label>
                  <input 
                    type="number" disabled={!editingSettings}
                    value={localSettings.currencyAmount}
                    onChange={(e) => setLocalSettings({...localSettings, currencyAmount: (e.target.value === '' ? '' : Number(e.target.value)) as any})}
                    className="w-full p-2.5 border border-slate-200 rounded-xl disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">ได้รับแต้ม</label>
                  <input 
                    type="number" disabled={!editingSettings}
                    value={localSettings.pointsPerCurrency}
                    onChange={(e) => setLocalSettings({...localSettings, pointsPerCurrency: (e.target.value === '' ? '' : Number(e.target.value)) as any})}
                    className="w-full p-2.5 border border-slate-200 rounded-xl disabled:bg-slate-50"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700">หักโควต้าแพ็กเกจอัตโนมัติ</p>
                <p className="text-slate-500 text-[11px]">ระบบจะหักจำนวนครั้งในแพ็กเกจของลูกค้าเมื่อมีการเช็คอิน</p>
              </div>
              <input 
                type="checkbox" disabled={!editingSettings}
                checked={localSettings.enablePackageDeduction}
                onChange={(e) => setLocalSettings({...localSettings, enablePackageDeduction: e.target.checked})}
                className="w-5 h-5 text-emerald-600 rounded"
              />
            </div>
          </div>
        </div>
      )}


      {/* EDIT / CREATE REWARD MODAL */}
      {editingReward && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                <span>{editingReward.id ? 'แก้ไขรายการของรางวัล' : 'เพิ่มของรางวัลใหม่'}</span>
              </h3>
              <button
                onClick={() => setEditingReward(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRewardSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">ชื่อของรางวัล / ส่วนลด *</label>
                <input
                  type="text"
                  required
                  value={editingReward.name || ''}
                  onChange={(e) => setEditingReward({ ...editingReward, name: e.target.value })}
                  placeholder="เช่น ส่วนลด 100 บาท สำหรับบริการสปา"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">คะแนนที่ต้องใช้ในการแลก (pts) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingReward.pointsRequired || 100}
                  onChange={(e) =>
                    setEditingReward({ ...editingReward, pointsRequired: (e.target.value === '' ? '' : Number(e.target.value)) as any })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">รายละเอียดสิทธิประโยชน์</label>
                <textarea
                  rows={3}
                  value={editingReward.description || ''}
                  onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                  placeholder="อธิบายเงื่อนไขการใช้งานคูปอง..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">URL รูปภาพประกอบ</label>
                <input
                  type="url"
                  value={editingReward.imageUrl || ''}
                  onChange={(e) => setEditingReward({ ...editingReward, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-[11px]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">เปิดให้ลูกค้าแลกบน LINE LIFF</span>
                <input
                  type="checkbox"
                  checked={editingReward.isActive ?? true}
                  onChange={(e) => setEditingReward({ ...editingReward, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </div>

              <div className="pt-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingReward(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกของรางวัล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST CUSTOMER POINTS MODAL */}
      {pointAdjustUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>ปรับแต้มสะสมลูกค้า: {pointAdjustUser.name}</span>
              </h3>
              <button
                onClick={() => setPointAdjustUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
              <p className="font-bold text-amber-900">แต้มปัจจุบัน: {pointAdjustUser.currentPoints.toLocaleString()} pts</p>
              <p className="text-[11px] text-amber-700">สามารถเพิ่มแต้ม (ใส่ค่าบวก) หรือลดแต้ม (ใส่ติดลบ) ได้ตามต้องการ</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">จำนวนแต้มที่ต้องการปรับ (+ / -) *</label>
                <input
                  type="number"
                  value={adjustPointsDelta}
                  onChange={(e) => setAdjustPointsDelta((e.target.value === '' ? '' : Number(e.target.value)) as any)}
                  placeholder="เช่น 50 หรือ -50"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">เหตุผลการปรับแต้ม</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="เช่น โบนัสโปรโมชันร้านค้า"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPointAdjustUser(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmPointAdjust}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันปรับแต้ม</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PACKAGE MODAL */}
      {packageUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span>เพิ่มแพ็กเกจให้: {packageUser.name}</span>
              </h3>
              <button onClick={() => setPackageUser(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">ชื่อแพ็กเกจ</label>
                <input 
                  type="text" required
                  value={newPackage.name}
                  onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                  placeholder="เช่น สปาหน้า 10 ครั้ง"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">จำนวนครั้ง (โควต้า)</label>
                <input 
                  type="number" required min={1}
                  value={newPackage.quota}
                  onChange={(e) => setNewPackage({...newPackage, quota: (e.target.value === '' ? '' : Number(e.target.value)) as any})}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setPackageUser(null)} className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100">ยกเลิก</button>
              <button 
                type="button" 
                onClick={() => {
                  if(!newPackage.name || newPackage.quota <= 0) return;
                  addCustomerPackage({
                    userId: packageUser.id,
                    packageName: newPackage.name,
                    totalQuota: newPackage.quota,
                    usedQuota: 0,
                    status: 'ACTIVE'
                  });
                  setPackageUser(null);
                  setNewPackage({ name: '', quota: 10, serviceId: '' });
                }} 
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> ยืนยันเพิ่มแพ็กเกจ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
