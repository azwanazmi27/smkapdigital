# Attendance and relief responsive layout — 2026-10-27

Added responsive-layout.css after the retained app styles. Both attendance and relief retain their workflows; layout rules now constrain grid tracks, keep the school crest/banner and avatar aspect ratios, wrap action groups, stack phone forms and long teacher records, and contain horizontal timetable scrolling. Embedded scroll regions have keyboard focus and an accessible label. Rules apply to screens, preserving print styling.

The attendance header now uses the portal crest in its portrait logo slot; relief keeps the original landscape school banner. Asset query strings were updated for the app and layout.

Validation: production build passed; 262 existing application tests passed; both JavaScript files parse and PostCSS parses the new stylesheet. No live data was changed. Browser visual/viewport validation is pending: the computer-use tool continues reporting “Local browser use is disabled in Work settings” after the user reported enabling it. Do not describe phone/laptop rendering as visually verified until that check is completed.

## Dark teal and crest follow-up
The uploaded school crest was cut out using ImageGen with transparency while preserving its book, lettering and emblem. A lossless WebP display derivative (384 × 420, ~133 KB) is served only within this module. All four module logo references use the new crest; portrait image slots prevent distortion. dark-teal.css follows the responsive stylesheet, applies only to screens, and covers forms, lists, dialogs, administration, timetables and semantic states. Base text/button/status contrast checks exceed 4.5:1. Browser visual validation remains pending due the tool-level browser-use restriction; do not claim it was performed.

## Screenshot follow-up: iOS date and summary search
User screenshots showed date controls extending past their cards, an inherited column layout in the search label, a dark green date hint and a pale badge with pale text. Explicit minmax(0,1fr) label tracks, border-box native date/time appearance and constrained inline sizes now apply to both date controls. Search labels explicitly use a row, a flexible zero-basis input and a contained icon. Badge/hint contrast is 8.50:1 / 7.52:1. CSS asset query versions were incremented. Production build and CSS parsing pass. These fixes are source-checked against the screenshots; browser visual validation is still unavailable.

## Glass surfaces and late-record hierarchy
Applied a screen-only glass layer to attendance and relief, using dark teal translucent gradients, subtle inset highlights and bounded backdrop blur on outer panels. Late absence cards now retain their teal surface with a static red edge/glow. The header warning remains; only its duplicate footer warning is hidden on screen. Phone records use the full card width for metadata, combine reason/duration into two columns, and provide matching edit/delete hit areas. Reduced-transparency mode uses opaque surfaces. Existing date/search fixes and print output remain separate. Build and CSS parser validation pass; no browser visual check was available.

## Responsive opening splash
Replaced the full-bleed cover image with a contained portrait image and an independent loading indicator. Safe-area padding and viewport-height limits preserve the original 1046:1394 aspect ratio. Laptop/tablet images cap at 520px wide; short landscape screens use a side-by-side layout. Width/height budgeting was checked for 320×568, 393×852, 430×932, 768×1024, 1024×1366, 1366×768, 1440×900 and 844×390; this is a calculation, not a browser visual test. Removed the image shade overlay that previously covered the artwork.
