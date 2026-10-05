# Per-app elapsed timer recovery and cleanup — 2026-10-05

## Result

Source/test fix verified. Existing per-executable timers survive foreground changes
and detector recovery. Closed-app metadata is evicted, shutdown releases session
state, and late detector callbacks cannot allocate new timers.

The installed app was read-only verified as version 1.0.25. This patch has not
been built, installed, published, or verified visually in real Discord.

## Reproduced mechanism

The server already retains `runningAppStartedAt` across normal focus changes and
error snapshots. The PowerShell helper nevertheless published its initial empty
`apps`/`running` arrays as a healthy catalog before its first asynchronous scan
completed. After helper recovery this looked like all apps closed: the server
deleted their timestamps and assigned new ones when the completed scan arrived.

A differential experiment replayed the production helper loop from HEAD through
the real server with fake clock/RPC and isolated profile. After ten minutes,
Orca's emitted RPC start changed from `1791158400000` to `1791159000200`:
the regression failed 0 passed / 1 failed. The current helper passes that same
recovery/focus-switch scenario and retains both Claude and Orca's original starts.
This reproduces the reset mechanism; it does not establish that the owner's
reported session actually experienced a helper restart.

## Changes

- `scripts/windows-apps.ps1`: publish healthy catalogs only after a completed
  scan. Keep heartbeats and timeout/error recovery. Completed empty scans still
  prove closure. Evict icon/name cache entries absent from the live process set.
- `scripts/studio-server.mjs`: clear app timestamps, recent history, snapshot
  and selection identity on stop. Ignore watcher/debounce callbacks after stop.
- `scripts/tests/studio-apps.test.mjs`: exercise callbacks during watcher teardown
  and after stop, requiring zero remaining timers.
- `docs/improvement-review/execution/p4/probes/scan-boundary-probe.mjs`: execute
  the production PowerShell loop with injected native host/clock, verify startup,
  completed empty scans, metadata eviction, and real-server RPC timestamps after
  a ten-minute Claude/Orca session, helper recovery and return focus.

No new dependency, polling loop, per-app timer or persistent session data.
Healthy scans prune app timestamps to running executables; errors retain only
the last known finite set. Existing recent history remains bounded to 100.

## Experiment ledger

1. Original focused focus-switch test: 1 passed / 0 failed. Ordinary focus
   changes alone do not reset timestamps in current source.
2. New pre-fix PowerShell cases: 3 passed / 3 failed. Observed healthy startup
   empty catalogs and retained closed-executable metadata.
3. New pre-fix server shutdown case: 0 passed / 1 failed. Watcher teardown
   callback allocated a timer after stop began.
4. Fixed focused suite:
   `node --test scripts/tests/studio-apps.test.mjs scripts/tests/windows-apps.test.mjs scripts/tests/studio-atomic-done.test.mjs scripts/tests/studio-boundary.test.mjs`
   — 39 passed / 0 failed / 0 skipped.
5. Fixed native probes:
   `node --test docs/improvement-review/execution/p4/probes/scan-boundary-probe.mjs`
   — 7 passed / 0 failed / 0 skipped.
6. `npm test` — 400 passed / 0 failed / 0 skipped. Captured output:
   `%TEMP%/vibe-app-timer-npm-test-20261005.log`.
7. Read-only native helper smoke: two healthy catalogs, 93 then 94 running
   executable paths, 9 visible apps, including Orca. Own helper stopped after
   six seconds; no windows controlled and no real RPC sent.
8. Independent read-only reviewer: focused server/watcher 8 passed / 0 failed;
   native probes 7 passed / 0 failed; no Blocker/Major/Minor findings.
9. Original-helper differential regression: 0 passed / 1 failed with the RPC
   timestamp reset above; temporary harness/profile removed afterward.

An initial integrated probe mistakenly used port 0, which this server treats as
the default port; it reused the existing listener and failed before emitting any
test detector event. Corrected to reserve an ephemeral port with
`requireOwnership:true`, then observed the 7/7 result. Owner config/secrets were
not read or written; all test servers and helpers were stopped.

## Verification limits

Cache eviction and shutdown behavior are verified at their actual boundaries.
This is not a multi-day heap/handle measurement or real Discord visual acceptance.
Timers represent when the companion first detected each still-running executable,
as before; they are in memory and do not survive companion shutdown/restart.
