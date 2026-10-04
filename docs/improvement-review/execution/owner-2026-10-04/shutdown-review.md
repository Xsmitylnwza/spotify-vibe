# Shutdown delta review — 2026-10-04

Verdict: **No blocker for this bounded lifecycle delta; ship.** Review baseline `421cbb7`, dirty changes only in `scripts/studio-server.mjs` and `scripts/tests/studio-p3-endpoints.test.mjs`. Unrelated dirty `CHANGELOG.MD` was not reviewed or changed.

## Intent and smallest approach

Prevent temporary profile cleanup racing outstanding icon-cache writes while retaining the existing three-second stop deadline. Reusing the existing `iconHosting.drain()` after HTTP close is the smallest appropriate change; sleeping or retrying directory deletion would not establish write completion.

## Traced paths

- Verified by source: `scripts/studio-server.mjs:774` makes repeated stop calls share one promise; `:775` marks stopping, `:779` closes icon hosting before any await, `:789` closes HTTP connections, and `:794` awaits drain inside the existing bounded shutdown.
- Verified by source: `scripts/app-icon-hosting.mjs:92` prevents new pairing after close; `:105` blocks a late aborted uploader result; `:106` rechecks close/consent/abort inside the serialized commit. Already-started writes remain owned by the upload operation until `:114` removes it from pending. `:132` waits pending operations and the saving chain, including consent writes queued before drain.
- Verified by source: commit awaits `writeJson` before updating memory (`scripts/app-icon-hosting.mjs:67-74`). The real atomic writer awaits mkdir, temporary file write, sync/handle close, rename, and final temporary file removal (`scripts/local-config-store.mjs:19-29`). Thus a successfully completed drain cannot leave those already-tracked writes running.
- Verified by source: closing suppresses the upload finally callback (`scripts/app-icon-hosting.mjs:115`); an already-queued callback checks `isStopping` (`scripts/studio-server.mjs:136`), and pairing checks it again (`:158`). No new callback-driven upload or presence update is introduced by this delta.

## Observed verification

Command: `node --test scripts/tests/studio-p3-endpoints.test.mjs scripts/tests/app-icon-hosting.test.mjs`.

- **13 tests passed, 0 failed, 0 cancelled, 0 skipped**; studio-p3 endpoints **7/7**, app-icon-hosting **6/6**; exit 0, reported duration 778.0546 ms.
- New regression (`scripts/tests/studio-p3-endpoints.test.mjs:169-179`) exercised actual server stop: it remained pending until the fake uploader was released, then completed with no published icon in the cache.
- Additional read-only inline Node probe reused the existing isolated server fixture through an in-memory data URL, with an uploader that ignored abort and remained unresolved. Actual `stop()` returned after **3,016 ms**; resolving the uploader afterwards left cache icons empty. Fixture cleanup completed; exit 0.
- Additional inline module probe used `createIconHosting` with a gated writer delegating to real `atomicWriteJson`. Closing during an already-started cache commit left drain pending until writer release; the real write and temporary file cleanup completed before drain resolved. Temporary directory removed; exit 0. This reproduces the commit/drain boundary at module level, not an artificially stalled server filesystem.

## Limitations and nonblocking follow-up

**Inferred, existing deadline exception:** `scripts/studio-server.mjs:800-805` resolves stop after three seconds without cancelling the shutdown continuation. An atomic filesystem operation stalled beyond that deadline can therefore outlive `stop({exit:false})`; the verified guarantee is completion of tracked cache writes on the drain-completed graceful branch, not unconditional completion on forced timeout. A hanging uploader also delays normal Discord clear/destroy behind drain; the deadline retains transport best-effort cleanup. These are bounded-shutdown tradeoffs, not a demonstrated blocker for this small fix. Do not describe timeout resolution as proof of filesystem quiescence.

**Minor coverage gap:** the new committed regression gates the uploader before commit, so it does not itself reproduce an atomic write already holding a temporary file. Smallest follow-up if stronger persistent coverage is needed: a module-level gated `writeJson` regression that calls close/drain and releases a real atomic writer, as in the successful inline probe. No source/test edits made by reviewer.

The original CI run `37189225499` and its ENOTEMPTY failure were task-provided context, not fetched or reproduced here. Only the two requested focused suites and the two boundary probes were run; no full suite, live owner profile, real Discord, autostart, GUI, commit, push, or release verification. The report is the only reviewer-created repository file.
