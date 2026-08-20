import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  Phone,
  Server,
  Activity,
  Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FailedDelivery {
  id: string;
  tenantId: string;
  eventType: string;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string; slug: string };
  user?: { id: string; displayName: string | null; phone: string | null; lineUserId: string | null };
  booking?: {
    id: string;
    ref_no: string | null;
    service_name: string;
    bookingDate: string;
    startTime: string;
    status: string;
  };
}

interface ReadinessState {
  status: 'ok' | 'degraded';
  checks: { database: 'up' | 'down'; redis: 'up' | 'down'; queue: 'up' | 'down' };
  latencyMs: { database: number; redis: number };
  queueCounts?: { waiting: number; active: number; failed: number; completed: number };
}

export const AdminFailedDeliveries: React.FC = () => {
  const [deliveries, setDeliveries] = useState<FailedDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live System Readiness Status
  const [readiness, setReadiness] = useState<ReadinessState | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    };
  };

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch(`${getBackendUrl()}/ready`);
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      } else {
        const data = await res.json().catch(() => null);
        setReadiness(data || {
          status: 'degraded',
          checks: { database: 'down', redis: 'down', queue: 'down' },
          latencyMs: { database: -1, redis: -1 },
        });
      }
    } catch {
      setReadiness({
        status: 'degraded',
        checks: { database: 'down', redis: 'down', queue: 'down' },
        latencyMs: { database: -1, redis: -1 },
      });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const fetchFailedDeliveries = async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getBackendUrl()}/admin/notifications/line/failed?limit=50`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch failed deliveries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedDeliveries();
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Polling health every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRetrySingle = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    setNotification(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getBackendUrl()}/admin/notifications/line/retry/${deliveryId}`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'ส่งคำขอยิงซ้ำ (Retry) สำเร็จแล้ว' });
        // Remove retried item from view
        setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        setNotification({ type: 'error', message: data.message || 'เกิดข้อผิดพลาดในการยิงซ้ำ' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'ไม่สามารถเชื่อมต่อ backend ได้' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (!window.confirm('คุณต้องการสั่งยิงซ้ำ (Retry) ข้อความที่ล้มเหลวทั้งหมดใช่หรือไม่?')) return;
    setIsRetryingAll(true);
    setNotification(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getBackendUrl()}/admin/notifications/line/retry-all`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: `ส่งคำขอยิงซ้ำทั้งหมด (${data.retriedCount || deliveries.length} รายการ) สำเร็จแล้ว` });
        fetchFailedDeliveries();
      } else {
        setNotification({ type: 'error', message: data.message || 'เกิดข้อผิดพลาดในการยิงซ้ำทั้งหมด' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'ไม่สามารถเชื่อมต่อ backend ได้' });
    } finally {
      setIsRetryingAll(false);
    }
  };

  const formatEventName = (eventType: string) => {
    switch (eventType) {
      case 'booking_created': return 'สร้างการจองใหม่';
      case 'booking_confirmed': return 'ยืนยันการจอง';
      case 'booking_cancelled': return 'ยกเลิกการจอง';
      case 'booking_rescheduled': return 'เลื่อนวัน/เวลา';
      case 'booking_checked_in': return 'เช็คอินสำเร็จ';
      case 'booking_completed': return 'รับบริการเสร็จสิ้น';
      default: return eventType;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            LINE Queue & Dead-Letter Queue (DLQ)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            ตรวจสอบและส่งซ้ำข้อความแจ้งเตือนลูกค้าที่ส่งไม่สำเร็จ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchFailedDeliveries(); fetchHealth(); }}
            disabled={isLoading || isLoadingHealth}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>

          {deliveries.length > 0 && (
            <button
              onClick={handleRetryAll}
              disabled={isRetryingAll}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              <Send className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
              {isRetryingAll ? 'กำลังยิงซ้ำทั้งหมด...' : `ยิงซ้ำทั้งหมด (${deliveries.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* System Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase">PostgreSQL Database</p>
              <p className="text-sm font-black text-slate-800">
                {readiness?.checks.database === 'up' ? 'ปกติ (Online)' : 'ขัดข้อง (Offline)'}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
              readiness?.checks.database === 'up'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {readiness?.latencyMs.database !== undefined && readiness.latencyMs.database >= 0
              ? `${readiness.latencyMs.database}ms`
              : 'N/A'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase">Redis & BullMQ</p>
              <p className="text-sm font-black text-slate-800">
                {readiness?.checks.redis === 'up' ? 'ปกติ (Connected)' : 'ขัดข้อง (Disconnected)'}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
              readiness?.checks.redis === 'up'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {readiness?.latencyMs.redis !== undefined && readiness.latencyMs.redis >= 0
              ? `${readiness.latencyMs.redis}ms`
              : 'N/A'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase">Failed Queue (DLQ)</p>
              <p className="text-sm font-black text-slate-800">{total} ข้อความ</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
              total === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {total === 0 ? 'คิวว่าง' : 'ต้องตรวจสอบ'}
          </span>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            รายการข้อความ LINE ที่ส่งไม่สำเร็จ ({total})
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">กำลังโหลดข้อมูลคิวข้อความ...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-black text-slate-800">ไม่มีข้อความล้มเหลวในระบบ</h4>
            <p className="text-xs text-slate-500">
              ข้อความแจ้งเตือนทาง LINE ทั้งหมดถูกส่งออกอย่างสมบูรณ์ หรือถูกเก็บเข้าคิวปกติ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">ร้านค้า / ลูกค้า</th>
                  <th className="py-3 px-4">เหตุการณ์ (Event)</th>
                  <th className="py-3 px-4">รหัสการจอง</th>
                  <th className="py-3 px-4">สาเหตุข้อผิดพลาด (Error)</th>
                  <th className="py-3 px-4">เวลาที่ล้มเหลว</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {deliveries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.tenant?.name || 'ไม่ระบุร้าน'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.user?.displayName || 'ลูกค้า'}</span>
                          {item.user?.phone && (
                            <span className="text-[10px] text-slate-400">({item.user.phone})</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {formatEventName(item.eventType)}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {item.booking?.ref_no || '-'}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="space-y-0.5">
                        {item.errorCode && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">
                            HTTP {item.errorCode}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-600 font-medium truncate" title={item.errorMessage || ''}>
                          {item.errorMessage || 'Unknown send error'}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(item.updatedAt).toLocaleString('th-TH')}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRetrySingle(item.id)}
                        disabled={retryingId === item.id || isRetryingAll}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/50"
                      >
                        <RefreshCw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                        {retryingId === item.id ? 'กำลังส่ง...' : 'ยิงซ้ำ'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
