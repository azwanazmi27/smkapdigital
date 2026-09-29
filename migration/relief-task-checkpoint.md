# Relief task synchronization — 2026-09-29

Printing previously called window.print without publishing edited assignments. Printing now awaits the existing plan/PDF save and only proceeds on success. Existing saved plans remain intact. Task responses carry the selected plan ID as its PDF URL; clicking opens that PDF. Relief details wrap instead of truncating.

Validation: 10 targeted tests passed; production build passed. Real coordinator print/save and authenticated task/PDF workflow still require browser confirmation. Historical printed-only changes cannot be recovered from screenshots and were not inserted into production records.

## Table PDF follow-up
Shared relief-table-pdf.js now generates a grouped six-column table matching the supplied sample (absent teacher, period/time, subject, class, replacement, signature). Editor saves and task PDF reads use the same generator. Existing plan PDFs are rendered from that plan's stored assignments without rewriting data or archived files. Build and 11 tests pass; synthetic multipage first page visually inspected. Browser print profile/banner is intentionally not embedded as another user's identity.
