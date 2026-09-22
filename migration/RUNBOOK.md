# Migration, deployment and rollback runbook

Status: limited staging deployed; production release blocked. Do not run a production deployment while release-gates.json is blocked.

## Architecture

Retain vinext/React and existing dependencies; move the application Worker and static assets into the user's Cloudflare account. Use D1 binding DB and R2 binding FILES with physically separate staging and production resources. Preserve Google DELIMa OAuth client/identities, Sheets, Drive, and Apps Script. Preserve AI provider configuration and limits. R2 usage-billed subscription was explicitly authorized and activated; no additional paid service is authorized.

Use `smkapdigital-staging` and `smkapdigital` as proposed Worker names under the already-observed `smkapdigital.workers.dev` account subdomain. Staging is deployed at https://smkapdigital-staging.smkapdigital.workers.dev; production remains proposed. No custom-domain purchase or DNS changes are requested after the user's prefixed-URL clarification. The existing `portal` Worker stays unchanged.

## Backup and migration gates

1. Obtain a complete supported SQL export from the source D1 owner, including tables, indexes and triggers. Record SQLite schema, per-table count, canonical per-row hashes, foreign-key checks, application relationships and a timestamp. The Sites row viewer cannot supply lossless large records or a consistent snapshot. Never treat captures in this audit as that export.
2. Export every R2 object with key, size, SHA-256, content metadata, custom metadata and last-modified value. Derive referenced keys from the database, compare both directions, and resolve missing referenced objects. Keep original keys. Do not delete source objects or overwrite an existing destination bucket.
3. Export native Google resources in recoverable forms and record IDs, ownership, ACLs and parent relationships. Preserve originals in place. A copy/export does not preserve all native permissions/history/triggers; verify those separately. Export full Apps Script projects, manifests, deployed versions, script properties (secret store), deployments, execution identities, scopes, triggers, and connected Sheet/Drive IDs.
4. Restore to fresh isolated resources. Import the exact current schema first; repository migrations alone do not prove equivalence because routes also create tables dynamically. Preserve record IDs/timestamps and session hashes; do not regenerate IDs. Reconcile every table and object. Require zero unexplained discrepancies.
5. Transfer 16 masked production secrets through a supported secure flow. Do not retrieve them through logging, client bundles or Git. Verify recovery/ownership before any rotation; rotation may disrupt the original portal.
6. Review every historical blob for credentials/private data before pushing history. If found, retain original history in restricted backup and present a remediation decision; do not silently rewrite history or upload private school data.

## Isolated staging

- Do not share production DB, bucket, Apps Script properties, Sheet, Drive folders, notification subscriptions or API tokens.
- Use synthetic test users/records. Test Google identities remain subject to existing school registration and role checks. Add the staging origin to the existing OAuth client through its owner, preserving current origins. Verify actual redirect usage; code uses Google Identity Services credential exchange with /api/session.
- Provision test-only Google resources/scripts with matching behavior. Disable all scheduled triggers. Use no production push key/subscriptions or live messages. A blank environment alone is not sufficient evidence of isolation.
- Keep staging access restricted before loading any copied private records; otherwise use synthetic records only. The generated workers.dev configuration is not an access-control implementation.
- Confirm R2 is available without enabling billing. Any required paid service needs explicit user approval.
- Copy targets.example.json to ignored targets.local.json and populate verified resource IDs. Record isolated_staging_verified in ignored release-evidence.local.json only after inspection.
- Run `npm ci`, `npm run build`, `node scripts/test-application.mjs`.
- Run `node scripts/prepare-cloudflare.mjs staging` to generate `dist/server/wrangler.staging.json`. Inspect the generated config and local logs without secrets.
- Once all staging prerequisites pass, deploy with `npx wrangler deploy --config dist/server/wrangler.staging.json`. Capture the actual returned URL/version. No deployment has been performed in this audit.
- Store staging-only runtime secrets using Wrangler/platform secure configuration. Verify no secret enters client assets.
- GitHub validation runs on migration-branch pushes and supports manual dispatch (`validate-migration.yml`). Deployment automation still requires a repository-scoped Cloudflare GitHub connection or restricted deployment credential, environment controls and verified resource IDs. Never enable automatic production deployment from this migration branch before release gates pass.

## Validation

Use api-matrix.json for all 26 route files and expand relief-legacy subroutes. Test every role from production role counts/permission mappings, including inactive/deleted/unregistered users and unauthenticated requests. Verify server enforcement, SSO, 30-day session behavior, cookie Secure/HttpOnly/SameSite=Lax, logout, refresh, direct navigation and new-login persistence.

Exercise test-only CRUD, upload/download, Drive/Sheets writeback, e-Tempahan, e-Kunjung, OPR, relief generation/import, management, SKAS, e-Panitia, staff assignments, all AI providers/fallbacks, and notification simulation. Inspect console/network/Worker logs and confirm actual persisted state. Review CORS and OAuth origins. Do not change access restrictions to pass tests.

Verify R2 images/PDFs and the optional /_vinext/image route: worker references IMAGES but the current manifest has no Images binding. Determine actual use and cost before enabling anything. Free Worker CPU/bundle limits must be checked against deployed build and measurements; local success is insufficient.

Browser-local storage contains announcement-read markers, task expansion preferences and embedded legacy app storage. Inventory all legacy keys/data before deciding what needs transfer. Cookies, service workers and push subscriptions are origin-bound. New-origin login/re-subscription is expected; preserve the old origin and obtain an explicit migration method for any unsynced local data. A server backup cannot capture every user's browser.

## Final synchronization and cutover

A brief agreed write-maintenance window is proposed, NOT yet agreed or implemented. Do not assume timestamps provide safe incremental replication. Freeze all source write paths and external writers/Apps Script only during that agreed window. Capture final exports and object manifests, restore to fresh destination resources, reconcile counts/hashes/relationships and test representative records. Do not reset a populated destination without an independently verified snapshot and explicit scope.

Keep one scheduler active. The daily summary script checks every minute after 12:30 Asia/Kuala_Lumpur and uses script properties/locks and deterministic IDs. Those safeguards do not coordinate independent production databases. After validation, change only the existing scheduler's target to the new verified production origin; do not create a second live trigger. Preserve its previous URL and properties for rollback.

Set production secrets and OAuth authorized origins while keeping original origins. Set all gates to PASS only with evidence. Build the exact reviewed commit, generate production config, deploy, then repeat critical tests on the returned production URL. For workers.dev, no DNS/MX changes are needed. If a custom domain is later requested, first export its complete DNS zone, propose exact record changes and preserve MX/TXT/SPF/DKIM/DMARC records.

The old portal can still receive writes unless a verified maintenance/forwarding mechanism is implemented. This remains a release blocker even when a new URL works. Do not launch independent writable production copies.

## Rollback preserving new writes

Before cutover, implement and rehearse either a full mutation journal covering inserts/updates/deletions/attachments and external effects, or an export/reconciliation procedure under a second write freeze. This is not currently implemented.

On rollback: freeze the new environment and scheduler; retain a complete destination DB/R2 backup and Google changes; identify every post-cutover mutation including deletions; replay/reconcile into the original source by stable IDs with duplicate protection and conflict review; verify counts, relationships and object hashes; then restore old routing/scheduler and allow writes. If replay cannot be proven safe, stay in maintenance rather than reverting traffic and losing writes. DNS/URL rollback alone is insufficient.

Never delete the old deployment, database, files, Google resources or backups without separate authorization.

## GitHub staging deployment

Workflow deploy-staging.yml supports manual deployment from migration/cloudflare-20260922 only. It builds and tests before deploying to fixed verified staging D1/R2 resources, with MIGRATION_MODE isolation. No production target, data import, scheduler or external integration secrets are supplied.

ADMIN SETUP REQUIRED: configure GitHub environment staging with deployment branch restriction, suitable required reviewers where supported, a narrowly scoped Cloudflare deployment API token as CLOUDFLARE_API_TOKEN, and variable STAGING_DEPLOY_ENABLED=true after review. Token permissions must match Cloudflare official deployment requirements; restrict to the target account and use additional resource constraints where supported. Do not reuse or upload local Wrangler OAuth/refresh credentials. Workflow has not been dispatched; end-to-end deployment automation remains BLOCKED until administrator setup.

For manual rollback of staging code, inspect deployed versions using pinned Wrangler and select the previously validated compatible version. A Worker rollback does not roll back D1/R2 or external changes. Export current staging data before any rollback involving schema incompatibility; preserve new records and files. Do not run production rollback until the final-sync/reverse-reconciliation procedure above is rehearsed.

Official references checked 22 September 2026: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/ and https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/ .
