# Scrutinize convergence record

Goal: a source-backed whole-product improvement plan that can be delegated and validated without silently changing owner choices or losing local data.

Contract: refine the canonical `IMPROVEMENT-SPEC.md` and executable `WORKFLOW.md`; review application source without implementing features. Full plan round cap is five; convergence requires two consecutive clean complete passes on the latest artifact. Independent lane code reviews are preparation and do not count as clean plan passes.

## Evidence preparation (not a convergence round)

Three actual Orca workers reviewed runtime, all UX/UI surfaces, and security/persistence/desktop lifecycle. Coordinator checked major traces and pure updater/delete probes, deduplicated findings by mechanism and incorporated 20 prioritized findings into the canonical spec. The reports contain further lower-priority observations with runtime/visual limits.

Accepted decisions: keep app-first running-app policy and approved art; remove implicit behavior migration; retain unsupported/hidden timer data; separate mapping save from Auto activation; Pause holds the previous acknowledged activity; Clear removes it; legacy scheduling uses consistent dated local boundaries; scanner error is unknown with explicit bounded hold/recovery; no framework/database/product-scope expansion.

Current externally unproved gates G1–G6 have owners, experiments, pass conditions and failure consequences in the canonical spec. Passing the Node suite does not settle them.

## Full plan rounds

| Round | Reviewer / main lens | New Blocker/Major | Resolved / carried | Added coverage | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Fresh Orca reviewer `ctx_a494bafe6c44`; necessity, architecture and ownership, complete pass | 0 Blocker / 2 Major / 1 Nit | R1-M1 single storage owner and R1-M2 Pause external-effect barrier resolved in canonical spec; G1–G6 carried | Cross-process/key-helper leases; already-submitted RPC, held activity/reconnect/cold restart; watcher observation clocks | Rework received; corrections applied |
| 2 | Fresh Orca reviewer `ctx_92a3f435b6b8`; security/privacy/failure and lifecycle, complete pass | 0 Blocker / 2 Major / 0 Nit | R2-M1 top-level-only Studio and R2-M2 provider/media resource ownership resolved in canonical spec; R1 findings resolved; G1–G6 carried | Foreign-parent interaction, HTTP cancellation to provider, coalesced callers, real in-flight work and long pagination | Rework received; corrections applied |
| 3 | Fresh Orca reviewer `ctx_5e6a54718646`; cold integration, user-visible behavior and test realism, complete pass | 0 Blocker / 1 Major / 0 Nit | R03-M1 byte/character compatibility resolved; all inherited issues resolved; G1–G6 carried | Maximum-count Thai payload crosses HTTP admission; full controller/renderer/host integration and test realism | Rework received; correction applied |
| 4 | Fresh Orca reviewer `ctx_441f0090ea78`; lifecycle, packaging and data-preserving backout, complete pass | 0 Blocker / 1 Major / 1 Nit | R4-M1 quiescent legacy upgrade admission resolved; R4-N1 external helper inventory clarified; inherited issues resolved; G1–G6 carried | Pre-lease old CLI/helper on overlapping storage, trusted backup provenance and actual external ASAR paths | Rework received; correction applied |
| 5 | Fresh Orca reviewer `ctx_623a658b00b6`; necessity/architecture and final cold integration, complete pass | 0 Blocker / 2 Major / 0 Nit | R5-M1 renderer prepared exit and R5-M2 profile-bound relaunch refined; all earlier findings resolved; G1–G6 carried | Debounce/later/invalid/conflicting drafts through host exit; custom/split profile login/update/backout and default sentinel | Rework received; corrections applied, not independently rechecked |

### Round 1 decisions

- **R1-M1 accepted:** process-local queues do not protect one file across different ports/CLI/Electron/helper. Add canonical per-file lease ownership before load/bind/migration; sorted acquisition and positive-exit recovery; runtime owns primitive/server, security owns standalone key helper. No new database/discovery service.
- **R1-M2 accepted:** invalidating metadata cannot retract a submitted RPC. Pause acknowledges after an 8-second bounded effect handoff, captures an immutable result and restores it on same-process reconnect; failed handoff is uncertain and cold restart publishes nothing. Hide discards the hold and clears through a barrier. Tests must observe actual mock effects, not snapshots alone.
- **R1-N1 accepted:** distinguish emitted focus observations from full process enumeration and record timing from the appropriate healthy sample. Hardware timing is a measured gate.
- No product answer required: these narrow contracts preserve Pause/Hide meanings and single-owner storage. Application code is unchanged; the refinement is the design correction, not a claim that baseline bugs were fixed.

Full report: [round-01.md](rounds/round-01.md). Its input hashes freeze the pre-correction artifact; subsequent passes review current canonical files, not old reports.

### Round 2 decisions

- **R2-M1 accepted:** Host/Origin/token checks do not stop a parent presenting genuine Studio controls deceptively. W1 requires HTTP `frame-ancestors 'none'` plus DENY fallback on Studio/boot/error documents. G5 proves blocked foreign embedding and usable direct navigation; browser admission was not observed in this run.
- **R2-M2 accepted:** a completed cache does not bound in-flight provider work, and renderer abort does not cancel upstream. Security owns coalesced, subscriber-aware admission: 2 active transports, 8 queued distinct searches, 32 HTTP requesters, 10-second total deadline and 2 MiB response cap; actual transport settlement releases active slots. Runtime wires disconnect/shutdown; UX retains at most 48 buttons, then explicit window replacement with focus/selected-art preservation.
- Source checked independently at `scripts/studio-server.mjs:735`, `:844`, `scripts/giphy-search.mjs:141`, `:213` and renderer `:2644`, `:2692`, `:2726`. The worker's pure fake-fetch probe observed three concurrent requests despite a one-entry completed cache; no browser/provider traffic was needed.
- A coordinator clarification distinguishes rejected zero-Scene input from a legitimate empty app catalog; current minimum-one-Scene validation is preserved.
- No product answer required and no application implementation performed. Both findings correct missing design rules; they cannot be dismissed as deferred runtime gates.

Full report: [round-02.md](rounds/round-02.md). The clean-pass streak remains zero; Round 3 must inspect the corrected current artifacts cold.

### Round 3 decisions

- **R03-M1 accepted:** 256 KiB as bytes narrowed the current 262,144-UTF-16-unit reader contract. A valid 20-Scene Thai payload measured 290,353 bytes. The canonical body cap is now 1 MiB with a 5-second total read deadline and typed zero-effect failure; keep field/count constraints and retain rejected drafts.
- The old reader's accepted valid UTF-8 text is bounded by 3 × 262,144 = 786,432 bytes. The new cap includes revision-envelope headroom; it is a compatibility rule, not a request to truncate fields or expand Scene count.
- Coordinator independently validated a synthetic maximum fixture of 20 Scenes, 24 slots and 100 mappings / 1,024-character paths: full save 625,598 bytes, mapping save 334,239 bytes. Probe uses only validator/serialization in memory; no server/Discord/filesystem write. W0/W1 require actual-reader multibyte/escaping/limit fixtures when implemented.
- The current server-test catalog/RPC isolation limitation is now explicit in the canonical evidence section. It does not invalidate the observed 56-test pass or satisfy Desktop proof gates.
- Full report: [round-03.md](rounds/round-03.md). No owner product decision is needed; no application source changed. Clean-pass streak is still zero. Rounds 4 and 5 must be consecutive clean full passes to converge within the five-round cap.

### Round 4 decisions

- **R4-M1 accepted:** a future lease does not exclude the unmodified baseline CLI/helper. Supported first shared-profile activation now requires a quiescent handoff: identify/retire legacy relaunch paths, stop only positively identified owned writers, verify incarnation exit, then acquire new ownership and take trustworthy backups before migration. Unknown ownership/exit refuses shared-profile access; preparation uses a disjoint profile. Runtime owns admission; lifecycle owns predecessor/startup handoff.
- Updated helper/CLI lease guarantees are explicit; manually restarting retired noncooperating binaries against the migrated profile is unsupported. Backout also requires confirmed stop/drain, compatible-copy provenance and one launcher; no unidentified process is terminated.
- **R4-N1 accepted as clarification:** lifecycle packages both external PowerShell scripts and their relative Codex icon outside ASAR; runtime owns a shared real dev/packaged resolver and consumers. G4 must execute both helpers/read icon, not merely match source strings.
- Source independently checked: baseline CLI entry, `studio-server.mjs:61`, old helper `setup-giphy-key.mjs:11`, `:44`, `windows-apps.mjs:10` and `$PSScriptRoot` icon at `windows-apps.ps1:52`. No source/host mutation or probe was required.
- Full report: [round-04.md](rounds/round-04.md). Clean-pass streak remains zero. Within the fixed five-round contract, a clean Round 5 can establish one clean pass but cannot establish two-pass convergence; final verdict must report that limit honestly.

### Round 5 decisions

- **R5-M1 accepted:** storage drain excludes unsent renderer drafts. Runtime coordinates registered-client prepare-exit receipts; UX freezes/captures the latest generation and waits for its committed revision; lifecycle admits Quit/install only after saved or explicitly discarded participants. Invalid/409/failed/uncertain/unreachable preparation cancels by default, including hidden/second tabs; deadline is 10 seconds. Explicit-save key/settings forms are never silently saved. Forced OS/tab loss remains best effort.
- **R5-M2 accepted:** one launcher is insufficient if it resumes the wrong files. Runtime defines the immutable nonsecret profile descriptor/resolver; lifecycle atomically retains its pointer for startup/update/backout. Canonical config/secrets identities, data directory, host/port/startup location must match before load; invalid/missing descriptor has no default-profile fallback. Supported legacy launch translation is explicit; incompatible combinations refuse automatic restart. Default-profile sentinel proves zero unintended writes.
- Coordinator checked debounce/pagehide/Quit/install at renderer `:2832`, `:2846`, `:3291`, `:3750`, native startup/install at `electron/main.js:38`, `:259` and VBS argv at `windows-autostart.mjs:24`. Input hashes matched; source remains unchanged.
- Full report: [round-05.md](rounds/round-05.md). Refinements also update W4/W6 ownership, dependency order and G2/G4 acceptance. No new product approval is required to choose these data-preserving defaults.

## Final disposition

**Rework.** Three independent source-review lanes and five fresh complete plan passes succeeded. Accepted plan corrections total eight Majors and two Nits; they are present in the canonical artifact, while F01–F20 are still unchanged-application work. Each pass found new Major coverage, so the clean streak is zero. Final Round 5 corrections have coordinator/source validation but no independent subsequent pass.

The fixed five-round cap is reached. The skill requires: “At the round cap, never declare success merely because the cap was reached.” This run therefore does not claim Ready or Ready with runtime gates. Next review proof is two consecutive complete clean passes on the final spec/workflow, with special attention to controlled-exit participants and profile restart/backout. G1–G6 still follow as actual implementation proofs and never replace that design rereview.

No outstanding owner product decision prevents this artifact delivery. No feature/source/package changes, browser control or release occurred. Per-Task settlement and preserved user-owned terminals are recorded in [COORDINATION.md](COORDINATION.md).
