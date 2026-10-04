# Desktop draft protection review — 2026-10-04

Scope: read-only review of dirty `electron/main.js`, `electron/preload.cjs`, and `scripts/tests/electron-host.test.mjs`; unchanged lifecycle/security/updater modules traced as dependencies. Only this report was written. Applied `C:/Users/golfp/.agents/skills/scrutinize/SKILL.md` in intent → simpler alternative → actual trace → verification order.

## Final retest: original blocker resolved

Coordinator patched the reported race during this review. Final focused command below observed **31 tests: 31 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, including **14 actual-main scenarios**. Original 29/29 result and four reproductions below describe the initial implementation, not the final verdict.

`electron/main.js:328` now awaits real renderer preparation before committing shutdown at `electron/main.js:338`. Missing hook, exception, undefined reply, `{ok:false}`, and nonboolean `ok` refuse teardown at `electron/main.js:335`. State updates after the shutdown boundary throw at `electron/main.js:262`. `scripts/tests/electron-host.test.mjs:149` covers delayed teardown and state rejection; its preparation-failure scenario covers refusal/exception cases.

Integration interface inspected only: `scripts/discord-presence-studio.html:972` synchronously refuses running/queued saves and dirty drafts unless discard was confirmed; sets `S.shuttingDown`, closes the draft, clears the save timer and makes the document inert at line 977. Hook exposed at line 1458. This is the required renderer/main linearization boundary rather than a second cached-state probe.

**Independent verified retest:** four in-memory probes combined the existing actual-main fixture with the actual renderer `notifyEditor`/`touch`/`prepareQuit` function block, evaluated in a second VM with fake DOM, fake preload calling the registered IPC, and fake Electron `executeJavaScript` executing that renderer hook. For normal quit and manual update installation, separately injected a dirty-only renderer state and a saving renderer state while main's cached state remained clean: all four refused exit, with stops **0**, quits **0**. Clearing the renderer draft then allowed preparation; all four asserted renderer shutdown flag **true**, document inert **true**, stop **1**, quit **0** during held cleanup, and late state IPC rejected. Releasing cleanup produced quit **1**, and installation **1** only for the two update cases. **4/4 integrated boundary probes passed.** Automatic install uses the same `quitApp({restart:true})` hook; existing `draft-update` test exercises its trigger.

No remaining blocker was found in the desktop scope after this retest. Native packaged behavior and the frontend worker's broader draft/save implementation remain separate verification gates.

## Intent and simpler alternative

Keep an explicit-Done Scene draft alive across tray hiding and updates, require discard confirmation on quit, and block exit during saving. The problem is real: hiding invokes auto-update at `electron/main.js:123`. Keeping the existing renderer alive and extending the existing authorized IPC wrapper is smaller than introducing draft persistence. One `{open,dirty,saving}` snapshot is sufficient only if shutdown first makes the renderer quiescent; a second state check after destructive companion teardown cannot safely replace that boundary.

## Original Blocker — shutdown accepted a new dirty/saving state and exited anyway (reproduced, now resolved)

**Location:** `electron/main.js:261`, `electron/main.js:308`, `electron/main.js:323`, `electron/main.js:299`, `electron/main.js:301`; asynchronous teardown at `electron/lifecycle.mjs:89`.

**Consequence:** an accepted in-flight save does not block native quit, and an accepted dirty draft does not block silent installation. Both violate the requested protection at the actual host boundary.

**Trace:** clean `vibe:quit`, or downloaded-update → window hide → `maybeAutoRestart`, passes the initial state check. `quitApp` sets `appQuitting=true` and calls cached asynchronous `shutdown`. While owned-server `stop()` is pending, the live renderer can still send `vibe:set-editor-state`; the handler accepts `{open:true,dirty:true,saving:true}` or `{open:true,dirty:true,saving:false}` and returns `{ok:true}`. Resolving `stop()` invokes native quit/install without another protection boundary. Subsequent `quitApp` calls also skip the state guard once `appQuitting` is true.

**Verified evidence:** four independent in-memory actual-main fixture probes, all asserting the offending behavior successfully:

- Clean quit → delayed stop → saving state accepted → release stop: native quit **1**, stops **1**.
- Clean quit → delayed stop → dirty state accepted → release stop: native quit **1**, stops **1**.
- Hidden downloaded update → delayed stop → saving state accepted → release stop: installs **1**, native quit **1**.
- Hidden downloaded update → delayed stop → dirty state accepted → release stop: installs **1**, native quit **1**.

These execute the unchanged real `electron/main.js`, real lifecycle/updater/security modules and registered IPC handlers through the existing VM fixture. They prove host behavior; native UI timing and renderer HTTP save ordering remain reasoned integration consequences.

**Smallest reliable fix:** before setting `appQuitting` or stopping the server, request renderer exit preparation and await an acknowledgement that editing/saves are frozen and its final state is known. Cancel preparation for dirty/saving state as appropriate, with explicit discard confirmation for normal quit; only then commit shutdown. A smaller host-only option is to freeze/destroy the renderer at the accepted clean/discard boundary if it also prevents already-starting saves and late state reports; merely rejecting state IPC after `appQuitting`, or checking state after stopping the server, does not preserve a locally started save/draft. Add actual-main delayed-stop coverage for quit and automatic/manual install plus the renderer preparation handshake.

## Verified paths and test evidence

Command:

```powershell
node --test scripts/tests/electron-host.test.mjs scripts/tests/electron-updates.test.mjs scripts/tests/electron-lifecycle.test.mjs scripts/tests/electron-security.test.mjs
```

Observed **29 tests: 29 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**; includes **12 actual-main scenarios**. Four additional adversarial probes reproduced the blocker; they are reproduction assertions, not four passing protection tests.

- `electron/preload.cjs:18` invokes the new state channel; `electron/main.js:230` routes it through `requireStudioSender`; `electron/security.mjs:10` checks live owned contents, exact top-level frame and localhost origin. Actual-main `ipc` scenario rejects all tested unauthorized handlers including this channel.
- `electron/main.js:262` requires three boolean fields, copies the snapshot, and schedules an event-driven retry only when previously held state becomes fully clear. Actual-main `draft-update` checks invalid input and downloaded-update blocking while already dirty/saving.
- `electron/main.js:111` prevents window close and hides to tray, retaining its renderer. `electron/main.js:213` and `electron/main.js:258` block automatic/manual installation for already reported open/dirty/saving state. Existing test verifies installation resumes once all three clear while hidden.
- `electron/main.js:312` uses an asynchronous parented warning dialog with cancel as default. `electron/main.js:320` rechecks saving after the dialog. Actual-main `draft-quit` verifies cancel retains the draft, already-saving blocks quit, and explicit discard quits once. The fixture dialog resolves immediately, so those scenarios do not exercise an outstanding dialog or teardown race.

## Historical adversarial probe for the pre-fix fixture (no source/test writes)

Run from `C:/letmecook-lab/spotify-vibe` against the pre-fix fixture reviewed above; the final fixture/source now intentionally rejects the asserted offending behavior. The script adapts the fixture in memory, retains its fake Electron/updater/server adapters, and loads actual source modules. It starts no GUI, real profile, Discord connection or autostart operation.

```powershell
@'
import { readFile } from 'node:fs/promises';
const testURL = new URL('./scripts/tests/electron-host.test.mjs', `file:///${process.cwd().replaceAll('\\','/')}/`);
const original = await readFile(testURL, 'utf8');
for (const install of [false,true]) for (const saving of [false,true]) {
  const label = `review-race-${install}-${saving}`;
  const body = `if (scenario.startsWith('review-race')) {
    let installs=0;
    updater.quitAndInstall=()=>{ installs++; app.quit(); };
    let request;
    if (${install}) {
      win.isVisible=()=>false;
      updater.emit('update-downloaded',{version:'2'});
      win.emit('hide');
    } else request=handlers.get('vibe:quit')(event);
    await flush();
    assert.equal(stops,1); assert.equal(quit,0);
    const result=await handlers.get('vibe:set-editor-state')(event,{open:true,dirty:true,saving:${saving}});
    assert.equal(result.ok,true);
    releaseStop(); await request; await flush();
    assert.equal(quit,1); assert.equal(installs,${install ? 1 : 0});
    console.log('REPRODUCED ${label}: accepted held state; quit=1');
  } else if (scenario === 'ipc') {`;
  const source=original
    .replace('const scenario = process.argv[2];', `const scenario = '${label}';`)
    .replaceAll('import.meta.url', JSON.stringify(testURL.href))
    .replace("if (scenario.startsWith('startup-late-cleanup')) await", "if (scenario.startsWith('startup-late-cleanup') || scenario.startsWith('review-race')) await")
    .replace("if (scenario === 'ipc') {",body);
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
'@ | node --experimental-vm-modules --input-type=module
```

## Integration limits

Renderer/backend workers were concurrently editing; their internal implementation was not reviewed. At the initial interface checkpoint the renderer did not yet call `setEditorState`; at final retest both notification and preparation hook were present and the latter was exercised with actual main. Frontend owner/reviewer still must verify every open/edit/save-start/save-success/save-failure/discard transition publishes the state in the required order and that save failure retains dirty state. No native packaged NSIS installation, GUI/tray longevity run, real Discord or full concurrently changing suite was performed. No source/test edits, commit, push or release were performed by this reviewer.

**Verdict: ship desktop source within the reviewed scope — the reproduced shutdown race is fenced by actual renderer preparation; native/UI gates remain unverified.**
