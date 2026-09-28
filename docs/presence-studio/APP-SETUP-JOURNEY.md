# Application setup and preset editor

Owner direction, 2026-09-06: replace the behavioral/time-first journey with two distinct pages. Setup is app-first: choose recognizable app icons, select multiple apps, assign a shared preset, then save and activate. The preset editor is a separate page for Discord text, artwork and links. Existing approved Hinata CI remains.

## Delivered

- `#setup` is the default page; `#presets` opens the existing editor and Discord preview. Legacy editor anchors still work.
- Visible Windows applications are collected by a hidden companion helper every 1.5 seconds. It reads executable paths, process names and extracted file icons, not window titles or browser tabs. Icon extraction is cached per executable.
- Codex Windows package is identified as Codex even though its executable is ChatGPT.exe. Shared ApplicationFrameHost is excluded because it is not a reliable app identity. Unreadable/protected paths are omitted; manual full executable paths remain available. This does not enumerate every installed app.
- Multiple selected app tiles can share one preset. Reassigning existing mappings updates them. Each mapping can be disabled, changed or removed. Selection feedback uses lift/press/check transitions; assigning uses a short settle animation. Reduced motion skips these effects.
- Mapping drafts stay separate from active mappings until Save and activate. Preset editing still uses the prior autosave behavior; a complete preset draft/apply redesign remains pending.
- Schema v2 retains scenes, time slots and settings. Existing v1 configs remain on schedule mode until the owner activates apps; a v1 file backup is attempted on migration. New configs use app mode. A mapping to a deleted preset is rejected.
- App mode uses the foreground executable after 1.5 seconds of stable observations (normally 1.5–3 seconds in practice). Unmapped foreground apps clear this companion's activity. Manual pin wins for one hour; saving mappings cancels pin and resumes Auto. No browsing-site detection.
- Activity start time is retained for same-key edits. A recoverable write queue permits retry after failed persistence. Queued stale app updates are skipped before RPC submission.

## Validation

38 Node tests passed, including selection, debounce, path identity, disabled/unmapped behavior, config roundtrip and API restart persistence. Playwright checked real local discovery (9 applications with extracted icons), Codex + Discord multi-select, shared-preset assignment, save/reload, both pages, no page errors, and 768px overflow. Art and fields remain accessible in the preset page.

Preview was previously run with separate test configuration. Real Discord rendering in a separate viewer/client is not verified. The bundled public artwork base is configured by default and can be overridden with `PRESENCE_ART_BASE_URL`; Discord still requires a valid Application ID. Store app version updates can change executable paths; affected mappings need reassignment. Foreground policy was chosen as the implementation default, not a recorded owner answer to the older open question.
