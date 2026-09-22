# Cloudflare migration checkpoint — 22 September 2026, Malaysia

Production cutover: BLOCKED. No production data, DNS, deployment or Google workflow changed.

- User chose Cloudflare, authorized private GitHub repository `azwanazmi27/smkapdigital`, and accepted a prefixed workers.dev address instead of buying a domain.
- Repository created and Private badge verified. Migration branch and rollback tag pushed and verified by GitHub API.
- Working branch: `migration/cloudflare-20260922`.
- Rollback tag: `rollback/pre-cloudflare-20260922`.
- Live source: `fd66112bbe29710638b1b5b3d3b598281eea8104`, Sites version 252, deployment succeeded.
- Site project: `appgprj_6a83d0418ed881919a0e18eedcb20355`.
- Original `origin` preserved; `github` added separately. Full local history: 259 commits, not shallow. Remote-history freshness beyond the confirmed live commit remains to be verified after authenticated fetch.
- Source recovery: Git bundle verified; independent clone and all 208 tracked-file SHA-256 hashes matched.
- Local baseline build PASS; 87 application tests PASS. Old starter `rendered-html.test.mjs` asserts a loading skeleton and was excluded; no claim that npm test passed.
- Heuristic scan inspected 855 historical blobs. Two private-key-marker matches were parser code, not key material. This is not comprehensive secret/private-data clearance; Additional historical secret-assignment scan found no matches; no tracked data dumps/private-key files found. Review remains heuristic, not a guarantee.
- Data: 41 D1 tables; see database-capture-status.json. Bounded reader captures are not transactionally consistent; four tables still truncate values. No schema export, full R2 listing/export or restoration test is available yet.
- Runtime: 49 configured variable names, 16 masked secrets. Backups retain readable configuration only; masked values cannot be recovered from the connector.
- Google: school root Drive permissions and attendance Sheet permissions read. Apps Script connector search returned no projects; browser is not signed into the school owner account. SMKAP search in the signed-in school staff account also returned no projects. Script versions, properties, scopes, deployment identities and triggers remain unverified.
- Attendance XLSX materialization failed HTTP 403. Recovery fallback succeeded: private native Sheet backup and an isolated restore copy both match all 38 populated rows including formulas. Native metadata/permissions history and script restoration remain unverified.
- GitHub CLI and restricted-scope Wrangler OAuth sign-in succeeded. Target account has no D1 databases. R2 API returned code 10042 (R2 not enabled); dashboard requires a renewing usage-billed subscription, user explicitly deferred R2 activation.
- Cloudflare account already has `portal.smkapdigital.workers.dev`, with zero bindings. Leave it untouched. Proposed separate names are `smkapdigital-staging` and `smkapdigital`; availability/deployment not verified.

## Local evidence locations (never push these)

Workspace: `/Users/noorazwanazmi/Documents/Codex/2026-09-22/se`.
Backup directory: `work/backups/20260921T221228Z` outside this checkout, owner-restricted directory; not verified encrypted or off-device.
Build and test logs: `work/build-baseline.log`, `work/tests-baseline.log`.
CLI configuration: `work/cli-config` outside this checkout. Never commit credentials.

## Next actions

1. CLI sign-in and private-repository verification completed; obtain authenticated source access for full managed-store export.
2. Obtain supported complete production D1 SQL export plus schema/index/trigger definitions, and R2 object bytes + metadata manifest. Never deploy an export endpoint into production before the user's backup gate is satisfied.
3. Export/backup Google data and full Apps Script source/configuration/properties/triggers with the school owner; secrets go to a secure store, not Git/chat.
4. Restore into isolated stores, validate IDs, relationships, ownership, counts and hashes; record a consistent cutoff and final-sync strategy.
5. Branch and rollback reference are pushed; repeat scoped secret/private-data checks for any new source/configuration before subsequent pushes.
6. Provision isolated staging only after billing eligibility and authentication are settled. Use test-only Google projects/resources and accounts; no live notification keys, jobs or production tokens.
7. Configure target IDs in ignored targets.local.json; prepare-cloudflare.mjs refuses missing targets and blocked production gates. It only generates configuration and does not enforce runtime isolation itself.
8. Deploy and test all endpoints/roles/integrations; then perform agreed write freeze/final synchronization, cutover and production validation. Keep old resources and backups.

## Latest completed preparation

- GitHub Actions clean install/build/application tests PASS: run 35684854085 at 686303c271b42e06962505370b32bbbc3a82f505. Subsequent edits are audit documentation only.
- All 231 inventoried Drive files copied into a school-owner-only backup folder; 191 subfolders inventoried. All 16 configured draft/final folder IDs are within that tree. Original hierarchy is recorded in the local inventory rather than recreated in the flat backup folder.
- Additional attendance Sheet and one referenced soft-deleted file backed up separately. No originals moved, untrashed or modified.
- Visitor Sheet REKOD_PELAWAT (29 populated rows) and REKOD_TEMPAHAN (18 populated rows) match formulas/values.
- 11 captured DB relationships have zero missing parent references. All 56 document-version Drive IDs appear in the inventory. One management reference outside the tree was explained by its soft-deleted record and backed up separately.
- Readable PDF sample from backup matches extracted source content. This is not a checksum audit of every binary.
- Raw SQL/schema/R2 backups, production secrets, OAuth/Apps Script settings, staging deployment and cutover remain BLOCKED. R2 activation is explicitly deferred by the user.

- Final verification: all 231 root-file copies passed metadata/parent/owner-only ACL checks; binary sizes match. Native Sheet size differences are expected metadata differences and full-range formulas/values match. Total 233 original files backed up plus one isolated attendance restoration copy. Binary checksums and complete original ACL/history restoration remain unverified.

## Google owner audit continuation

See GOOGLE-ACCESS-PROGRESS.md: school owner Apps Script access and personal-account Google OAuth access resolved. Native copies of both script projects created with zero triggers/executions, but full source/properties/ACL restoration not verified. Both active deployment URLs match saved production runtime configuration (apps-script-url-verification.json). Google Client ID exactly matches source; original JavaScript origin only, no redirect URIs, External/In production. No production settings changed. R2 permission and complete source D1/R2 export remain pending; source export request prepared in workspace outputs, not sent.

R2 is now activated with explicit user authorization and billing completed by user. Staging R2 bucket and D1 created; see CLOUDFLARE-STAGING-STATUS.md for exact IDs and verification. No Worker deployed or data imported. Prior R2-deferred statements are superseded. CLI auth refresh required; full source export remains blocked.

Staging schema now imported: 41 tables verified, zero portal_users. Pinned Wrangler authentication works; prior CLI-auth blocker resolved. See CLOUDFLARE-STAGING-STATUS.md. Local generator work/prepare_staging_schema.py and SQL work/staging-schema.sql are outside repo; never use as production export. Source-derived schema is for empty staging only; no data migration or Worker deployment completed.

## Current staging preview

See STAGING-PREVIEW.md, which supersedes older statements that no Worker exists. Google origin saved after user confirmation. Staging-only account seeded after verified staging SQL export restoration. Production cutover remains blocked.

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

## Task/portfolio access verification — 22 September 2026

Actual staff-work handlers passed isolated tests with SQLite/R2 adapters and synthetic local sessions: unauthenticated access denied; unrelated private/duty files denied to teacher; owner/assigned file bytes match; admin duty access allowed but unrelated private paper denied; uploads ownership filtering and assigned-task listing passed.

Portfolio actual handlers passed isolated tests: anonymous/all-users teacher reads rejected, own-user filtering, admin aggregate listing, deleted-material exclusion, foreign/duplicate featured selection rejection, own featured update persisted without changing another owner. Enabled PUT /api/portfolio only after these tests. POST upload still blocked because it requires Google Drive. These are local handler tests, not all-role browser/production validation. No actual user portfolio records modified by tests.

Evidence: staff-work-access-results.json and portfolio-access-results.json; reproducible local harnesses work/test-staff-work-access.mjs and work/test-portfolio-access.mjs outside checkout. Google integrations/full source export/live browser upload remain outstanding as previously recorded.

## Automation preparation and remaining work

Manual staging-only GitHub workflow prepared; not activated. Configuration rehearsal PASS in temporary directory: exact isolated target, no crons, no production target, refuses overwrite of existing local config. Administrator token/environment setup remains required. See ADMIN-HANDOFF.md for consolidated remaining work; it explicitly distinguishes non-admin tests still pending. Runtime code unchanged this checkpoint; no redeploy necessary.

## 22 September — Drive-first storage direction
User requested all files in Google Drive where possible, reducing Cloudflare storage dependence. Added DRIVE-STORAGE-PLAN.md with per-component treatment, copy-only transfer, permission-preserving adapter, verification and rollback for new writes. No production storage changed or source objects deleted. Static browser-local inventory now includes relief-plans fallback and relief-params; per-device export is a release dependency.

Staging browser file chooser now works. Synthetic PNG submission reached D1/R2; remote download SHA-256 equals source f3ec9e14b9c085b55edc96155f7bd26b6fdeda2462f02af4e0279d8319b365e3, 68 bytes. Full refresh shows two same-title test records (0a15dfb8-1f60-48cb-9b69-1f53bc909623 and fa78efc4-f5a6-477b-827f-e4fd01ea6121, six seconds apart). Duplicate submission origin not established; retain records and investigate before claiming duplicate protection. No errors/warnings captured in limited browser log sample. Full role E2E, server logs and full integration checks incomplete. Deployment workflow preparation committed/pushed cf59bc0; not enabled.

## 22 September — offline Drive storage preparation
Added inactive verified read adapter and offline file-manifest reconciliation CLI. Nine new tests; application suite 102 PASS. No live Google transport, production writes or deployment in this step. Reports refuse overwrite and omit private object keys from console. Do not label this a completed Drive migration. Administrator-provided isolated Apps Script contract/config and full source exports still needed.

Duplicate SKAS investigation: existing submit handler sets React state but does not synchronously reject reentry; server generates a new UUID for each submission. This identifies a possible duplicate path, not proof of the two observed requests' origin. No captured request trace establishes whether repeated user/tool submission, retry or another cause produced those records. Records retained; end-to-end idempotency remains unverified.

## 22 September — SKAS concurrent submission guard
Added synchronous per-form lock around SKAS add-evidence submission. A second event while the first is pending performs no second request; failure releases the lock for retry. This does not add server-side idempotency, prevent cross-tab submissions or prove the earlier duplicate cause. Two focused behavioral tests PASS; full application suite 104 PASS; build PASS. Earlier synthetic duplicate records and original production data remain intact.
Updated validation-results.json and api-matrix.json to distinguish limited passing checks from incomplete full E2E and administrator dependencies; removed stale assertions that staging/Google login/R2 activation had not happened.
Deployment verified by Wrangler: staging version f12659cd-e20d-4a97-bc1b-85e6a43d90f8, runtime source commit 3b3f62f. Bound only to staging D1/R2 with MIGRATION_MODE=isolated-staging. Post-deploy interactive repeat-click test NOT TESTED; local lock behavior and build passed. No production cutover.

## 22 September — post-deployment browser and restoration evidence
GitHub CI runs 35730455445 (3e479e1) and 35730433643 (3b3f62f runtime source) completed SUCCESS. In-app browser Google school login PASS after staging deployment; anonymous teacher-module navigation required login. Synthetic DOUBLECLICK 20260922 link submitted with clickCount=2: saving button disabled, later UI shows record, remote D1 exact-title count=1. Does not prove server replay/cross-tab idempotency. Original duplicate PNG records retained.
Private backup work/backups/staging-20260922-post-upload: remote D1 export restored to separate restore.sqlite, integrity_check=ok, 41 tables, 61 users, 3 SKAS records at snapshot. Two referenced synthetic PNGs downloaded and SHA-256 matches source (68 bytes). Snapshot predates subsequent double-click record; not complete bucket inventory or production export. Files 0600/folder0700; off-device/encryption unverified. Raw export log may contain signed URL: never print/commit it.
Direct CLI anonymous API requests still uniformly 403 text/plain (network path limitation), not application authorization evidence. Remaining live Google transport, full source exports, per-role sessions, browser-local device exports, CI credential activation and cutover gates are documented in outputs/CURRENT-STATUS.md. No production changes.

## 22 September — actual Google staging resources created
Created empty Drive test folder 1DjcfpqBct2BI4jP08rFrlHsF4HsDiW-V and fresh Apps Script scaffold 1mw1dHMqCl8Sf-8DEFx-WYICJz_2ogtkWqKlGU2Gk_CpPNmXOisZRs0d7 under school owner. No deployment/execution/scopes/secrets/triggers. See GOOGLE-STAGING-SETUP.md; do not duplicate these resources. Prepared Cloudflare token summary with Workers Scripts:Edit restricted to account, no expiry; final creation pending explicit action-time security confirmation. No token exists yet.
