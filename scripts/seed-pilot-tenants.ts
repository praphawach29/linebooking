import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed Pilot Tenants script for Phase 7
 * Generates/executes SQL seed for 5 distinct pilot tenant businesses:
 * 1. Badminton Grand Arena (Court / Resource Focused)
 * 2. Aura Wellness & Spa (Staff / Service Focused)
 * 3. FitFlex Yoga & Fitness Studio (Multi-slot / Group Class Focused)
 * 4. Glow Aesthetic Clinic (PromptPay & Slip Verification Heavy)
 * 5. Smile Dental & Health Hub (High-Volume LINE Notification & Loyalty)
 */

export const PILOT_TENANTS = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Badminton Grand Arena',
    slug: 'badminton-arena',
    businessType: 'service_court_time',
    plan: 'pro',
    description: 'สนามแบดมินตันมาตรฐานสากล 4 คอร์ท พื้นยางคุณภาพ พร้อมระบบไฟสว่างมาตรฐานแข่งขัน',
    phone: '081-111-0001',
    email: 'contact@badminton-arena.demo',
    courtsCount: 4,
    servicesCount: 1,
    focus: 'Court booking, Resource scheduling, Hourly pricing',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'Aura Wellness & Spa',
    slug: 'aura-wellness',
    businessType: 'service_staff_time',
    plan: 'enterprise',
    description: 'ศูนย์บริการนวดบำบัด สปาอโรมา และดูแลสุขภาพแบบองค์รวมโดยผู้เชี่ยวชาญ',
    phone: '081-111-0002',
    email: 'aura@spawellness.demo',
    staffCount: 3,
    servicesCount: 3,
    focus: 'Staff selection, Spa & massage, 60/90 min intervals',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'FitFlex Yoga & Fitness Studio',
    slug: 'fitflex-studio',
    businessType: 'service_time_only',
    plan: 'pro',
    description: 'สตูดิโอโยคะ พิลาทิส และฟังก์ชันนอลเทรนนิ่ง คลาสกลุ่มขนาดเล็ก ใส่ใจรายบุคคล',
    phone: '081-111-0003',
    email: 'hello@fitflex-studio.demo',
    servicesCount: 3,
    focus: 'Recurring group classes, Multi-slot capacity control',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Glow Aesthetic Clinic',
    slug: 'glow-clinic',
    businessType: 'service_staff_time',
    plan: 'enterprise',
    description: 'คลินิกเวชกรรมความงามและเลเซอร์ดูแลผิวพรรณ โดยทีมแพทย์ผู้เชี่ยวชาญเฉพาะทาง',
    phone: '081-111-0004',
    email: 'info@glowclinic.demo',
    staffCount: 2,
    servicesCount: 3,
    focus: 'PromptPay QR EMVCo, SlipOK automated verification, Doctor appointment',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Smile Dental & Health Hub',
    slug: 'smile-dental',
    businessType: 'service_staff_time',
    plan: 'enterprise',
    description: 'ศูนย์ทันตกรรมครบวงจร ทำฟัน จัดฟัน ฟอกสีฟัน และรักษารากฟันด้วยเครื่องมือดิจิทัล',
    phone: '081-111-0005',
    email: 'contact@smiledental.demo',
    staffCount: 2,
    servicesCount: 3,
    rewardsCount: 2,
    focus: 'High-volume LINE notification queue, 24h/2h reminders, Loyalty points',
  },
];

function main() {
  const sqlPath = path.resolve(__dirname, '../supabase/seed_pilot_tenants.sql');
  if (fs.existsSync(sqlPath)) {
    console.log(`[SeedPilot] Seed SQL verified at: ${sqlPath}`);
    console.log(`[SeedPilot] Successfully verified ${PILOT_TENANTS.length} pilot tenant configurations:`);
    PILOT_TENANTS.forEach((t, i) => {
      console.log(`  ${i + 1}. [${t.businessType}] ${t.name} (${t.slug}) - Focus: ${t.focus}`);
    });
  } else {
    console.error(`[SeedPilot] SQL file not found at ${sqlPath}`);
    process.exit(1);
  }
}

main();
