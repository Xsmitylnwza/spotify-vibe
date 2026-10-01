# Review coordination contract

Goal: produce one source-backed improvement specification for the current local Discord Presence app, with an executable phased workflow and converged outsider review.

Baseline: `b241ccd5542b1f3e5ee348bd507cac051cafabda`, `main`, version `1.0.7`; clone `C:/letmecook-lab/spotify-vibe` on 2026-10-01.

Orca Run: `run_bb0a60f802aa`. Coordinator owns synthesis, evidence validation, tests, canonical spec, decisions and completion accounting. Worker completion is evidence; acceptance requires coordinator validation.

| Lane | Review ownership | Output |
| --- | --- | --- |
| Runtime | Scheduler, app detection/mapping, config and Discord state flows | `runtime-review.md` |
| UX/UI | Every current screen, component, interaction, accessibility and recovery state | `ux-review.md` |
| Security/lifecycle | HTTP/Electron boundaries, secrets/persistence, startup/tray/update/package | `security-lifecycle-review.md` |
| Coordinator | Product/doc reconciliation, test baseline, synthesis and scrutinize refinements | `IMPROVEMENT-SPEC.md`, `WORKFLOW.md`, `SCRUTINIZE-LOG.md` |

Independent review lanes run first. The coordinator checks source evidence and reconciles findings before writing the canonical spec. Fresh reviewer tasks receive the latest canonical spec plus raw source, read the spec cold before prior reports, and complete full passes with rotating lenses. Accepted corrections go into the canonical artifact. Stop after two consecutive clean full passes, with an overall cap of five for architecture/security/lifecycle work; a cap alone is not acceptance.

Only review/planning documents may change. No feature implementation, source refactor, push, merge, publish, real Discord activity, autostart configuration or user-data writes are authorized by this review task. No browser/Chrome/computer control; visual and real Desktop/Discord/installer checks remain named proof gates. Tests use isolated fixtures. Each worker has a unique report path and must settle its authoritative Dispatch before release or reuse.

## Initial wave settlement

| Task / Dispatch | Accepted result | Evidence | Cleanup decision |
| --- | --- | --- | --- |
| `task_412721acfdf0` / `ctx_bbdeae7822be` | Succeeded: runtime source review | `runtime-review.md`; pure transaction, selection/pause, projection, cardinality and clock fixtures; coordinator checked main traces | Release requested after settlement; Orca returned `retained`, `user_takeover`, `processAction:none`; preserve user-owned terminal |
| `task_98319d91f8e6` / `ctx_c9778a5cb952` | Succeeded: all-surface source UX/UI review | `ux-review.md`; source state matrix, pure draft/timer/delete probes and explicit visual/accessibility gates | Released after accepted completion; transcript archived |
| `task_c184fd21cda4` / `ctx_2d361c61c0e0` | Succeeded: security/persistence/lifecycle review | `security-lifecycle-review.md`; updater, chunked UTF-8, concurrent secret, recovery and schema fixtures; coordinator checked core paths | Released after accepted completion; transcript archived |

All three authoritative `worker_done` messages were validated against their active Task/Dispatch and processed before FIFO Delivery acknowledgement. Duplicate observations were reconciled in the canonical spec. None of these settlements certifies an implementation or release.

Fresh full-plan scrutiny begins after this evidence wave; round reports and convergence decisions are in `SCRUTINIZE-LOG.md`.

## Plan round settlement

| Task / Dispatch | Accepted result | Evidence | Cleanup |
| --- | --- | --- | --- |
| `task_2a39a79ec72d` / `ctx_a494bafe6c44` | Review succeeded; plan verdict Rework with two Major contracts | `rounds/round-01.md`, input hashes, full coverage; single storage owner and submitted-RPC Pause handoff accepted and specified | Release requested after settlement; runtime returned `retained` / `user_takeover`; no process action |
| `task_0d213fdad8f0` / `ctx_92a3f435b6b8` | Review succeeded; plan verdict Rework with two new Majors; Round 1 issues resolved | `rounds/round-02.md`, matching frozen hashes and pure fake-provider probe; anti-framing and GIF ownership/bounds accepted and specified | Released after accepted settlement; transcript captured; Delivery `delivery_6479d3e39925` processed/acknowledged after cleanup |
| `task_bc06754ebca3` / `ctx_5e6a54718646` | Review succeeded; plan verdict Rework with one new Major; inherited issues resolved | `rounds/round-03.md`, frozen hashes and valid Thai payload probe; byte/character compatibility accepted and corrected | Released after accepted settlement; transcript captured; Delivery `delivery_29076712514c` processed/acknowledged after cleanup |
| `task_53d33249d28d` / `ctx_441f0090ea78` | Review succeeded; plan verdict Rework with one new Major and one Nit; earlier issues resolved | `rounds/round-04.md`, frozen hashes/full coverage; quiescent legacy handoff accepted, external helper resource layout clarified | Released after accepted settlement; transcript captured; Delivery `delivery_4ac6b7ce42e7` processed/acknowledged after cleanup |
| `task_1b10779a4d08` / `ctx_623a658b00b6` | Review succeeded; plan verdict Rework with two new Majors; six previous Majors/two Nits resolved | `rounds/round-05.md`, frozen hashes/full coverage; prepared exit and profile-bound relaunch accepted/refined; no independent rereview yet | Release requested after settlement; runtime returned `retained` / `user_takeover`, no process action; Delivery `delivery_24e80a5dac64` processed/acknowledged after cleanup decision |

A succeeded review Task can deliver Rework: lifecycle success means the requested review was delivered, not that the plan or application was accepted.

## Final accounting

Fleet enumeration returned all **8 Tasks succeeded**, **5 terminals released**, **3 retained/user-owned**, no reclaimable resource and no remaining lifecycle nextAction. Runtime's user_takeover decisions for initial runtime, Round 1 and Round 5 were preserved. Every delivered completion was processed, evidence checked and a cleanup decision made before Delivery acknowledgement. The canonical plan verdict is Rework at the five-round cap; source/implementation/release readiness is not claimed. Final path-only citation cleanup in Round 3/4 reports leaves their findings and frozen inputs unchanged.
