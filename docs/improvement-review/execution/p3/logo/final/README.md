# Ghost final — direction 1 + eye sparkle (bolt removed)

Base: `ghost-v2/ghost-v2-1` — same tile, gradient, ghost, round eye, wink, small smile. Bolt badge removed; the ghost is re-centred in the tile (scale .9) now that the badge is gone. Concept only. `build.mjs` regenerates every file here.

- **a · catch-light dot** (`ghost-final-a.svg`, `-a-tray.svg`) — one white dot in the eye; calmest. Tray: sparkle drops out cleanly (sub-pixel at 16 px) → plain direction-1 face.
- **b · star glint on the eye edge** (`ghost-final-b.svg`, `-b-tray.svg`) — white 4-point star with thin ink outline straddling the eye's upper-right edge. Tray: star is cut out of the silhouette, merged with the eye hole (eye reads as a twinkling notch).
- **c · catch-light + tiny star outside** (`ghost-final-c.svg`, `-c-tray.svg`) — dot in the eye plus a small ink star just above-right of it. Tray: dot dropped, star kept as a separate cut-out.

- **d · catch-light + wink sparkle — OWNER'S CHOICE** (`ghost-final-d.svg`, `-d-tray.svg`) — treatment c with the tiny ink star moved from beside the open eye to just outside the outer end of the winking arc, slightly above it (anime wink ✨); catch-light dot, smile, tile and gradient unchanged. Tray: the star is a cut-out beside the wink; at 24 px it shows as a small notch/star, at 16 px it is ~1.5 px and effectively drops to a barely-there notch — the silhouette stays clean either way (judged from the 1:1 sheet screenshot, not magnified).

Earlier recommendation (before the owner's pick): **c** — the clearest "วิ๊ง ✨" at 48/32 px and the star stays visible on the white face, while the eye stays a clean round dot; **a** is the safest fallback if the owner wants zero extra shapes. **b** is the most compact but its star blurs into the eye at ≤32 px.

Verification: own Orca tab on `final-sheet.html`; JPEG screenshots (PNG capture failed with `runtime_unavailable`) each viewed: `shot-1-icons.jpg` (256→200/48/32/16 + tray), `shot-4-with-d.jpg` (app-icon + tray rows incl. d, 6 columns, 256 px column shown at 160), `shot-2-tray.jpg` (tray 16/24 light+dark, in-app "Vibe Studio" light/dark).
Not verified: real Windows tray at 100/125/150 % DPI; a 96 px magnified-tray check was dropped (page would not reload in the tab). The 256 px column is rendered at 200 px to fit five columns. CURRENT is recreated from the existing SVGs. Sparkle at 16 px app icon is below legibility in all three (expected).
