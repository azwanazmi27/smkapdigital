# Google Drive as primary file storage — 22 September 2026

User direction: keep all application files in Google Drive where possible and reduce Cloudflare file-storage dependence. Cloudflare remains the application runtime and structured database. This supersedes the unapproved proposal to switch portfolio uploads from Drive to R2. No live storage architecture was changed by this plan.

## Component treatment

| Component | Current implementation | Target |
|---|---|---|
| OPR, ePanitia, management and portfolio documents | Existing Google Drive / Apps Script contract | Retain Drive IDs, permissions and workflow |
| Visitor photos and associated documents | Existing Google integration | Retain Drive and reconnect after isolation checks |
| SKAS uploads | R2 object key in D1 | Drive private file; retain existing API URL and role checks via authenticated server download |
| Staff work PDFs | R2 file_key and assignments in D1 | Drive private file; preserve owner/assignment access checks |
| Relief PDFs and import endpoint | R2 plus existing Drive archive for generated PDFs | Reconcile existing Drive archive first; reuse verified Drive file instead of duplicating; retain PDF API URLs |
| Absence summary PDF | R2 deterministic key | Drive file with stable logical key and duplicate protection; one live scheduler only |
| Avatars, profiles, announcement images | R2 keys; some existing public API image delivery | Drive backing store; preserve current public/private API behavior without making Drive folders public |
| Bundled UI code, icons and static build assets | Git + Worker static assets | Keep deployment assets with application; not school document storage |
| Structured records, identities, roles and file mappings | D1 | Retain D1; Drive does not replace relational records or access controls |

## Concrete migration approach

1. Obtain full source object inventory/bytes and SQL export. Hash and restore-test copies outside resources being changed. Do not infer file completeness from Git or D1 rows.
2. Audit existing Apps Script source, properties, execution identity, deployment permissions and Google resource mappings. Preserve existing Google workflows. Prepare a separate test Drive root and script deployment with no production schedules.
3. Add a server-only file-storage adapter and additive mapping table: original logical key, Drive file ID, MIME type, size, SHA-256, source reference, migration status and timestamps. Keep all original record IDs, file keys, API URLs and authorization rules.
4. Rehearse copy-only migration with synthetic data. Upload once per logical key/hash, verify downloaded bytes, persist mapping only after verification, and leave failed entries retryable without duplicate creation. Prefer reuse of already archived Drive files only when bytes and ownership are verified.
5. Copy production files without deleting source objects. Reconcile every referenced and unreferenced object, missing file, permission and checksum. Preserve original timestamps as metadata where platform-native timestamps cannot be retained.
6. Deploy dual-read behavior during transition: verified Drive mapping first, original R2 read fallback for unmigrated objects. Switch new writes to Drive only after isolated upload/download/permissions tests pass. Never silently fall back writes to R2 on Drive failure.
7. Final supported synchronization or agreed write-maintenance window; confirm zero unexplained discrepancies before production cutover. Keep original R2 and backups until separate explicit decommission authorization.
8. Rollback must retain Drive files and mapping rows created after cutover. Either retain adapter-compatible code or copy verified new Drive objects back into the legacy key namespace before rollback. Do not roll back just DNS/code and orphan new writes.

## Compatibility risks and release gates

- Google service limits, file-size overhead, script execution time, concurrent access and download performance require measured tests with representative files before selecting adapter transport. Current official limits must be checked at implementation time; no capacity guarantee yet.
- Private Drive URLs are not substitutes for app authorization. Downloads must retain server-side owner/role/assignment checks. Do not publish folders or bypass Google/app authentication.
- Public portal images need an explicitly controlled server delivery path; private school documents must never inherit public image rules.
- Existing Apps Script upload/download/trash operations cannot be assumed to support generic logical keys, resumable large files, checksum metadata or idempotency. Audit before extending them.
- Deletions must preserve current user-facing behavior while using recoverable Drive trash where supported; production cleanup requires separate authorization.
- Full source exports, isolated Google configuration and secrets remain administrator-dependent. No Drive destination switch or R2 deletion is authorized solely by this plan.

Status: architecture plan PREPARED; implementation and transfer NOT STARTED; original production intact. User requested administrator work last. The migration cannot be declared complete until data and access gates pass.
