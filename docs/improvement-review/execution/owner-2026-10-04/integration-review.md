> FINAL STATUS: No remaining reproduced Blocker/Major in the reviewed scope after coordinator corrections. Final focused tests 152/152 and full suite 362/362. Source/fixture acceptance only; live Discord second-account visibility, GUI/visual and packaged-runtime gates remain unverified.

# Integration review — owner 2026-10-04

Read-only reviewer, Dispatch ctx_85aad506b862 / Task task_34360397cd7a. Reviewed backend first; coordinator stable message msg_47bd3313837a authorized frontend trace. Source/test files were never edited by this reviewer. Only this report and TEMP probes were written; isolated HTTP fixture was stopped and its temporary profile removed.

## Intent and simpler alternative

Goal: remove active Pin behavior, commit editor Scene and pairing drafts together only on Done, retain failed/conflicted drafts, preserve running-app timers and send valid clickable buttons. A separate save API or generalized transaction layer is unnecessary: existing queued PUT /api/config already supports combined arrays and optimistic expectations. Reusing that endpoint for deletion/undo is the smallest way to eliminate the remaining two-step partial-save behavior.

## Major — Scene deletion commits pairings before failing, then falsely restores UI

**Historical reproduced Major; coordinator corrected during review, independent actual-HTTP remove/reassign recheck passed.** `scripts/discord-presence-studio.html:513`, `:523`, `:1251`, `:1264`, `:1245`; `scripts/app-presence.mjs:7` validates references even for disabled mappings.

Scene has both an enabled app mapping and a hidden disabled mapping. Delete with Unpair removes its enabled rule but retains the hidden mapping. `flushSave()` sends PUT /api/app-mappings successfully, then PUT /api/config attempts deletion and fails because the hidden mapping references the deleted Scene. `doDelete()` restores local Scene/rules and clears dirty flags, although the enabled mapping was already removed from persisted config. The dialog claims “Nothing was changed.” The same two-step save can partially mutate even without hidden mappings if the second persistence operation fails.

Actual renderer functions `doDelete`, `flushSave`, `settleSave` were executed in VM against actual isolated `startStudioServer` HTTP (no fake persistence). Observed requests: `/api/app-mappings` 200, `/api/presence` 200 (paused compatibility restoration), `/api/config` 400. Afterward UI enabled mappings=1, server enabled mappings=0, Scenes remain=4. Error: “An application references a missing preset. Remove or reassign its mapping first.” Probe: `%TEMP%/vibe-integration-delete-probe.mjs`.

Smallest fix: use one PUT /api/config with final Scenes + mappings and both expectations for deletion and undo; handle affected hidden mappings according to remove/reassign choice, retaining unrelated hidden entries/unknown fields. Change local saved state only after success; on failure preserve server baseline and retryable operation. Include a hidden-mapping failure case and injected persistence failure at this boundary. For Undo, restore the captured hidden entries and mappings through the same atomic endpoint.

## Resolved during review — continuation after renderer quit freeze

Historical **Major, reproduced** at old `api`, `setPresence`, `prepareQuit`: start `setPresence(true)`, invoke synchronous `prepareQuit()`, receive `{ok:true}`, then the awaited continuation issued POST /api/schedule and GET /api/state with S.shuttingDown=true. Probe `%TEMP%/vibe-integration-shutdown-probe.mjs` recorded both requests. Not a hypothetical event-order concern.

Coordinator corrected the mechanism during this review: current `scripts/discord-presence-studio.html:342` rejects all API calls after shutdown, `:976` also refuses handshake during ST.busy/ST.iconBusy, and keyboard handlers gate frozen state. Current actual renderer VM tests exercise preparation dirty/save/command refusal and zero late fetch; independent focused rerun passed. `electron/main.js:332` executes `window.__vibePrepareQuit({discard:boolean})`, accepts only exact ok:true, then tears down; actual-main host fixtures passed. This original finding is closed for the tested continuation. VM/source verification does not substitute for live Electron visual acceptance.

## Traced and verified surfaces

- **Storage:** `scripts/local-config-store.mjs:16` writes exclusive TEMP file, fsyncs, renames, publishes raw document only after success. `scripts/presence-config.mjs:202` overlays unknown root/settings/Scene/mapping fields by id/appKey and preserves raw slots when omitted. Tests cover deletion without resurrection, rename/fsync errors, backups, concurrent secret/config operations and unknown fields. Legacy malformed manualOverride stays on disk inert; normalization omits it and active override routes return 404.
- **Done transaction:** `scripts/studio-server.mjs:486` builds and validates inside recovered command queue; `:638` checks expectedScenes/expectedAppMappings against latest normalized arrays using isDeepStrictEqual before persistence. Combined candidate is validated once, persisted once, then reconciled. Invalid arrays/references/buttons, stale expectations, queued overlapping requests and persistence failure have zero candidate publication/RPC effects; valid retry recovers. Paused Done remains paused.
- **Draft isolation:** `scripts/discord-presence-studio.html:957` clones Scene and whole baseline/mappings; `:983` sends Scene baseline always and mappings expectation when pairing draft changed; `:990` one busy-gated Done. VM TH/EN cases cover text/type/art/buttons/pairing/undo without requests, unknown fields and hidden entry preservation, new Scene, double Done, midflight edit/discard refusal, failure retry, 409 retention, confirmed reload/discard and applyConfig leaving draft untouched. Busy library save blocks editor open.
- **Buttons:** `scripts/discord-presence-studio.html:196` validates preview href; dcCard emits HTTPS anchors, new tab + noopener/noreferrer, rather than inert labelled buttons. VM verifies anchor rendering and invalid/partial links. `scripts/presence-config.mjs:135` validates maximum two complete label+HTTPS URLs; `:352` puts full objects into activity. `scripts/studio-server.mjs:367` sends actual SET_ACTIVITY request args to injected fake RPC; tests assert exact labels/URLs and timestamps in those outgoing args. No real Discord transport or second-account visibility was observed. Coordinator reported the owner's symptom is own-profile button visibility and added help; external issue research was coordinator work, not independently verified here.
- **Timer policy:** `scripts/studio-server.mjs:127`, `:238`, `:525`, `:1024` keep per-app first-observed starts, remove only on successful supported detector snapshot showing closure, preserve duration across A/B switches and error snapshots, restart on true close/reopen. Fake clock + real HTTP/fake RPC checks all transitions; Codex session startedAt overrides detector elapsed start. Remaining timer uses same preserved activity base. Actual process launch time preceding initial detection is not measured.
- **Pin:** active renderer ACT/UI and server override routes are absent; legacy raw data remains inert and causes no expiry writes. Some historical vocabulary/comments are not active behavior. Dead CSS removal was coordinator-owned and in progress at last status.

## Exact observed verification

1. Backend focused: `node --test scripts/tests/studio-atomic-done.test.mjs scripts/tests/persistence-boundary.test.mjs scripts/tests/studio-boundary.test.mjs scripts/tests/studio-apps.test.mjs scripts/tests/presence-config.test.mjs scripts/tests/studio-p2-endpoints.test.mjs` — **67 tests, 67 pass, 0 fail**.
2. Initial renderer/desktop focused run — **77 tests, 76 pass, 1 fail**, missing notifyEditor in renderer-p3 fixture (not a reproduced product failure). Coordinator fixed fixture; superseded by next run.
3. After coordinator shutdown corrections: `node --test scripts/tests/renderer-draft.test.mjs scripts/tests/renderer-p3.test.mjs scripts/tests/renderer-updates.test.mjs scripts/tests/electron-host.test.mjs` — **79 tests, 79 pass, 0 fail**.
4. `npm test` — **356 tests, 356 pass, 0 fail, 0 skipped/cancelled/todo**, 19186.6976 ms. TEMP log: `%TEMP%/vibe-integration-npm-test.log`. This suite read files while coordinator added shutdown/fixture corrections; it does not cover the independently reproduced hidden deletion failure and is not evidence of a frozen final source snapshot.
5. TEMP probes — two concrete reproductions described above; deletion used real HTTP and isolated disk, shutdown used actual API/renderer functions with recording fetch. No Chrome/browser GUI, real owner profile/secrets, live Discord, package install, commit/push/deploy, or visual release acceptance.

## Resolved during review — Undo lost deleted owner extensions

**Historical Major reproduced after initial atomic-delete correction; final server-owned-token correction independently verified below.** Current `scripts/discord-presence-studio.html:1254` takes baseline from ST.config, whose Scenes and mappings are normalized API projection; `:1276` Undo resends those normalized arrays. `scripts/presence-config.mjs:202` can preserve extensions only if that identity exists in the current raw document. Deleted identities no longer do.

Actual HTTP + actual renderer doDelete/Undo VM probe `%TEMP%/vibe-integration-delete-recheck.mjs` ran remove and reassign separately. Both deletion and Undo return 200, each one /api/config request, with pause preserved and affected hidden mappings correctly removed/reassigned. Before deletion Scene raw ownerExtension={sacred:"Scene extension"}; after Undo that field is absent in both modes. With remove, enabled and hidden mappings also lose their raw ownerExtension; with reassign mappings retain them because the records were never deleted. Thus the partial-delete finding above is corrected, but explicit Undo does not restore the owner's original documents.

Smallest reliable fix is a bounded server-owned raw snapshot associated with an explicit undo token and the committed normalized expectation, or equivalently explicit restore semantics that can recover removed raw identities only for this owner-authorized Undo. Do not preserve removed records by default or silently resurrect deliberate deletion. Add actual HTTP/disk assertions for deleted unknown Scene/mapping fields: renderer fixture tests inject unknown fields directly into ST.config although real GET /api/config omits them, so green assertions do not cover this boundary.

**Historical intermediate verdict: fix-then-ship for raw Undo loss; superseded by final acceptance below.**


## Atomic-delete correction rechecks

Coordinator stable message msg_a8bf9bbe736f authorized final changed-source recheck. TEMP actual renderer functions + actual isolated HTTP verified remove and reassign, disabled mappings, pause retained, successful one-request deletion and one-request Undo. TEMP `vibe-integration-delete-failure.mjs` separately verified rename500 retains exact disk bytes/Scenes/mappings, and a later Scene edit causes Undo409 retaining later bytes. Every fixture stopped server and removed its TEMP profile.

After atomic-delete patch: renderer-draft **30/30** and fresh full `npm test` **359/359**, 0 failures/skips/cancellations/todo, 12512.0915 ms; log `%TEMP%/vibe-integration-post-delete-npm-test.log`. These greens still do not resolve the reproduced raw Undo extension loss. Coordinator msg_ba6f3813f36f accepted that finding and is implementing bounded explicit server-owned Undo token; final rereview pending its stable signal.


## Final acceptance after explicit raw Undo-token correction

Coordinator stable msg_59b41913d858 authorized final source review. All source changes described here are coordinator changes, not reviewer edits.

Current `scripts/studio-server.mjs:485`, `:640`, `:652`, `:658`, `:672` maintains one 60-second raw snapshot token. Deletion retains a raw snapshot inside the config queue only with expected arrays and reduced Scene count. Undo requires the matching token and unchanged committed Scene/mapping arrays, restores previous normalized arrays against the server-owned raw Scene/mapping snapshot, and preserves current raw root/settings/slots. Token is consumed after successful persistence; failed replacement retains retryability. Normal saves do not resurrect deleted records. TTL is source-traced; expiry timing was not independently exercised by this reviewer.

`local-config-store.mjs:110` supplies a defensive cloned snapshot; internal `baseDocument` is passed only for explicit restoration. `discord-presence-studio.html:1247` sends retainUndo on atomic deletion and `:1267` sends the returned token on explicit Undo.

**Independent actual renderer + actual HTTP/disk final recheck:** remove and reassign each issue one PUT /api/config for delete, one for Undo; restored raw Scene ownerExtension={sacred:"Scene extension"} and enabled/disabled mapping extensions are exact in both modes. Pause remains false scheduleEnabled. This closes the raw-extension loss finding. Final actual rename500 and stale Undo409 probes still retain exact disk bytes, saved Scene/mapping state and later edits. TEMP profiles removed and fixture servers stopped.

**Final tests observed:** combined backend/renderer/actual-main focused suite **151 tests,151 pass,0 fail**, 12759.3104ms; `%TEMP%/vibe-integration-final-focused.log`. Final `npm test` **361 tests,361 pass,0 fail,0 skipped/cancelled/todo**,13251.4231ms; `%TEMP%/vibe-integration-final-npm-test.log`. Backend focused coverage includes raw Undo extensions/current root+session preservation, one-use token, failed restore retry and conflicting later edit. Renderer fixture unknown-field tests alone remain insufficient; actual HTTP/disk reproduction above supplies that missing proof.

Prior pre-compatibility source SHA256:

- scripts/studio-server.mjs: 88EB0A736B2D6976344B66E3B38237EE8722F2698D25DB10EF93431D548E3B7B
- scripts/presence-config.mjs: DD5F124B9A11D108C5104818EC2BE71FF32556B38BE818D3CF1D27E30C4909FB
- scripts/local-config-store.mjs: 886A4A0A02780B0A9815E741BC81FBE3C49A305E83433FC68DFAC9BDB41FC3F6
- scripts/discord-presence-studio.html: FCF0BBA3C7DAF8C5B180FD1612F891C06918EA8DA0D21088998EAA110A6475AD
- electron/main.js: 0795ED10FA03CD16E319362EC095396670C0B03FDA0B965CDD9767A1BE6C8E99

**Final verdict: source/test review accepted — all three reproduced Majors were corrected and independently rechecked. This is not browser, owner visual, live Discord viewer, packaged-runtime or release acceptance.**

## Later upgrade-compatibility check

Coordinator found historically accepted labelled buttons with empty URL could reset existing profile under newly strict validation, then provided stable correction msg_28105216253c. Actual isolated HTTP probe `%TEMP%/vibe-integration-legacy-compat.mjs` verified unchanged bytes on initial load/no corrupt backup, unrelated session update preserves old label+empty URL and root/Scene unknown fields, new invalid Scene save400 leaves bytes unchanged, strict createDiscordActivity rejects delivery, explicit repair200 preserves Scene extension. Focused compatibility/persistence/renderer tests **69/69**,0 fail,4222.5233ms.

Additional raw-data probe `%TEMP%/vibe-integration-legacy-buttons.mjs` added `ownerButton:'keep'` inside a legacy button object. Unrelated /api/codex-session PUT strips this nested unknown field because Scene overlay replaces raw buttons with normalized array. Reproduced loss occurred after initial unchanged load; root and Scene extensions remained. Coordinator notified msg_6d6bb54c3950. This nested preservation issue was accepted in scope and corrected by coordinator; final actual HTTP retention/removal verification below supersedes this historical finding.


## Settled final review — final compatibility and nested preservation source

Stable msg_3705b1408080 authorized the narrow final correction. `scripts/presence-config.mjs:60`/`:159` make legacy empty-button URL allowance opt-in; server store load and internal commits allow only historical empty URLs, while new HTTP Scene arrays and createDiscordActivity remain strict. The Scene overlay at `scripts/presence-config.mjs:214` preserves raw button entries only when their normalized label/URL sequence equals the candidate sequence; explicit edited or removed buttons take priority.

Actual HTTP/disk final probes `vibe-integration-legacy-buttons.mjs` and `vibe-integration-button-removal.mjs` passed: original bytes unchanged on load, no corrupt backup/reset, ownerButton/root/Scene fields retained through unrelated update, invalid new Scene PUT400 and activity rejected, explicit HTTPS repair200, explicit button removal200, and subsequent unrelated update does not resurrect removed buttons. Both fixture servers stopped and TEMP profiles removed.

Final focused command (same ten files as final 151-test run above) now observed **152/152**,0 fail/skipped/cancelled/todo,10103.8691ms. Final `npm test` observed **362/362**,0 fail/skipped/cancelled/todo,12552.2137ms. TEMP final-focused and final-npm-test logs now contain these final results; earlier counts in this report are historical.

Final accepted source SHA256 (supersedes earlier hashes):

- scripts/studio-server.mjs: ABE5C663728ADB55B37382E2E86D2FFEF380BFE86ED05E8E9FB5C35712807548
- scripts/presence-config.mjs: 5BAA2D6458B4C33760D6BC9273C67B9B56DEB839C0C61FAA0449C9642C2395F5
- scripts/local-config-store.mjs: 886A4A0A02780B0A9815E741BC81FBE3C49A305E83433FC68DFAC9BDB41FC3F6
- scripts/discord-presence-studio.html: FCF0BBA3C7DAF8C5B180FD1612F891C06918EA8DA0D21088998EAA110A6475AD
- electron/main.js: 0795ED10FA03CD16E319362EC095396670C0B03FDA0B965CDD9767A1BE6C8E99

**Final verdict: source/test review accepted, no remaining reproduced Blocker/Major in this scope. All reviewer-discovered persistence/shutdown findings were corrected and independently rechecked; upgrade compatibility also independently verified. No live Discord viewer, Chrome/browser GUI, owner visual acceptance, packaged install/runtime, commit/push/deploy or release operation was performed.**
