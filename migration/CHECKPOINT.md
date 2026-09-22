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
