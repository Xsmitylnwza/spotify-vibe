# Changelog

Changes are listed newest first. Historical entries were reconstructed from Git
commit history and published GitHub releases. Dates below use UTC publication
dates; versions without a separate release are explicitly marked.

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
