# Nori refinement (P3-L2) — concepts only

Owner chose D3 Nori. Files here (nothing outside this folder was touched): per variation a 64×64 master `nori-N-*.svg` and a single-colour `nori-N-*-tray.svg` (`currentColor`, transparent), plus `nori-sheet.html` (self-contained, no fonts/network) and screenshots `nori-sheet-1.png` (original D3 + Nori 1, tops of 2/3) and `nori-sheet-2.png` (all Nori 2/3 rows), taken from the sheet in an Orca browser tab and viewed (verified).

## What changed vs D3
- **Headphones removed** (they said "music app"). Nori keeps the round plum body, ring-eyes, smile and the warm tile.
- **Tile**: still orange→coral, but the pink end is pulled from `#F0467A` to `#EF5B6E` so it is a warm coral, not magenta. Next to Studio's tokens (warm `#FAF8F5` ground, `#1F1F1F` ink, indigo `#4F46E5`) it sits as a warm complement and does not compete with the indigo accent; no blurple, no Spotify green. Studio is not re-themed.
- Palette: tile `#FFA45E→#EF5B6E`, body `#2A1B33`, cream `#FFF6EA`, signal yellow `#FFD25C`.

## Variations
1. **Status dot** (`nori-1-status*`) — a yellow "live" dot with cream ring sits on Nori's shoulder, like a presence indicator on an avatar. Simplest; survives 16 px best (a knocked-out dot beside a face blob). Risk: reads as a generic notification/online badge; the master is off-centre by design.
2. **Antenna signal** (`nori-2-signal*`) — a short antenna with a yellow tip and two signal arcs: "broadcasting my status". Strongest "presence/vibe switching" story and a distinctive silhouette. Risks: at 16 px the arcs thin out (tray arcs were thickened), and a round body with a stalk can read as a bomb/fuse or a bug; keep the arcs and cream tip.
3. **Scene card** (`nori-3-scene*`) — Nori becomes a squircle "scene card" winking, with a second yellow card behind (the other Scene). Ties to the Scene concept and the expression change adds personality. Risks: heaviest, least like the original, tray reads as two overlapping blobs (the wink is lost below 24 px).

## Legibility (verified on the sheet, light #F3F3F3 and dark #202020 strips)
- 48/32 px masters: face, eyes and the added motif are readable in all three.
- 24 px tray: all three read; 1 and 2 clearly, 3 as a blob pair with a wink.
- 16 px tray: the face is a dotted blob in all, as expected; motif reads in 1 (dot) and 2 (stalk + tip, arcs faint), 3 only as double shape. The 16 px master tile is reduced to colour + dark blob + a speck — adequate as an app icon, not for detail. Tray SVGs use mask cut-outs, so they work on any taskbar colour via `currentColor`.
- Not checked: real Windows ICO rasterisation by `build-icons.mjs` (pure-Node rasteriser would need masks/arcs support — out of scope), Windows hinting/DPI scaling.

## Fit with Scene artwork (`public/art`, looked at hinata/chill-poster.png, gaming-poster.png, apps/code.svg, chat.svg, avatar-1.svg)
- Colour: fits well. Hinata art is saturated orange (hair) on teal/blue; Nori's orange-coral tile echoes the orange, and the plum body is dark enough to sit with the blue app tiles (`#1b2740`).
- Style: **does not match closely.** The Scene art is detailed pixel-art anime; the app glyphs are flat navy tiles with light-blue line icons; Nori is a flat, smooth mascot. It will sit well as a brand mark and empty-state character, but will look like a different hand if placed inside Scene art. Not a problem for an icon; do not put Nori into Scene artwork without a pixel-style variant.

## Recommendation
**Nori 2 (Antenna signal)** for the brand: it says "presence/status" without implying music, keeps the character, and has the most distinctive silhouette. If testing at real tray size shows the antenna reads as a bomb/bug, fall back to **Nori 1** (cleanest at 16 px; dot is a familiar status cue). Nori 3 is the most on-concept for Scenes but too heavy for the tray; keep it as an empty-state/illustration pose rather than the app icon.
