import { Tenant, TenantTerminology } from '../types';

export type { TenantTerminology };

export function getTenantTerminology(tenant?: Tenant | null): TenantTerminology {
  const businessType = tenant?.businessType || 'sports';
  const custom = tenant?.settings?.terminology || {};

  // Sports / Court / Venue booking (e.g. JackSports)
  if (businessType === ('sports' as string) || businessType === ('venue' as string)) {
    return {
      serviceLabel: custom.serviceLabel || 'ประเภทกีฬา',
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
      serviceLabel: custom.serviceLabel || 'รายการตรวจ',
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

  // Fitness / Gym / Yoga — coach-based, not a fixed room/court
  if (businessType === ('fitness' as string)) {
    return {
      serviceLabel: custom.serviceLabel || 'คลาส/โปรแกรม',
      resourceName: custom.resourceName || 'เทรนเนอร์',
      resourceSelectTitle: custom.resourceSelectTitle || 'เลือกเทรนเนอร์ (หรือจัดสรรให้อัตโนมัติ)',
      resourceSelectDesc: custom.resourceSelectDesc || 'คุณสามารถเลือกเทรนเนอร์คนโปรด หรือเลือกคนใดก็ได้ที่มีคิวว่าง',
      autoAssignTitle: custom.autoAssignTitle || 'เทรนเนอร์คนใดก็ได้ (แนะนำ)',
      autoAssignDesc: custom.autoAssignDesc || 'ระบบจะจัดคิวเทรนเนอร์ที่ว่างตรงเวลานั้นให้อัตโนมัติ',
      selectedResourceLabel: custom.selectedResourceLabel || 'เทรนเนอร์ที่เลือก',
      autoAssignedText: custom.autoAssignedText || 'จัดสรรเทรนเนอร์ให้อัตโนมัติ',
      durationLabel: custom.durationLabel || 'เลือกระยะเวลาคลาส',
    };
  }

  // Restaurant — resource is a table, not a person
  if (businessType === ('restaurant' as string)) {
    return {
      serviceLabel: custom.serviceLabel || 'ประเภทที่นั่ง',
      resourceName: custom.resourceName || 'โต๊ะ',
      resourceSelectTitle: custom.resourceSelectTitle || 'เลือกโต๊ะ (หรือจัดสรรให้อัตโนมัติ)',
      resourceSelectDesc: custom.resourceSelectDesc || 'คุณสามารถเลือกโต๊ะที่ต้องการ หรือเลือกให้ระบบจัดโต๊ะว่างให้อัตโนมัติ',
      autoAssignTitle: custom.autoAssignTitle || 'โต๊ะใดก็ได้ (แนะนำ)',
      autoAssignDesc: custom.autoAssignDesc || 'ระบบจะจัดโต๊ะที่ว่างตรงกับช่วงเวลาที่เลือกให้อัตโนมัติ',
      selectedResourceLabel: custom.selectedResourceLabel || 'โต๊ะที่เลือก',
      autoAssignedText: custom.autoAssignedText || 'จัดสรรโต๊ะให้อัตโนมัติ',
      durationLabel: custom.durationLabel || 'เลือกระยะเวลาการใช้โต๊ะ',
    };
  }

  // Education / Tutoring — coach-based
  if (businessType === ('education' as string)) {
    return {
      serviceLabel: custom.serviceLabel || 'วิชา/คอร์ส',
      resourceName: custom.resourceName || 'ผู้สอน',
      resourceSelectTitle: custom.resourceSelectTitle || 'เลือกผู้สอน (หรือจัดสรรให้อัตโนมัติ)',
      resourceSelectDesc: custom.resourceSelectDesc || 'คุณสามารถเลือกผู้สอนที่ต้องการ หรือเลือกคนใดก็ได้ที่มีคิวว่าง',
      autoAssignTitle: custom.autoAssignTitle || 'ผู้สอนคนใดก็ได้ (แนะนำ)',
      autoAssignDesc: custom.autoAssignDesc || 'ระบบจะจัดคิวผู้สอนที่ว่างตรงเวลานั้นให้อัตโนมัติ',
      selectedResourceLabel: custom.selectedResourceLabel || 'ผู้สอนที่เลือก',
      autoAssignedText: custom.autoAssignedText || 'จัดสรรผู้สอนให้อัตโนมัติ',
      durationLabel: custom.durationLabel || 'เลือกระยะเวลาเรียน',
    };
  }

  // General / Salon / Spa / Beauty / Barbershop / Other
  return {
    serviceLabel: custom.serviceLabel || 'บริการ',
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
