# Empty production migration plan

This plan prepares a new production portal with the migrated application and no historical portal data. The original portal remains untouched.

## Ready to carry forward

- React/Vinext application, API handlers and UI assets from the migration branch.
- D1 schema and migrations; create a dedicated production database and run migrations only.
- Google SSO validation, role checks and session protections.
- Google Drive storage design; production folders and Apps Script deployment must be separate from staging.
- GitHub Actions deployment workflow with a production approval gate.
- Rollback reference `rollback/pre-cloudflare-20260922` and the original portal URL.

## Must be re-entered in the new portal

- users, Google identities, roles and module permissions;
- school leadership records and organisation chart images;
- announcements, calendar events, profile photos and public settings;
- module records, documents, attachments and Drive links;
- Apps Script production URL/token and production Drive folder IDs;
- provider credentials and production AI configuration.

## Production release gates

1. Dedicated production D1 and Google Drive root verified.
2. Production SSO origins and callbacks verified.
3. Production secrets entered as platform secrets; none committed.
4. Synthetic role matrix passes for super admin, admin, teacher and unauthenticated visitor.
5. Upload/download persistence passes against production Drive test folder.
6. DNS/TLS and rollback instructions reviewed.
7. User gives final cutover confirmation.

No production resource is created or traffic is changed by this document. It is a preparation checklist only.

## Provisioned resources

- Production D1: `smkapdigital-production-db`, ID `24214079-2cb4-41f8-b708-b4cda7784047`.
- Production R2 bucket: `smkapdigital-production-files` (kept empty; Google Drive remains the intended file store).
- Production D1 schema applied and 61 active users inserted: 2 `super_admin`, 59 `teacher`.

Worker deployment, production SSO secrets, Apps Script production URL/token, and DNS remain gated until their values are configured and tested.

## First production deployment

- URL: `https://smkapdigital-production.smkapdigital.workers.dev`
- Version: `c47b5d3b-4271-42dc-a526-83228a44fa6a`
- Root smoke test: HTTP 200.
- Google client configuration endpoint returns the existing client ID.
- No custom DNS was changed.
- Apps Script production credentials and production Drive folder are not configured yet, so integration write paths remain unavailable until those secrets are added.

## Requested production URL

- Primary URL: `https://smkapdigital.smkapdigital.workers.dev`
- Version: `c40d4e59-99ee-4dcb-a9b6-db1cab425112`
- GET `/` returns the portal HTML; the Google client configuration endpoint responds successfully.

## Friendly production URL

- Official URL: `https://portal.smkapdigital.workers.dev`
- Version: `37309631-cbc5-43fa-9f54-f1685871996e`
- GET `/` returns the portal HTML and `/api/admin-users?resource=config` returns the Google client configuration.
