# Approved CI art — Court idle

Approved by the owner on 2026-09-06. This decision supersedes earlier unresolved character appearance directions in FINAL-PLAN-DRAFT.md and human-chibi-direction.md.

## Default artwork

Hinata portrait v2 is the approved temporary default. Files: public/art/hinata/idle.gif and poster.png. The GIF is 512px, six exposures, 2.02 seconds. Preserve the larger face-and-chest crop, expressive open eyes, orange hair, white shirt, fists-up athletic energy, teal gym/net background and deliberate chunky pixel clusters. Do not independently redesign the face, oversimplify it into a blank expression, or return to the newsboy character.

Keep character identity separate from mood/outfit/animation in future asset families. Only this look is available now; do not show invented mood variants as available. Generated raster art assembled by code, not SVG-authored or original franchise character design.

## Studio design tokens

Court navy #101e31, panel blue #203b55, hair orange #ffad50, net teal #73d7df, shirt white #f5f7f4, secondary text #b1c4d3. Segoe UI Variable / Segoe UI for readable Thai and English; oversized compact heading, readable form text. Keep pixel styling in artwork, not body text.

Layout: scene library | character stage above editor | Discord preview and runtime. Left-aligned text; portrait is the single focal point. Controls respond in 140ms without repeated celebratory effects. Respect reduced motion and use the poster when the tab is hidden. Existing GIPHY motion is not covered by the bundled-art toggle.

## Delivery boundary

New configurations use builtin:hinata-idle. Existing configured image URLs remain unchanged. Owners can choose either bundled look from the editor. Local Studio serves only the two allowlisted images; no arbitrary file route.

Discord cannot fetch local files. The runtime resolves bundled art against the published immutable base URL in `scripts/character-art.mjs`; `PRESENCE_ART_BASE_URL` can override it with another public HTTPS directory containing `hinata/idle.gif` and `hinata/poster.png`, or a scene can use another hosted image URL. Without a public base the companion refuses bundled-art publication with an actionable error, rather than claim success or send a local asset key. The default GIF endpoint returned HTTP 200 with `image/gif` during this update; rendering in a separate Discord viewer/client remains unverified.
