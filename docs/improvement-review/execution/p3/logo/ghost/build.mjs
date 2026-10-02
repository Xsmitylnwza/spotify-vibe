// Generates the 3 variations (master + tray). Run: node build.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));

// Ghost silhouette: same dome + 3-point scalloped hem as today, symmetric, rounded via round-join stroke.
const body = 'M32 11C21.4 11 13.5 19.4 13.5 31V51.5L22.75 44.5 32 51.5 41.25 44.5 50.5 51.5V31C50.5 19.4 42.6 11 32 11Z';
const bolt = { A: 'M33.6 14.2 27.6 22.9H31.3L29.7 29.2 36.4 20.2H32.6Z',
               B: 'M33.9 13.6 27.3 23.2H31.2L29.4 29.8 36.8 19.8H32.7Z',
               C: 'M34.3 13 26.8 23.4H31L29 30.4 37.4 19.4H32.9Z' };
// left (open) eye per variation, wink arc, smile
const eye = {
  A: '<rect x="20.5" y="30.5" width="6" height="6" rx="1.5" transform="rotate(-9 23.5 33.5)"/>',
  B: '<ellipse cx="23.5" cy="33.6" rx="3.1" ry="3.5" transform="rotate(-9 23.5 33.6)"/>',
  C: '<rect x="20" y="30" width="7.4" height="7.4" rx="2.7" transform="rotate(-9 23.7 33.7)"/>' };
const wink = { A: 'M36.6 33.6Q40.6 37.2 44.6 33.2', B: 'M36.4 33.8Q40.5 37.6 44.8 33', C: 'M36.2 33.8Q40.5 37.8 44.9 32.9' };
const winkW = { A: 2.6, B: 2.8, C: 3.2 };
const smile = { A: 'M27 40Q31.5 43.2 36.5 39.6', B: 'M27.3 40Q31.7 43.3 36.7 39.6', C: 'M27.5 40.2Q31.8 43.4 36.8 39.7' };
const hemJoin = { A: 1.4, B: 2.2, C: 3 }; // round-join stroke = consistent corner radius
const inkW = { A: 0.8, B: 1.2, C: 1.6 };

const defs = {
A: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7483FA"/><stop offset="1" stop-color="#4650C6"/></linearGradient>`,
B: `<linearGradient id="bg" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#7C8BFF"/><stop offset="1" stop-color="#434DC2"/></linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.12" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7E8FB"/></linearGradient>`,
C: `<linearGradient id="bg" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#8794FF"/><stop offset=".55" stop-color="#5360E4"/><stop offset="1" stop-color="#3A42B2"/></linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.08" r="0.85"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F1F2FF"/><stop offset="1" stop-color="#D5D9FB"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#1C2160" flood-opacity=".38"/></filter>`
};
const ink = { A: '#4650C6', B: '#3F49B8', C: '#343DA8' };
const ghFill = { A: '#F8F7F4', B: 'url(#gh)', C: 'url(#gh)' };

function master(v) {
  const j = hemJoin[v];
  const g = (a) => a ? '' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>Vibe Studio ghost — variation ${v}</title>
  <defs>
    ${defs[v]}
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#bg)"/>
  ${v !== 'A' ? '<rect width="64" height="64" rx="15" fill="url(#glow)"/>' : ''}
  ${v === 'C' ? '<rect x=".6" y=".6" width="62.8" height="62.8" rx="14.4" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.2"/>' : ''}
  <path d="${body}" fill="${ghFill[v]}" stroke="${ghFill[v]}" stroke-width="${j}" stroke-linejoin="round"${v === 'C' ? ' filter="url(#sh)"' : ''}/>
  ${v === 'C' ? '<path d="M18.5 28C18.5 21 23 15.6 29 13.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>' : ''}
  <g fill="${ink[v]}" stroke="${ink[v]}" stroke-width="${inkW[v]}" stroke-linejoin="round">
    <path d="${bolt[v]}"/>
    ${eye[v]}
  </g>
  <g fill="none" stroke="${ink[v]}" stroke-linecap="round">
    <path d="${wink[v]}" stroke-width="${winkW[v]}"/>
    <path d="${smile[v]}" stroke-width="${v === 'A' ? 1.9 : 2.1}"/>
  </g>
</svg>
`;
}

// Tray: single colour (currentColor), no tile, no smile, heavier features, ghost fills the box.
const tr = { A: [1.2, 1.6], B: [1.22, 2.0], C: [1.24, 2.6] }; // [scale, silhouette round-join]
function tray(v) {
  const [s, j] = tr[v];
  const t = `translate(32 32) scale(${s}) translate(-32 -32.2)`;
  const extra = { A: 0.9, B: 1.2, C: 1.5 }[v];   // extra stroke on knockout shapes so 16px stays legible
  const ww = winkW[v] + { A: 0.9, B: 0.9, C: 0.8 }[v];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>Vibe Studio ghost tray — variation ${v}</title>
  <defs>
    <mask id="k${v}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
      <rect width="64" height="64" fill="#fff"/>
      <g transform="${t}" fill="#000" stroke="#000" stroke-width="${extra}" stroke-linejoin="round">
        <path d="${bolt[v]}"/>
        ${eye[v]}
        <path d="${wink[v]}" fill="none" stroke-width="${ww}" stroke-linecap="round"/>
      </g>
    </mask>
  </defs>
  <g mask="url(#k${v})"><path transform="${t}" d="${body}" fill="currentColor" stroke="currentColor" stroke-width="${j}" stroke-linejoin="round"/></g>
</svg>
`;
}
for (const v of ['A', 'B', 'C']) {
  writeFileSync(join(dir, `ghost-${v.toLowerCase()}.svg`), master(v));
  writeFileSync(join(dir, `ghost-${v.toLowerCase()}-tray.svg`), tray(v));
}
// CURRENT reference copies (verbatim from electron/assets, for the sheet only)
