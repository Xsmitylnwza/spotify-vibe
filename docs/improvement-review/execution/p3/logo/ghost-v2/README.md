# Ghost v2 (P3-L4) — clean redesign from variation B

Concept only; nothing outside this folder touched. Kept from B: indigo gradient tile + light glow, rounded square (r=15), white ghost with rounded head + zigzag hem
(3 tips, symmetric, optically centred), cheeky wink. Fixed: bolt no longer crosses/collides with the face; max 3 interior marks; one round-join corner treatment; hem unchanged (3 tips).

Files: `ghost-v2-{1..4}.svg` (64×64 master), `ghost-v2-{1..4}-tray.svg` (single colour `currentColor`, no tile), `ghost-v2-sheet.html`, `build.mjs` (regenerates all), `shot-*.png` (verified).

1. **Face only + bolt badge** — dot eye + wink + tiny smile (3 marks), ghost shrunk/shifted, white bolt as a badge in the tile's top-right corner (tray: solid bolt beside ghost).
2. **Bolt as negative space** — two dot eyes + bolt cut out of the head's top-right (tile shows through); no overlap with eyes; no mouth.
3. **Minimal wink** — dot eye + wink only; no bolt, no mouth; identity from silhouette + gradient.
4. **Balanced** — dot eye + wink (2 marks) with a slightly larger ghost and a small white bolt badge in the tile corner; no smile.

Tray: knock-out marks only (no smile), ghost scaled 1.3×, wink stroke ≈ 6 units (1.5 px at 16 px), eye Ø ≥ 9 units; badge bolt in 1 and 4 is solid.

## Recommendation
**Direction 4** — cleanest face that still carries the "vibe" bolt, and the bolt is removed from the ghost so the 16 px tray is just ghost + eye + wink. Direction 3 is the safest fallback if the badge bolt is judged too small in the tray; direction 1 if the smile (more personality) is wanted. Direction 2 is the most "designed" but its eyes/bolt become specks at 16 px.

## Verification
Screenshots via own Orca browser tab, each PNG viewed: `shot-1-icons.png` (256/48/32/16, CURRENT/B/1–4), `shot-2-tray.png` (tray 16/24, light+dark, 100 % zoom), `shot-3-brand.png` (tinted chip + full tile with "Vibe Studio", light/dark).
Caveats: sheet sections were captured one at a time (the CLI screenshot is viewport-only; page scrolling returned blank frames); icon-section shot is at 62 % zoom to fit. CURRENT is recreated from the existing SVG (gradient approximated). Real Windows tray at 100/125/150 % DPI not tested. Master-icon smile/wink strokes (2.6–3 units) are thinner than the 1.5 px@16 px rule — that rule is met by the tray variants, which are what render at 16 px.
