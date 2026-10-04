
# P3-R — Variables UI, app-icon consent, sidebar update card, first-paint skeleton (renderer)

Files: scripts/discord-presence-studio.html, scripts/studio-ci.css, scripts/tests/renderer-updates.test.mjs (rewritten for card/Settings), scripts/tests/electron-packaging.test.mjs (banner expectations), scripts/tests/renderer-p3.test.mjs (new, 11 tests).

1. Variables: `{ }` button beside Activity name, Details, State, both hover texts and both button labels opens a chip row ({app} {scene} {user}); chip inserts at the caret. A "→ resolved" hint shows under any input containing a token; the `?` tooltip lists the variables. Preview/Now/library resolve like the server (live scene: runtime.variables; else first paired app, else Scene name; user = DCID name, fallback "Discord user"); unknown tokens stay literal. (verified by tests)
2. App icons: GET/PUT /api/icon-hosting; per-app status (ready/uploading/needs-consent/failed) in the small-image "app icon" dialog; one consent card (exact Thai copy, Allow/Not now) in that dialog and on Now (only while consent is undecided); switch in Settings > Discord connection; app list is re-read after consent and polled every 3 s (max 12) only while something is uploading. Absent fields degrade (publicIcon => ready; no endpoint => controls hidden). (verified by tests)
3. Updates: top banner removed. Sidebar `.mk-vcard`: idle "vX · ล่าสุด" + check mark + hover/focus tip "ตรวจล่าสุด HH:MM"; downloading slim bar + %; downloaded accent card + "รีสตาร์ตเพื่ออัปเดต" + "หรือจะติดตั้งให้เองตอนปิดแอป"; error quiet retry; collapsed-sidebar dot variant; reduced motion respected. Settings: same states, hourly auto text, secondary "ตรวจตอนนี้". checkedAt is taken from state.checkedAt/lastCheckedAt if the desktop sends it, else when a check finishes. Spelling changed to "รีสตาร์ต" everywhere. 17 old updater tests became 20 and still cover all behaviours via sidebar/Settings.
4. First paint: head inline script (before the stylesheet) applies `vibe.theme`/OS pref + `vibe.lang`; inline html background per theme; static `.vs-boot` skeleton (sidebar + page cards, shimmer) inside #root, replaced by mount() on first render.

Evidence: node --test renderer-updates 20/20, renderer-p3 11/11, electron-packaging pass. Full `npm test`: 288/295; the 7 failures are in electron-main host boundary / app-badge / HTTP app-catalog tests (other lanes' in-flight work, not renderer files).
Not verified: visual check in a real browser (Chrome extension not connected; page only confirmed served 200 and both inline scripts pass `node --check`); caret insert and chip UI untested interactively; skeleton/real-shell pixel parity is approximate. Isolated server was stopped.

## P3-R2 follow-up
Files: scripts/discord-presence-studio.html, scripts/tests/renderer-updates.test.mjs, scripts/tests/renderer-p3.test.mjs.
- Update copy: downloaded card "vX พร้อมแล้ว / vX ready" + "จะอัปเดตให้เองเมื่อปิดหน้าต่าง", button "รีสตาร์ตตอนนี้ / Restart now"; idle tip "ตรวจอัตโนมัติทุกชั่วโมง · ล่าสุด HH:MM". No Download button while an update is `available` (sidebar shows "preparing…", Settings has no primary action); Download appears only as recovery after an error.
- `window.vibeStudio.setTheme(S.theme)` via guarded `syncShellTheme()`: called at boot and in the theme action.
- App icon source: scene fields `artSource`/`smallSource` round-trip as `largeImageSource`/`smallImageSource:'app-icon'` (key omitted when unset). The small-image "ใช้ไอคอนแอปต่อไป/Use app icon" button now saves smallImageSource:'app-icon' (image cleared); the large dialog gets "ใช้ไอคอนแอปที่จับคู่". Any other image pick/clear resets the source. Preview/well show the paired app's publicIcon (live scene: runtime applicationBadge).
- Tests: renderer-updates 22/22, renderer-p3 15/15. Full npm test: 309/309 pass.
- Not verified in a real browser/desktop shell.
