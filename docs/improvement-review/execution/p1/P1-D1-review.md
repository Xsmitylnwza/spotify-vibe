# R-P1-D1 — Desktop lifecycle review

**Verdict: Rework.** One Blocker and two Major findings remain despite passing tests. Review completed against the uncommitted `improve/flow-ux` tree on 2026-10-01; no source edits, commits, installed-app launch, registry writes, or real Electron runs by this reviewer.

## Intent and scope

Make the desktop own its listener, preserve startup opt-out, deliver updater state safely, and finish every explicit shutdown through one lifecycle owner. A shared shutdown helper and host adapters are a reasonable smaller solution than a new framework; the defects below are in the host wiring and updater failure contract, not a reason to replace the approach. Read AGENTS.md sections 5–7, the task findings F06/F07/F16 and Desktop lifecycle contract, the full main/preload/helper/test code, and the author's P1-D1 report. Server implementation review remains with its lane; this review evaluates main's use of `onQuit`, `requireOwnership`, and bounded idempotent `stop`.

## Findings

### 1. Blocker — New Quit IPC accepts an untrusted sender/frame

**Location:** `electron/main.js:248`; bridge exposed at `electron/preload.cjs:14`; window configuration at `electron/main.js:73` and initial navigation at `electron/main.js:98`.

**Concrete failure:** The new `vibe:quit` handler ignores its event entirely. A foreign sender or a foreign document navigating in the preload-bearing window can stop the companion and quit the desktop. Owning the initial server port does not authorize every later document or frame. No `will-navigate` guard, window-open policy, or IPC sender/frame guard exists in the reviewed desktop code. This violates the explicit task constraint against a new IPC surface without sender validation and leaves the F06 navigation/IPC boundary unresolved. A foreign document gaining bridge access is a prerequisite; this review makes no Internet RCE claim.

**Evidence — reproduced at injected main-process boundary:** Executed the actual `electron/main.js` as a `vm.SourceTextModule`, linking fake Electron/host exports and the real lifecycle helpers. Invoked the registered handler with `sender.id=999` and `senderFrame.url=https://foreign.example/` plus a non-null parent. Result: `stop=1`, `quit=1`, `trayDestroyed=1`; no rejection occurred. Browser navigation/exploit delivery was not exercised.

**Smallest fix:** Validate that the IPC event comes from the live Studio window's webContents and its top-level frame, with a URL whose origin equals the owned Studio origin, before invoking Quit. Add explicit navigation/window-open restrictions so foreign content cannot retain the privileged preload. Reuse that guard for privileged existing handlers rather than inventing a separate trust rule. Add behavioral fixtures rejecting foreign senders, foreign origins and subframes while permitting the owned top-level frame.

### 2. Major — Installer failure can permanently strand a stopped desktop

**Location:** `electron/main.js:271`, `electron/main.js:205`, `electron/lifecycle.mjs:45`.

**Concrete failure:** After an update is downloaded, the owner clicks restart/install. Shutdown stops the server and destroys the tray, sets `exitReady=true`, and calls `autoUpdater.quitAndInstall`. In the installed electron-updater, an installer exception is caught internally, reported through its `error` event, and converted to `false`; `quitAndInstall` then returns `undefined` without quitting. The lifecycle helper treats that void return as success, so its exception fallback never runs. `appQuitting` stays true and the shutdown promise stays cached. Subsequent renderer/tray-style Quit requests return that settled promise and never call `app.quit`; reopening is also blocked by `showWindow`'s quitting guard. The owner is left with a stopped service and no tray.

**Evidence — reproduced:** Installed dependency `node_modules/electron-updater/out/BaseUpdater.js:13` quits only when `install()` returns true; `BaseUpdater.js:64` catches installer exceptions and dispatches an error before returning false. Called the real `BaseUpdater.prototype.quitAndInstall` through a prototype instance with fake logger/download metadata and a throwing `doInstall`; no actual installer or Electron was invoked. Using the real `createShutdown`, `await shutdown({restart:true}); await shutdown()` produced exactly `["stop","error:installer refused"]`, with no `app.quit`. The actual-main injected-host probe independently produced `stop=1`, `install=1`, `trayDestroyed=1`, `quit=0` after install error and a later Quit request.

**Smallest fix:** Treat an updater error during the install phase as a terminal failure that invokes a once-only app-quit fallback after cleanup; do not send that fallback through the already-cached shutdown request. Ensure a non-quitting installer attempt has a bounded completion/fallback policy. Retain the visible error report. Add a fixture where `quitAndInstall` emits `error` and returns void, including a later Quit request; the existing throwing-install test does not model the dependency's behavior.

### 3. Major — OS Quit waits indefinitely for startup before it can stop or exit

**Location:** `electron/main.js:266`, `electron/main.js:286`, `electron/main.js:300`.

**Concrete failure:** While `startOwnedStudio` is pending, OS/application Quit enters `before-quit`, prevents the native quit, and enters shared shutdown. Its first asynchronous wait is the unresolved `bootPromise`; it has no timeout/cancellation. Neither `studioHandle.stop()` nor final `app.quit()` can run. Repeated Quit requests share the same unresolved promise. A bounded server `stop()` cannot help because that method is not reached. This violates the bounded boot/stop/quit acceptance contract; no actual hung server startup was induced.

**Evidence — reproduced with injected pending starter:** Actual-main VM probe used a starter returning a never-settling promise, then emitted `before-quit`. After flushing twelve event-loop turns, the event had been prevented, with `stop=0` and `quit=0`. The wait itself has no deadline, so continued blocking follows directly from the code. The seven focused tests only release their synthetic stop promise; none exercises shutdown during non-settling startup.

**Smallest fix:** Give startup a bounded deadline and cancellation/cleanup contract, and bound shutdown's wait for startup. Coordinate cancellation with the server lane; if startup resolves late, clean that handle exactly once and never create a window after shutdown. Add an actual-main host fixture for Quit during pending startup and for late startup resolution. Do not merely race the wait and abandon potentially live helpers.

## What passed and what was traced

- **Verified:** `node --test scripts/tests/electron-lifecycle.test.mjs` — **7 tests, 7 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**, duration **125.1791 ms**.
- **Verified:** `npm test` — **96 tests, 96 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**, duration **10205.5657 ms**. Run once by this reviewer; count differs from the author's older 63-test run because concurrent lane tests are now present.
- **Verified:** The seven new tests exercise imported helpers with host adapters rather than source-string assertions. They cover void-safe broadcast, destroyed window/content, destruction during send, ownership rejection, shutdown idempotence/reentrancy/order, synchronous/rejected update operations and startup registration gating. They do not execute main's event/IPC wiring; the probes above show failures hidden by that separation. Some pre-existing full-suite Electron tests remain source/asset checks, so a green full suite is not desktop end-to-end proof.
- **Verified with actual-main injected hosts:** A first starter rejection with `STUDIO_PORT_IN_USE`, native dialog Retry response, and a second owned handle produced **2 starts, 1 dialog, 1 load**, exclusively `http://127.0.0.1:47395/#/status`. No load occurred before owned startup. Native Windows dialog interaction was not exercised.
- **Reasoned from code plus passing adapter tests:** `startOwnedStudio` forces `requireOwnership:true`, passes `onQuit`, and rejects every handle except `alreadyRunning:false` before window creation (`electron/lifecycle.mjs:17`, `electron/main.js:300`). Dialog Quit enters the same shutdown after a rejected boot promise, which can settle normally (`electron/main.js:317`).
- **Reasoned from code plus passing tests:** Broadcast accepts Electron's void `send`, skips destroyed windows/webContents and catches destruction races (`electron/lifecycle.mjs:2`). NEW-D1 gates both default and explicit registration on packaged mode and `PRESENCE_AUTOSTART_DISABLE`; an existing sentinel preserves owner opt-out (`electron/lifecycle.mjs:27`, `electron/main.js:229`). No real registry behavior was tested here.
- **Reasoned from code:** Normal renderer Quit, tray Quit, no-tray window close, `before-quit`, server `onQuit` and explicit updater restart converge on the same promise (`electron/main.js:83`, `125`, `246`, `248`, `289`, `305`). The exitReady guard prevents ordinary app.quit recursion. These guarantees do not resolve findings 2–3.
- **Reasoned from code:** `window-all-closed` intentionally keeps the tray companion alive (`electron/main.js:283`); ordinary no-tray close explicitly requests shutdown first. Tray construction failure destroys any partial tray and forces window visibility; closing that window requests Quit (`electron/main.js:142`, `330`, `83`). No real tray failure was injected.

## Verification limits and remaining work

The probes ran Node VM modules with fake Electron, updater, server, filesystem and timers, linking the actual main source and real helper exports; they did not launch Electron, access owner secrets, write startup settings, or create helper processes. The installed updater prototype probe executed its real failure logic with a fake installer. Full-suite HTTP tests used their isolated temporary profiles. No source files were modified; only this report was created.

Native OS shutdown, occupied-port dialog interaction, tray failure, real Discord cleanup, packaged login settings, successful update install/restart and release/signing metadata remain unverified by this reviewer. The author's earlier manual smoke is reported evidence, not independently rerun evidence. Fix the three findings, add host-wiring behavior coverage, then repeat focused/full tests and the appropriate isolated Windows acceptance checks before accepting this slice.
