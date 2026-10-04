# Scene draft and integration implementation

The renderer now clones the saved Scene and pairings when opening the editor.
Text, type, images, variables, and pairing changes remain private to that draft.
Done sends one atomic `/api/config` request with baseline expectations. Invalid
input, persistence failure, and 409 conflicts retain the open draft; a stale draft
requires explicit discard/reload. Double Done and edits during saving are blocked.
Closing through X, Escape, backdrop or navigation asks before discarding dirty
work. Library toggles continue to save immediately outside the draft.

Pin UI/actions/functions and active backend behavior are removed. Legacy raw
manualOverride data remains inert on disk. Preview buttons are valid HTTPS links
with new-tab handling; incomplete buttons cannot be saved. Discord's own-profile
button visibility limitation is explained in Thai and English. Actual buttons
seen by another Discord account were not verified in this run.

The desktop receives editor state. Hidden updates wait while the editor is open;
quit requires explicit dirty discard and refuses saving. Before shutdown the main
process invokes the synchronous renderer preparation hook, which refuses mutable
operations, freezes editing and blocks later API requests. Independent actual-main
review reproduced and then confirmed correction of shutdown races.

Independent integration review reproduced partial Scene deletion with hidden
disabled mappings. Delete and Undo now commit all arrays atomically, with stale
expectations. A subsequent raw-field Undo loss reproduction led to a bounded,
one-use 60-second server snapshot token. Only explicit Undo can restore deleted
raw Scene/mapping extensions; newer Scene/mapping edits prevent resurrection.
Current root/settings/slots/session state is preserved during Undo.

Sonnet implemented the initial renderer patch but exhausted its provider session
quota before sending worker_done. Its final usage-limit turn was verified, the
Dispatch was fenced/stopped, and the coordinator finished the remaining fixture,
shutdown, atomic delete/Undo, visibility copy, and cleanup work. No duplicate
renderer writer was started.

Verified focused checks: renderer-draft 30/30; raw Undo + renderer + store 42/42;
desktop independent review 31/31 plus four actual-main/renderer interface probes.
The final full suite passed **362/362**, with zero failed/skipped/cancelled tests.
Legacy pre-update buttons without URLs remain readable without resetting owner
config; strict new Scene writes and Discord delivery require repair. Release
verification is recorded by the coordinator after the final review.
These are source/VM/HTTP/storage/fake-RPC proofs. No Chrome GUI,
owner profile mutation, real Discord publishing or second-account visual check
was performed.
