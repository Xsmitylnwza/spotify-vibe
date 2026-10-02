# Ghost logo refinement (P3-L3) — polish of the ORIGINAL

Concept only. Nothing outside this folder was touched. Source of truth for "current":
`electron/assets/logo-ghost.svg` + `icon.png` (white ghost, bolt, square eye, wink, smile, indigo gradient tile).

Files: `ghost-{a,b,c}.svg` (64×64 master, tile + ghost), `ghost-{a,b,c}-tray.svg` (single colour, `currentColor`,
no tile), `ghost-sheet.html` (CURRENT vs A/B/C), `build.mjs` / `build-sheet.mjs` (regenerate), `shot-*.png` (verified screenshots).

## Shared fixes (all variations)
- Same silhouette family: dome + three-point scalloped hem, now **symmetric** (hem points at x=13.5/32/50.5, valleys 22.75/41.25) and centred in the tile
  (ghost spans y 11–52 → optical centre ≈ 31.5, was top-heavy at 10–44 with the hem crowded by the smile).
- **One corner radius**: hem tips/corners are rounded by a round-join stroke of the same colour instead of razor points.
- Smile moved up and shortened so it no longer collides with the hem (the "mouth + hem" noise in the current icon).
- Bolt re-drawn with cleaner proportions, kept on the forehead; the open eye and wink share the same stroke weight and tilt (-9°, matching the bolt slant).
- Square eye no longer a hard rotated square (reads as a glitch) — replaced by a soft eye; wink stays (cheeky personality kept).
- Tray variants: knock-out (mask) of bolt + eye + wink only, smile dropped, ghost scaled ~1.2× to fill the box, features thickened for 16/24 px.

## A — minimal tidy-up
Closest to today. Same warm white `#F8F7F4`, same vertical blurple (`#7483FA → #4650C6`). Eye is still a square idea but **rounded (r=1.5) and
tilted to match the bolt**, so it reads as an intentional "pixel eye". Thin ink details (stroke 0.8), hem radius light.

## B — moderate refinement
Round-ish open eye (ellipse) + wink = clear cheeky pair. Subtle diagonal gradient, soft top-left light glow on the tile, ghost with a faint white→lavender
vertical fill, slightly rounder hem. Slightly bolder bolt.

## C — bolder polish
Larger/heavier features (bolt, eye as soft squircle r=2.7, wink 3.2), richer 3-stop gradient with stronger glow, inner highlight ring on the tile,
soft drop shadow under the ghost and a small rim-light on the dome. Heaviest tray variant (rounder hem, thicker knock-outs) — best at 16 px.

## Verification (screenshots via own Orca browser tab)
- `shot-1-icons.png`: app icon 256/48/32/16, CURRENT vs A/B/C, first tray strips — viewed.
- `shot-2-tray-brand.png`: tray 24/16(/48) on light + dark strips, sidebar brand mark (tinted chip + full-colour tile) with "Vibe Studio" light/dark — viewed.
- Caveat: CURRENT in the sheet is recreated from the SVG (icon.png gradient approximated `#6B7BF7→#4651C4`); verified by eye against icon.png only.
- Not verified: actual Windows tray rendering at 100/125/150 % DPI (only browser downscale of the 64-unit SVG).

## Recommendation
A is the safest swap; B is the best balance (my pick for the owner: friendly, still clearly the same ghost); C is the most "app-store polished" but drifts furthest.
