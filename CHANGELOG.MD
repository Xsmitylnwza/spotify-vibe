# Changelog

Changes are listed newest first. Historical entries were reconstructed from Git
commit history and published GitHub releases. Dates below use UTC publication
dates; versions without a separate release are explicitly marked.

## [1.0.26] - 2026-10-05

### Fixed
- Preserve each running app's elapsed timer when Windows app detection restarts; wait for a completed scan before treating an empty catalog as closed apps.
- Release cached app names and icons when their executables stop running.
- Clear app session state during shutdown and ignore late detection callbacks so they cannot retain snapshots or create new timers.

## [1.0.25] - 2026-10-04

### Fixed
- Restore the main image picker home with App icon, built-in art, GIF search and public image links, including avatar and recent image choices.
- Explicit custom images override the default app logo after Done; choosing App icon restores app-logo priority and the Vibe Studio fallback.
- Keep image selection as a draft until Done, preserve the chosen mode across reloads, and prevent live status from replacing a custom-image preview.
- Preserve legacy stored artwork without silently reactivating images ignored by the previous release.

## [1.0.24] - 2026-10-04

### Changed
- The main Discord status image always uses the selected paired app's public logo, even when its Scene previously selected other artwork.
- Use the Vibe Studio ghost logo when an app logo is unavailable; automatic small icons use the same fallback.
- Align Studio previews and the image editor with app-logo priority while preserving saved Scene artwork and explicit small images.

### Fixed
- Upload completion updates an app's main logo without restarting its elapsed timer, including Scenes that previously had custom main artwork.

## [1.0.23] - 2026-10-04

### Added
- Upload icon and Retry upload controls for apps without a public icon in both large and small image pickers.
- Anonymous IMG.GE icon hosting, with public PNG MIME and exact-byte verification before caching the URL.

### Fixed
- Restore icon uploads with explicit provider consent instead of hiding the upload flow. Changing hosts requires fresh consent; old catbox cached icons are not reused.
- Upload only trusted local catalog icons, including installed-icon fallback for running apps with no extracted icon. Uploading a selected icon does not save Scene drafts.
- Keep uploads single flight per app and retry failures only on an explicit retry action; preserve owner cache extensions.
- Reload the permission disclosure when the provider changes or consent is revoked, without silently granting permission.
- Use the truthful Public icon ready status for verified hosted PNGs; actual Discord image-proxy rendering remains a separate verification step.

## [1.0.22] - 2026-10-04

### Changed
- Scene editing keeps a separate draft until Done saves the Scene and edited app pairings together.
- Removed Pin/manual override controls, commands, and runtime behavior; legacy owner data remains inert.

### Fixed
- Switching between running apps preserves each app's elapsed timer, starting from its first successful detection. Observed closure and reopening begin a new timer.
- Scene save failures and stale-data conflicts preserve the draft; closing a dirty editor asks before discarding.
- Scene deletion and Undo save Scenes and all enabled/disabled pairings together; explicit Undo restores owner extension fields from a short-lived server snapshot and refuses stale restores.
- Prevent silent update installation while an editor is open, and prevent quitting during a save. Quitting with unsaved changes requires an explicit discard decision.
- Preview buttons open valid HTTPS links. Buttons must have both a label and a valid HTTPS URL before saving.
- Explained that Discord hides Rich Presence buttons on the activity owner's own profile; viewers must check from another account.
- Keep older configs containing a button without a URL readable during upgrade; new Scene saves require a valid URL instead of resetting the owner's document.
- Drain aborted background icon uploads/cache writes during bounded shutdown before releasing the profile.

## [1.0.21] - 2026-10-04

### Added
- This changelog, covering every version from 1.0.0 onward.
- An `AGENTS.md` rule requiring a matching changelog entry before every release.

## [1.0.20] - 2026-10-04

### Added
- Orca's icon to the public app icon pack.

### Fixed
- Disabled the default catbox upload path after Discord displayed uploaded icons as a white question mark.
- Hide upload consent controls when no working uploader is available; apps outside the public pack omit the small icon instead of publishing a broken image.

## [1.0.19] - 2026-10-04

### Fixed
- A pinned Scene now uses its running paired app for `{app}` and its app icon.

## [1.0.18] - 2026-10-04

### Fixed
- Windows login startup opens the companion in the background tray instead of showing the Studio window.

## [1.0.17] - 2026-10-04

### Added
- Hourly update checks, background downloads, and silent installation when Studio is hidden or quitting, with relaunch into the tray.
- `{app}`, `{scene}`, and `{user}` text variables, insert controls, and resolved previews while preserving the original templates.
- Consent-based icon uploads for paired apps outside the public pack, with a hash-checked atomic cache and upload status. The default upload host was subsequently disabled in 1.0.20.
- A startup skeleton in the saved theme and a sidebar update card.

### Fixed
- Preserved the paired app icon as the default small image while keeping explicitly selected images.
- Aligned preview fallback text and activity names with server output.

## [1.0.16] - 2026-10-04

### Fixed
- Packaged Windows builds now load app-detection PowerShell helpers from `app.asar.unpacked`.
- Deleting a Scene no longer fails because legacy time slots reference it; legacy data remains on disk and the affected slots are disabled.
- Clear pins to deleted Scenes and keep the frameless desktop sidebar at full window height.

## [1.0.15] - 2026-10-04

### Added
- The approved Studio redesign: Discord account sidebar, simplified Now switch and preview, Scene list toggles, in-editor app pairing, sticky preview, image picker, and Settings.
- A shared reconnect endpoint and public icon URLs on running/installed app responses.
- Per-Scene enabled state for app selection; explicit pins still take precedence.
- Bundled IBM Plex fonts for consistent rendering without remote font loading.

## [1.0.14] - 2026-10-03

### Added
- Optional SignPath installer signing in the release workflow, including signature verification and regenerated updater metadata. Signing remains dependent on repository configuration and signing approval.

## [1.0.13] - 2026-10-03

### Fixed
- Native upgrade verification installs the baseline into a product-named folder.

## [1.0.12] - 2026-10-03

### Fixed
- Native upgrade verification treats the CDP bridge as ready only after a privileged IPC request succeeds.

## [1.0.11] - 2026-10-03

### Fixed
- Normalize Windows ProductVersion when identifying the relaunched process in native upgrade verification.

## [1.0.10] - 2026-10-03

### Fixed
- Compare Windows ProductVersion (`x.y.z.0`) with the release version correctly in native upgrade verification.

## [1.0.9] - 2026-10-03

### Changed
- Applied the selected ghost logo (option 09).

### Fixed
- Locate uploaded draft releases through the authenticated release list before publication.
- Pin the Windows PowerShell 5.1 host for native upgrade verification.

## [1.0.8] - 2026-10-03

### Added
- Public app icon pack with exact identity matching and pack/upload/default resolution.
- Connected Discord user identity in the local state API.
- Explicit updater states, matching package/lock/tag validation, candidate build retention, and verified Windows release publication from main.
- Native Windows upgrade verification and retained per-release evidence.

### Changed
- Reduced app detector work with change-only snapshots and background bulk scans.

### Fixed
- Fail-safe config persistence and bounded request bodies.
- Desktop listener ownership, IPC guards, and bounded shutdown.
- Reset the autosave timer reliably after completion.
- Prepare release versions before installing dependencies.

## [1.0.7] - 2026-10-01

### Added
- Paired app icons on Scene list rows and app binding inside Scene details.
- UI motion refinements, a save indicator, Discord-style preview, and field help.

### Fixed
- Refresh the app-pairing Scene dropdown after saving a Scene.

## [1.0.6] - 2026-10-01 (source version; no separate GitHub Release)

### Added
- Installed-app catalog in the app picker, with icon tiles and search.
- Included in the subsequent 1.0.7 public release.

## [1.0.5] - 2026-10-01 (source version; no separate GitHub Release)

### Added
- Custom confirmation modal and frameless window controls.
- Included in the subsequent 1.0.7 public release.

## [1.0.4] - 2026-10-01

### Changed
- Reworked the Scene journey and unified artwork selection.
- Removed time-based features from the active UI in favor of app-based presence.

### Fixed
- GIF selection and artwork behavior.

## [1.0.3] - 2026-09-30

### Changed
- Removed the top navbar for the sidebar layout.

### Fixed
- Visible feedback for update checks.

## [1.0.2] - 2026-09-30

### Changed
- Redesigned Scenes as a master-detail interface.

### Fixed
- GIF artwork behavior.

## [1.0.1] - 2026-09-30

### Added
- Scene tile artwork and Discord previews, sidebar/disclosure motion, and a merged Scene editor.
- Windows release CI with explicitly controlled artifact publication.

### Fixed
- Installer artifact names match updater metadata; removed the default Electron menu.
- Settings wording, new Scene defaults, artwork warnings, and QA findings including data-loss cases.
- Cross-platform test invocation on Windows.

## [1.0.0] - 2026-09-30

### Added
- First desktop release of Vibe Studio with Electron, tray operation, startup integration, and in-app updates.
- Local Discord Rich Presence companion, app pairing, Scene editing, artwork/GIF selection, and local API key setup.
- Thai/English language support, light/dark themes, IBM Plex typography, and ghost branding.

### Fixed
- Packaged updater dependency loading, updater ESM import, and shutdown behavior before the first desktop release.
