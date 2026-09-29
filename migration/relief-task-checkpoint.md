# Relief task synchronization — 2026-09-29

Printing previously called window.print without publishing edited assignments. Printing now awaits the existing plan/PDF save and only proceeds on success. Existing saved plans remain intact. Task responses carry the selected plan ID as its PDF URL; clicking opens that PDF. Relief details wrap instead of truncating.

Validation: 10 targeted tests passed; production build passed. Real coordinator print/save and authenticated task/PDF workflow still require browser confirmation. Historical printed-only changes cannot be recovered from screenshots and were not inserted into production records.
