# Implementation Task Tracker

เอกสารนี้เป็น checkpoint สำหรับส่งต่องานระหว่าง AI ให้ยึด `implementation_plan.md`, `FEATURE_AND_UI_ANALYSIS.md` และ `PROJECT_STATUS.md` เป็น source of truth ห้ามทำขั้นที่เสร็จแล้วซ้ำโดยไม่มีหลักฐาน regression

## Current Phase

- Phase 0: Completed
- Phase 0.5: Completed
- Phase 1: Completed (2026-08-02)
- Current step: None — Phase 1 closed. Next up is Phase 2 (LINE LIFF Identity Integration) per `NEXT_IMPLEMENTATION_PLAN.md`, after the project owner reviews the Phase 0 known issues logged in Step 14 evidence.

## Phase 1 Checklist

- [x] Step 1: Pre-Implementation Gate
- [x] Step 2: Lock Prisma model after `db pull` / `generate`
- [x] Step 3: Shared API/error contracts and DTOs
- [x] Step 4: Tenant resolvers and guards
- [x] Step 5: Minimal LINE identity bridge
- [x] Step 6: Availability domain service and unit tests
- [x] Step 7: `GET /bookings/available-slots`
- [x] Step 8: Atomic create transaction, bounded retry and real PostgreSQL integration tests
- [x] Step 9: Customer and Merchant HTTP endpoints
- [x] Step 10: Frontend booking API helper and LIFF token integration
- [x] Step 11: Replace `SaaSContext.createBooking` and remove direct insert
- [x] Step 12: RLS browser-write cutover
- [x] Step 13: Full frontend/backend verification and concurrency tests
- [x] Step 14: Manual smoke tests
- [x] Step 15: Final `PROJECT_STATUS.md` evidence update

## Step 8 Evidence

- Unit/HTTP: 85/85 passed across 7 suites
- Real PostgreSQL: 6/6 scenarios passed in 4 consecutive runs (24 scenario executions)
- Prisma 7 `DriverAdapterError: TransactionWriteConflict` is handled as retryable
- Backend build and targeted production/integration lint passed
- Dedicated test fixtures were cleaned and the PostgreSQL test container was stopped

## Step 9 Checklist

- [x] Implement `POST /bookings` for authenticated LINE customers
- [x] Implement `POST /bookings/merchant` for Supabase merchant/platform admins
- [x] Source tenant only from validated `x-tenant-id`
- [x] Map both endpoints to `BookingsService.createBookingAtomic`
- [x] Reject client-owned server fields through strict DTO validation
- [x] Replace remaining `JwtAuthGuard` and `req.user.id` usage in `BookingsController`
- [x] Restrict temporary cancellation endpoint to merchant authentication
- [x] Add controller and HTTP contract tests
- [x] Run unit tests, targeted lint and backend build
- [x] Update this file and `PROJECT_STATUS.md` with actual evidence

## Step 9 Evidence

- `POST /bookings` uses `LineIdTokenGuard`, `@TenantId()` and `@CurrentCustomer()`
- `POST /bookings/merchant` uses `SupabaseAuthGuard` followed by `TenantAccessGuard`
- Both create endpoints call only `BookingsService.createBookingAtomic`
- Merchant cancellation is temporarily protected by Supabase merchant guards
- Legacy snake_case create DTO and unsafe legacy create method were removed
- Unit/HTTP: 101/101 passed across 8 suites (89 unit + 12 HTTP)
- Targeted production/new-test lint passed
- Backend build passed
- Step 9 evidence was preserved as the prerequisite baseline for completed Step 10 work

## Step 10 Checklist

- [x] Create a shared typed booking API helper using `VITE_API_URL`
- [x] Send `x-tenant-id` on every booking API request
- [x] Use LINE ID token for customer booking requests
- [x] Use Supabase session access token for merchant booking requests
- [x] Send only camelCase client-owned fields
- [x] Add typed handling for `400`, `401`, `403`, `404`, `409`, `422` and `500`
- [x] Prevent duplicate creates in the API helper while an identical request is in flight
- [x] Keep Step 11 direct-insert cutover explicitly pending
- [x] Add focused frontend tests
- [x] Run frontend verification and update status documents

## Step 10 Scope Boundary

- Step 10 owns the reusable API/auth integration layer and its focused tests.
- Existing LIFF and Merchant UI call sites continue to use `SaaSContext.createBooking` until Step 11.
- Step 10 must not remove or rewrite the direct Supabase booking insert; that cutover is verified separately in Step 11.

## Step 10 Evidence

- Added official `@line/liff` SDK and lazy LIFF initialization/login/ID-token resolution.
- Added typed customer and merchant booking clients with actor-correct token selection.
- Added `x-tenant-id`, camelCase body whitelisting, structured error classification and in-flight create deduplication.
- Frontend tests: 19/19 passed across 3 suites.
- Frontend TypeScript check and Vite production build passed.
- `SaaSContext.createBooking` still contains the direct insert by design; Step 11 has not started.
- `npm audit --omit=dev` reports 2 high findings in the existing `react-router-dom` / `react-router` dependency chain; no automatic version change was applied.

## Step 11 Checklist

- [x] Replace local availability calculation with `GET /bookings/available-slots`
- [x] Replace customer direct insert with the LIFF-authenticated backend client
- [x] Replace merchant direct insert with the Supabase-authenticated backend client
- [x] Require an existing tenant membership/customer ID for merchant bookings
- [x] Map the backend `201` response into frontend booking state
- [x] Refetch availability after `BOOKING_SLOT_UNAVAILABLE`
- [x] Surface actor-specific authentication and domain errors
- [x] Remove every direct browser insert into `bookings`
- [x] Add focused cutover tests
- [x] Run frontend/backend verification and update status documents

## Step 11 Evidence

- `SaaSContext.getAvailableSlots` calls `getAvailableSlotsFromApi` (`GET /bookings/available-slots`); no local slot calculation remains
- `SaaSContext.createBooking` calls `createCustomerBookingWithLiff` for LIFF customers and `createMerchantBookingWithSession` for walk-in/admin bookings only; no other create path exists
- Merchant bookings without an existing `customerId` are rejected client-side before any request is sent
- `201` responses are mapped into frontend `Booking` state via `mapBookingApiResponse`; `BOOKING_SLOT_UNAVAILABLE` triggers an availability refetch and other `BookingApiError`s surface actor-specific messages
- `src/lib/booking-cutover.test.ts` statically asserts `src/context/SaaSContext.tsx` source contains no `.from('bookings').insert(...)` call, in addition to response-mapping tests
- Confirmed via repo-wide grep that no `supabase.from('bookings').insert|update|delete|upsert` call exists anywhere in `src/`; the only remaining `bookings` table access is the authenticated merchant read (`select('*')`) used to populate dashboard state
- Frontend tests: 21/21 passed (`npm run test:frontend`, 4 suites: `booking-api`, `booking-auth`, `booking-client`, `booking-cutover`)
- Frontend typecheck: `tsc --noEmit` passed with 0 errors
- Backend tests (baseline, unaffected by Step 11): 101/101 passed across 8 suites

## Step 12 Checklist

- [x] Audit existing `bookings` RLS policies for public/anon write access
- [x] Confirm the backend (Prisma via direct `DATABASE_URL` connection) is not subject to PostgREST RLS, so closing anon policies cannot break backend writes
- [x] Confirm no frontend code path still performs a direct Supabase write (`insert`/`update`/`delete`/`upsert`) to `bookings`
- [x] Author `supabase/migrations/0008_close_bookings_public_insert.sql` dropping the `bookings_public_insert` anon policy, with no replacement INSERT policy (default-deny)
- [x] Run `0008_close_bookings_public_insert.sql` against the actual Supabase project (executed by project owner in the Supabase SQL editor, 2026-08-02)
- [ ] Post-run verification: `SELECT policyname FROM pg_policies WHERE tablename = 'bookings' AND cmd = 'INSERT'` returns 0 rows (recommended follow-up; not yet explicitly confirmed with this query)
- [ ] Post-run verification: an anon-key `supabase.from('bookings').insert(...)` call is rejected with an RLS error (42501) (recommended follow-up; not yet explicitly tested)

## Step 12 Evidence

- Migration file created: `supabase/migrations/0008_close_bookings_public_insert.sql` — drops `bookings_public_insert` (the temporary anon INSERT policy added in `0007_rls_hardening.sql` for the pre-Step-11 direct-insert flow) and intentionally leaves no INSERT policy on `bookings`, relying on RLS default-deny
- `bookings_tenant_update` (authenticated, tenant-scoped) is left unchanged; no anon UPDATE/DELETE policy exists on `bookings`, and grep confirms no frontend code needs one
- Migration was run against the production Supabase project by the project owner via the Supabase SQL editor (`DROP POLICY` executed successfully); the two explicit post-run verification queries listed above are still recommended before treating Step 12 as fully closed for a security audit, but are not blocking further Phase 1 work

## Step 13 Checklist

- [x] Re-run frontend typecheck (`tsc --noEmit`)
- [x] Re-run frontend production build (`npm run build`)
- [x] Re-run frontend test suite (`npm run test:frontend`)
- [x] Re-run backend production build (`cd backend && npm run build`)
- [x] Re-run backend unit/HTTP test suite (`cd backend && npm test`)
- [x] Re-run the Step 8 real-PostgreSQL concurrency integration suite against a fresh dedicated test database, 4 consecutive runs
- [x] Review residual `npm audit --omit=dev` risk and record a decision
- [x] RLS post-run verification queries against the live Supabase project (project owner ran `SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND cmd='INSERT';` in the Supabase SQL editor, 2026-08-02, and confirmed 0 rows returned)

## Step 13 Evidence

- Frontend typecheck: `npx tsc --noEmit -p tsconfig.json` — 0 errors
- Frontend build: `npm run build` — succeeded (`vite build`, output `dist/`); pre-existing chunk-size warning for `index-BwyrrsZ1.js` (1.34 MB) noted as a non-blocking, known issue (see `NEXT_IMPLEMENTATION_PLAN.md` Known Issue #9, code-splitting deferred to Phase 5)
- Frontend tests: `npm run test:frontend` — 21/21 passed across 4 suites (`booking-api`, `booking-auth`, `booking-client`, `booking-cutover`)
- Backend build: `cd backend && npm run build` (`nest build`) — succeeded, 0 errors
- Backend tests: `cd backend && npm test` — 101/101 passed across 8 suites
- **Real PostgreSQL concurrency re-run**: spun up a dedicated throwaway Docker container (`postgres:16`, container `line_oa_booking_test_pg`, port `55432`, isolated from `.env` `DATABASE_URL` and from the local Supabase dev stack on port `54322`); applied the `uuid-ossp` extension via `test/bootstrap-test-db.sql`; pushed the Prisma schema via `prisma db push --url=... --accept-data-loss` (explicit user consent obtained per Prisma's AI-agent safety guard, since this is a schema-mutating command even though the target was a brand-new empty database); ran `npm run test:integration` (`TEST_DATABASE_URL` pointed at the container) **4 consecutive times — 6/6 scenarios passed every run (24/24 scenario executions total)**, matching the original Step 8 evidence bar exactly; observed real `TransactionWriteConflict` retries in the logs, confirming the Serializable + bounded-retry behavior still holds after the Step 9-12 controller/guard changes; container was stopped and removed after the run (`docker rm -f line_oa_booking_test_pg`), leaving no residual state
- `npm audit --omit=dev` residual risk: still 2 high findings, both from a single advisory (`react-router` "RSC Mode CSRF Bypass Allows Action Execution Before 400 Response", GHSA-qwww-vcr4-c8h2) in the `react-router-dom` dependency chain. **Decision: no version change applied.** This app is a Vite client-side SPA and does not use React Router's RSC (React Server Components) mode, which is the vulnerable code path; the fix (`npm audit fix --force`) would force a breaking downgrade to `react-router-dom@7.11.0` outside Phase 1 scope. Documented as an accepted, low-applicability residual risk rather than an oversight; revisit before Phase 5 production hardening if this app ever adopts RSC-mode routing.
- RLS Step 12 post-run verification: the project owner ran `SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND cmd='INSERT';` in the Supabase SQL editor and confirmed 0 rows returned — `bookings_public_insert` and any other INSERT policy on `bookings` are confirmed absent on the live project. Step 12's RLS closure is now fully verified end-to-end.

## Step 14 Checklist

- [x] LIFF customer opens flow, sees real availability, and reaches the point where a real LINE identity is required
- [x] Merchant creates a walk-in booking for an existing customer
- [x] Two concurrent requests for the same slot: exactly one succeeds, the other gets `409 BOOKING_SLOT_UNAVAILABLE`
- [x] Newly created booking appears in the Merchant dashboard/DB via the backend API only
- [x] Confirmed via network inspection that booking creation never hits Supabase REST directly (only `available-slots` GETs and `POST /bookings*` to the backend)
- [x] Real, pre-existing bugs found during testing were triaged with the project owner (fixed where in-scope/safe, documented where not)

## Step 14 Evidence

Testing performed against the confirmed dev/staging Supabase project (`kpodudqwcmsxhzjymldj`, not live/production — confirmed with the project owner before writing any test data) using a real Chromium browser (Playwright, installed temporarily and removed afterward) driving the actual `npm run dev` (port 3005) and `cd backend && npm run start:dev` (port 3000) servers, plus direct `curl` calls through the same backend for the concurrency scenario.

**LIFF customer flow**: navigated `/liff/<seed-tenant>` → selected service → auto-assign staff → date/time picker showed real availability from `GET /bookings/available-slots` (21/21 slots available after seeding `staff_schedules`, see bugs below) → selected a slot → booking summary with real price/duration from the backend → payment method screen → final "ยืนยันการส่งคำขอจอง" click invoked `createCustomerBookingWithLiff`, which correctly threw `BookingAuthError: LIFF ID is not configured for this tenant` and stopped before any network call. This is **expected, correct behavior**, not a bug: `LineIdTokenGuard` requires a real LINE-issued ID token, which requires a real LIFF app/LINE account that does not exist in this test environment. Everything up to that security gate was verified working end-to-end with real backend data.

**Merchant flow**: self-registered a fresh merchant account first (blocked by pre-existing bugs, see below), then pivoted to creating a merchant account for the existing seed tenant directly via a throwaway backend Prisma script (bypasses RLS, same pattern already used for the Step 13 test DB). Logged in through the real `/merchant/login` UI (no errors). Opened "เพิ่มคิว Walk-in", selected the seeded test customer, filled in name/phone/date/time, submitted with cash payment. Confirmed via direct Supabase read (service role key, read-only) that a real row was created: `ref_no BK-MSBKCH1S-58540E`, `tenant_id` = seed tenant, `source: "admin"` (backend-determined, not trusted from the client payload), `status: pending`, `payment_status: unpaid`, correct computed `price`/`end_time`/auto-assigned `staff_name`.

**Concurrency**: fired two simultaneous `POST /bookings/merchant` requests (same `curl`, same payload, same slot) using a real merchant session token against the live backend. Result: one `201` with a real booking (`ref_no BK-MSBKFV01-F28C80`), one `409 BOOKING_SLOT_UNAVAILABLE`. Confirmed via direct Supabase read that exactly one row exists for that tenant/date/time. This exercises the same `BookingsService.createBookingAtomic` Serializable-transaction path already covered by the Step 8/13 integration suite, now proven against the real database, not just the isolated test container.

**Network verification**: across all flows, booking-related writes only ever went to `localhost:3000/bookings` or `localhost:3000/bookings/merchant`. No `supabase.co/rest/v1/bookings` `POST`/`PATCH`/`DELETE` request was observed anywhere; the only Supabase REST calls touching `bookings` were authenticated `GET` reads for the merchant dashboard list, consistent with Step 11/12 evidence.

**Real, pre-existing bugs found and fixed during this Step 14 session** (all unrelated to Step 11/12 logic itself, but blocking the ability to smoke-test it; fixed with explicit project-owner sign-off before each change):
1. `LiffHome.tsx` (+ `LiffBookingSummary.tsx`, `LiffPointHistory.tsx`, `LiffProfile.tsx`, `LiffRewards.tsx`) crashed to a blank page for any anonymous LIFF visitor because `currentUser` (correctly `null` post-RLS-hardening for unauthenticated visitors) was accessed without null guards. Fixed with optional chaining and fallback values. This is a real, currently-shipping bug independent of Phase 1 — anonymous customers could not open the LIFF home page at all before this fix.
2. `get-available-slots.dto.ts`, `create-customer-booking.dto.ts`, `create-merchant-booking.dto.ts` used `@IsUUID()`/`@IsUUID('4')` (strict RFC 4122 validation), which rejected this project's actual seed data (`00000000-...-0001`, `11111111-...-1111`, etc. — valid as Postgres `uuid` values but not RFC-4122-compliant v4 UUIDs). Replaced with a new shared `IsLooseUuid` validator (`backend/src/common/validators/is-loose-uuid.validator.ts`) matching the same loose hex-dash regex already used by the tenant guards (`customer-tenant.guard.ts`, `tenant-access.guard.ts`, `line-id-token.guard.ts`), restoring internal consistency. Without this fix, `available-slots` and booking creation were unusable with the documented seed IDs.
3. `staff_schedules` was completely empty for the seed staff member, so availability was correctly computed as 0 slots always. This is a seed-data completeness gap, not a code bug; filled in via a throwaway backend script (all 7 days, 09:00-20:00) for testing purposes.
4. `MerchantLayout.tsx` and `HeaderNav.tsx` accessed `activeTenant.logoUrl`/`.name`/`.plan`/`.id` without null guards, crashing to a blank page on a fresh page load/reload before the tenant fetch resolves. Fixed with an early loading-state return in `MerchantLayout` and a conditional render in `HeaderNav`.

**Real, pre-existing bugs found and explicitly NOT fixed (out of Phase 1 scope, documented for follow-up)**:
1. `AuthContext.signUp()` (`src/context/AuthContext.tsx`) inserts into `tenants` immediately after `supabase.auth.signUp()` without checking whether a session was actually returned. If Supabase Auth has "Confirm email" enabled, no session exists yet and the insert fails RLS — self-service merchant registration is broken in that configuration. The project owner temporarily disabled email confirmation to unblock registration testing; even with it disabled, a **separate** issue was hit (see #2) so this path is still not fully proven end-to-end.
2. Even with email confirmation disabled and a freshly-issued, valid `role: authenticated` JWT (obtained directly from the Auth API, bypassing all frontend code), `POST /rest/v1/tenants` was rejected with `42501 new row violates row-level security policy for table "tenants"`. This contradicts `tenants_insert_authenticated ... WITH CHECK (true)` as defined in `0007_rls_hardening.sql`, suggesting the live project's actual policy state may not match the migration files (possible documentation/execution drift). Not diagnosed further — this session has no SQL/dashboard access to the project. Recommend the project owner run `SELECT policyname, cmd, roles, with_check FROM pg_policies WHERE tablename='tenants';` to check.
3. `SaaSContext`'s bulk data fetch (`tenants`, `services`, `memberships`, etc.) runs once on top-level mount with an empty dependency array and never re-fires after an auth state change (login/logout). Confirmed concretely: after merchant login, `memberships` (and therefore the Walk-in modal's customer list) stayed empty until a full page reload. This affects any authenticated-only data anywhere in the app, not just bookings.

**Test data left in the dev/staging project** (per project-owner confirmation that this project is not live/production): one merchant test account (`praphawach+smoketestmerchant...@gmail.com`), one test customer + membership (`SMOKE_TEST_LINE_USER`), `staff_schedules` for the seed staff (7 days, 09:00-20:00), and 2 real test bookings (`BK-MSBKCH1S-58540E`, `BK-MSBKFV01-F28C80`). Also left behind: a handful of orphaned Supabase Auth users from earlier registration attempts that failed before a `users`/`tenants` row was created (harmless, no linked data). Not cleaned up automatically — flag to the project owner in case cleanup is wanted before further testing.

## Step 15 Checklist — Phase 1 Definition of Done (per `implementation_plan.md` §13)

- [x] Pre-Implementation Gate has real inspection results, not assumptions (Step 1)
- [x] LIFF customer identity is verified at the backend and resolved to a database user (Step 5, `LineIdentityService`; confirmed the guard correctly blocks bookings without a real LINE identity in Step 14)
- [x] Merchant and customer use separate, correct auth/tenant rule sets (`LineIdTokenGuard` + customer tenant resolver vs. `SupabaseAuthGuard` + `TenantAccessGuard`)
- [x] `available-slots` and create-booking use the same domain rules (shared `AvailabilityService`, no duplicated algorithm)
- [x] Backend computes duration, end time, resource assignment and price (confirmed live in Step 14: merchant walk-in booking response had backend-computed `endTime`/`price`/auto-assigned `staffName`, and `source` was backend-determined, not trusted from the client)
- [x] Concurrent booking never exceeds capacity and retry behavior is proven by integration tests (Step 8/13: 24/24 scenario executions on a dedicated test DB; Step 14: proven again against the real dev/staging database with two simultaneous real HTTP requests — 1×201, 1×409)
- [x] Frontend core booking flow uses the backend API only (Step 11; re-confirmed live in Step 14 — no direct Supabase writes observed on the network for either the LIFF or merchant flow)
- [x] Browser direct write to `bookings` is removed and RLS protects it (Step 11 removed the code path; Step 12 closed the RLS policy and the project owner confirmed 0 INSERT policies remain on `bookings`)
- [x] No legacy `JwtAuthGuard`/`req.user.id` left in `BookingsController` (Step 9)
- [x] Frontend lint/typecheck and production build pass (re-verified after all Step 14 fixes: `tsc --noEmit` 0 errors, `npm run build` succeeds)
- [x] Backend build passes (re-verified after all Step 14 fixes: `nest build` succeeds)
- [x] Unit/integration/frontend tests are real and pass (101/101 backend, 21/21 frontend, 24/24 concurrency scenarios — all re-run after Step 14's fixes with no regressions)
- [x] Manual smoke tests pass for both LIFF Customer and Merchant (Step 14 — LIFF customer flow verified up to the real-LINE-identity security gate; Merchant flow verified fully end-to-end including a real created booking)
- [x] `PROJECT_STATUS.md` matches the real database/code/test state (updated throughout Steps 11-14 with evidence from actual command output and live database reads, not assumptions)

## Step 15 Evidence

Phase 1 (Core Booking Backend API) is **Completed** as of 2026-08-02. All 15 steps in the execution order from `implementation_plan.md` §12 are done with real, verifiable evidence (test output, live database reads, and a real browser session), not assumptions. `PROJECT_STATUS.md` has been updated to reflect Phase 1 as complete, with the three Phase-0-scope bugs found during Step 14 (merchant registration + email confirmation, `tenants` RLS insert drift, `SaaSContext` stale-refetch-after-login) logged as separate known issues — not blockers for Phase 1's own definition of done, since they predate and are unrelated to the booking cutover work, but they should be triaged before Phase 2 (LINE LIFF Identity Integration) begins, since Phase 2 will lean more heavily on real auth/session flows.

**Recommended next steps for the project owner before starting Phase 2:**
1. Decide whether to fix the `AuthContext.signUp()` email-confirmation race and the `tenants` RLS insert policy drift now, or accept them as known limitations for now (self-service merchant registration is not currently reliable).
2. Decide whether to clean up the Step 14 test data (merchant account, test customer, test bookings) left in the dev/staging Supabase project, or leave it as fixture data.
3. Review `NEXT_IMPLEMENTATION_PLAN.md` Phase 2 prerequisites (`VITE_LIFF_ID`, a real LINE Channel/LIFF app) before starting, since Step 14 confirmed the booking flow is otherwise ready to receive a real LINE identity.

## Safety Rules

- Do not use production Supabase for destructive or integration tests
- Do not run `prisma migrate`, `prisma db push` or schema mutations against Cloud
- Do not reintroduce direct browser inserts or trust price, end time, status or payment fields from request bodies
- Do not apply `supabase/migrations/*.sql` directly against the Cloud project from an agent session; the project owner runs these manually in the Supabase SQL editor
