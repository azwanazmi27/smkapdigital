# Cloudflare migration checkpoint — 22 September 2026, Malaysia

Production cutover: BLOCKED. No production data, DNS, deployment or Google workflow changed.

- User chose Cloudflare, authorized private GitHub repository `azwanazmi27/smkapdigital`, and accepted a prefixed workers.dev address instead of buying a domain.
- Repository created and Private badge verified. It is still empty remotely pending CLI authorization and final private-data review.
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
- Google: school root Drive permissions and attendance Sheet permissions read. Apps Script connector search returned no projects; browser is not signed into the school owner account. Script versions, properties, scopes, deployment identities and triggers remain unverified.
- Attendance XLSX export returned a reference, but materialization failed HTTP 403. Do not count this as a verified backup.
- GitHub CLI and restricted-scope Wrangler OAuth sign-in succeeded. Target account has no D1 databases. R2 API returned code 10042 (R2 not enabled); dashboard requires a renewing usage-billed subscription, user decision pending.
- Cloudflare account already has `portal.smkapdigital.workers.dev`, with zero bindings. Leave it untouched. Proposed separate names are `smkapdigital-staging` and `smkapdigital`; availability/deployment not verified.

## Local evidence locations (never push these)

Workspace: `/Users/noorazwanazmi/Documents/Codex/2026-09-22/se`.
Backup directory: `work/backups/20260921T221228Z` outside this checkout, owner-restricted directory; not verified encrypted or off-device.
Build and test logs: `work/build-baseline.log`, `work/tests-baseline.log`.
CLI configuration: `work/cli-config` outside this checkout. Never commit credentials.

## Next actions

1. Finish supported CLI sign-in, then authenticated read-only source/repository checks.
2. Obtain supported complete production D1 SQL export plus schema/index/trigger definitions, and R2 object bytes + metadata manifest. Never deploy an export endpoint into production before the user's backup gate is satisfied.
3. Export/backup Google data and full Apps Script source/configuration/properties/triggers with the school owner; secrets go to a secure store, not Git/chat.
4. Restore into isolated stores, validate IDs, relationships, ownership, counts and hashes; record a consistent cutoff and final-sync strategy.
5. Complete historical secret/private-data review. Push migration branch and rollback reference to the already-created private repository without changing existing remotes/history.
6. Provision isolated staging only after billing eligibility and authentication are settled. Use test-only Google projects/resources and accounts; no live notification keys, jobs or production tokens.
7. Configure target IDs in ignored targets.local.json; prepare-cloudflare.mjs refuses missing targets and blocked production gates. It only generates configuration and does not enforce runtime isolation itself.
8. Deploy and test all endpoints/roles/integrations; then perform agreed write freeze/final synchronization, cutover and production validation. Keep old resources and backups.
