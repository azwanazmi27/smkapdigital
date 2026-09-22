# Google staging setup — 22 September 2026

User authorized proceeding with available Google/Cloudflare administration rather than assuming administrator access unavailable.

Created with the signed-in school account sekolah-2508@moe-dl.edu.my:
- Empty Drive folder `SMKAP Digital STAGING TEST ONLY 20260922`: https://drive.google.com/drive/u/5/folders/1DjcfpqBct2BI4jP08rFrlHsF4HsDiW-V
- New Apps Script project `SMKAP Digital Staging Drive 20260922`: https://script.google.com/u/5/home/projects/1mw1dHMqCl8Sf-8DEFx-WYICJz_2ogtkWqKlGU2Gk_CpPNmXOisZRs0d7/edit

These are scaffolding only: default function, no workflow implementation, execution, deployment, trigger, new OAuth scope, secret or production reference configured. Existing backup projects and source scripts were not edited. Folder created in My Drive outside the production root; full ACL verification still pending. Do not claim Drive upload functionality is connected.

Cloudflare token summary prepared (not created): `smkapdigital-github-staging`, account Noorazwan092@gmail.com's Account, Workers Scripts:Edit only. UI exposes account-level scope; this does not restrict credential to staging Worker. No DNS/D1/R2 privileges requested. Expiry currently unset. Action-time confirmation requested before creation and storage as staging GitHub environment secret. Additional permissions must not be silently added if deployment fails; diagnose minimal needed scope and obtain approval for expansion.

## Superseding update: token and workflow complete
User explicitly approved account-scoped Workers Scripts:Edit without expiry. Token created and stored directly in GitHub environment `staging` as `CLOUDFLARE_API_TOKEN`; value never printed or persisted to repo. Environment restricted to branch `migration/cloudflare-20260922`, `STAGING_DEPLOY_ENABLED=true`. Manual workflow run https://github.com/azwanazmi27/smkapdigital/actions/runs/35731978285 succeeded including clean install, build, 104 tests and deploy. Worker version `bc77a4c0-7ea6-4904-9e44-ad1055abf864`. No D1/R2/DNS token permissions needed or granted. Existing account-level scope risk was explicitly approved.

## Superseding update: Apps Script code prepared, secret handoff
Read the OPR backup Code.gs through the editor into memory; inspected managementDrive_ contract without printing secrets. Source production/backup unchanged. Clipboard cleared after inspection. Fresh staging project's code now contains only doPost/doGet/json_ plus the existing managementDrive_ implementation with all root-folder references replaced by the new staging root. It allows only management_health/upload/download/trash, requires STAGING_API_TOKEN from Script Properties (minimum 32 characters), and fails closed when unconfigured. No scheduling, notification, public-sharing or other OPR handlers copied. This is limited management integration, not full Apps Script migration.

Corrected editor replacement issue; verified exact 4230-character code equality by reopening fresh editor and reading back. Code not executed/deployed or Google-authorized yet. Current management upload duplicate handling retains the original same-name behavior; checksum-aware conflict/idempotency extension is still needed before general storage migration.

Project Settings is prepared with Property STAGING_API_TOKEN and Value empty (not saved). Credential entry is a user handoff under browser control policy. User should generate a unique random token of at least 32 characters with a password manager, enter/save it in this staging script only, and retain it securely for the Worker staging secret. Do not send it in chat. Subsequent authorization/deployment must be reviewed at action time; no new OAuth grants yet. Folder ACL verification remains pending.

## Live staging integration — 22 September 2026
User explicitly accepted retaining the exposed staging token, approved web-app access Anyone under school identity, and approved Google Drive-wide OAuth scope. No production root used. OAuth callback returned a Google error page, but after reopening deployment the authorized project deployed successfully.

Apps Script version 1 deployment:
https://script.google.com/macros/s/AKfycbxL_Fxqo13T-HGfGeZDwSx09Cq9U0zeSV8mA3EknzVV9lTbHlZ9hLAgE0qdmsSSp_q8sg/exec

The existing token and URL were transferred directly into encrypted Worker secrets OPR_APPS_SCRIPT_TOKEN and OPR_APPS_SCRIPT_URL, without printing their values during transfer. Staging policy enables portfolio POST and pengurusan GET only for file or health queries; other management mutations and other external integrations remain blocked. CI deployment run 35734479971 succeeded, 105 tests, Worker version 130a5bba-5a1d-4108-a03b-6492bbfb4b04 (source e4d280d).

Browser synthetic upload PASS: portfolio ID 559aa0f3-6a10-4999-837a-af4bec2b618b, title UJIAN MIGRASI SAHAJA — DRIVE PORTFOLIO 20260922, 68-byte synthetic PNG. Successful portfolio card appears; after full refresh profile count=1. Authenticated file API opens image/png, confirmed by browser Page resource tree. Byte-for-byte download comparison NOT TESTED: browser resource-content retrieval unavailable. Console ORB failure was for favicon.ico, not evidence that the image request failed. Local Wrangler D1 read now returns authorization error 7403; database record reconciliation for this new item BLOCKED on CLI auth refresh. Do not print credentials or silently broaden CI token permissions.

This enables limited portfolio upload using Drive. It does not migrate all R2 objects, enable the full Google workflows, establish all-role browser coverage, or approve production cutover.
