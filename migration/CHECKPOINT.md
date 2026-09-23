# Cloudflare migration checkpoint — 22 September 2026, Malaysia

## 23 September 2026, 09:25 MYT — school Chrome profile verification
- Opened the production Apps Script in the dedicated Chrome **School** profile (`sekolah-2508@moe-dl.edu.my`), without the stale `/u/5` account selector. The read-only `authorizeServices` execution completed at 09:13:06, granting the missing Sheets/Mail scopes. Live deployment remains version 6; no new deployment or Sheet write was made.
- Production `/api/ekunjung` returned `success:true`, zero active records after authorization. Read-only E-Kunjung path is PASS; create/checkout remain NOT TESTED.
- Authenticated e-Tempahan UI reached the school Sheet bridge but the status/list view ended with `Status bilik tidak dapat dibaca sekarang.` Apps Script version 6 `doPost` executions completed in 1–3 seconds; its generic catch obscures the cause. E-Tempahan remains FAIL. The untested booking create/delete/email paths must not be treated as working. A read-only diagnostic helper was added only to the Apps Script editor draft, not the deployed version.
- Chrome's native automation can select the School profile and inspect pages, but the editor function picker did not respond to accessibility clicks; diagnosis is unfinished. No production Worker or DNS changes occurred in this continuation.

## 23 September 2026, 08:45 MYT — continuation
- Production Worker secret-name audit found only `OPR_APPS_SCRIPT_URL` and `OPR_APPS_SCRIPT_TOKEN`. Cloudflare AI binding generated synthetic text successfully earlier, but external Gemini/Groq/Mistral/OpenRouter production credentials are absent and those provider paths are not verified. E-Keberadaan Google Sheet service-account variables and VAPID private key are also absent, so Sheet mirroring and push parity must remain unverified. Do not infer these modules work from the successful AI binding test.
- The earlier Apps Script link with `/u/5` was wrong for the owner's fresh, school-only Chrome profile. The owner confirmed that the corrected profile-neutral editor URL opens. Authorization completion is still pending at this checkpoint.
- GitHub Actions validation for pushed commit `79cc1bd` passed `npm ci`, build and application tests. Added a separate **manual-only** production deployment workflow and config generator. It targets the existing `portal` Worker, production D1/R2 and AI binding, and requires both a `production` environment secret and `PRODUCTION_RELEASE_VERIFIED=true`. This gate is not enabled; no new production deployment occurred. Local Wrangler dry run confirmed the generated bindings. Do not enable until Google Sheet authorization, role testing and other release gates are met.
- GitHub CLI OAuth completed after owner confirmation and GitHub e-mail verification. The private repository `azwanazmi27/smkapdigital` was fetched, its two remote commits merged without force-push, and migration branch pushed. Remote and local SHA both `8a2ab380caa9052202f2fcc23066ca2a61890fb6`; the original `origin` remote remains unchanged. CLI credential is in an ignored owner-only directory (`work/cli-config`, mode 0700; files 0600), not in Git.
- Verified backup/restoration evidence and dated cost assumptions in local commit `ccd1d14`. GitHub still requires authenticated, non-force branch reconciliation and push.
- Added a read-only `authorizeServices` helper to the production Apps Script editor draft and saved it. This draft is **not deployed**; the live web app remains version 6. Running it confirmed the missing Spreadsheet scope. The authorization dialog is open for the school owner, but consent has not completed. E-Kunjung and e-Tempahan remain blocked.
- Started official GitHub CLI device OAuth with owner approval; GitHub requires an e-mail verification code that only the owner should enter on its open page. No CLI credential has been issued yet. Scanned 1,759 reachable Git blobs for embedded PEM blocks, GitHub tokens, Google API keys and common literal secret assignments before push. No credential values matched. Two historical PEM-marker hits contained only a one-character interpolation between markers; no embedded key body was found. Current `.env.example` is the sole tracked env-like file. This heuristic scan does not prove absence of every secret or private record.

## Current production checkpoint — 23 September 2026, 08:15 MYT

The older sections below are historical. The user has authorized a **new** Cloudflare production portal without importing the inaccessible historical Sites database. Do not describe that choice as a complete data migration. The original Sites portal and its data remain intact; the full source export and reconciliation gate has not been met.

- Production Worker: `portal` at https://portal.smkapdigital.workers.dev, current version `27afca61-862c-4018-82c8-2c7e94623be8`; prior code versions `39fd7930-ecee-4de7-aa4d-9fb7b340c6c6`, `7423ec76-b02a-412e-a0c6-e90b1159176f` and `bd11ad9b-e8b5-466c-ad8a-4dd9f8d4637d` are rollback references. Production D1 `smkapdigital-production-db` and R2 `smkapdigital-production-files` remain separate from staging. No DNS change or purchased custom domain.
- Google SSO: production login was verified with the school account. Live synthetic document generation using the Cloudflare AI binding succeeded; this verifies text generation only, not all AI workflows. The account has Workers Free and R2 Paid; no Workers Paid activation occurred.
- Google Drive: production Apps Script `SMKAP Digital Cloudflare Production Drive 20260923` deployment ID `AKfycbyNjYkzKd_sdLYMkvhXkXEsf2X7jaMkHU67JGaPj9BS6c90dAzaj2cPjmHnJ0c6BPS9bA` updated to **version 6**. The `/exec` URL is unchanged. Management-file upload/read was previously verified with a synthetic PDF in the existing school Drive root. OPR now scans its eight existing Drive roots separately; the authenticated production portal displayed **54 OPR reports** and rendered a representative existing PDF in the preview. This verifies list and read-only preview, not new upload, bundle, delete or ownership for every role. No OPR record was modified in this test.
- E-Kunjung and e-Tempahan code was added to this Apps Script and remains in version 6. **Both live Sheet-backed reads FAIL**: Google has not granted `https://www.googleapis.com/auth/spreadsheets` to this project. Editor execution of a read-only authorization helper confirmed the missing scope. Google’s “Review permissions” flow opens a “Page not found” URL under `script.google.com/accounts?authuser=5`; no grant was completed. Do not test creates, checkout, cancellation, or booking e-mail until authorization and read-only checks succeed. The authorization helper was removed from the deployed version and editor draft.
- The school-owned `REKOD E-KUNJUNG SMKAP` Sheet was exported and copied outside the checkout to owner-restricted `../backups/google-sheet-20260923/rekod-ekunjung-etempahan-20260923-0755.xlsx` (relative to this checkout; SHA-256 `3ec5d2b29918ca5bb59c62d70033c984daac162f07aff1b834a685dc88e97959` on both copies). ZIP integrity passed. An isolated local reconstruction read 32 nonempty rows including header in the visitor tab and 18 in the booking tab; this is not a Google Sheet restore or a complete old-portal backup.
- Current Cloudflare production D1 export was saved outside the checkout at `../backups/cloudflare-production-20260923/d1-production.sql` (SHA-256 `4fe9782473380a9453615c76930e2dedd541e4dd68048466577fe03d599e6f63`, owner-restricted). An isolated SQLite restore passed `PRAGMA integrity_check=ok` and reproduced active role counts: 59 teacher, 2 super_admin. This is a backup of the **new** production D1 only; it does not include R2 object bytes, Google Drive files or the historical Sites database.
- Current local branch `migration/cloudflare-20260922` has unpushed Cloudflare AI binding and e-Tempahan bridge fallback changes at this checkpoint. Private GitHub gained the production bridge file through the browser at commit `4a86555f01cf94786c158141e2bffd76c8323065`, but local and remote histories must be reconciled before a CLI push. No force push. GitHub CLI OAuth is awaiting user authorization.
- Local build and `scripts/test-application.mjs` passed (105 tests). Browser production checks: Google login PASS, synthetic text AI PASS, management Drive upload/read PASS (earlier), OPR list/preview PASS (54 reports), e-Tempahan list FAIL, E-Kunjung active list FAIL. Unauthenticated direct GET and POST of `/api/etempahan` now return HTTP 401 (both verified live). Other roles and write flows remain NOT TESTED. No historical Sites DB or R2 reconciliation; do not claim full parity or zero data loss.

Next: resolve school-owner Apps Script Sheets/Mail authorization; rerun read-only visitor/booking calls; then test isolated create/update/delete paths without real notifications; sync reviewed branch to private GitHub; complete the wider role/API matrix and source-data status.

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

## 22 September — GitHub deployment now complete; Apps Script credential handoff
User approved creation and GitHub storage of Workers Scripts:Edit account token without expiry. Secret exists in staging environment; branch policy restricts to migration branch; STAGING_DEPLOY_ENABLED=true. First GitHub deployment run 35731978285 SUCCESS, 104 tests, version bc77a4c0-7ea6-4904-9e44-ad1055abf864. No token value printed or written to repo. Current local docs commit 9ee83e1 had not been pushed when run started; runtime unchanged from 874fe5f.
Staging Apps Script now contains isolated management contract only, rooted in new test folder, token required; verified exact persistence after reopening (4230 characters). Not deployed/executed/authorized. Project Settings prepared for STAGING_API_TOKEN value entry by user. See GOOGLE-STAGING-SETUP.md for precise status, limitations and URLs. Never read back/print future secret property values. Browser original audit source contained secrets only in memory, clipboard cleared.

## Token replacement required before Apps Script deployment
User saved STAGING_API_TOKEN; property name present and read-only before edit. New web-app deployment configuration inspected (execute as school owner, default access Only myself); no deployment created or OAuth granted. A browser snapshot-filtering mistake exposed the property value in tool output. Do not repeat/store that value. User informed and asked to replace it before use. Deployment dialog cancelled; Script Properties edit form left open for user handoff. Next: user replaces secret with securely generated random value and saves; obtain action-time authorization for web-app access/Google scopes, then deploy and configure corresponding staging Worker secret. Do not use the exposed token.

## User accepts retaining exposed staging token
User explicitly declined replacement and accepted continued use for staging. This supersedes the prior stop-for-rotation instruction; do not rotate without authorization or claim token remains confidential. Prepared New deployment as Web app, execute as school owner, access Anyone, management-only code rooted in staging folder. Asked exact action-time confirmation for public endpoint access with existing token; Deploy not clicked. No new Google scopes granted. Browser deployment dialog retained for continuation.

## 22 September — Drive portfolio now live in staging
Apps Script v1 deployment URL and approvals recorded in GOOGLE-STAGING-SETUP.md. Worker secrets URL/token configured directly through UI; user accepted existing exposed token specifically for staging. CI 35734479971 SUCCESS (105 tests), Worker 130a5bba-5a1d-4108-a03b-6492bbfb4b04. Synthetic portfolio upload via Google Drive succeeded; record559aa0f3-6a10-4999-837a-af4bec2b618b persists after refresh, profile count1. Authenticated file response identified as image/png by browser; exact downloaded checksum not verified. Wrangler D1 remote read now 7403 unauthorized; no permission escalation performed. Full source SQL/R2 exports still absent. Production unchanged.


## 2026-09-22 AI connection checkpoint
User approved creating Gemini key smkapdigital-staging in oprsmkap (gen-lang-client-0855567570), storing it in Cloudflare staging, and synthetic-only tests. AI Studio shows Free tier. Creation attempted; no new key appeared after reload. A second attempt returned: "Failed to generate API key, The request is suspicious. Please try again." Stopped automated creation; prepared named form for user handoff. No new key copied or stored, no billing enabled, no AI request made. AI staging routes remain blocked. Existing portal key unchanged. Model gemini-3.6-flash confirmed in official model documentation: https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash . Next: user completes key creation in AI Studio; transfer directly to Worker secret without exposing value, then enable only audited isolated AI routes and run synthetic authenticated tests.


## AI multi-provider audit continuation
See AI-STATUS.md. All five source adapters retained; 20/20 focused mocked tests pass. User-created Gemini staging key was exposed during new-format UI inspection; replacement creation rejected by Google suspicious-request protection. Other provider login pages prepared. No provider secrets added to Worker, no live AI requests, no billing changes.


## 2026-09-22 — Three staging provider credentials configured
After explicit user approval, created smkapdigital-staging keys in Groq Personal/Default Project, Mistral Default Workspace and OpenRouter Default Workspace. All expire 2026-10-22; Mistral Shared connectors only; OpenRouter credit limit USD 0. Transferred directly in browser memory to encrypted Worker secrets GROQ_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY. Cloudflare settings verified all three as Value encrypted. Secret variables nulled after transfer; no key values written to this repository or logs. Existing portal keys untouched. No billing activation or credit purchase. Live provider calls still NOT TESTED and AI staging routes still blocked. Gemini replacement and Cloudflare AI runtime credential remain unresolved.


## Live staging AI health verification
Commit 5c6f30e enabled only GET /api/ai/health in isolated staging. GitHub Actions run 35738424778 succeeded and deployed. Live response at https://smkapdigital-staging.smkapdigital.workers.dev/api/ai/health: Gemini online, Groq online, Mistral online, OpenRouter online, Cloudflare offline. This is provider configuration/health status, not a generation call. AI generation routes remain blocked until an authenticated synthetic end-to-end test is performed; Cloudflare AI remains unavailable because no Workers AI runtime credential/binding is configured.


## Live synthetic AI generation result
Authenticated staging super_admin session submitted synthetic e-Panitia Minit Mesyuarat prompt. UI returned generic temporary AI outage after fallback. Admin AI status recorded: Gemini Offline SERVER (0/2), Groq Offline BAD_REQUEST (0/1), Mistral Offline RATE_LIMIT (0/2), OpenRouter Offline AUTH (0/1), Cloudflare Offline API_KEY_MISSING (0/0). No school data used and no document saved. Health endpoint configuration status is therefore insufficient; live generation is FAIL/BLOCKED pending provider-specific credential/model/API compatibility fixes.

## 2026-09-22 — Production OAuth origin fixed
- Added and saved `https://portal.smkapdigital.workers.dev` to Google OAuth client `Portal SMKAP Web` in project `portal-digital-smkap`; existing portal and staging origins preserved.
- Browser verification: production portal loads and Google sign-in dialog opens without `origin_mismatch`. Current browser session showed an unregistered personal Gmail account; final role test still requires selecting a registered `@moe-dl.edu.my` account.

## 2026-09-22 — Post-login validation
- `node scripts/test-application.mjs`: PASS, 105/105 tests.
- `npm run build`: PASS (Cloudflare/Vinext build completed).
- Production Google OAuth origin gate updated to PASS. Full production role/API/upload E2E remains pending because production Apps Script/Drive credentials and a complete role test matrix are not yet configured.

## 2026-09-22 — Production Drive/App Script audit
- Verified the school account `sekolah-2508@moe-dl.edu.my` has an existing shared folder `PORTAL DIGITAL SMKAP` (folder ID recorded only in browser evidence) containing production module folders: OPR, E-Keberadaan, E-Relief, E-Kunjung, E-Tempahan and Pengurusan Sekolah. No new folder or existing content was deleted or overwritten.
- Verified Apps Script project `Copy of Portal OPR SMKAP - Drive` under the school account contains the Drive handlers and production folder mappings. A web-app deployment was prepared as execute-as-school-owner / Anyone, but Google’s OAuth consent return did not complete and Apps Script still reports no active deployment. Production upload remains BLOCKED until the deployment is successfully created and its URL/token are configured in the Worker.

## 2026-09-23 — Production Drive reconnection prepared
- User explicitly chose the existing school Drive root `PORTAL DIGITAL SMKAP` over an isolated new production root. Its ID is `1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE`.
- A new Apps Script project `SMKAP Digital Cloudflare Production Drive 20260923` was created under the school account: `https://script.google.com/u/5/home/projects/1L09M04Z2-aIMkHpX5hl0isiTmVcAZBKg13miNhX45vk4i4k1tYlkTiI1/edit`.
- Its code was derived from the verified staging management-only contract, changed to `PRODUCTION_API_TOKEN` and the existing school Drive root, then read back byte-for-byte before saving. It has no triggers and does not contain an embedded token. The earlier `Copy of Portal OPR SMKAP - Drive` project, which displays a hardcoded token, remains undeployed and is not the intended Cloudflare backend.
- `PRODUCTION_API_TOKEN` property name is prepared in the new project's settings, but no credential value was entered or saved. A new production token must be entered through the user handoff; the web app is not deployed yet.
- Cloudflare Worker `portal` settings showed an empty Production runtime variables/secrets table. Therefore OPR_APPS_SCRIPT_URL/TOKEN and all AI provider keys are absent; upload and AI are BLOCKED. The existing D1 binding remains present.

### 2026-09-23 continuation: production Drive authorization and OPR access gate

- The school account entered and saved `PRODUCTION_API_TOKEN` in the new Apps Script project's Script Properties. Its value was displayed by the settings UI during inspection; it is not copied into this repository. The user explicitly chose to keep it despite the recommendation to rotate it. Avoid printing or reading the value again.
- With user confirmation, configured a Web app deployment to execute as `sekolah-2508@moe-dl.edu.my` with `Anyone` access. Deployment is **not complete**: Google Drive consent redirects to a `script.google.com/accounts` "Page not found" error, twice. The deployment dialog remains at "Authorize access"; no `/exec` URL has been obtained. No production Cloudflare Drive secrets have been added.
- The new script supports only `management_health/upload/download/trash`; OPR list/upload, E-Kunjung and E-Tempahan actions still need a reviewed implementation and tests before parity can be claimed. The old Drive root remains unchanged.
- Audited `/api/drive`: unauthenticated requests could list/download OPR files and upload to Drive once connected. Added `portalActor` checks for all GET and POST requests before enabling production integration. `node scripts/test-application.mjs` passed 105/105 and `npm run build` passed. This code is on the migration branch and is not deployed to production.
- The school account owner repeated the Google authorization attempt and received the same `script.google.com/accounts` "Page not found" callback. A focused direct domain URL check also returned "Page not found". Treat Apps Script authorization/deployment as blocked; no `/exec` URL exists.
- Local commit `368c52e` contains the OPR login gate and checkpoint, but both HTTPS `git push` attempts lack a usable GitHub/previous-origin CLI credential. The browser can read the private GitHub branch, while the GitHub connector returns 404 for this repository. Therefore `368c52e` is not on GitHub and must not be assumed deployed.
- An empty `SMKAP Digital Cloudflare Production 20260923` Drive folder was created before the user clarified the preference for the existing root. It is unused and retained; nothing was moved or deleted.

## 2026-09-23 — AI production check
- Cloudflare `portal` Worker Production runtime variables/secrets table is empty. No AI provider key is configured there, so live AI generation cannot succeed. This is a configuration blocker, not evidence of an AI provider outage.
- Updated the OpenRouter `HTTP-Referer` header in source to the official Worker URL instead of the old ChatGPT Sites URL. Focused AI tests PASS 20/20. The change is not yet deployed to production; provider credentials and synthetic live generation remain required.

## 2026-09-23 — Production Worker and Drive verified (supersedes earlier deployment blockers)
- Google owner authorized the new production Apps Script web app. Deployed version 3 at `https://script.google.com/macros/s/AKfycbyNjYkzKd_sdLYMkvhXkXEsf2X7jaMkHU67JGaPj9BS6c90dAzaj2cPjmHnJ0c6BPS9bA/exec`. Its public GET returned `POST required`; the token value is not recorded here. The script points at the existing `PORTAL DIGITAL SMKAP` Drive root, and supports only `management_health/upload/download/trash`.
- The owner supplied the matching `PRODUCTION_API_TOKEN` Apps Script property and `OPR_APPS_SCRIPT_TOKEN` Cloudflare secret. `OPR_APPS_SCRIPT_URL` is also configured. The user declined token rotation after exposure; do not print or retrieve the token.
- Wrangler OAuth under the school operator's Cloudflare account is available in an ignored local config directory. Deployed a targeted `/api/drive` authentication fix to Worker `portal` version `c3bd7276-4ec4-4344-8045-33cb382c109f`; previous version `0645e4e1-c194-46fb-95dc-d16d7cb3da8f` is the rollback reference. Production `/` returned 200 and unauthenticated `/api/drive` and `/api/pengurusan` returned 401. Tests 105/105, build and Wrangler dry run passed before deployment.
- Production Google sign-in succeeded with `sekolah-2508@moe-dl.edu.my`. A synthetic private PDF uploaded through Pengurusan Sekolah, opened with the correct contents, and remained after portal reload. D1 record `0b87b285-a61f-4f7b-a047-688ac14d9671`, Drive file `1bNXgCG4M0FgjrpgGu_YlsTVnzAZEHU8V`. Deletion was initiated for this synthetic record but the browser confirmation automation timed out; deletion result is **unverified**. Inspect before any retry. No real record was modified by this test.
- The authentication fix was committed through the GitHub browser to private branch `migration/cloudflare-20260922` as `3e6f24878a4c058045c225d5d9b17ab4e2b251a4`. Local docs commits remain ahead because CLI GitHub auth is unavailable.
- Full parity remains BLOCKED: `/api/drive` expects OPR `list/download/bundle/ensureFolders/upload/delete` actions, `/api/ekunjung` expects `ekunjung_active/create/checkout`, and `/api/etempahan` requires separate `ETEMPAHAN_APPS_SCRIPT_URL/TOKEN`. None are implemented by the deployed management-only script. Production AI keys are not configured; health endpoint 200 is not a generation test. Historical source database export/reconciliation and all-role end-to-end testing remain incomplete. Do not claim migration complete.
- A further local patch at commit `c625e81` prevents an empty or partial OPR Drive listing from deleting cached `opr_reports` rows. `node scripts/test-application.mjs` passed 105/105, `npm run build` and Wrangler dry run passed. Deployed directly to production Worker `portal` version `6c23a5fb-f150-4476-82b9-561c7c06c299` (previous rollback version `c3bd7276-4ec4-4344-8045-33cb382c109f`). Post-deploy `/` returned 200 and unauthenticated `/api/drive` and `/api/pengurusan` returned 401; both Apps Script secrets remained configured. The local patch is not yet on GitHub because CLI GitHub authentication is unavailable; align repository before relying on GitHub deployment automation.
