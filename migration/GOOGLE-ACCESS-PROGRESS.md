# Google integration audit — 22 September 2026

School owner login confirmed in Apps Script: sekolah-2508@moe-dl.edu.my. Earlier statements that the owner was not signed in are superseded. No source script edited, run, redeployed or trigger changed.

- Portal OPR SMKAP - Drive project: `1qpV_daNBahYQ_OF-e5Hz7dqK0c5e1T8ZL9WOqAjMJ7t-oK4QRVUKPjcY`. Editor lists Code.gs and AbsenceSummaryScheduler.gs. One owner time-based trigger `smkapDailyAbsenceSummary`, Head, last run 22 September 2026 17:05:44; displayed error rate 0.02%. Exact interval and failure cause not yet inspected.
- OPR active deployment: version 8, 6 September 2026 09:44, description Pengurusan Sekolah - padam selamat ke Trash Drive. Execute as school owner; access Anyone. This is existing access, unchanged; application secret enforcement must be preserved.
- E-Tempahan SMKAP project: `1YdFWgrjo6A3Ary4p_M5cYgCEEUHDUp8T-9ePXGUBd4WHiUjWIVz7N8U2`. Owner confirmed. Existing named deployment E-Tempahan v2 — padam tempahan dan semakan pertindihan. Scopes: script.send_mail and spreadsheets. Seven-day overview showed 25 executions, 0% error. This is historical evidence, not migration E2E validation.
- Native Make a copy succeeded for E-Tempahan. Backup project: `1OmdTawMQykeCDZhJVSStHeRU3VVDQl8RpUihmP9mWVMkskJ3wH_y9vOf`, title Copy of E-Tempahan SMKAP. UI initially opened a broken legacy redirect; opening from project search confirmed it exists. Do not duplicate. Overview: no deployed status, last run blank, zero executions. Triggers page: zero triggers. Source equality, ACL, script properties and restoration remain unverified; do not run backup because it may retain production resource IDs.

Next: securely export script source and properties without displaying secrets; compare native copy; back up OPR; inspect deployment URL matching, triggers and Google OAuth origins. Full D1/R2 export and R2 subscription decision remain separate blockers. R2 remains deferred.

## Follow-up: 22 September 2026, 17:12 MYT

- OPR native backup created once: `1mYmg0WC9mJu7hkr_Ivs-wUdMAjgmFqeTdXvm3Lj5mQ1X7-M4ps2NHBCd`, title Copy of Portal OPR SMKAP - Drive. Project search and overview confirm owner school account, blank deployed status/last-run and zero executions. Triggers page confirms zero triggers. No source edits or execution performed. Full source/property/ACL equality still unverified.
- OPR backup reports four requested scopes: drive, spreadsheets, script.scriptapp, script.external_request. No new consent granted or scopes changed.
- Google Cloud credentials page for school account requires organization reauthentication (Verify it’s you/password). Browser tab left awaiting user completion; no password requested through chat. SSO console audit remains pending.
- Two script backups now exist in addition to earlier 233 original Drive-file backups and the attendance restoration copy. These native script copies are not verified restoration packages and may retain production identifiers; never run or deploy them for staging.

## Follow-up: Google Cloud authenticated

Google Cloud reauthentication completed. Project selector for school account showed no projects under No organization; moe-dl.edu.my listed DELIMa-3. Search for production OAuth client project-number prefix 700702672944 returned no resources in either scope. This does not establish deletion or ownership; owner account/project access remains required. Existing client ID preserved, no new identity system created.

E-Tempahan Manage deployments verified active version 2 (27 August 2026 13:31), execute as school owner, access Anyone; archived v1 remains. No deployment or access settings changed. Active deployment ID: AKfycbzABXhCPuGERzOT2xY-G4dm9tFtjEMc4PLTJxs6rcrGgAUm7Bd-IKVo_Fzz6iF6EDSnTA. Secret enforcement and destination E2E remain unverified.

## OAuth owner resolved

User identified noorazwan092@gmail.com. Google Cloud authenticated as that account and project `portal-digital-smkap` (Portal Digital SMKAP) was found. OAuth client Portal SMKAP Web exactly matches source code: `700702672944-20sjvug0albitl36cm671s7h19k57pc4.apps.googleusercontent.com`.

Verified baseline: one authorized JavaScript origin, `https://portal-smkap-muadzam.sekolah-2508.chatgpt.site`; zero authorized redirect URIs. Audience is External, publishing status In production. Service account Portal OPR SMKAP exists in the same project. No secrets revealed/downloaded, no credentials created/rotated, no origin or audience changed. Earlier OAuth owner-access blocker is resolved; destination-origin configuration and full SSO E2E remain pending a verified deployment.

## R2 authorization update

User explicitly authorized R2 activation, including usage overages and subscription terms. Clicking Add R2 subscription opened a payment-details checkout; activation is NOT complete. Checkout requires payment method and billing address, which user must supply directly. No card details available or entered. Earlier R2-deferred statements are superseded by authorized-but-payment-pending status.
