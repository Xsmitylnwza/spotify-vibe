# V1 — "Switch apps → status follows" (hero clip)

9 s, 1600x1000, silent, seamless loop (the end state equals the start state). The sequence is scripted with exact timing in `stage.html`.

| t (s) | Event |
| --- | --- |
| 0–2.5 | VS Code focused. The card shows "Playing · Coding" with the VS Code icon. |
| 2.5–3.35 | Alt-Tab switcher appears and the highlight moves to Figma. |
| 3.35 | Switcher released and the Figma window comes forward. |
| 3.35–3.75 | The card cross-fades to "Playing · Design" with the Figma icon (0.4 s). |
| 4.5–5.9 | The cursor selects the "Get started" button in Figma. |
| 5.9–6.75 | Alt-Tab back to VS Code. |
| 6.75–7.15 | The card cross-fades back to "Coding". |
| 7.15–9 | Hold, then loop. |

No latency numbers are shown in the frame. The 0.4 s cross-fade is motion timing, not a measurement. The measured latency (0.26–0.54 s) is not stated in the clip.

Identity is fictional: "Vibe Demo", "@vibe.demo", and the mockup's generic `avatar-1.svg`. The frame carries a "Fictional demo" label and the caption "Switch apps — your Discord status follows". The Discord card reuses the mockup's `.dcp` classes (`mockup-extra.css`) and markup. The mockup source is not edited.

| File | Size | What it shows |
| --- | --- | --- |
| `v1-switch.mp4` | 447 KB | H.264, faststart, 30 fps |
| `v1-switch.webm` | 312 KB | VP9, 30 fps |
| `v1-switch.gif` | 727 KB | 640 px wide, 10 fps, 64-color palette |
| `v1-switch.poster.png` | 237 KB | Clean frame at Design state, taken 5.0 s into the loop |
| `stage.html` | 15 KB | Deterministic demo stage. `?t=N` renders a single frame. |
| `rec.cjs` | 1 KB | Playwright recorder. Serves the `spotify-vibe` root on port 47481 and records 19.5 s of video. |

ffmpeg re-encode: the 9 s segment is cut from the recording at `-ss 0.5`. The GIF is scaled to 640 px wide.
