# App icon upload backend — 2026-10-04

## Result

Verified: anonymous IMG.GE PNG uploading works using curl and the actual default Node adapter. Enabled this adapter by default; explicit `uploader: null` still disables uploads. `ready` proves public PNG retrieval at upload time, not Discord image-proxy acceptance.

Worker changes only:

- `scripts/app-icon-hosting.mjs`: IMG.GE adapter, generic provider metadata, old-host consent/cache invalidation, preserved cache extensions, strict PNG chunk/checksum/inflate checks, explicit retry, bounded direct GET verification.
- `scripts/studio-server.mjs`: provider-bound consent PUT; local-origin/JSON guarded explicit upload POST; exact catalog lookup with installed PNG fallback for running apps; automatic upload limited to enabled mappings whose saved Scene uses automatic app art.
- `scripts/tests/app-icon-hosting.test.mjs`, `scripts/tests/studio-p3-endpoints.test.mjs`: network-free adapter, cache and actual HTTP boundary tests.
- This report. Renderer/CSS changes visible in the shared workspace belong to the coordinator; this worker did not edit them.

## Live host evidence

Only `%TEMP%/vibe-upload-probe.png`, a generated 32px PNG with no owner data, was uploaded. No accounts, private API keys or browser control were used.

1. Anonymous curl GET `https://img.ge/en` obtains session CSRF and ephemeral cookies; curl multipart POST `https://img.ge/en/upload` sends `file=icon.png`, generic name/type/size and `upload_auto_delete=0`.
2. The anonymous page explicitly labels option `0` as `Don't autodelete`; POST returned `type: success`, direct URL `https://img.ge/i/VIU8X66.png`.
3. Direct GET without cookies returned HTTP 200 and `Content-Type: image/png`; SHA-256 matches the generated source: `9d112f81938659b35efd40dfefe3e83c0700d2226d7e2a97e28aeab493b97784`.
4. The actual `createIconUploader()` with Node global fetch uploaded the same generated PNG and returned `https://img.ge/i/ASUhs66.png` only after its direct GET verified MIME and exact bytes. A later independent curl GET again returned 200 image/png and the same SHA-256.

The adapter permits only exact `https://img.ge/i/<safe-id>.png` returned links, rejects redirects on every request, sends cookies only to the fixed IMG.GE upload origin, and caps the GET stream at source byte size (source PNG limit 256 KiB). Session values exist only in memory; neither session cookies nor CSRF tokens enter the cache/config/report. No executable names or paths enter upload payloads.

Other observed candidates: Postimages `/json` rejected automated website uploading with error code 403 and directed callers to its official API; imgbox generated an anonymous upload token but `/upload/process` returned its 500 error HTML and its page announces a hosting-provider disruption. These adapters were not shipped. Coordinator-provided Catbox/qu.ax/freeimage/pomf findings were treated as task context, not independently claimed verification.

## Behavior and preservation

Settings GET returns `{consent, provider: 'imgge', providerName: 'IMG.GE', providerUrl: 'https://img.ge/'}`. Consent PUT requires JSON `{consent: boolean, provider: 'imgge'}` and rejects missing/stale provider. Old Catbox or missing-provider consent becomes null; old cached URLs are ignored while original URL/hash and unknown cache/root fields remain preserved. Reading never rewrites the disk. New cache entries merge by stable app identity and persist via the existing atomic writer only after upload/direct PNG validation.

Upload POST accepts only `{executable}`. It requires current consent, an exact normalized running/installed identity (saved mapping is a fallback), and a trusted catalog PNG; caller PNG/URL/extra fields, unknown paths and invalid local PNGs are rejected. It queues work and returns HTTP 202 `{ok:true}` without saving a Scene draft or pairing or publishing draft presence. Existing saved automatic mappings may upload after consent; explicit-art Scenes never export mapped icons automatically. Pack icons retain priority. One operation is active per app identity; failed SHA is retained across reads/automatic pairing, and the explicit click clears only that SHA for retry. Consent revocation/shutdown abort late writes; shutdown drains the work.

## Verification

- Initial focused run: **12 passed, 0 failed**.
- Expanded icon/P3 HTTP run: **21 passed, 0 failed**.
- Final focused compatibility run: `node --test scripts/tests/app-icon-hosting.test.mjs scripts/tests/studio-p3-endpoints.test.mjs scripts/tests/studio-p2-endpoints.test.mjs` — **31 passed, 0 failed, 0 skipped**.
- Initial `npm test`: **374 passed, 1 failed** out of 375. The P2 catalog test exposed an extra empty icon field and an unnecessary consent state for an app with no valid PNG. Fixed catalog metadata preservation/no-PNG status; the compatibility test passes unchanged.
- Final `npm test`: **375 passed, 0 failed, 0 skipped**; observed duration 12551.8905 ms. Fake adapters only; no real Discord RPC, owner profile, Start Menu scans or owner image uploads.
- `git diff --check`: passed (only normal repository LF/CRLF notices).

Covered boundaries include failed host/session, non-PNG MIME, changed/oversized GET bytes, redirect rejection, restricted returned URLs/SSRF, malformed PNG, provider migration/raw extensions, cache-write failure, explicit retry/coalescing, disabled uploader, origin/JSON/request guards, exact identity/installed fallback behind iconless running metadata, draft upload without config writes, automatic explicit-art exclusion, revoke and shutdown drain.

## Remaining gates and limits

Actual Discord rendering is **unverified** and requires the coordinator/owner gate; fake RPC assertions only prove the outgoing payload. The provider advertises no autodeletion for the selected option, but its future availability/retention cannot be guaranteed by a point-in-time test. Anonymous website form/schema changes or provider outages fail closed as failed uploads with explicit retry; there is no background retry polling. No commits, pushes, release, deployment, real owner-profile access or real Discord activity were performed. All test servers were stopped through fixture teardown.
