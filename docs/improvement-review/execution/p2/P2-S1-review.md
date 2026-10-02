# R-P2-S1 — Discord identity review

Verdict: **Accept with fixes** — 1 Major, reproduced with fake RPC; no source edits or commits.

Reviewed current uncommitted `improve/flow-ux` tree against decision #21 and the author report. Goal: expose the current local RPC identity without OAuth or persistence. The existing RPC READY user is the smallest suitable source; no additional service is needed.

## Finding

**Major — A stale failed login clears the replacement account identity.** `C:/letmecook-lab/spotify-vibe/scripts/studio-server.mjs:431` (unconditional state reset and new identity clear at `:433`–`:434`). **Reproduced**, not a hypothesis: keep client A login pending, PUT `/api/settings` with a different Application ID, let replacement B login succeed, then reject A's login. Before rejection the HTTP state is `connected` with user `replacement`; afterward it is `disconnected`, `discordUser: null`, and a reconnect is scheduled despite B still being current. The success continuation has a current-client guard at `:421`, but catch only guards the client-reference assignment at `:432`. The unguarded connection reset predates this slice; the new identity field inherits its race and breaks decision #21's reconnect/account-switch truthfulness.

Smallest fix: at catch entry, if stopping or `discordClient !== candidate`, destroy only that candidate and return before mutating runtime or scheduling retry. Add a behavioural fake-RPC regression that rejects an old pending login after its replacement is connected, and asserts the replacement identity/connection remain intact and no retry is scheduled. Also cover rejection of the current replacement login to confirm null identity on genuine failure. Existing tests (`C:/letmecook-lab/spotify-vibe/scripts/tests/studio-discord-user.test.mjs:87`) hold the replacement pending but never settle/reject the old login, so they miss this boundary.

## Verified coverage

- Source and fake RPC: minimal `{ id, username, displayName, avatarUrl }`, global-name fallback, static PNG / animated `a_` GIF with size=128, and null-avatar `(BigInt(id) >> 22n) % 6n`: `C:/letmecook-lab/spotify-vibe/scripts/studio-server.mjs:140`; behavioural HTTP assertions at `C:/letmecook-lab/spotify-vibe/scripts/tests/studio-discord-user.test.mjs:41`.
- Source: initialization/normal disconnect/explicit teardown/disabled connection/current failure/shutdown clear identity at `C:/letmecook-lab/spotify-vibe/scripts/studio-server.mjs:125`, `:292`, `:314`, `:397`, `:406`, `:434`, `:744`. Fake RPC verifies normal disconnect, changed account reconnect, stale disconnect isolation, pending replacement and absent READY user (`C:/letmecook-lab/spotify-vibe/scripts/tests/studio-discord-user.test.mjs:61`, `:87`, `:102`). Failure/shutdown identity clearing is source-traced; stale failure is the exception above.
- Source and HTTP tests: additive runtime field at `C:/letmecook-lab/spotify-vibe/scripts/studio-server.mjs:243`, shared by state/presence/settings; existing fields retained. Only runtime stores identity; config/secrets writes remain separate. Tests assert no config identity, no secrets file and no extra fake token in projection (`C:/letmecook-lab/spotify-vibe/scripts/tests/studio-discord-user.test.mjs:47`). Diff introduces no identity/token log or server network request; avatar URL is constructed only.
- Source: installed RPC assigns READY user before connected (`C:/letmecook-lab/spotify-vibe/node_modules/discord-rpc/src/client.js:170`) and login without scopes returns after connect (`:135`). P4-1 detector wiring/debounce/reconcile transition (`C:/letmecook-lab/spotify-vibe/scripts/studio-server.mjs:995`) and activity reconcile/SET_ACTIVITY behaviour are unchanged by the diff; existing transition regression passed.

## Commands / limits

From `C:/letmecook-lab/spotify-vibe`:

- `node --test C:/letmecook-lab/spotify-vibe/scripts/tests/studio-discord-user.test.mjs`: **7 passed, 0 failed**, exit 0.
- `npm test`, run once: **130 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**, exit 0; 11,886 ms.
- Additional inline Node fake-RPC reproduction through the real HTTP server: observed `connected/replacement` -> `disconnected/null` on late old-login rejection; exit 0. Temporary config/secrets, disabled app detection/autostart; server stopped and temporary directory removed in finally.

No real Discord account switch/quit, CDN fetch or renderer display was verified. Source and existing fake-RPC checks support those normal paths; live integration and visual acceptance remain later gates. Only this report was written; unrelated dirty files preserved.
