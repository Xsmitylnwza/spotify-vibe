# Windows releases

The public updater and landing use retained GitHub Releases in `Xsmitylnwza/spotify-vibe`. Resolve the versioned `Vibe-Studio-Setup-X.Y.Z.exe` asset from the Releases API; there is no stable installer alias. `latest.yml` always retains its versioned installer URL, SHA512 and size.

## Automatic main and explicit tags

- A main push with a stable package version newer than every published stable release keeps that version. If package version is equal to or behind the newest published release, CI prepares the next patch of that release instead. It changes package.json and both package-lock version roots together in a local bot commit; it does not change dependency records.
- An unchanged already-published source SHA skips dependency installation, tests, build and release. Stale main events also skip. A version tag (`vX.Y.Z`) must exactly match package.json and both lock roots; malformed/prerelease versions are rejected.
- Main and tag runs share one repository-wide concurrency lock, without cancelling an active run. Duplicate published tag events skip. Historical tags may publish retained releases but cannot downgrade GitHub's latest release.
- A manual Actions dispatch and scheduled reconciliation at minute 17 and 47 of every hour check out latest main under the same lock. Already-published source skips installation/tests/build. This recovers main events dropped by concurrency coalescing; schedules can be delayed by GitHub, so immediate delivery is not guaranteed.
- CI runs `npm ci`, `npm test`, then `npm run dist:win` (`-p never`). After updater metadata validation it retains a workflow artifact, checks main has not advanced, and pushes the bot version commit without force. A newer source push wins; rejected pushes cannot publish.
- GitHub's normal GITHUB_TOKEN is used for bot commits/tags, so those writes do not trigger another push workflow. There is no PAT, automatic source rebase, force-push, or version edit in the developer checkout.
- A tag is created only for the verified build source. CI uploads exactly five assets to a draft, checks GitHub upload state, size and SHA256 against local bytes, rechecks the tag, and publishes the complete draft. Existing releases are never overwritten. Existing drafts or conflicting tags require operator recovery.

## Retained assets

Each new release contains exactly:

1. `Vibe-Studio-Setup-X.Y.Z.exe`
2. `Vibe-Studio-Setup-X.Y.Z.exe.blockmap`
3. `latest.yml`
4. `release-provenance.json`
5. `SHA256SUMS.txt`

Provenance records the full built source commit, triggering commit, package/lock versions, repository, workflow reference, run ID/attempt/URL, Node version/platform, timestamp and three updater artifact hashes. SHA256SUMS covers the installer, blockmap, feed and provenance (four entries; the checksum file cannot hash itself). Provenance is a CI build record, not a signed attestation. Windows code signing and an installed native upgrade remain **unverified** until separate real evidence exists.

## Failure and recovery limits

GitHub retains one running and one pending concurrency run; newer events can replace a pending event, including main/tag cross-replacement. Pushes coalesce to latest main source; scheduled/manual reconciliation recovers skipped main delivery. Never claim every intermediate commit is built, and Actions schedules may be delayed or disabled on inactive repositories. A stale build stops before publication when main advanced. Failed tests/builds do not push the version commit or create a release.

If publication fails after the bot commit is pushed, the original main event becomes stale. Inspect the retained Actions artifact and source/tag identity before recovery. An unpublished matching tag can be retriggered using its existing exact source; a conflicting tag must never be moved automatically. A partially uploaded draft requires an operator to verify/complete or remove that draft before retry; CI fails closed rather than overwriting it. A complete public release is immutable by policy even though GitHub repository settings currently allow mutation.

Repository Actions must permit contents write and main must allow the bot's fast-forward version commit. Protected-main environments need a separately approved persistence mechanism. Live GitHub execution, publication, Windows code signing, and installed upgrade behavior are not established by local tests.

## Existing v1.0.7 caveat

The inspected public release contains only installer, blockmap and latest.yml. Their downloaded SHA256 digests and updater SHA512/URL/size agree. Its annotated tag peels to `b241ccd5542b1f3e5ee348bd507cac051cafabda`; package.json is 1.0.7 but both lock roots are 1.0.1. It has no provenance/checksum assets and cannot satisfy the new source/lock agreement gate. Preserve that historical release; do not retrofit unverifiable build claims.
