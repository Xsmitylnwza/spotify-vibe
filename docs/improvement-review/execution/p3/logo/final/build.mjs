// Regenerates final/ SVGs + final-sheet.html. Run: node build.mjs  (concept only, no network)
import fs from 'node:fs';
const INK='#3F49B8';
const G='M32 11C21.4 11 13.5 19.4 13.5 31V51.5L22.75 44.5 32 51.5 41.25 44.5 50.5 51.5V31C50.5 19.4 42.6 11 32 11Z';
const star=(cx,cy,r,k=.3)=>{const i=r*k;return `M${cx} ${cy-r}L${cx+i} ${cy-i} ${cx+r} ${cy} ${cx+i} ${cy+i} ${cx} ${cy+r} ${cx-i} ${cy+i} ${cx-r} ${cy} ${cx-i} ${cy-i}Z`;};
const arc=(x1,x2,y,d,sw,c)=>`<path d="M${x1} ${y}Q${(x1+x2)/2} ${y+d} ${x2} ${y}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`;
const T={
 a:{name:'Catch-light dot',
   spark:`<circle cx="25.7" cy="28.8" r="1.1" fill="#fff" stroke="none"/>`,
   tray:''},
 b:{name:'Star glint on the eye edge',
   spark:`<path d="${star(26.5,27.9,3.6)}" fill="#fff" stroke="${INK}" stroke-width=".6"/>`,
   tray:`<path d="${star(26.8,27.6,4.6)}"/>`},
 c:{name:'Catch-light + tiny star outside the eye',
   spark:`<circle cx="25.5" cy="28.9" r="1" fill="#fff" stroke="none"/><path d="${star(30.2,24.6,2.6)}" fill="${INK}" stroke="${INK}" stroke-width=".5"/>`,
   tray:`<path d="${star(30.6,24.4,3.4)}"/>`},
};
const defs=`<linearGradient id="bg" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#7C8BFF"/><stop offset="1" stop-color="#434DC2"/></linearGradient>
<radialGradient id="gl" cx="0.3" cy="0.12" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7E8FB"/></linearGradient>`;
const master=k=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Vibe Studio ghost final — ${k}: ${T[k].name}</title><defs>${defs}</defs><rect width="64" height="64" rx="15" fill="url(#bg)"/><rect width="64" height="64" rx="15" fill="url(#gl)"/><g transform="translate(32 33) scale(.9) translate(-32 -31.5)"><path d="${G}" fill="url(#gh)" stroke="url(#gh)" stroke-width="2.2" stroke-linejoin="round"/><g fill="${INK}" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"><circle cx="24.5" cy="30" r="3.2"/>${arc(35,44,30,4.5,3,INK)}${arc(28.5,35.5,39,3,2.6,INK)}${T[k].spark}</g></g></svg>`;
const tray=k=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Vibe Studio ghost tray final — ${k}: ${T[k].name}</title><defs><mask id="k" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><g transform="translate(32 33) scale(1.08) translate(-32 -31.5)" fill="#000" stroke="#000" stroke-width="1.2" stroke-linejoin="round"><circle cx="24.5" cy="30" r="3.6"/>${arc(35,44,30,5.5,4.8,'#000')}${T[k].tray}</g></mask></defs><g mask="url(#k)"><path transform="translate(32 33) scale(1.08) translate(-32 -31.5)" d="${G}" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></g></svg>`;
for(const k of Object.keys(T)){fs.writeFileSync(`ghost-final-${k}.svg`,master(k)+'\n');fs.writeFileSync(`ghost-final-${k}-tray.svg`,tray(k)+'\n');}
let uid=0;
const uniq=s=>{const p='u'+(uid++)+'-';return s.replace(/id="([^"]+)"/g,`id="${p}$1"`).replace(/url\(#([^)]+)\)/g,`url(#${p}$1)`).replace(/<title>.*?<\/title>/,'');};
const sv=(s,c)=>uniq(s).replace('<svg ',`<svg class="${c}" aria-hidden="true" `);
const rd=f=>fs.readFileSync('../'+f,'utf8');
const cur=rd('ghost/ghost-sheet.html').match(/<svg class="s256"[\s\S]*?<\/svg>/)[0].replace(/class="s256" aria-hidden="true" /,'');
const curTray=fs.readFileSync('../../../../../../electron/assets/logo-ghost.svg','utf8');
const items=[{k:'CURRENT',m:cur,t:curTray},{k:'ghost-v2-1 (bolt)',m:rd('ghost-v2/ghost-v2-1.svg'),t:rd('ghost-v2/ghost-v2-1-tray.svg')},
 ...Object.keys(T).map(k=>({k:`${k} · ${T[k].name}`,m:master(k),t:tray(k)}))];
const row=f=>items.map(f).join('');
const sheet=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ghost final — eye sparkle</title>
<style>
:root{--bg:#f4f5fb;--ink:#1b1d3a;--mut:#6a6e92;--card:#fff;--line:#dfe1f2}
*{box-sizing:border-box}body{margin:0;padding:24px;background:var(--bg);color:var(--ink);font:14px/1.45 "Segoe UI",system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.sub{color:var(--mut);margin:0 0 18px}
h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:24px 0 10px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.cell{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:12px;min-width:0}
.lbl{font-weight:700;font-size:12px;color:var(--mut);align-self:flex-start}
svg.s256{width:200px;height:200px}svg.s48{width:48px;height:48px}svg.s32{width:32px;height:32px}svg.s16{width:16px;height:16px}svg.s24{width:24px;height:24px}
.sizes{display:flex;align-items:flex-end;gap:18px}
.strip{width:100%;border-radius:10px;padding:12px;display:flex;gap:14px;align-items:center;justify-content:center}
.light{background:#f3f3f5;color:#1f1f24}.dark{background:#202127;color:#e9e9ee}
.brand{width:100%;border-radius:12px;padding:10px;display:flex;align-items:center;gap:8px}
.brand.light{background:#fff;color:#1b1d3a;border:1px solid var(--line)}.brand.dark{background:#17182c;color:#ecedff}
.mark{width:34px;height:34px;flex:0 0 34px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.mark svg{width:26px;height:26px;display:block}
.light .mark{background:#eceeff;border:1px solid #cfd3ff;color:#4651C4}.dark .mark{background:#262a5c;border:1px solid #3c4290;color:#aeb6ff}
.mark.full{background:none;border:0}.mark.full svg{width:34px;height:34px}
.bn{font-weight:600;font-size:13px;line-height:1.3;display:block}.bs{font-size:11px;opacity:.65;display:block}
.brandrow{display:flex;flex-direction:column;gap:8px;width:100%}
</style></head><body>
<h1>Ghost final — direction 1 + eye sparkle</h1><p class="sub">CURRENT · ghost-v2-1 (bolt) · a catch-light · b star glint · c catch-light + star. Concept only. Tray: a drops the sparkle, b/c cut it out of the silhouette.</p>
<h2>App icon — 200 (256 spec, scaled to fit) / 48 / 32 / 16 px</h2><div class="grid">${row(it=>`<div class="cell"><div class="lbl">${it.k}</div><div class="sizes">${sv(it.m,'s256')}</div><div class="sizes">${[48,32,16].map(s=>sv(it.m,'s'+s)).join('')}</div></div>`)}</div>
<h2>Tray — 16 / 24 px, single colour, light + dark</h2><div class="grid">${row(it=>`<div class="cell"><div class="lbl">${it.k}</div>${['light','dark'].map(m=>`<div class="strip ${m}">${sv(it.t,'s16')}${sv(it.t,'s24')}${sv(it.t,'s16')}</div>`).join('')}</div>`)}</div>
<h2>In-app brand mark — "Vibe Studio" light / dark</h2><div class="grid">${row(it=>`<div class="cell"><div class="lbl">${it.k}</div><div class="brandrow">${['light','dark'].map(m=>`<div class="brand ${m}"><div class="mark">${sv(it.t,'')}</div><div class="mark full">${sv(it.m,'')}</div><div><span class="bn">Vibe Studio</span><span class="bs">Discord presence</span></div></div>`).join('')}</div></div>`)}</div>
</body></html>`;
fs.writeFileSync('final-sheet.html',sheet);
