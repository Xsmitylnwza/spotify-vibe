# Resume handoff — 2026-10-02 (overnight coordinator session)

Branch `improve/flow-ux` (local only, nothing pushed). Orca run `run_2fe4a6848594`,
coordinator terminal `term_4339a3b4-3759-41a6-9897-9b4edbca79bd` (bound via `run-use`).
Claude/Sonnet frontend/design workers are **still paused** (owner instruction). No push,
merge, release, install or autostart was done. Chrome was not controlled.

## Completed and accepted (commits)

| Commit | Task | Evidence (coordinator-verified unless marked) |
| --- | --- | --- |
| `745dceb` | **P1-S2** server persistence + body limits + host hooks (F02, F08, F14, F15, R-S2-01) | Review R-P1-S2 Rework (1 Major: unknown owner fields lost) → P1-S2b fix → R-P1-S2b **Accept** (0 Blocker/Major, 25 adversarial probes). Coordinator: focused 52/52, `npm test` 115/115 |
| `bcda96b` | **P0-C2** footprint baseline S1–S6 (`execution/p0/footprint-baseline.md`, raw CSV + source snapshots) | Coordinator recomputed avg/p95/max CPU and WS for all 6 scenarios from raw CSV with an independent script: exact match; CPU formula matches per row. No listeners left on 4739x, no Electron Run entry |
| `3e477d0` | **P1-D1** desktop lifecycle (F06, F07, F16-lite, NEW-D1, review R1–R3b) | R-P1-D1 Rework (1 Blocker, 2 Major) → P1-D1b → R-P1-D1b Rework (1 Major R3b) → P1-D1c → R-P1-D1c **Accept**. Coordinator: electron tests 24/24, `npm test` 115/115, HKCU Run clean |

Footprint headline (for P4): PowerShell app-detection helper ≈ 98 % of idle tree CPU
(~1.9 % of 12 logical CPUs, ~122 MB WS); Electron hidden to tray keeps ≈ 590 MB tree WS
(electron.exe ≈ 321 MB). Ranked P4 candidates are in footprint-baseline.md.

## Unverified / notes

- Native packaged behaviour (installer success/failure, OS shutdown, real tray failure,
  occupied-port dialog), real Discord RPC: not verified by anyone.
- Original P0 S5 run's graceful Electron exit ~150 s after close-to-tray: **not reproduced**
  (frozen re-run stayed alive 10 min; reviewer found no mechanism). Keep as a watch item.
- Product note for owner (not a defect): `window.open` now opens any credential-free
  https URL in the system browser instead of an Electron child window. An allowlist is a
  product choice.
- Grok reliability again poor: G-P1-S2 summary contradicted by tests and never sent
  worker_done; G-P1-D1b stuck 26 min with no output (both stopped). Keep Grok to narrow,
  quote-backed questions and never as acceptance evidence.
- Codex shows **weekly limit ~11 % left** (seen in worker terminals ~03:30). The same
  account runs the owner's scheduled PortfolioX automations, so no new large Codex work
  was started after P1 acceptance.

## Remaining tasks (in order) and next steps

1. **Owner gate D1 (blocking P2):** live UX journey discussion. Needs P0-A2/P0-B2
   journey audits (Sonnet — paused; tasks `task_747b584a5a80`, `task_86582e4eee2d` exist
   but their earlier attempts failed). Do not write `ia-decision.md` without the owner.
2. **Logo:** owner picks from `execution/p3/logo/concept-sheet.html` (do not choose).
3. **P1-S1 contracts C1/C2 (server, Codex)** — ready once quota allows. C1 changes
   `PUT /api/app-mappings` semantics that the current renderer relies on, so sequence it
   with the renderer lane (P1-R2) or keep backward compatibility in the same task.
   Spec per WORKFLOW.md §3 P1 table + §6 template; reviewer = fresh Codex.
4. **P1-S3 delete Scene backend (server, Codex)** — independent of renderer, additive
   endpoint; can run after/with P1-S1 (same lane → sequential).
5. **P1-R1..R3 renderer (Sonnet)** — paused.
6. **P4 background footprint (Codex)** — unblocked by P0-C2; start with the detector
   (candidate 1) and measure with `footprint-measure.ps1` (repeat method in baseline).
7. **P5 security basics (Codex)** — after P1.

Commands to resume: `orca orchestration run-use --id run_2fe4a6848594 --json`, then
`orca orchestration check --types "worker_done,escalation,question" --json` (inbox was
empty and all dispatches settled at handoff). Codex prompts often stay pasted but
unsubmitted (`turn_start_unobserved`): send one bare Enter via
`orca terminal send --terminal <handle> --enter`.

## Orca state at handoff

- No active dispatches; `worker-list --terminal-state reclaimable` = 0.
- Retained idle terminals (safe to close manually): `term_7930fd0f…` (P1-S2 author,
  explicit retain), `term_059a90b3…` (old P0-C2, abandoned; owner later used it for an
  unrelated chat — leave to the owner).
- Stopped: Grok `ctx_89f9fdf5020d`, `ctx_eecf229ae97d`. Abandoned: `ctx_72991f9b77fb`.
- Temp evidence logs from workers remain under `%TEMP%\vibe-d1*`, `vibe-s2b-*`,
  `vibe-r-*` (synthetic test data only; cited by reports).
