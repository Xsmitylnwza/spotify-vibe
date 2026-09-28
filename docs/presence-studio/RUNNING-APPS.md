# Running apps and badges — 2026-09-06

Owner superseded the foreground-only rule: a mapped application keeps its Presence while running, including minimized/background processes whose executable path is readable. Latest stable foreground use among currently running enabled mappings wins; mapping order breaks ties before any recent use. Closing the winner falls back to another running mapping; closing all clears activity. Manual pin and pause retain precedence.

Character remains the preset's large image. Codex and Discord now receive their extracted, publicly hosted app icons as the small image, with the app name as hover text. This is applied to the outgoing activity without changing the shared preset. Other apps retain their preset's small image until a public icon is available; arbitrary local icons cannot be fetched by Discord. No automatic upload of arbitrary future app icons is implemented.

43 tests passed; published Codex/Discord PNG URLs return HTTP 200. Previous foreground-only documentation is superseded. Closing a window while its process remains in the tray counts as still running.
