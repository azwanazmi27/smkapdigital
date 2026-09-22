# Cloudflare staging infrastructure — 22 September 2026

R2 activation verified complete in dashboard after user completed billing. Earlier deferred/payment-pending statements are superseded. Usage-based R2 subscription authorized by user; do not assume unlimited free usage.

Account: 4def4968e3047142b10d2601a56318b7 (noorazwan092@gmail.com).

- R2 bucket: smkapdigital-staging-files. Created and verified, Standard class, automatic Asia Pacific placement, Public Access Disabled, 0 B. No school data uploaded.
- D1: smkapdigital-staging-db. ID af5a7f3f-8978-4419-b93f-9043570dc26f. Created and verified, zero tables/queries. Initial metadata storage 12.29 kB. No school data imported.
- No production stores created or modified, no Worker deployed, no SSO origins changed. These empty resources are not a working application or a completed migration.
- Wrangler CLI did not find usable authentication in the configured session. Resource preparation used the already authenticated dashboard; CLI authentication must be restored before repeatable imports/deployment.
- Full source SQL/R2 export is still required before data restoration and cutover. SOURCE-EXPORT-REQUEST.md is prepared for the user to send to the source platform administrator; it has not been sent.

Next: restore supported CLI authentication, prepare isolated schema/test fixtures and staging integration configuration; obtain source export and verify restoration/reconciliation. Keep staging jobs/notifications disabled and never connect copies of Apps Script to live data for testing.

## Schema preparation completed

CLI authentication works with the repository-pinned Wrangler 4.92.0 and permitted network access. No dependency upgrade was made. SQL journal alone reconstructs 26 tables; four supplemental SQL migrations bring this to 30. Eleven runtime-created tables plus static ALTER statements were extracted from source in an isolated local SQLite rehearsal. All 41 expected table names matched.

The new, verified-empty staging D1 received this source-derived schema (75 statements). Readback confirms 41 application tables and zero portal_users. This is empty test infrastructure, not a production data import. Full source schema/index/trigger comparison and record reconciliation remain pending export. PRAGMA integrity_check was rejected by D1 with SQLITE_AUTH; it is not recorded as passing. Basic table-count readback passed separately.

No application Worker deployed yet. No external integration secrets configured and no scheduled jobs activated. Production remains unchanged.
