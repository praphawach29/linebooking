import React from 'react';
import { X, ShieldCheck, FileText, RefreshCw } from 'lucide-react';

export type LegalModalType = 'privacy' | 'terms' | 'refund' | null;

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            {type === 'privacy' && <ShieldCheck className="h-5 w-5 text-emerald-600" />}
            {type === 'terms' && <FileText className="h-5 w-5 text-blue-600" />}
            {type === 'refund' && <RefreshCw className="h-5 w-5 text-violet-600" />}
            <h3 className="font-bold text-slate-800 text-base">
              {type === 'privacy' && 'นโยบายความเป็นส่วนตัว (Privacy Policy)'}
              {type === 'terms' && 'ข้อกำหนดการใช้บริการ (Terms of Service)'}
              {type === 'refund' && 'นโยบายการคืนเงิน (Refund Policy)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 text-xs leading-relaxed text-slate-600 space-y-4">
          {type === 'privacy' && (
            <>
              <p className="font-semibold text-slate-800">
                1. การเก็บรวบรวมและการใช้ข้อมูลส่วนบุคคล (PDPA Compliance)
              </p>
              <p>
                ระบบจะเก็บรวบรวมข้อมูลส่วนบุคคล เช่น ชื่อ นามสกุล หมายเลขโทรศัพท์ และบัญชี LINE User ID ของท่านเพื่อวัตถุประสงค์ในการยืนยันตัวตน การจองคิวรับบริการ การแจ้งเตือนสถานะการจองผ่าน LINE และการสะสมคะแนนสมาชิกเท่านั้น
              </p>
              <p className="font-semibold text-slate-800">
                2. การรักษาความมั่นคงปลอดภัยของข้อมูล
              </p>
              <p>
                ข้อมูลของท่านจะได้รับการปกป้องด้วยมาตรการรักษาความปลอดภัยตามมาตรฐานสากล มีการเข้ารหัสข้อมูลขณะส่งผ่านเครือข่าย และไม่เปิดเผยต่อบุคคลภายนอกโดยไม่ได้รับความยินยอม ยกเว้นตามที่กฎหมายกำหนด
              </p>
              <p className="font-semibold text-slate-800">
                3. สิทธิของท่านในฐานะเจ้าของข้อมูลส่วนบุคคล
              </p>
              <p>
                ท่านมีสิทธิในการขอเข้าถึง ขอรับสำเนาข้อมูลส่วนบุคคล (Data Export) หรือขอลบและทำลายข้อมูลส่วนบุคคล (Right to Erasure) ได้ตลอดเวลาผ่านหน้าโปรไฟล์ในระบบ
              </p>
            </>
          )}

          {type === 'terms' && (
            <>
              <p className="font-semibold text-slate-800">
                1. ข้อกำหนดการจองบริการ
              </p>
              <p>
                ผู้ใช้บริการต้องระบุข้อมูลที่เป็นจริงในการจองคิว และเดินทางมารับบริการตรงตามเวลาที่นัดหมาย หากไม่สามารถมารับบริการได้ กรุณาแจ้งเลื่อนหรือยกเลิกคิวล่วงหน้าผ่านระบบ
              </p>
              <p className="font-semibold text-slate-800">
                2. การชำระเงินและมัดจำ
              </p>
              <p>
                สำหรับบริการที่มีการเรียกเก็บเงินมัดจำ การจองจะสมบูรณ์เมื่อท่านชำระเงินและได้รับการยืนยันสถานะจากระบบหรือร้านค้าเรียบร้อยแล้วเท่านั้น
              </p>
              <p className="font-semibold text-slate-800">
                3. การยกเลิกและสิทธิของร้านค้า
              </p>
              <p>
                ร้านค้าขอสงวนสิทธิในการยกเลิกหรือปรับเปลี่ยนการจองในกรณีเกิดเหตุสุดวิสัย โดยจะมีการแจ้งให้ลูกค้าทราบผ่านทาง LINE ล่วงหน้า
              </p>
            </>
          )}

          {type === 'refund' && (
            <>
              <p className="font-semibold text-slate-800">
                1. เงื่อนไขการขอคืนเงิน
              </p>
              <p>
                กรณีร้านค้ายกเลิกการให้บริการ หรือกรณีที่ลูกค้าขอยกเลิกการจองล่วงหน้าตามระยะเวลาที่เงื่อนไขของร้านค้ากำหนด ลูกค้าจะได้รับสิทธิคืนเงินมัดจำตามนโยบายของทางร้าน
              </p>
              <p className="font-semibold text-slate-800">
                2. ระยะเวลาการดำเนินการ
              </p>
              <p>
                การคืนเงินผ่านระบบพร้อมเพย์หรือบัตรเครดิตจะดำเนินการภายใน 7-14 วันทำการขึ้นอยู่กับประเภทของช่องทางการชำระเงิน
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition"
          >
            รับทราบและปิด
          </button>
        </div>
      </div>
    </div>
  );
};
