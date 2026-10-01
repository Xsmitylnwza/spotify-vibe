# Round 01 — independent full-plan review

**Verdict: Rework. New findings: 0 Blocker / 2 Major / 1 Nit.**
The intent and scope are coherent and necessary; the implementation graph is mostly executable, but two ownership contracts need decisions before implementation. Neither is a runtime-only gate.

## Version and independence

- Reviewed 2026-10-01; tracing started at approximately 10:50 UTC, within the requested seven-minute timebox.
- Checkout: `C:/letmecook-lab/spotify-vibe`; HEAD `b241ccd5542b1f3e5ee348bd507cac051cafabda`; package version `1.0.7` (`package.json:82`). Tracked application files matched that baseline by `git diff --exit-code`; review documents were untracked.
- Canonical `IMPROVEMENT-SPEC.md`: 188 lines, SHA256 `7D668F425411629C9ADAE48935D59B58499DB4D0406F94EE0870027D5535087A`.
- Canonical `WORKFLOW.md`: 100 lines, SHA256 `75227E1D27429A27029FC802E97E12110C03D5B81E88A81FFFFCC88D260B2507`.
- Read both canonical artifacts cold, then raw source/tests/historical scope documents. No supporting review, convergence log or earlier round was opened; findings below are independent.
- Source inspection only: no suite rerun, installation/build, network/provider interaction, browser, Electron, startup or real user-data action. The recorded 56-test result remains coordinator evidence, not a fresh result from this pass.

## Intent, necessity and smaller alternative

Make the local companion reliably select the owner's saved Discord Scene, preserve edits/data, and distinguish a saved draft from an acknowledged Discord application.
Doing nothing fails that intent: initialization writes mappings/mode, form capture replaces timers, and request handlers publish candidates before persistence (`scripts/discord-presence-studio.html:3629`, `:1829`; `scripts/studio-server.mjs:530`, `:536`). These are already covered findings, not new blockers.
The smaller 90/10 delivery is W0–W4 plus the desktop correctness/security portion of W6: reuse Node, validators, RPC queue and vanilla renderer; repair trust, storage, selection and truthful feedback while retaining layout/tokens. Defer W5 composition changes until that slice passes focused checks and owner review. The current plan permits this through correctness-first sequencing and isolated hotfixes (`WORKFLOW.md:68`); no rewrite or database is necessary.

## Independent findings

### R1-M1 — Major: the single writer is defined per application instance, not per durable storage identity

- **Consequence:** two companions can each accept the same expected revision and publish different committed state; concurrent secret updates can lose an unrelated key. An in-process queue and safe rename cannot establish one transaction owner across those processes.
- **Artifact evidence:** spec `:110–114`, `:136`, `:142` assign command/secrets serialization and host startup adapters but no cross-process storage ownership; workflow `:54–59` does not assign the standalone secret writer.
- **Source trace:** CLI entry calls the same server (`scripts/discord-presence-studio.mjs:5–9`); configurable port and shared default config/secrets paths are independent (`scripts/studio-server.mjs:39–62`). Config loads before port ownership is established (`:73`, `:906`), so even rejecting an occupied port happens after possible recovery/default writes. Electron's lock covers Electron launch, then uses that server (`electron/main.js:30`, `:300–304`); it does not cover a separate Node CLI. Storage's queue is instance-local (`scripts/local-config-store.mjs:8–9`, `:25–29`). `scripts/setup-giphy-key.mjs:8–11`, `:44` independently writes the same secrets through `scripts/app-secrets.mjs:148–167`, `:180–192`.
- **Minimal correction:** explicitly require one owner for the canonical config/secrets storage identity, acquired before load/migration/recovery and retained through shutdown; reject a second writer even on another port. Make the key helper acquire the same ownership and refuse while the companion owns it, or explicitly route it through the live owner. Assign the shared primitive to runtime and the helper/secrets integration to security in the workflow.
- **Acceptance:** isolated two-process/same-storage/different-port and helper-versus-settings fixtures must produce one writer, no stale-revision double success and no lost secret; crash/lock recovery must preserve bytes. G2 proves the chosen Windows mechanism; it cannot choose the ownership rule.

### R1-M2 — Major: Pause lacks a defined handoff for an already-submitted RPC and its held activity

- **Consequence:** ignoring a stale RPC completion can make the snapshot look paused while Discord actually changes to the in-flight Scene. After connection loss, recomputing selection from paused config yields no Scene, so the implementation must guess whether/how to restore the held activity.
- **Artifact evidence:** spec `:96` promises the last successfully applied activity remains; `:118–120` require generation checks and invalidate pending applies, but specify only stale completion bookkeeping, not a side-effect barrier or restoration. `:120` also says reconnect recomputes selection. Pause and Hide persist pause/no-override without a stated durable held/hidden distinction (`:96–97`).
- **Source trace:** a queued apply submits `SET_ACTIVITY` and only afterward records success (`scripts/studio-server.mjs:304–330`); the generation changing while `:323` is awaiting does not retract the submitted request. Pause persists disabled selection and removes the override without draining RPC (`:541–552`); paused selection returns no Scene (`:194`). Reconnect forces reconciliation (`:401–405`), while applied identity is volatile (`:114–124`, `:169` in `scripts/presence-config.mjs`).
- **Minimal correction:** choose an explicit Pause linearization point. For example, drain the submitted RPC with a bounded deadline before acknowledging Pause, capture the resulting immutable acknowledged payload/source/timestamp, then prevent automatic applies and restore that payload on reconnect; report uncertain/disconnected if the drain fails. Define cold restart as paused with no owned activity unless a separate persisted hold is deliberately specified. Hide must invalidate the held payload. Assign this to W3 and make W4 copy follow the chosen receipt.
- **Acceptance:** fake RPC must record actual submissions/effects as well as snapshots: Pause during submitted apply, failure/timeout, reconnect, held Scene edited/deleted, Hide after Pause and cold restart. Checking that stale metadata was ignored is insufficient. This is a controller design decision, not something G3 can decide empirically.

### R1-N1 — Nit: define which watcher observation bounds switching

- **Consequence/evidence:** G6's proposed two-observation budget (`spec:178`) is ambiguous: focus/snapshot emission runs every 200 ms, but running-process enumeration is once per second (`scripts/windows-apps.ps1:21–24`, `:60`, `:68`). New process discovery and focus changes therefore have different measurement boundaries.
- **Minimal correction:** define separate start points for newly discovered processes and focus changes, then measure against healthy full observations. This does not require speculative optimization.

## Complete coverage and traced contracts

Every row follows entry → owner/branch → mutation/side effect → recovery → observable outcome; future behavior is assessed as a contract, not claimed implemented.

| Coverage | Source-backed trace and plan assessment |
| --- | --- |
| Initialization/legacy migration | `scripts/discord-presence-studio.html:3620–3642` → mappings API `scripts/studio-server.mjs:769–775` → config save/reconcile. W0/W4 replace implicit writes with read-only Retry and explicit migration; old schedule docs are historical, not permission to rebuild Dayline (`docs/presence-studio/APP-SETUP-JOURNEY.md:12–13`; `docs/adr/0004-reduce-to-personal-scheduled-presence.md:7`). |
| Scene editing/save/apply | Renderer `:1811–1841`, `:2789–2822`, `:2870–2893` → config handler/server `:525–538`, override `:555–570` → disk then RPC. Hidden metadata retention, generation-aware saves, conflict recovery and saved-versus-applied receipts are explicit; failed save must block apply. |
| Pairing/create/delete | Renderer `:3188–3218`, `:3529–3556`, `:3610–3614` → mapping/config owners → validation `scripts/app-presence.mjs:7–18`, `scripts/presence-config.mjs:118–128`. Atomic confirmed dependency removal and commit-before-pairing are executable; Retry must retain candidate intent and preserve mode/pin/pause. |
| Commands/revisions/storage | Server config/mode/pin/clear/session paths `:525–600`, `:750–755`, `:783–785` → store `scripts/local-config-store.mjs:11–29`, `:32–67`. W2 addresses failed persistence, future schema, backup verification and concurrent tabs; R1-M1 adds the missing process boundary. |
| Selection/derived payload | Server `:174–208`, `:434–459`, watcher `:907–912` → `scripts/app-presence.mjs:27–44` → badges/session → `scripts/presence-config.mjs:280–286`. Existing running fallback is source/test backed (`scripts/tests/running-presence.test.mjs:7–14`); one-hour pin, expiry and outgoing validation are retained. |
| Pause/Hide/reconnect/quit | Server `:252–410`, `:541–601`, `:671–687` → RPC queue / host shutdown. Explicit apply/hold/clear, late-generation protection and bounded stop are necessary; R1-M2 resolves external-effect ownership rather than repeating F13. |
| Schedule/clock/recovery | `scripts/presence-scheduler.mjs:19–65` combines wall-minute active selection with Date boundaries; heartbeat/expiry are server `:419–457`. Dated DST instances, no missed-event replay, unknown detection hold/backoff and supervised pumps are specified; DST/sleep/failure fixtures still need implementation. |
| Discovery/resource bounds | `scripts/windows-apps.mjs:10–18` owns one helper; `scripts/installed-apps.mjs:28–65` caches/single-flights but conflates failure/empty; singleton/launcher contract is `scripts/installed-apps.ps1:49–68`. Plan distinguishes stale/error/empty and returns pending refresh. GIPHY has 10-second fetch and 100-entry cache (`scripts/giphy-search.mjs:141–143`, `:213–244`); measured CPU/RSS/helper-output and cache growth remain G6 concerns, not observed regressions. |
| HTTP/security/privacy | Server `:498–507`, `:693–696`, `:750–869` → mutating owners → error boundary `:874–883`. W1 specifies Host/Origin/token/object/UTF-8/size/time boundaries and protected refresh. Keys stay separate; public status uses `scripts/app-secrets.mjs:208–220`; full paths currently enter snapshots (`scripts/studio-server.mjs:227–228`) and need ordinary-message redaction. No Internet exploit is asserted. |
| Electron/startup/update | `electron/preload.cjs:5–28` → unguarded IPC `electron/main.js:231–274`; startup `:38–46`, boot `:297–321`, occupied-port server `:887–898`, updater `:162–225`, shutdown `:276–291`. W1/W6 define owned document/frame, fail-closed server, one startup adapter, tray recovery and unified install/quit. Real sandbox/preload and signer/feed behavior remain gates. |
| All UX surfaces/accessibility | Status/Scenes/Settings routing `scripts/discord-presence-studio.html:3346–3394`; skip `:35`; confirmation `:1385–1426`; GIF inert/keyboard `:2456–2486`; onboarding `:3849–3865`; polling `:2934–2950`, `:3665–3667`. Section 4 covers onboarding, library/detail/preview, pairing, legacy notice, GIF, secrets, companion and desktop states, bilingual themes/zoom. Source selectors disagree (`:279`, `:1883`; `scripts/studio-ci.css:911`); G1 must prove colors, focus, layout and motion. No current render failure is claimed. |
| Packaging/migration/backout | `package.json:14–18`, `:54–62`, `:82` versus `package-lock.json:3`, `:8–17`; release `.github/workflows/release.yml:21–33`. W6/W7 require production imports/version/artifact proof and isolated previous-version update/backout. Spec `:180` preserves slots, compatible config, separate secrets and opt-out; pending updater removal is part of backout. |
| Tests/workflow/ownership | Server fixtures disable host/detection but do not inject RPC (`scripts/tests/studio-server.test.mjs:38–49`; server `:391–396`); storage recovery test omits backup readback (`scripts/tests/local-config-store.test.mjs:32–42`); desktop tests largely assert strings (`scripts/tests/electron-packaging.test.mjs:55–106`). Spec `:165–167` requires real boundary failures and fake RPC; workflow `:33–66` sequences contracts and assigns single server/renderer writers. R1-M1 requires the additional helper owner; integration remains separately assigned. |

## Carried gates and inherited blockers

| Gate | Owner / experiment | Pass condition | Failure consequence |
| --- | --- | --- | --- |
| G1 | UX + App Owner; isolated desktop/narrow, both languages/themes, zoom/motion/keyboard | Required states and focus/overflow/contrast pass; owner accepts appearance | W5 stays local/unaccepted |
| G2 | Runtime/lifecycle; isolated Windows profile with crash/restart/sharing/ACL/startup fixtures | Data/preferences survive and one companion starts; add chosen storage-lock proof | W2/W6 cannot release |
| G3 | Runtime + App Owner; approved isolated Discord session and separate viewer | Scene/source/art/buttons/timestamp and chosen Pause/pin/Hide/reconnect contract hold | No Presence acceptance or exposure |
| G4 | Lifecycle; packaged Windows candidate, previous install and controlled feed | Preload/IPC/ASAR/tray/quit/startup/update/backout pass | No installer/update release |
| G5 | Security; isolated request/navigation harness, later authorized Electron/browser | Rejections have zero side effects; supported links/artwork work | W1 blocks exposure |
| G6 | Runtime + UX; reference Windows machine and fixed workload | Measured helper/CPU/RSS/scan/input/switch budgets pass; observation definition fixed | Reduce bounded work before release |

These gates have owners, experiments, pass conditions and consequences; they legitimately carry unavailable platform/visual proof. They must follow the chosen ownership/Pause design, not substitute for it.
Inherited canonical exposure blockers F01/F06/F07/F09 are addressed at plan level by explicit W0/W1/W4/W6 corrections and applicable G1/G4/G5 proofs; none is asserted fixed in unchanged source. There are no earlier round findings to mark resolved in this independent pass. **The plan cannot count this round as clean because R1-M1 and R1-M2 remain unresolved design obligations.**

Coverage added: cross-process CLI/Electron/key-helper storage ownership; already-submitted RPC effects versus stale bookkeeping; Pause reconnect/cold-start identity; helper observation clocks; test boundaries and shared-file assignment. No additional product expansion is required. The coordinator owns canonical corrections and the choice of Pause linearization/restoration semantics.
