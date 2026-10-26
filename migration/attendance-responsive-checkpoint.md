# Attendance and relief responsive layout — 2026-10-27

Added responsive-layout.css after the retained app styles. Both attendance and relief retain their workflows; layout rules now constrain grid tracks, keep the school crest/banner and avatar aspect ratios, wrap action groups, stack phone forms and long teacher records, and contain horizontal timetable scrolling. Embedded scroll regions have keyboard focus and an accessible label. Rules apply to screens, preserving print styling.

The attendance header now uses the portal crest in its portrait logo slot; relief keeps the original landscape school banner. Asset query strings were updated for the app and layout.

Validation: production build passed; 262 existing application tests passed; both JavaScript files parse and PostCSS parses the new stylesheet. No live data was changed. Browser visual/viewport validation is pending: the computer-use tool continues reporting “Local browser use is disabled in Work settings” after the user reported enabling it. Do not describe phone/laptop rendering as visually verified until that check is completed.
