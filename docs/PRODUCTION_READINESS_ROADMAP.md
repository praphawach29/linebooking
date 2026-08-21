# แผนพัฒนาสู่ Production Ready (Production Readiness Roadmap)

เอกสารนี้เป็นแผนหลักสำหรับปิดงาน LINE OA Booking SaaS ให้พร้อมเปิดใช้งานกับข้อมูลลูกค้าจริงในรูปแบบ Multi-tenant SaaS โดยอ้างอิงผลตรวจสอบ ณ วันที่ **21 สิงหาคม 2026** และ commit `1431f42`

> นิยาม "พร้อม 100%" ในเอกสารนี้หมายถึงผ่านเกณฑ์ Release Gate ที่กำหนดครบทุกข้อ ไม่ได้หมายความว่าระบบไม่มีความเสี่ยงเหลืออยู่เลย

---

## 1. สถานะตั้งต้น

| ด้าน | ระดับปัจจุบันโดยประมาณ | เป้าหมายก่อน GA |
|---|---:|---:|
| ความครบถ้วนของฟีเจอร์ | 85% | 95% ขึ้นไป |
| Backend และ business logic | 75% | 95% ขึ้นไป |
| Security และ tenant isolation | 25% | ผ่าน security gate 100% |
| CI/CD และ automated tests | 50% | ทุก required check ผ่าน |
| Operations และ incident readiness | 70% | ผ่าน restore/incident drill |
| ความพร้อมรวมสำหรับ Public SaaS | 45% | ผ่าน Release Gate ทุกข้อ |

### จุดแข็งที่มีอยู่แล้ว

- ระบบจองคิวแบบ atomic transaction และตรวจสอบเวลาซ้อน
- LIFF authentication และ merchant authentication
- LINE Flex Message พร้อม queue, retry, delivery audit และ quota snapshot
- QR check-in, payment, payment slip, loyalty, package และ customer profile
- Health/readiness endpoints, audit log และ pilot metrics
- Deployment, rollback, backup, monitoring และ incident runbooks

### ตัวหยุดการเปิด Production ในปัจจุบัน

- Migration `0030-0032` เปิดสิทธิ์ `anon` บน `bookings`, `users` และ `tenants`
- Browser ยังมี direct Supabase fallback สำหรับ booking mutation และ cleanup
- LINE credentials ยังเข้าถึงได้จาก frontend และมี unauthenticated LINE Push proxy
- มี Omise webhook สองเส้นทาง โดยหนึ่งเส้นทางไม่ได้ตรวจ charge กลับกับผู้ให้บริการ
- Frontend type-check และ backend lint ยังไม่ผ่าน ทำให้ CI เป็นสีแดง

---

## 2. หลักการดำเนินงาน

1. ห้ามเปิดรับร้านใหม่หรือข้อมูลลูกค้าจริงระหว่างที่ Phase 0 ยังไม่ผ่าน
2. ทุก mutation ที่มีผลต่อ booking, payment, tenant, LINE และ check-in ต้องผ่าน authenticated backend
3. ทุก phase ต้องมี test evidence และ rollback plan ก่อนถือว่าปิดงาน
4. Migration ต้องทดสอบจากฐานข้อมูลว่างและฐานข้อมูลที่มี migration เดิมครบแล้ว
5. ห้าม merge เข้า `main` หาก required CI checks ไม่ผ่าน
6. Production secrets ต้องไม่อยู่ใน browser, source code, Git history หรือ application log

---

## 3. Roadmap ภาพรวม

| Phase | เป้าหมาย | ระยะเวลาโดยประมาณ | เงื่อนไขเริ่ม |
|---|---|---:|---|
| Phase 0 | ปิดช่องโหว่และควบคุมความเสียหาย | 2-4 วัน | เริ่มทันที |
| Phase 1 | บังคับ server-only trust boundary | 3-6 วัน | Phase 0 ผ่าน |
| Phase 2 | ทำ CI, tests และ release controls ให้สมบูรณ์ | 4-7 วัน | Phase 0 ผ่าน |
| Phase 3 | Reliability, monitoring และ recovery | 5-8 วัน | Phase 1-2 ผ่าน |
| Phase 4 | SaaS lifecycle, compliance และ support tools | 7-12 วัน | Phase 2 ผ่าน |
| Phase 5 | Controlled production pilot | 2-4 สัปดาห์ | Phase 0-4 ผ่าน |
| Phase 6 | General Availability (GA) | 2-3 วัน | Pilot ผ่านเกณฑ์ |

ระยะเวลาเป็น effort โดยประมาณสำหรับนักพัฒนา 1 คน งานบางส่วนสามารถทำคู่ขนานได้หลัง Phase 0

---

## 4. Phase 0: Security Emergency

**เป้าหมาย:** ปิดการเข้าถึงข้อมูลข้ามร้านและนำ Production กลับสู่ขอบเขตความปลอดภัยที่ยอมรับได้

### งานที่ต้องทำ

- [x] สร้าง migration ใหม่เพื่อ `REVOKE` สิทธิ์ `anon/authenticated` ที่เปิดโดย `0030-0032`
- [x] ลบ policy แบบ `USING (true)` และ `WITH CHECK (true)` จากตาราง sensitive
- [x] กำหนด tenant-scoped policy สำหรับ merchant และปิด browser mutation สำหรับ customer
- [x] ยกเลิกสิทธิ์ `anon/authenticated` ในการเรียก `cleanup_stale_pending_bookings`
- [x] ย้าย cleanup เป็น backend job หรือ merchant endpoint ที่ตรวจ tenant ownership
- [x] ตรวจสอบว่า public views เปิดเผยเฉพาะข้อมูลร้านและสล็อตที่จำเป็น
- [ ] หมุน LINE Channel Access Token และ Channel Secret ของร้านที่ใช้งานจริง
- [ ] ตรวจ log และ audit history เพื่อหาการอ่านหรือแก้ไขข้อมูลผิดปกติย้อนหลัง
- [x] จัดทำ SQL rollback script สำหรับ migration แก้ไข

### Tests ที่ต้องเพิ่ม

- [x] `anon` อ่าน `tenants/users/bookings` โดยตรงไม่ได้
- [ ] Merchant ร้าน A อ่านหรือแก้ไขร้าน B ไม่ได้
- [ ] Customer A อ่าน booking ของ Customer B ไม่ได้
- [x] `anon` เรียก cleanup RPC ไม่ได้
- [x] Public tenant/availability endpoints ยังใช้งานได้หลัง hardening
- [ ] Tests ต้องรันกับฐานข้อมูลหลัง apply migration ทุกไฟล์ตามลำดับจริง

### Acceptance criteria

- ไม่มี P0 tenant-isolation finding
- Security regression tests ผ่านทั้งหมด
- Production database ผ่าน privilege audit
- มีหลักฐานการหมุน LINE credentials และบันทึกผู้ดำเนินการ

### ผู้รับผิดชอบหลัก

Backend/Database Engineer, Security Reviewer และผู้ดูแล Supabase Production

---

## 5. Phase 1: Server-only Trust Boundary

**เป้าหมาย:** ให้ backend เป็นผู้ตัดสินใจเพียงจุดเดียวสำหรับข้อมูลและธุรกรรมสำคัญ

### Booking และ merchant actions

- [ ] ลบ direct Supabase insert/update/delete/RPC fallback จาก `src/lib/booking-client.ts`
- [ ] เมื่อ backend ล่ม ให้แสดง retryable error และไม่สร้าง booking response จำลอง
- [ ] บังคับ booking create, status update, payment confirmation, reschedule, cancellation และ cleanup ผ่าน backend
- [ ] ตรวจ tenant ownership และ actor role ในทุก merchant endpoint
- [ ] เพิ่ม idempotency key สำหรับ create booking และ payment mutation

### LINE Messaging

- [ ] ปิด `api/line-push.js` หรือเปลี่ยนให้เป็น authenticated server-to-server endpoint
- [ ] นำ Channel Access Token และ Channel Secret ออกจาก frontend state และ API response
- [ ] เก็บ LINE secrets แบบ encrypted at rest หรือใน secret manager ที่เหมาะสม
- [ ] ส่ง LINE ผ่าน BullMQ worker เท่านั้น
- [ ] เพิ่ม recipient validation, tenant ownership, throttling และ idempotency
- [ ] รองรับ retry แบบ bounded backoff และ dead-letter handling

### Payment

- [ ] ปิด `/webhooks/omise` ที่เชื่อ payload โดยตรง
- [ ] ใช้ `/billing/webhook` เพียงเส้นทางเดียว
- [ ] ตรวจ charge กลับกับ Omise และตรวจ `invoice_id`, `tenant_id`, amount และ currency
- [ ] ทำ webhook idempotency และเก็บ provider event ID
- [ ] เพิ่ม reconciliation job สำหรับ payment ที่ค้างหรือตกหล่น

### Authentication configuration

- [ ] ลบ service-role fallback ออกจาก `getSupabaseAnonKey()`
- [ ] แยก environment variables ของ public key และ privileged key ชัดเจน
- [ ] ทำ fail-fast validation เมื่อ production environment ขาดค่าจำเป็น

### Acceptance criteria

- Browser bundle และ network response ไม่มี LINE/Supabase privileged secrets
- การปิด backend ทำให้การ mutation ล้มเหลวอย่างปลอดภัย ไม่มีข้อมูลจำลอง
- Negative authorization tests ผ่านทุก endpoint สำคัญ
- Payment และ LINE duplicate events ไม่สร้างผลซ้ำ

---

## 6. Phase 2: CI, Tests และ Release Controls

**เป้าหมาย:** ทุก release มีหลักฐานอัตโนมัติว่าสามารถ build, deploy และรักษาขอบเขตธุรกิจได้

### แก้ quality gates ปัจจุบัน

- [ ] แก้ frontend TypeScript errors ทั้งหมด
- [ ] แก้ backend ESLint errors และลด warnings ให้ต่ำกว่า threshold
- [ ] ทำให้ frontend/backend build ผ่านจาก clean install
- [ ] ทำให้ GitHub Actions `Verify` ผ่านครบทุก job

### เพิ่ม test coverage ที่จำเป็น

- [ ] RLS และ tenant-isolation integration tests
- [ ] Booking concurrency: สล็อตสุดท้าย, request ซ้ำ และ transaction conflict
- [ ] LIFF token: หมดอายุ, issuer/audience ผิด และ customer ผิด tenant
- [ ] Payment: success, failed, duplicate, refund และ reconciliation
- [ ] LINE: sent, failed, retry, invalid token, quota warning และ worker restart
- [ ] QR check-in: ผิดร้าน, booking ยกเลิก, check-in ซ้ำ และ code หมดอายุ
- [ ] Migration smoke test จากฐานเปล่าและ snapshot ของ production schema
- [ ] Critical user-flow E2E: onboarding -> booking -> payment -> confirmation -> check-in -> completion

### Release controls

- [ ] เปิด branch protection บน `main`
- [ ] บังคับ PR review และ required checks
- [ ] แยก Staging environment จาก Production
- [ ] เพิ่ม deploy approval ก่อน promote Production
- [ ] บันทึก deployment version/commit ใน health endpoint

### Acceptance criteria

- CI เขียวติดต่อกันอย่างน้อย 10 runs บน `main`
- ไม่มี skipped test ใน critical flows
- E2E และ migration tests ผ่านใน environment ที่มี PostgreSQL และ Redis จริง
- Rollback ของ frontend/backend และ migration ผ่านการทดลองหนึ่งรอบ

---

## 7. Phase 3: Reliability, Monitoring และ Recovery

**เป้าหมาย:** ตรวจพบปัญหาเร็ว กู้ระบบได้จริง และมีเป้าหมายประสิทธิภาพที่วัดได้

### Service Level Objectives

- [ ] API availability เป้าหมายอย่างน้อย 99.9% ต่อเดือน
- [ ] Booking API p95 ต่ำกว่า 500 ms ในภาระปกติ
- [ ] Booking success rate อย่างน้อย 99.5% โดยไม่รวม validation error
- [ ] LINE delivery success rate อย่างน้อย 98% สำหรับ token ที่ใช้งานได้
- [ ] Payment reconciliation gap เท่ากับ 0 เมื่อจบรอบรายวัน

### Monitoring และ alerts

- [ ] ติดตั้ง frontend/backend error tracking พร้อม release version
- [ ] Uptime monitor สำหรับ frontend, `/health` และ `/ready`
- [ ] Alert เมื่อ error rate, latency, DB connection, Redis หรือ queue backlog เกิน threshold
- [ ] Alert LINE quota 70%, 85%, 95% โดยไม่บล็อกการส่ง
- [ ] Alert payment webhook/reconciliation failure
- [ ] Redact token, secret, authorization header และ PII จาก log

### Load และ failure tests

- [ ] ทดสอบ booking พร้อมกันอย่างน้อย 50-100 requests
- [ ] ทดสอบ connection pool และ transaction contention
- [ ] Restart Railway ระหว่าง queue processing และยืนยันว่า job ไม่หาย/ไม่ซ้ำ
- [ ] จำลอง Redis/LINE/Omise/Supabase timeout
- [ ] ตรวจ graceful shutdown ของ worker และ API

### Backup และ recovery

- [ ] กำหนด RPO ไม่เกิน 1 ชั่วโมง และ RTO ไม่เกิน 4 ชั่วโมง หรือค่าที่ธุรกิจอนุมัติ
- [ ] เปิด backup/PITR ตามแพ็กเกจฐานข้อมูล
- [ ] Restore backup ลง isolated environment และตรวจ data integrity
- [ ] ซ้อม incident และ rollback ตาม runbook
- [ ] บันทึกผล restore drill พร้อมเวลาและผู้รับผิดชอบ

### Acceptance criteria

- Monitoring ส่ง alert ทดสอบถึงช่องทาง on-call สำเร็จ
- Load test ผ่าน SLO และไม่เกิด double booking
- Restore drill ผ่านภายใน RTO
- Queue recovery ไม่มี lost jobs และไม่มี duplicate customer effect

---

## 8. Phase 4: SaaS Lifecycle, Compliance และ Support

**เป้าหมาย:** ระบบดูแลวงจรชีวิตร้านค้า ข้อมูลส่วนบุคคล และเหตุสนับสนุนได้ครบ

### Subscription lifecycle

- [ ] Trial, subscribe, upgrade, downgrade, renew, cancel และ past-due ทำงานครบ
- [ ] Enforcement แพ็กเกจอยู่ที่ backend ไม่ใช่แค่ซ่อน UI
- [ ] มี grace period และ read-only mode เมื่อหมดอายุ
- [ ] Billing webhook มี idempotency และ reconciliation
- [ ] แสดง invoice/receipt และประวัติการเปลี่ยนแพ็กเกจ

### Data lifecycle และ PDPA

- [ ] Privacy Policy, Terms of Service และ consent record
- [ ] แจ้งวัตถุประสงค์การใช้ LINE profile, เบอร์โทร และประวัติการจอง
- [ ] รองรับ export, correction และ deletion request
- [ ] กำหนด retention ของ booking, audit log, payment evidence และ backups
- [ ] กระบวนการปิดร้านต้อง revoke access และลบ/เก็บข้อมูลตามนโยบาย

### Merchant onboarding

- [ ] Setup checklist สำหรับร้าน, บริการ, เวลา, payment, LINE และ test booking
- [ ] ตรวจค่าที่ขาดหรือผิดก่อนเปิดร้าน
- [ ] ปุ่มทดสอบ LINE connection, payment webhook และ PromptPay
- [ ] แยกข้อมูลทดลองจากข้อมูลจริงและมีวิธีลบข้อมูลทดลอง

### Support และ platform administration

- [ ] ค้นหา tenant, user, booking, invoice และ LINE delivery ได้แบบ tenant-scoped
- [ ] Retry failed LINE delivery และ payment reconciliation อย่างมี audit
- [ ] ระงับ tenant/user พร้อม reason และ audit trail
- [ ] Platform admin ใช้ least privilege และ MFA
- [ ] จัดทำ support SLA และ escalation contacts ที่เป็นข้อมูลจริง

### Acceptance criteria

- Subscription state ทุกแบบผ่าน test matrix
- เอกสารกฎหมายได้รับการอนุมัติจากเจ้าของธุรกิจ/ที่ปรึกษา
- Data export/deletion rehearsal ผ่าน
- Support สามารถแก้เหตุจำลองโดยไม่ใช้ direct database edit

---

## 9. Phase 5: Controlled Production Pilot

**เป้าหมาย:** พิสูจน์ระบบกับร้านจริงจำนวนจำกัดก่อนเปิดทั่วไป

### ขอบเขต Pilot

- ร้านนำร่อง 3-5 ร้าน
- ระยะเวลาอย่างน้อย 2-4 สัปดาห์
- เปิดเฉพาะฟีเจอร์ที่ผ่าน Release Gate แล้ว
- มีช่องทางติดต่อและ on-call owner ชัดเจน

### ตัวชี้วัดที่เก็บทุกวัน

| ตัวชี้วัด | เกณฑ์ผ่าน |
|---|---:|
| ข้อมูลข้าม tenant | 0 เหตุการณ์ |
| Double booking จากระบบ | 0 เหตุการณ์ |
| Payment สูญหาย/ยืนยันผิด | 0 เหตุการณ์ |
| Booking success rate | >= 99.5% |
| LINE delivery success | >= 98% สำหรับ token ปกติ |
| P0/P1 unresolved | 0 รายการ |
| Restore/rollback readiness | ผ่านการซ้อม |

### Pilot exit criteria

- ทำงานครบระยะเวลาที่กำหนด
- ไม่มี security breach หรือ data loss
- P0/P1 ทั้งหมดปิดและมี regression test
- ร้านนำร่องยืนยัน workflow จอง ชำระเงิน แจ้งเตือน และ check-in
- เจ้าของผลิตภัณฑ์ลงนามอนุมัติ Go-Live

---

## 10. Phase 6: General Availability

### ก่อนเปิด GA

- [ ] Run final production privilege audit
- [ ] Freeze schema/code ก่อนเปิดอย่างน้อย 24-48 ชั่วโมง
- [ ] สำรองฐานข้อมูลและตรวจ restore point
- [ ] ตรวจ Production environment variables และ secret rotation dates
- [ ] ตรวจ LINE/LIFF callback, payment webhook และ public domains
- [ ] ตรวจ on-call schedule, incident channel และ status communication
- [ ] จัดทำ release notes และ known limitations

### หลังเปิด GA 7 วันแรก

- [ ] ตรวจ metrics และ error dashboard ทุกวัน
- [ ] ทบทวน failed booking/payment/LINE delivery ทุกวัน
- [ ] จำกัดการเปลี่ยน schema เฉพาะ emergency fix
- [ ] สรุป launch review และจัดลำดับปัญหาที่พบ

---

## 11. Definition of Done ต่อหนึ่งงาน

งานหนึ่งรายการจะถือว่าเสร็จเมื่อครบทุกข้อ:

- Code และ migration ผ่าน review
- มี automated test ครอบคลุม happy path และ negative authorization path
- CI ผ่านจาก clean environment
- ไม่มี secret หรือ PII ใน source/log
- มี migration/rollback note เมื่อกระทบฐานข้อมูล
- เอกสาร setup/runbook ได้รับการอัปเดต
- มี test evidence หรือ screenshot/log ที่ไม่เปิดเผยข้อมูลสำคัญ
- Deploy Staging และ smoke test ผ่านก่อน Production

---

## 12. Release Gate: นิยาม Production Ready 100%

| Gate | เกณฑ์ | สถานะเริ่มต้น |
|---|---|---|
| Security | ไม่มี P0/P1, tenant isolation ผ่าน | BLOCKED |
| Secrets | ไม่มี privileged secret ใน browser/Git/log | BLOCKED |
| CI | Required checks ผ่าน 10 runs ติดต่อกัน | BLOCKED |
| Critical E2E | Booking/payment/LINE/check-in ผ่าน | BLOCKED |
| Migration | Fresh + upgrade + rollback tests ผ่าน | BLOCKED |
| Reliability | Load/failure tests ผ่าน SLO | NOT STARTED |
| Observability | Alerts และ dashboards ทดสอบแล้ว | PARTIAL |
| Recovery | Restore drill ผ่าน RPO/RTO | PARTIAL |
| SaaS lifecycle | Subscription และ enforcement ผ่าน | PARTIAL |
| Compliance | PDPA/Terms/retention พร้อม | PARTIAL |
| Pilot | 3-5 ร้าน ผ่าน 2-4 สัปดาห์ | NOT STARTED |
| Go-Live approval | Product/Engineering/Operations อนุมัติ | NOT STARTED |

**การตัดสินใจ:** เปิด GA ได้ต่อเมื่อทุก Gate เป็น `PASS` เท่านั้น การผ่านฟีเจอร์หรือ UI ไม่สามารถชดเชย Security, Data Integrity หรือ Recovery Gate ที่ยังไม่ผ่านได้

---

## 13. ลำดับการเริ่มงานที่แนะนำ

1. เริ่ม Phase 0 ด้วย migration ปิด RLS regression และ privilege tests
2. ทำ Phase 1 โดยลบ browser mutation fallback และปิด LINE/payment endpoints ที่ไม่ปลอดภัย
3. ทำ Phase 2 ควบคู่ช่วงท้าย Phase 1 เพื่อให้ CI เป็นตัวป้องกัน regression
4. ทำ Phase 3 และ Phase 4 คู่ขนานหลัง security gate ผ่าน
5. Deploy Staging, ซ้อม migration/rollback/restore แล้วเริ่ม Pilot
6. ประเมิน Pilot exit criteria และลงนาม Go-Live ก่อน GA

### เอกสารที่ใช้ร่วมกัน

- `docs/FINAL_RELEASE_GATE_REPORT.md`
- `docs/DEPLOY_AND_ROLLBACK_GUIDE.md`
- `docs/MONITORING_AND_ALERTS.md`
- `docs/BACKUP_AND_RESTORE_PROCEDURE.md`
- `docs/INCIDENT_RESPONSE_RUNBOOK.md`
- `docs/DATA_RETENTION_POLICY.md`
- `docs/MERCHANT_ONBOARDING_GUIDE.md`
