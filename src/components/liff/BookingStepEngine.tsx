import { Tenant, Staff, Court, BookingFlowConfig } from '../../types';

export type StepType = 'SERVICE' | 'STAFF' | 'RESOURCE' | 'TIME_SLOT' | 'PAYMENT' | 'SUMMARY';

export interface StepDefinition {
  id: StepType;
  title: string;
  shortTitle: string;
}

/**
 * Calculates the active steps for a tenant based on their modular bookingFlowConfig settings
 */
export function getActiveBookingSteps(tenant: Tenant): StepDefinition[] {
  const config: BookingFlowConfig = tenant.settings?.bookingFlowConfig || {
    presetTemplate: 'SERVICE_AND_STAFF',
    paymentMode: 'DEPOSIT_ONLY',
    steps: {
      requireService: true,
      requireStaff: tenant.settings?.enableStaffSelection ?? true,
      requireResource: tenant.settings?.enableCourtSelection ?? false,
      requireNotes: false
    },
    autoAssignStaff: true,
    autoAssignResource: true
  };

  const activeSteps: StepDefinition[] = [];

  // 1. Service Selection Step
  if (config.steps.requireService) {
    activeSteps.push({
      id: 'SERVICE',
      title: 'เลือกบริการ (Service)',
      shortTitle: 'บริการ'
    });
  }

  // 2. Staff Selection Step
  if (config.steps.requireStaff) {
    activeSteps.push({
      id: 'STAFF',
      title: 'เลือกช่าง/พนักงาน (Staff)',
      shortTitle: 'ช่าง'
    });
  }

  // 3. Resource/Court Selection Step
  if (config.steps.requireResource) {
    activeSteps.push({
      id: 'RESOURCE',
      title: tenant.settings?.resourceTerm ? `เลือก${tenant.settings.resourceTerm}` : 'เลือกสนาม/คอร์ท',
      shortTitle: tenant.settings?.resourceTerm || 'สนาม'
    });
  }

  // 4. Time Slot Selection Step (Always Required)
  activeSteps.push({
    id: 'TIME_SLOT',
    title: 'เลือกวันและเวลา (Date & Time)',
    shortTitle: 'วันเวลา'
  });

  // 5. Payment Step (Required if paymentMode is not NO_PAYMENT)
  if (config.paymentMode !== 'NO_PAYMENT') {
    activeSteps.push({
      id: 'PAYMENT',
      title: config.paymentMode === 'DEPOSIT_ONLY' ? 'ชำระเงินมัดจำ' : 'ชำระเงินเต็มจำนวน',
      shortTitle: 'ชำระเงิน'
    });
  }

  // 6. Summary & Confirmation Step (Always Required)
  activeSteps.push({
    id: 'SUMMARY',
    title: 'ยืนยันการจอง',
    shortTitle: 'ยืนยัน'
  });

  return activeSteps;
}

/**
 * Auto-assigns available staff when requireStaff is turned off by merchant
 */
export function autoAssignStaff(staffs: Staff[]): Staff | null {
  const activeStaffs = staffs.filter(s => s.isActive);
  if (activeStaffs.length === 0) return null;
  
  // Random or first active staff assignment
  const randomIndex = Math.floor(Math.random() * activeStaffs.length);
  return activeStaffs[randomIndex];
}

/**
 * Auto-assigns available court/resource when requireResource is turned off by merchant
 */
export function autoAssignResource(courts: Court[]): Court | null {
  const activeCourts = courts.filter(c => c.isActive);
  if (activeCourts.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * activeCourts.length);
  return activeCourts[randomIndex];
}
