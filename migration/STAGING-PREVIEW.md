# Staging progress — 22 September 2026

Staging: https://smkapdigital-staging.smkapdigital.workers.dev

The full application bundle is deployed on the isolated Cloudflare Worker. Browser home-page rendering passed. This is a limited staging preview, not completed migration or production cutover.

- Separate D1 smkapdigital-staging-db and private R2 smkapdigital-staging-files. No production database export or external integration secrets copied. IMPORTANT: first admin-panel read ran the original source-code seed and added 60 bundled default school accounts; these are not reconciled production records. No records were deleted. Staging authentication is now limited to the one user-approved school email; subsequent automatic seeding is disabled.
- Existing Google session flow, local portal-content routes and GET admin-users (default, config, me only) are enabled. Other APIs return STAGING_INTEGRATION_BLOCKED (503); admin-user mutations remain blocked. Existing authorization checks remain in enabled handlers. No cron jobs configured.
- User-selected school account seeded as staging-only super_admin, excluded from public directory/org chart. No production permissions changed. Seed uses ON CONFLICT DO NOTHING.
- Before seeding, remote staging SQL export restored in isolated local SQLite: integrity_check=ok, zero users. This verifies staging backup only, not the incomplete production backup.
- Build and 91 selected application tests passed. Starter rendered-html assertion is excluded because it checks the old starter skeleton.
- Google OAuth staging origin saved with explicit user confirmation and read back alongside original origin. Same client/provider; no scopes or credentials rotated.
- Google SSO PASS: school account logged in, one session confirmed in staging D1, identity persisted after refresh, Super Admin panel opened. Logout and repeat login: NOT YET VERIFIED. Panel count 61 reflects bundled seed plus one test user, not migrated production data.
- CLI HTTPS probes returned uniform 403 and cannot be used as evidence of application authorization. Direct browser API navigation was blocked by client. Browser in-app testing is required.
- Source full SQL export, four truncated captured tables, full source R2 bytes, restoration/reconciliation and external integration workflows remain BLOCKED pending source administrator export. Source administrator work is deferred per user, not waived.

Local evidence outside Git: work/staging-before-test-user.sql (restricted), work/staging-build.log, work/staging-tests.log, work/staging-deploy.log. Export logs may contain temporary signed download URLs and must not be published.

Resume: verify latest isolation-hardening deployment then browser admin login; test isolated content upload/persistence/logout; enable each remaining integration only after isolated resources and credentials exist. Retain old portal and all backups. No production cutover.
