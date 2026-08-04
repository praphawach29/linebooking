import { Tenant } from '../types';

export interface TenantTerminology {
  resourceName: string;
  resourceSelectTitle: string;
  resourceSelectDesc: string;
  autoAssignTitle: string;
  autoAssignDesc: string;
  selectedResourceLabel: string;
  autoAssignedText: string;
  durationLabel: string;
}

export function getTenantTerminology(tenant?: Tenant | null): TenantTerminology {
  const businessType = tenant?.businessType || 'sports';
  const custom = (tenant?.settings as any)?.terminology || {};

  // Sports / Court / Venue booking (e.g. JackSports)
  if (businessType === ('sports' as string) || businessType === ('venue' as string)) {
    return {
      resourceName: custom.resourceName || 'สนาม',
      resourceSelectTitle: custom.resourceSelectTitle || 'เลือกสนาม (หรือจัดสรรให้อัตโนมัติ)',
      resourceSelectDesc: custom.resourceSelectDesc || 'คุณสามารถเลือกสนามที่ต้องการ หรือเลือกให้ระบบจัดสนามว่างให้อัตโนมัติ',
      autoAssignTitle: custom.autoAssignTitle || 'สนามใดก็ได้ (แนะนำ)',
      autoAssignDesc: custom.autoAssignDesc || 'ระบบจะจัดคิวสนามมาตรฐานที่ว่างตรงกับช่วงเวลาที่เลือกให้อัตโนมัติ',
      selectedResourceLabel: custom.selectedResourceLabel || 'สนามที่เลือก',
      autoAssignedText: custom.autoAssignedText || 'จัดสรรสนามให้อัตโนมัติ',
      durationLabel: custom.durationLabel || 'เลือกระยะเวลาการเล่น (ชั่วโมง)',
    };
  }

  // Clinic / Healthcare
  if (businessType === ('clinic' as string) || businessType === ('medical' as string)) {
    return {
      resourceName: custom.resourceName || 'แพทย์',
      resourceSelectTitle: custom.resourceSelectTitle || 'เลือกแพทย์ / ผู้เชี่ยวชาญ',
      resourceSelectDesc: custom.resourceSelectDesc || 'เลือกแพทย์ประจำตัว หรือเลือกแพทย์ท่านใดก็ได้ที่มีคิวว่าง',
      autoAssignTitle: custom.autoAssignTitle || 'แพทย์ท่านใดก็ได้ (แนะนำ)',
      autoAssignDesc: custom.autoAssignDesc || 'ระบบจะจัดคิวแพทย์ผู้เชี่ยวชาญที่ว่างตรงเวลานั้นให้อัตโนมัติ',
      selectedResourceLabel: custom.selectedResourceLabel || 'แพทย์ที่เลือก',
      autoAssignedText: custom.autoAssignedText || 'จัดสรรแพทย์ให้อัตโนมัติ',
      durationLabel: custom.durationLabel || 'เลือกระยะเวลาการตรวจ',
    };
  }

  // General / Salon / Spa / Beauty
  return {
    resourceName: custom.resourceName || 'ผู้ให้บริการ',
    resourceSelectTitle: custom.resourceSelectTitle || 'เลือกผู้ให้บริการ (ช่าง)',
    resourceSelectDesc: custom.resourceSelectDesc || 'คุณสามารถเลือกช่างคนโปรด หรือเลือกช่างคนใดก็ได้ที่มีคิวว่าง',
    autoAssignTitle: custom.autoAssignTitle || 'ช่างคนใดก็ได้ (แนะนำ)',
    autoAssignDesc: custom.autoAssignDesc || 'ระบบจะจัดคิวช่างที่มีความเชี่ยวชาญและว่างตรงเวลานั้นให้อัตโนมัติ',
    selectedResourceLabel: custom.selectedResourceLabel || 'ผู้ให้บริการที่เลือก',
    autoAssignedText: custom.autoAssignedText || 'จัดสรรช่างให้อัตโนมัติ',
    durationLabel: custom.durationLabel || 'เลือกระยะเวลาบริการ',
  };
}
