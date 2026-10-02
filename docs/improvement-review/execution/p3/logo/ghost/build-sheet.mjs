import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const raw = (f) => readFileSync(join(dir, f), 'utf8').replace(/<\?xml.*?\?>/, '').trim();
// scope ids per instance so gradients/masks never collide
let n = 0;
const inst = (svg, cls = '') => { const p = 'i' + (n++) + '-';
  return svg.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace('<svg ', `<svg class="${cls}" aria-hidden="true" `); };
const currentMaster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6B7BF7"/><stop offset="1" stop-color="#4651C4"/></linearGradient>
<mask id="m"><rect width="64" height="64" fill="#fff"/><path d="M22 27l8 1.5-1.5 7-8-1.5Z" fill="#000"/><path d="M39 30Q43 33.5 47 29.5" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M25 38.5Q32.5 44 40 37" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30.5 13l4.5 0-2.5 5.5 4 0-6.5 8.5 2-6-4 0Z" fill="#000"/></mask></defs>
<rect width="64" height="64" rx="15" fill="url(#bg)"/><path d="M32 10C21 10 14 20 14 31V44l9-6 9 6 9-6 9 6V31C50 20 43 10 32 10Z" fill="#F8F7F4" mask="url(#m)"/></svg>`;
const currentTray = raw('../../../../../../electron/assets/logo-ghost.svg');
const V = [
  ['CURRENT', currentMaster, currentTray, 'current'],
  ['A', raw('ghost-a.svg'), raw('ghost-a-tray.svg'), 'a'],
  ['B', raw('ghost-b.svg'), raw('ghost-b-tray.svg'), 'b'],
  ['C', raw('ghost-c.svg'), raw('ghost-c-tray.svg'), 'c'],
];
const sizes = [256, 48, 32, 16];
const row = (title, f) => `<section><h2>${title}</h2><div class="grid">${V.map(v => `<div class="cell"><div class="lbl">${v[0]}</div>${f(v)}</div>`).join('')}</div></section>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ghost logo refinement — CURRENT vs A/B/C</title>
<style>
:root{--bg:#f4f5fb;--ink:#1b1d3a;--mut:#6a6e92;--card:#fff;--line:#dfe1f2;--acc:#5865F2}
*{box-sizing:border-box}body{margin:0;padding:28px;background:var(--bg);color:var(--ink);font:14px/1.45 "Segoe UI",system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.sub{color:var(--mut);margin:0 0 22px}
h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:26px 0 10px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.cell{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:12px;min-height:60px}
.lbl{font-weight:700;font-size:12px;color:var(--mut);align-self:flex-start}
.s256{width:256px;height:256px}.s48{width:48px;height:48px}.s32{width:32px;height:32px}.s16{width:16px;height:16px}.s24{width:24px;height:24px}
.sizes{display:flex;align-items:flex-end;gap:16px}
.strip{width:100%;border-radius:10px;padding:12px;display:flex;gap:18px;align-items:center;justify-content:center}
.light{background:#f3f3f5;color:#1f1f24}.dark{background:#202127;color:#e9e9ee}
.strip.tb{border:1px solid rgba(128,128,128,.25)}
.brand{width:100%;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px}
.brand.light{background:#fff;color:#1b1d3a;border:1px solid var(--line)}.brand.dark{background:#17182c;color:#ecedff}
.mark{width:34px;height:34px;flex:0 0 34px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.mark svg{width:24px;height:24px;display:block}
.light .mark{background:#eceeff;border:1px solid #cfd3ff;color:#4651C4}.dark .mark{background:#262a5c;border:1px solid #3c4290;color:#aeb6ff}
.mark.full{background:none;border:0;width:34px;height:34px}.mark.full svg{width:34px;height:34px}
.bn{font-weight:600;font-size:14px;line-height:1.3;display:block}.bs{font-size:12px;opacity:.65;display:block}
.note{font-size:12px;color:var(--mut)}
</style></head><body>
<h1>Ghost logo refinement — polish of the ORIGINAL</h1>
<p class="sub">CURRENT = recreated from electron/assets/logo-ghost.svg + icon.png. A minimal tidy-up · B moderate refinement · C bolder polish. Concept only.</p>
${row('App icon — 256 / 48 / 32 / 16 px', v => `<div class="sizes">${inst(v[1], 's256')}</div><div class="sizes">${[48, 32, 16].map(s => inst(v[1], 's' + s)).join('')}</div>`)}
${row('Tray — single colour, 24 / 16 px (light + dark strips)', v => ['light', 'dark'].map(m => `<div class="strip tb ${m}">${inst(v[2], 's24')}${inst(v[2], 's16')}${inst(v[2], 's48')}</div>`).join(''))}
${row('In-app brand mark (sidebar, tinted chip 24px glyph)', v => ['light', 'dark'].map(m => `<div class="brand ${m}"><span class="mark">${inst(v[2], '')}</span><span><span class="bn">Vibe Studio</span><span class="bs">มุม Discord ของคุณ</span></span></div>`).join(''))}
${row('In-app brand mark (full-colour tile, 34px)', v => ['light', 'dark'].map(m => `<div class="brand ${m}"><span class="mark full">${inst(v[1], '')}</span><span><span class="bn">Vibe Studio</span><span class="bs">มุม Discord ของคุณ</span></span></div>`).join(''))}
</body></html>`;
writeFileSync(join(dir, 'ghost-sheet.html'), html);
