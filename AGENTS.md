# AGENTS.md — Vibe Studio (spotify-vibe)

Shared rules for every agent working in this repository (Claude Opus/Sonnet,
Codex, Grok).
Coordinator-specific rules live in `CLAUDE.md`. The execution plan lives in
`docs/improvement-review/WORKFLOW.md`.

## 1. What this product is

A single-owner, local Windows companion that sets the owner's **Discord Rich
Presence** based on which desktop app is running. It is **set-and-forget**:
the owner opens Studio only to edit a Scene's text/art or change which apps
are paired with which Scene, then leaves the companion running in the
background for days.

Design consequences every change must respect:

1. **Background footprint is a feature.** Idle CPU, RAM, wakeups and helper
   processes must stay minimal while Studio is closed or hidden. No new
   polling loop, timer or child process without a measured reason.
2. **Studio is a short visit.** Opening it must immediately answer
   "what is Discord showing now, and why?", then get the owner to the edit
   they came for in as few steps as possible, then get out of the way.
3. **Truthful state.** Never label something saved, live or applied before the
   backend/RPC actually confirmed it. Never lose a draft on failure.
4. **Owner data is sacred.** Never discard, reset or silently migrate config
   fields the UI does not show.

### Owner decisions (2026-10-01)

- App-first only. **Daily Time Slots / schedule mode are removed from scope.**
  Do not rebuild Dayline, slot UI or DST logic. Keep reading old configs
  without crashing; do not delete `slots` data from disk.
- Keep the running-app selection policy (most recently foregrounded mapped app
  among running processes). No foreground-only switch.
- Keep: Scenes, approved artwork, Discord-style preview, Thai/English,
  light/dark themes, vanilla HTML/CSS/JS + plain Node ESM. No React, no
  framework migration, no database, no hosted service, no accounts.
- Real Discord may be used for verification (owner approved). The owner's
  real config/secrets must still never be touched — see §4.

## 2. Sources of truth (highest first)

1. Owner instructions in the current task / chat.
2. `docs/improvement-review/WORKFLOW.md` (phases, lanes, gates) and the
   Task spec you were dispatched with.
3. `docs/improvement-review/IMPROVEMENT-SPEC.md` — findings F01–F20 and
   behavioral contracts. Sections marked **Parked** or about legacy schedule
   are not in scope.
4. Current source code (observable behavior).
5. `CONTEXT.md` vocabulary (Scene, Editing Preview, Live Scene, Manual
   Override). Its schedule/Daily Time Slot terms are obsolete.
6. Everything else under `docs/` (PRODUCT_*, presence-studio/*, ADRs,
   commercial docs, screenshots) is **historical** — do not implement from it.

## 3. Repository map

| Area | Files | Lane owner |
| --- | --- | --- |
| Renderer (Studio UI) | `scripts/discord-presence-studio.html` (inline JS), `scripts/studio-ci.css`, `public/` art | **Renderer lane** (Sonnet) — single writer at a time |
| Companion server / runtime | `scripts/studio-server.mjs`, `presence-config.mjs`, `presence-scheduler.mjs`, `app-presence.mjs`, `windows-apps.*`, `installed-apps.*`, `local-config-store.mjs`, `app-secrets.mjs`, `giphy-search.mjs`, `codex-session.mjs`, `application-badges.mjs`, `character-art.mjs`, `discord-application.mjs`, `discord-presence-studio.mjs`, `setup-giphy-key.mjs` | **Server lane** (Codex) |
| Desktop shell | `electron/main.js`, `electron/preload.cjs`, `scripts/windows-autostart.mjs`, `build` section of `package.json` | **Desktop lane** (Codex) |
| Tests | `scripts/tests/*.test.mjs` | Lane that owns the module under test |
| Shared contracts | `package.json` deps, `package-lock.json`, config schema, HTTP API shape | **Coordinator only** decides; assigns one writer |
| Plans / docs | `docs/improvement-review/**`, `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` | Coordinator (workers write only their own report file) |

Edit only the files your Task's **Ownership** line grants. If you need a change
in another lane's file, stop and `ask` the coordinator — do not edit it.

## 4. Commands and safe local runs

```powershell
npm test                       # node --test, whole suite (~56+ tests)
node --test scripts/tests/<name>.test.mjs   # focused
npm start                      # CLI companion + Studio in browser
npm run dev                    # Electron shell
```

**Always isolate local runs** so the owner's real profile is never read or
written:

```powershell
$env:PRESENCE_CONFIG_PATH  = "$env:TEMP\vibe-dev\presence-config.json"
$env:PRESENCE_SECRETS_PATH = "$env:TEMP\vibe-dev\secrets.json"
$env:PRESENCE_STUDIO_PORT  = "47391"        # not the default port
$env:PRESENCE_AUTOSTART_DISABLE = "1"       # never touch Windows startup
# optional: $env:PRESENCE_APP_DETECTION_DISABLE = "1" for pure UI work
```

- Never read, print, copy or commit real secrets (`%APPDATA%` profile, GIPHY
  key, `.env`). Never paste a key into a report or screenshot.
- Never enable autostart, install, publish, push, merge, tag or release.
- Real Discord presence on the owner's account is allowed **only** in tasks
  that say so; always clear the activity (Hide/Clear) when the task ends.
- Stop every companion/Electron process you started before `worker_done`.

## 5. Engineering rules

- Match surrounding style: vanilla JS, no new dependencies without a
  coordinator decision. Small, reviewable diffs scoped to the Task.
- Fix the mechanism, not the symptom. One finding → one coherent change.
- Tests must exercise the real failure boundary (HTTP handler, file I/O with
  temp files, fake clock/RPC/host adapters). **No source-string assertions**
  and no padding tests. Tests must not spawn real Start Menu scans, real
  Discord RPC or real autostart — inject adapters.
- Run the focused tests for what you changed, then `npm test` once before
  reporting. Report the exact pass/fail counts; never claim a pass you did
  not observe.
- UI work: every user-visible state needs Thai and English copy, works in
  both themes, keyboard-operable, visible focus, respects reduced motion.
- Performance: no work while Studio is hidden that the owner cannot see;
  prefer event-driven over polling; one in-flight request per kind.

## 6. Reporting (all workers)

- Write your report to the path given in the Task (normally
  `docs/improvement-review/execution/<phase>/<task-id>.md`).
- Report: what changed (files), why, evidence (commands + real output
  counts), what you could **not** verify, open risks. Mark each claim as
  *verified* (you observed it) or *inferred*.
- Orca workers: follow the live preamble — `ask` for blocking questions,
  `check` mail before starting new files and before `worker_done`, send
  `worker_done` exactly once with explicit `--outcome` and
  `--files-modified` / `--report-path`.

## 7. Role-specific rules

Model routing is decided by the coordinator (`CLAUDE.md` §1):
frontend/design → Claude Sonnet 5.5; backend/logic/heavy review → Codex
gpt-6.1-sol; fast exploration/walkthroughs/measurement → Grok 4.7.

**Implementer (any model)** — writes source + tests inside its Ownership;
does not review its own work as final; does not commit.

**Frontend implementer (Sonnet)** — owns the renderer files only. Keep the
existing visual identity/tokens unless the Task says otherwise. Every state
change ships with TH/EN copy, both themes, keyboard + focus, reduced motion.
Capture before/after screenshots for UI-visible changes (isolated profile).

**Reviewer (Codex by default; Grok for fast passes)** — read-only on source.
May run the app/tests in an isolated profile and write only its report (and
screenshots under the report folder). Findings must cite `file:line`, give a
concrete failure scenario, severity (Blocker / Major / Minor / Nit) and the
smallest fix. Say explicitly when something is a hypothesis vs reproduced. Do
not rewrite the plan or expand scope; flag scope questions instead.

**Explorer (Grok)** — fast, compact answers: journey walkthroughs, search,
measurement. Record the method so the result can be repeated.
