# Round 03 — cold integration review

Verdict: **Rework**. New findings: **0 Blocker / 1 Major / 0 Nit**.
Review date: 2026-10-01. Review only; application and canonical documents unchanged.

## Inputs and independent intent

Read the complete canonical spec and workflow before older review reports or convergence history.
Intent: make the owner's existing app-selected/legacy scheduled Discord Scenes reliable, preserve local data and artwork, and make editing, durable saving, selection and actual RPC application visibly distinct without replacing Node/vanilla architecture.
Cold questions recorded independently: can all existing supported data survive the new transport/storage contracts; can concurrent commands and already-submitted RPC effects be represented truthfully; do tests reach real boundaries; can a smaller correctness release defer visual work?
Source HEAD observed: `b241ccd5542b1f3e5ee348bd507cac051cafabda`; tracked diff empty. Canonical inputs stayed stable across the trace.
SHA-256 (raw on-disk bytes):

| Input | Observed hash |
| --- | --- |
| `docs/improvement-review/IMPROVEMENT-SPEC.md` | `11E512AC7DC660128550047E38C5F43E0CA4B3144BB52DD12B4B2B124529A15B` |
| `docs/improvement-review/WORKFLOW.md` | `F25AFBFC3FA091D3E801D4F116E51C8CE3764402D1FF4CE07ADBE84E81496B02` |
| `scripts/studio-server.mjs` | `1014EE57500872934B527CDCC531AB950782B93BF85D48A7E53FCD06C7896AD4` |
| `scripts/discord-presence-studio.html` | `15B79564FD958598B4C5EEC029532EDDD2B4ADD5EC568F8DC4E9FF14439C019E` |
| `electron/main.js` | `6BA8FFBA5F85729126888E9DE61F1E94FF79A7522B742DC062B71A97182A601A` |

## Independent findings — frozen before inherited-review reading

**Major R03-M1 — The planned request byte cap is smaller than a supported Scene-save payload.**
Consequence: an owner with valid maximum-count/multibyte data can load and edit it, but every whole-Scene autosave/Show preparation fails at the new HTTP guard; a security change creates an inability to save existing supported data.
Plan evidence: spec `15`, `67`, `75` preserve fields/Thai and editor operation; `134` fixes every JSON read at 256 KiB; `191` requires maximum supported Scenes. No aggregate-size compatibility rule resolves those requirements.
Raw trace: `scripts/presence-config.mjs:27-55` counts JavaScript characters, allows 512-character HTTPS/image strings; `96-112` permits six URL/image fields and two button URLs; `143-149` permits 20 Scenes. Renderer `scripts/discord-presence-studio.html:2795-2804` serializes all Scenes and slots into one save; server `scripts/studio-server.mjs:783-785` accepts that body through the reader before validation/persistence.
Pure source probe: imported only `presence-config.mjs`; constructed 20 unique Scenes with 40-character Thai names, five 128-character Thai text fields, eight 512-character HTTPS strings per Scene and two 32-character Thai button labels; `validateConfig` accepted it. `Buffer.byteLength(JSON.stringify({scenes,slots:[]}))` was **290,353 bytes**, exceeding **262,144** by **28,209**. No server, provider, filesystem mutation or Discord connection was used.
Smallest correction: derive finite per-route byte caps from supported serialized payload bounds, preserving valid legacy data; alternatively specify compatible partial-update commands. Add maximum-count multibyte/JSON-escaping fixtures through the actual reader, including `/api/app-mappings` (100 mappings, 1,024-character paths; `scripts/app-presence.mjs:9-18`). Do not truncate fields or defer the compatibility rule to G6.
This is a missing plan contract introduced by W1's byte cap, distinct from the already assigned F15 chunk-decoding/application defect.

## Complete trace and ownership coverage

Paths below are repository-relative; line spans identify inspected seams. Each row follows entry -> owner/branches -> state or effect -> failure/recovery -> visible outcome.

| Path / surface | Source trace and plan disposition |
| --- | --- |
| CLI and desktop entry | `scripts/discord-presence-studio.mjs:5-9` -> `scripts/studio-server.mjs:55-92,887-934`; `electron/main.js:30-47,297-321` -> shared server. W0/W1/W2/W6 decide storage ownership before boot writes, owned listener, typed collision cleanup and one startup adapter (spec `142,154-168,176-182`). |
| Current owner decisions | `CONTEXT.md:11-40` defines Scenes/editing versus Live; `docs/presence-studio/APP-SETUP-JOURNEY.md:3,12-20` supplies app-first setup/legacy retention; newer `docs/presence-studio/RUNNING-APPS.md:3-7` supersedes foreground-only priority. `docs/presence-studio/decision-auto.md:16-18` is older/open; `docs/presence-studio/decision-character.md:16-22` is historical art direction. Spec `11-15,59,95,104,208-210` correctly preserves current running selection/approved assets and excludes speculative public/product extensions. |
| Initialize, onboarding, navigation | Renderer `35,3620-3659,3849-3869` reads then currently migrates through mapping PUT; `3346-3402,1870-1881` owns route/detail focus; overlay code `1385-1425,2456-2486` owns cleanup. W4 removes write-on-read and unifies visible retry/history/modal focus; W5/G1 covers Start destination, keyboard and close-to-background explanation (spec `63-64,70,79`). |
| Library, create/duplicate/delete | Renderer `3146-3218` changes Scene identities/dependencies locally -> autosave; `scripts/app-presence.mjs:7-18` rejects dangling references. W2/W4 preserve one-Scene minimum, 20 maximum, explicit dependent-reference confirmation, atomic commit and retryable draft; success follows commitment (spec `66,122,180,191`). |
| Editor, timers, Preview, Show | Renderer `1811-1849,1883-1904,2777-2889` -> serialized save then override; validator `scripts/presence-config.mjs:58-115,280-310`; art `scripts/character-art.mjs:13-23`. W4 preserves invisible timer metadata and later drafts; W3 exposes saved versus RPC-applied and validates projection; G3 proves public art/buttons. R03-M1 remains at the unchanged whole-document transport seam. |
| Pairing, installed/manual/running apps | Renderer `3468-3556,3564-3580,3610-3614` -> server `761-775`; `scripts/installed-apps.mjs:28-95` / `scripts/installed-apps.ps1:42-68` normalize singleton/empty/unsupported targets; `scripts/app-presence.mjs:1-44` owns identity/priority. F10/F12 and spec `69,108,122` require stable candidate Retry, last-good/error/empty distinction, one scan and deliberate Enable Auto. |
| Status, selection, pin, session, schedule | Server `174-249,434-458,555-576,750-755` -> `scripts/app-presence.mjs:27-44`, `scripts/presence-scheduler.mjs:19-65`, `scripts/codex-session.mjs:1-17`, `scripts/application-badges.mjs:4-15`. W3 preserves app fallback, hour pin, legacy boundary overrides/DST, outgoing validation and source/timestamp identity; Status distinguishes unknown, desired, applying and acknowledged output (spec `65,93-108,126-128`). |
| Pause/Hide/reconnect/Quit effects | Server `298-409,541-552,590-600,671-692` submits/clears RPC and reconnects; renderer `2897-2949,3278-3308` reports actions. Spec `110-114` explicitly handles one already-submitted effect, timeout uncertainty, immutable process-local hold, held-Scene edits/deletion and cold restart; W3 assertions must record actual submissions/effects, including clear when `active` was false. |
| Config/revision/concurrency/recovery | Server `429-438,525-538,769-785` currently publishes or merges outside a command transaction -> `scripts/local-config-store.mjs:11-67` write chain/migration/reset. W2 + runtime owner cover queued read/validate/save/publish, persisted revision, two-tab 409, separate drafts, failed-write rollback, alias/partial-overlap process leases and future-schema/read-error preservation (spec `118-122,154-162`; workflow `54,59,63-64`). |
| Settings/key helper/privacy | Renderer `2503-2570` -> server `603-668,807-813`; `scripts/app-secrets.mjs:37-99,103-138,148-221` -> `scripts/setup-giphy-key.mjs:11,42-65`; `scripts/discord-application.mjs:1-14`. W2/security owns the shared secret lease/partial merge/recovery; W1 fences provider credential generations; W6 owns startup adapter changes. Effective source/default/override is reported without GIPHY values; no key/path capture was performed (spec `72,138,148,158-162,204`). |
| HTTP and Electron trust | Server `493-508,693-743,807-894` parses body/Host and exposes mutations; preload `electron/preload.cjs:5-29` -> main `electron/main.js:79-102,231-274`. W1/runtime/UX ownership in workflow `54-56,63-64` covers guarded parsing, tokenized client, frame-ancestors HTTP headers, exact owned main-frame IPC/navigation, validated external link handoff and fail-closed occupied port (spec `134-142`); G5 proves denied requests have zero effects. |
| GIF provider/picker/resources | Renderer `2448-2486,2592-2618,2644-2678,2714-2785` -> server `844-851` -> `scripts/giphy-search.mjs:99-180,213-245`. W1/W4 choose 2 transports/8 queued/32 requesters, actual-settlement admission, coalesced one-versus-last cancellation, byte/deadline caps and 48 retained buttons with focus/selected-art preservation (spec `85,146-150`). Ignored abort remains bounded and visibly unavailable; no unbounded retry assumed. |
| Helpers, latency, hidden Studio | `scripts/windows-apps.mjs:5-18` owns one persistent helper; `scripts/windows-apps.ps1:4,17-68` caches icons, enumerates about 1 s, emits about 200 ms. Renderer `2934-2949,3665-3667` polls with one pending flag. W3/W5/G6 separate healthy enumeration from focus settling, require stale detection/backoff/30 s unknown clear, suspend hidden polling/media and measure real helper/cache/CPU/RSS costs (spec `108,202`). |
| Language/theme/responsive/accessibility | Renderer `969-1112,1121-1141,279,1883-1886,3849-3862`; `scripts/studio-ci.css:159-178,211,245,911-940,1100-1156`. W4/W5 assign per-screen errors, labels, interactive Preview, reusable dialog cleanup, main scroll/action rail, visible mobile preferences and reduced-motion posters; G1 covers Thai/English, both themes, 390/768/1280/1440 and 200% zoom. No current rendered/layout assertion inferred (spec `75,79-85,195`). |
| Startup/tray/update/package/backout | `scripts/windows-autostart.mjs:12-59`; `electron/main.js:38-47,135-167,170-220,233-262,276-321`; `package.json:14-18,54-62,70-82`, `package-lock.json:3-17`, `.github/workflows/release.yml:21-34`. F07/F16/F20 + W6 cover void send, missing tray, pending startup/quit/install, one startup authority/opt-out, production dependency/resource/tag/artifact checks. Spec `166-168,198,204` assigns previous-version install/update/migration/backout proof and prevents pending-update/double-launch resurrection. |

## Test realism and implementation burden

Inspected `scripts/tests/{studio-server,local-config-store,app-secrets,presence-config,presence-scheduler,app-presence,running-presence,codex-session,character-art,discord-application,windows-autostart,giphy-search,electron-packaging}.test.mjs` through their real fixtures/test cases.
Server fixtures disable startup/discovery and use temp files but retain real RPC login (`studio-server.test.mjs:38-49,173-190` -> server `387-405,932`); therefore the recorded 56-pass result proves neither isolated RPC effects nor real viewer delivery. Electron assertions include source strings (`electron-packaging.test.mjs:55-105`), not sender/lifecycle execution. Store coverage (`local-config-store.test.mjs:9-43`) demonstrates success/reset but does not challenge backup/rename failures; GIF coverage (`giphy-search.test.mjs:174-201`) tests completed cache, not shared cancellation or actual concurrency.
Spec `150,178-189,191` supplies meaningful deferred transports, real temporary filesystem/fault seams, actual RPC effects and boundary harnesses; G1-G6 retain the necessary external proofs. Future harness work must replace/inject those real-RPC test paths before claiming deterministic isolation, and must add R03-M1 through the guarded HTTP reader rather than only a serializer assertion.
The plan is substantial but ownership is executable: runtime alone writes server/lease/controller glue; security writes guards/provider/host/secrets; UX writes the renderer; package/public-contract changes have a single assigned writer (workflow `54-66`). Contract review precedes wiring; no framework/database rewrite is needed.

## Smaller 90/10 alternative

Deliver a correctness slice first: read-only initialization/timer preservation, compatible guarded transport, durable revisioned saves/drafts, dependency-safe delete/pairing, truthful Status and controller effects; apply Electron safe-send/owned-port guards before any desktop exposure. Reuse current route/forms/tokens and defer W5 composition/color work and new installer exposure. This meets most reliability value sooner; it still requires the relevant trust/storage/Discord gates and cannot bypass data ownership or backout. Workflow `68` already permits separately scoped authorized hotfixes.

## Inherited issue assessment

Read `rounds/round-01.md` and `rounds/round-02.md` only after the independent findings and complete coverage above were written.
- **R1-M1 resolved at plan level:** spec `154-162` decides per-file canonical ownership before reads/migration, port reservation before storage, incarnation/nonce recovery and shared helper exclusion; workflow `54-55` assigns both integrations. G2 verifies the selected mechanism.
- **R1-M2 resolved at plan level:** spec `110-114` decides the eight-second submitted-RPC handoff, immutable hold/restoration, uncertain timeout, Hide invalidation and restart-with-no-hold; W3 `179` demands actual-effect fixtures.
- **R1-N1 resolved:** spec `202` separates full enumeration from emitted focus snapshots and measurement start points.
- **R2-M1 resolved at plan level:** spec `136` mandates top-level Studio and anti-framing response headers, including error documents; W1/workflow `54,63-64` owns wiring and G5 proves actual framing denial.
- **R2-M2 resolved at plan level:** spec `85,146-150` chooses explicit upstream/queue/requester/byte/deadline/media limits and actual-settlement cancellation semantics; workflow `54-56` assigns transport/provider/renderer seams. G6 measures those already-decided bounds.
Inherited F01-F20 remain assigned application corrections, not unimplemented plan decisions. Added coverage beyond earlier rounds: valid maximum-count multibyte/serialized data crossing the new HTTP admission cap. **R03-M1 is new; 0 Blocker / 1 Major means this is not a clean pass.**

## Remaining external proof gates

| Gate | Owner / experiment / pass / failure |
| --- | --- |
| G1 | UX + App Owner; isolated real Studio across widths/languages/themes/zoom/motion and modal/route journeys; all required states operable and appearance accepted; otherwise W5 stays local (spec `195`). |
| G2 | Runtime + lifecycle; sandboxed Windows aliases/two processes/key helper/crash/ACL/startup; one pre-load storage owner and preserved bytes/opt-out with no double launcher; otherwise W2/W6 block release (`196`). |
| G3 | Runtime + App Owner; approved isolated Discord session with separate viewer; correct Scene/source/time/art/buttons through switching/pause/pin/clear/reconnect; otherwise no Rich Presence/exposure acceptance (`197`). |
| G4 | Lifecycle; packaged Windows candidate, controlled feed and previous installed version; preload/tray/quit/ASAR/update/hidden start/backout pass; otherwise no installer/update release (`198`). |
| G5 | Security; isolated request/provider harness, then authorized browser/Electron framing/navigation; denied input has zero effects, direct navigation/art work and real resource caps hold; otherwise W1 blocks exposure (`199`). |
| G6 | Runtime + UX; named Windows fixture/machine, idle/helper/RSS/scan/input/switch and long-GIF browsing measurements; chosen bounds and numerical baseline regressions meet thresholds; otherwise reduce work before release (`200-202`). |

Migration/backout receipt additionally preserves verified backups, current secrets, slots/compatible fields and startup opt-out, and proves no rejected pending update or second launcher (`204`; workflow `98`). These are legitimate external experiments, not substitutes for fixing R03-M1.
No full tests, live server/Discord/Electron, browser control, user-data reads, installation or build were run in this round. One pure validator/byte-count probe was sufficient; coordinator retains canonical edits and final convergence authority.
