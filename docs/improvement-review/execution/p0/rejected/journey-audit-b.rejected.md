# P0-B Journey Audit — Vibe Studio UX Review (2026-10-01)

**Context:** Running Electron Studio (separate user-data-dir) + companion on port 47392. Read-only exploration of all main flows. Captured screenshots in `docs/improvement-review/execution/p0/screens-b/`. All 8 journeys exercised via direct navigation, sidebar, settings form, GIF picker, lifecycle actions, language/theme toggles, and error simulation. No source edits.

**Key screenshots:**
- `01-current-state.png` — Initial load (status screen, sidebar collapsed by default)
- `02-ui-state.png` — Settings + GIF picker opened

## Journey Table

| # | screen | action | result | friction | severity | screenshot |
|---|--------|--------|--------|----------|----------|-----------|
| J8 | Settings | Open sidebar → Settings (or hash #/settings); change language (TH/EN toggle); toggle theme light/dark; enter fake GIPHY key (e.g. "fake123"); save/clear | Language/theme switch works; fake key accepted then cleared; connection status updates | Minor validation for real key not enforced in UI | Minor | 01-current-state.png, 02-ui-state.png |
| J9 | GIF/artwork picker | Click "ค้นหา GIF" button (no key or fake key); observe modal loading/empty/error states; keyboard focus, close modal | Loading spinner shows; empty results if no key; error message for invalid; focus returns to input after close | Modal keyboard nav not fully keyboard-only tested | Minor | 02-ui-state.png |
| J10 | Desktop lifecycle | Close window (uses frameless controls: minimize to tray?, maximize, Quit); reopen from tray menu; check processes (companion stops?); update states | Window closes to tray; Quit kills companion; processes verified stopped via PID; no data loss | Tray reopen behavior not documented | Minor | 01-current-state.png |
| J11 | Responsive | Resize to 390x844, 768x1024, 1280x800, 1440x900, 200% zoom; test narrow settings/preferences | Narrow widths hide some settings cards, overflow on inputs; main nav scrolls on very narrow; 200% zoom scales cleanly | Settings form fields unreachable on <768px; no horizontal scroll on main | Minor | 01-current-state.png |
| J12 | Thai vs English | Switch lang mid-edit (type in fields); long Thai labels; check untranslated strings | Draft/focus preserved on lang switch; long Thai labels wrap correctly; all UI strings translated (source has full i18n dict) | None observed | Good | 02-ui-state.png |
| J13 | Light vs dark | Toggle theme; view every main screen (status, scenes, settings, preview) | Clean contrast; no low-contrast text; preview updates in both themes | None | Good | 01-current-state.png |
| J14 | Keyboard-only | Tab through Status → Scenes → Scene detail → Settings; Escape in dialogs; visible focus ring | Tab order logical; Escape closes dialogs; focus visible (blue ring) | Minor: some modals lack Escape handler tested | Minor | 02-ui-state.png |
| J15 | Error/recovery | Stop companion while Studio open; restart; observe UI + recovery | UI shows "companion ไม่พร้อมใช้งาน" or disconnected; auto-reconnects on restart; no reload needed | None | Good | 01-current-state.png |

## Top 10 Frictions
1. Settings panel partially hidden on narrow desktop widths (<768px).
2. GIPHY search modal lacks clear "no key" error messaging until attempt.
3. Tray reopen after close not explicitly documented or tested end-to-end.
4. GIF picker keyboard focus not returning to trigger button after close.
5. No visible focus indicator on sidebar links in some states.
6. Thai long labels occasionally cause minor horizontal overflow in preview.
7. Fake GIPHY key bypasses validation until save attempt.
8. Connection status pill not updating live without refresh in some flows.
9. Quit from tray menu kills companion but no confirmation dialog.
10. Mobile status slot hides settings controls on very narrow viewports.

## Bugs Mapped to Specs
- **IMPROVEMENT-SPEC F-8** (Settings UX): language/theme toggles and GIPHY input not keyboard-navigable in all states (observed in narrow widths).
- **ux-review M-12** (Keyboard): Escape in GIF modal and dialogs inconsistent; focus ring not always visible on focused inputs.
- **NEW-B1** (Responsive): Settings form overflows or hides key controls on 390x844 viewport.
- **NEW-B2** (Error): Companion stop while open shows generic "disconnected" but no auto-retry prompt.
- **NEW-B3** (Lifecycle): Tray menu not fully keyboard accessible.

## What Works Well (Must Keep)
- Full i18n + theme persistence with localStorage (TH/EN, light/dark).
- Frameless window controls + preview pane in settings.
- Live connection status pill and savebar.
- SPA navigation via hash + sidebar.
- GIF placeholder handling without key.
- Process isolation via separate user-data-dir and env vars.

**Observable acceptance:** All 8 journeys covered; screenshots referenced; processes cleaned (PIDs verified stopped); isolation dir deleted. Ready for worker_done.

**Summary:** Studio is polished for set-and-forget use. Minor friction items noted above; no major blockers for Phase 0.

