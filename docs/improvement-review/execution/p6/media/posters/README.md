# Vibe Studio — cover posters (Task M-P)

All 1600x1000 (8:5) webp. Each `.html` is the editable source (open via any static server; styles/fonts/art are copied under `assets/`). Rebuild: `node _capture.mjs` (snapshots the real mockup components in DEMO mode with a mock identity — "Vibe Demo", `@vibe.demo`, generated avatar) → `node _build.mjs` → `node _render.mjs` (needs a static server; `_serve.mjs`, port 47460).

| File | What it shows |
| --- | --- |
| `p1.webp` (+`p1.html`) | **Desktop ↔ Discord** — stylised Windows desktop with a fictional Figma-like canvas in focus (taskbar icons from public/art/apps; "Fi" tile for Figma, no real brand logo), thin line with the ghost mark at its head into the Discord profile popout (dcCard) "Playing · Design". |
| `p2.webp` (+`p2.html`) | **Filmstrip** — three member-list rows as film frames: VS Code → Coding, Figma → Design, Spotify → Chill; app icons left, lines + scene chips to rows. |
| `p3.webp` (+`p3.html`) | **Studio hero** — the real Now page (status header + dark Discord stage with Profile and Member list) floating on the brand background, ghost mascot peeking over the window corner. |

Common: ghost logo + "Vibe Studio" wordmark + one-line tagline top-left; IBM Plex (Discord-like font only inside dcCard); "Fictional demo" label bottom-right (A33). No real Discord identity anywhere; scene artwork swapped for a neutral app icon. `_frag.json` = captured component HTML.

## P1 stronger variants (task M-P1b)
- `p1-a.html/.webp` (46 KB) — Focal Discord: tilted ~40%-width profile popout with glow, dimmed/blurred Figma desktop, luminous path with ghost riding it.
- `p1-b.html/.webp` (59 KB) — Diagonal before/after split, hot-pink accent, sweeping light trail + arrow across the seam.
- `p1-c.html/.webp` (64 KB) — Oversized "Your status follows your apps." headline with UI overlapping the type.
- Build/render: `_build_p1v.mjs` (generates the 3 html), `_render_p1v.mjs` (needs `_serve.mjs` on :47460). Real icons from `assets/apps` (figma.png, spotify.png added). Original `p1.webp` untouched.
