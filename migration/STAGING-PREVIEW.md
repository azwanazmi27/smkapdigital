# Staging progress — 22 September 2026

Staging: https://smkapdigital-staging.smkapdigital.workers.dev

The full application bundle is deployed on the isolated Cloudflare Worker. Browser home-page rendering passed. This is a limited staging preview, not completed migration or production cutover.

- Separate D1 smkapdigital-staging-db and private R2 smkapdigital-staging-files. No production database export or external integration secrets copied. IMPORTANT: first admin-panel read ran the original source-code seed and added 60 bundled default school accounts; these are not reconciled production records. No records were deleted. Staging authentication is now limited to the one user-approved school email; subsequent automatic seeding is disabled.
- Existing Google session flow, local portal-content routes and GET admin-users (default, config, me only) are enabled. Other APIs return STAGING_INTEGRATION_BLOCKED (503); admin-user mutations remain blocked. Existing authorization checks remain in enabled handlers. No cron jobs configured.
- User-selected school account seeded as staging-only super_admin, excluded from public directory/org chart. No production permissions changed. Seed uses ON CONFLICT DO NOTHING.
- Before seeding, remote staging SQL export restored in isolated local SQLite: integrity_check=ok, zero users. This verifies staging backup only, not the incomplete production backup.
- Build and 91 selected application tests passed. Starter rendered-html assertion is excluded because it checks the old starter skeleton.
- Google OAuth staging origin saved with explicit user confirmation and read back alongside original origin. Same client/provider; no scopes or credentials rotated.
- Google SSO PASS: school account logged in, one session confirmed in staging D1, identity persisted after refresh, Super Admin panel opened. Logout PASS: browser returned to login and D1 session count returned to zero. Repeat login and other roles: NOT YET VERIFIED. Panel count 61 reflects bundled seed plus one test user, not migrated production data.
- CLI HTTPS probes returned uniform 403 and cannot be used as evidence of application authorization. Direct browser API navigation was blocked by client. Browser in-app testing is required.
- Source full SQL export, four truncated captured tables, full source R2 bytes, restoration/reconciliation and external integration workflows remain BLOCKED pending source administrator export. Source administrator work is deferred per user, not waived.

Local evidence outside Git: work/staging-before-test-user.sql (restricted), work/staging-build.log, work/staging-tests.log, work/staging-deploy.log. Export logs may contain temporary signed download URLs and must not be published.

Resume: verify latest isolation-hardening deployment then browser admin login; test isolated content upload/persistence/logout; enable each remaining integration only after isolated resources and credentials exist. Retain old portal and all backups. No production cutover.

Latest deployed Worker version: ea202c3d-bc64-4446-8c43-b494898afe0d. Final hardening build and 91 tests PASS. Browser session survived reload on final build; logout passed.

## User-confirmed access expansion — 22 September 2026

User explicitly confirmed all listed users and their roles. Removed the single-email staging restriction and obsolete MIGRATION_TEST_EMAIL configuration. Existing Google audience/verified-email/domain validation, active/non-deleted user lookup and database role checks remain unchanged. No user records or roles modified. Read-only D1 inventory: 61 active users (59 teacher, 2 super_admin). Automatic source-code seeding remains disabled in staging; external integration API restrictions remain enabled. Build and 91 application tests PASS. These counts are not production data reconciliation; individual login for every account remains untested.

## SKAS staging — 22 September 2026

Enabled /api/skas after dependency audit: D1/R2 only, no external outbound calls. Existing handler authentication/role rules preserved. Enabled local directory/staff-picker/public-settings reads needed by existing UI. Drive-backed portfolio, document deletion and AI-dependent staff-work remain blocked.

Build and 92 application tests PASS. Actual SKAS handlers tested using isolated SQLite and in-memory R2 adapters with synthetic local sessions: anonymous read/download rejected; teacher create/review/delete rejected; admin create/upload/read/review/download byte equality/delete PASS. This is not live R2 validation or SSO evidence. Rehearsal script: work/test-skas-isolated.mjs outside checkout; result: migration/skas-isolated-results.json.

Live Cloudflare browser: repeat Google school-owner login PASS; year 2026 loaded; SKAS dashboard loaded; explicit test-only link record UJIAN MIGRASI SAHAJA — SKAS 20260922 created and remained after refresh. D1 readback confirmed the test record. Kept clearly labelled test record for review. No school operational records modified and no notifications sent. Live R2 upload/download, all-role browser matrix and production reconciliation remain NOT TESTED/BLOCKED as applicable.

Worker version dec316f7-437f-480e-a20b-915637311b8e. Staging URL: https://smkapdigital-staging.smkapdigital.workers.dev/?module=skas .

## e-Panitia and local reads — 22 September 2026

Enabled documents GET and save-draft POST only. All other document POST actions are rejected in staging before execution, including delete-draft because it may delete Drive copies. Original owner/year checks retained. Enabled staff-work GET and portfolio GET only; POST uploads/AI remain blocked. No external credentials added.

Build and 93 application tests PASS. Actual documents handlers in isolated SQLite rehearsal PASS: anonymous read rejected, teacher draft create/update/read, cross-owner/year mismatch rejection, persisted payload/ownership, Drive-related action rejection, zero storage objects. See documents-isolated-results.json; local harness work/test-documents-isolated.mjs outside checkout.

Live browser e-Panitia PASS: Panitia Bahasa Melayu loaded; clearly labelled test-only Takwim draft saved; after refresh it appears under Draf Tersimpan / Sambung kerja. D1 readback confirms record. Kept for review. Staff-work/portfolio role/browser matrix not yet verified. Full e-Panitia generation/Drive publishing remains blocked; do not label full module migration complete.

Worker version cfde3014-1ce7-4c39-8179-bd838e59b55c. Next: live R2 roundtrip, remaining local read/auth matrix, isolated Google integrations. Source data export/reconciliation remains a production release gate.

## Remote R2 verification — 22 September 2026

Remote CLI upload/download PASS for a synthetic 68-byte PNG in smkapdigital-staging-files, unique key migration-tests/20260922-8c53b9fa/MIGRATION-TEST-ONLY.png. Downloaded bytes equal original, SHA256 f3ec9e14b9c085b55edc96155f7bd26b6fdeda2462f02af4e0279d8319b365e3. Retained test object; no school data used or overwritten. Evidence: r2-roundtrip-results.json.

Browser upload attempt BLOCKED: Chrome extension fileChooser.setFiles returned Not allowed. Official troubleshooting requires enabling Allow access to file URLs for the ChatGPT browser extension. User informed. No SKAS evidence record created for this failed browser upload. Remote CLI verification does not establish end-to-end app upload/download or metadata/permission parity with production.

Browser staff-work read PASS (school test admin): uploads hub and Kertas Kerja list load, showing empty isolated data. Upload/AI processing remain blocked by staging policy. No new application deployment needed this checkpoint.
