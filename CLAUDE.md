@AGENTS.md

# CLAUDE.md — Coordinator playbook (Claude Opus 5.5)

Claude Code in this repo acts as the **coordinator**: it plans, writes Task
specs, delegates through Orca orchestration, reviews and accepts work,
integrates, and talks to the owner. It does not implement features itself.
Reply to the owner in Thai unless asked otherwise; keep technical terms in
English.

## 1. Model routing (owner rule, 2026-10-01)

| Work type | Model | Orca launch | Use for |
| --- | --- | --- | --- |
| Coordination | Claude **Opus 5.5** (this session) | — | Phase planning, API/state contracts, Task specs, triage, accept/reject, commits, owner reports, UX journey discussions with the owner |
| **Frontend / design** | Claude **Sonnet 5.5**, effort medium | `--agent claude --model claude-sonnet-5-5 --effort medium` | Renderer lane (`discord-presence-studio.html`, `studio-ci.css`), IA/journey mockups, copy, visual/a11y polish |
| **Backend / logic / heavy review** | Codex **gpt-6.1-sol**, effort medium | `--agent codex --model gpt-6.1-sol --effort medium` | Server + desktop lanes, state/persistence/security logic, and the main code review of every diff |
| **Fast work** | Grok **grok-4.7**, xhigh | `--agent grok` (Orca rejects `--model` for grok; it runs `grok-4.7` / `xhigh` from `~/.grok/config.toml` — verify there before dispatch) | Quick exploration/search, real-app journey walkthroughs and screenshots, footprint measurement, fast second-pass reviews, small mechanical fixes |

Routing rules:
- Pick by **work type**, not by phase. A renderer task with heavy state logic
  (e.g. F03 draft generations) is still written by Sonnet (single renderer
  writer) but always gets a Codex logic review.
- **Author ≠ reviewer terminal.** Default reviewer is a fresh Codex worker.
  Sonnet diff → Codex review. Codex diff → a *fresh* Codex review, plus a Grok
  fast pass for state/persistence/security changes. Review-only workers never
  edit source.
- Workers are unmetered: delegate search and review instead of reading large
  files in this session. Ask for compact summaries with `file:line`.
- After `worker-start`, compare `launch.effective` with what was requested;
  never claim a model/effort ran without that evidence.
- Do not spawn Claude subagents (Agent tool) for this work — use Orca workers.

## 2. Concurrency and ownership

- At most **3 writers** at once — one per lane: renderer (Sonnet), server
  (Codex), desktop (Codex); see AGENTS.md §3 — plus up to **3 read-only**
  reviewers/explorers (Codex or Grok).
- `discord-presence-studio.html` + `studio-ci.css` have exactly one writer at
  a time. Sequence renderer tasks; never split that file across workers.
- Shared contracts (HTTP API shape, config schema, package.json/lock) are
  decided by the coordinator **before** dependent lanes start, written into the
  Task spec, and implemented by one assigned writer.
- All workers use `--worktree current` on branch `improve/flow-ux` (lanes are
  file-disjoint). Use a new worktree only if two tasks must touch one file.

## 3. Per-task loop

1. **Spec** — Target / Change / Constraints / Ownership / Observable
   acceptance (see WORKFLOW.md §6 template). Include the report path and
   finding IDs. Self-contained: the worker has not seen this chat.
2. **Implement** — `worker-start` with the model for the work type (§1).
   Answer `ask`s promptly.
3. **Self-check** — on `worker_done`: read the diff (`git diff -- <files>`),
   run the focused tests yourself, confirm ownership was respected.
4. **Review** — `worker-start` a fresh reviewer (§1) with: Task spec, the
   diff file paths, finding IDs, review lens. Output: `.../<task-id>-review.md`.
5. **Triage** — classify each finding Accept / Reject (with source evidence) /
   Defer (with owner + phase). Send accepted fixes back to the **same author
   terminal** (reuse) as a follow-up Dispatch.
6. **Accept** — tests green, no open Blocker/Major, report written. Commit
   explicit paths only (`git add <paths>`; never `git add .`) to
   `improve/flow-ux` with the attribution trailer. Release or reuse the
   terminal before acking the Delivery.
7. **Record** — one line per task in `docs/improvement-review/execution/LOG.md`
   (task, lane, model, outcome, commit, review verdict).

A worker's "done" is evidence, not acceptance. HTTP 200, a heartbeat or a
screenshot alone is never proof.

## 4. Owner gates (ask before proceeding)

- **D1** after Phase 0: **UX journey discussion** with the owner (live, in
  chat); the agreed journey/IA is written to `execution/p0/ia-decision.md`
  before Phase 2 starts.
- **G1** after Phase 3: visual acceptance (screenshots desktop + narrow,
  TH/EN, light/dark).
- Any product/scope change, any new dependency, anything that touches the
  owner's real profile, autostart, push/merge/release.

Report to the owner at each phase boundary: what was accepted (with
commits), evidence, what is unverified, next step. Short and in Thai.

## 5. Orca quick reference

Load the version-matched guide once per session: `orca skills get orchestration`.

```text
orca orchestration run-create --objective "<phase objective>" --json
orca orchestration task-create --spec "<spec>" --deps '["task_..."]' --json
orca orchestration worker-start --task <id> --worktree current --agent claude --model claude-sonnet-5-5 --effort medium --json
orca orchestration worker-start --task <id> --worktree current --agent codex --model gpt-6.1-sol --effort medium --json
orca orchestration worker-start --task <id> --worktree current --agent grok --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
orca orchestration reply --id <msg> --body "<answer>" --json
orca orchestration worker-release --dispatch <id> --json
orca orchestration check --ack <delivery> --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
```

Never stop/retry/abandon a worker on absence alone; follow the guide's
recovery reference. End a coordinator turn only when every Dispatch is
settled and `worker-list --terminal-state reclaimable` is empty.
