# Remaining work and access boundaries — 22 September 2026

The user's latest instruction is to finish available work and defer work requiring administrator access. This does not waive release gates or authorize replacing Google Drive with R2 for portfolio uploads.

| Work | Current result | Dependency |
|---|---|---|
| Source code/history, private GitHub, staging build/deploy | Available; deployed manually | Existing access |
| Google SSO registered users | Working; all-role browser matrix incomplete | Safe accounts and browser tests |
| SKAS and ePanitia drafts | Limited staging enabled; documented local/browser evidence | Remaining full workflow validation |
| R2 put/get | Remote CLI bytes/checksum PASS | Browser synthetic PNG upload reached D1/R2; checksum PASS and UI persists after full refresh. Duplicate test records require investigation. |
| Task/portfolio reads and featured selection | Local handler ownership/role tests PASS | Browser role matrix pending |
| Staging GitHub deployment workflow | Prepared and configuration rehearsal PASS; not enabled or run | Administrator creates scoped Cloudflare token and GitHub environment settings |
| Full source SQL and R2 export | BLOCKED; four bounded table captures truncate | Source hosting administrator; request in outputs/SOURCE-EXPORT-REQUEST.md |
| Source restore/reconciliation/final synchronization | BLOCKED | Complete consistent export, object manifests and agreed write window |
| Drive portfolio/document uploads | BLOCKED | Isolated Apps Script deployment, test Drive root, secure token/configuration, full source/config audit |
| Sheets/Apps Script workflows, jobs/webhooks | BLOCKED | Isolated resources, execution identity/scopes/triggers and secrets; no duplicate production schedules |
| AI and notifications | BLOCKED | Authorized isolated provider configuration; no live notifications during tests |
| Browser local-only state migration | Static key inventory complete; device exports NOT TESTED | User-device inventory/transfer process; server backup is insufficient |
| Production cutover/reverse data migration | BLOCKED | All critical gates, final sync, tested preservation of post-cutover writes |

No claim that every non-admin task is complete: duplicate upload investigation, full per-role E2E, complete UI/network/server-log inspection and device-local export/reconciliation still need finishing. Do not classify those as completed or solely administrator-blocked.

Account owner access to school Apps Script was recovered; the existing copy remains a backup, not an isolated deployed backend. Do not run that copy before reviewing/replacing all production references and secrets. No new Google scopes or deployment access were granted.

GitHub deployment uses the existing pinned Wrangler. Secrets are supplied only to deployment step; no production secrets, SQL exports or backups are uploaded as workflow artifacts. Deployment remains manual and staging-only. Follow RUNBOOK.md for setup and rollback, not a DNS-only rollback.
