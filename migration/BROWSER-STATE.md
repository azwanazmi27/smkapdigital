# Browser-local preservation — 22 September 2026

Static audit covers app TypeScript and the bundled e-Keberadaan JavaScript, not every user's device. New origins do not inherit old-origin browser storage. Keep the old portal and each user's browser data intact.

| Key | Location | Meaning / handling |
|---|---|---|
| `smkap_announcement_read_<id>` | localStorage | Read markers. Preserve on original origin; optional user-mediated transfer after announcement IDs are reconciled. |
| `smkap_tasks_expanded` | sessionStorage | Display preference; do not confuse with server task records. |
| `relief-params` | localStorage, embedded relief app | Local relief parameters; compare with server configuration before import. |
| `relief-plans` | localStorage, embedded relief app | Fallback plans used when API reads fail. Potential data outside server exports: backup and reconcile IDs/content per coordinator device before cutover. Do not overwrite with destination plans. |
| `relief-access` | sessionStorage | UI access marker only. Never migrate as authentication or use to bypass server PIN checks. |
| `__vinext_hard_navigation_target__`, `__vinext_rsc_initial_reload__` | sessionStorage | Framework reload guards; no business records. |

No IndexedDB calls were found in the scanned application sources. This is not evidence that all historical versions/devices lack additional storage.

Coordinator handoff: on each device used for relief, keep the existing profile and source origin, export only the application keys through browser developer storage tools into private storage outside Git, record source origin/date, and compare relief plans and parameters against the complete server export. Review duplicates and missing IDs before any import. Do not export cookies, sessions, passwords, or unrelated website storage. No automatic cross-origin copy is implemented. Device-level export and reconciliation remain BLOCKED on device-owner participation; server administrators alone cannot recover these browser copies.
