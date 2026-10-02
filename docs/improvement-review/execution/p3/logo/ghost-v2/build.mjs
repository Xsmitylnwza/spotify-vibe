// Regenerates ghost-v2 SVGs + ghost-v2-sheet.html. Run: node build.mjs
import fs from 'node:fs';
const R='../ghost/', INK='#3F49B8';
const G='M32 11C21.4 11 13.5 19.4 13.5 31V51.5L22.75 44.5 32 51.5 41.25 44.5 50.5 51.5V31C50.5 19.4 42.6 11 32 11Z';
const BOLT='M33.9 13.6 27.3 23.2H31.2L29.4 29.8 36.8 19.8H32.7Z'; // 27.3..36.8 x 13.6..29.8
const bolt=(x,y,s)=>`<path transform="translate(${x} ${y}) scale(${s}) translate(-27.3 -13.6)" d="${BOLT}"/>`;
const dot=(cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const arc=(x1,x2,y,d,sw)=>`<path d="M${x1} ${y}Q${(x1+x2)/2} ${y+d} ${x2} ${y}" fill="none" stroke-width="${sw}" stroke-linecap="round"/>`;
const D={
 1:{name:'Face only + bolt badge',
  face:t=>dot(24.5,30,t?3.6:3.2)+arc(35,44,30,t?5.5:4.5,t?4.8:3)+(t?'':arc(28.5,35.5,39,3,2.6)),
  badge:true},
 2:{name:'Bolt as negative space',
  face:t=>dot(23.5,38.5,t?3.6:3.2)+dot(35.5,38.5,t?3.6:3.2)+bolt(t?37.5:38,t?17.5:18,t?.85:.8), mask:true},
 3:{name:'Minimal wink',
  face:t=>dot(24,32.5,t?4:3.6)+arc(35.5,46,32.5,t?6:5.5,t?5:3.2)},
 4:{name:'Balanced: eye + wink + bolt badge',
  face:t=>dot(24,32.5,t?3.8:3.4)+arc(35,45,32.5,t?5.8:5,t?4.9:3.1),
  badge:true,big:true},
};
const defs=(p)=>`<linearGradient id="${p}bg" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#7C8BFF"/><stop offset="1" stop-color="#434DC2"/></linearGradient>
<radialGradient id="${p}gl" cx="0.3" cy="0.12" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7E8FB"/></linearGradient>`;
const M1='translate(29.5 35.5) scale(.86) translate(-32 -31.5)', T1='translate(27 35) translate(-32 -31.5)';
const M4='translate(29 35) scale(.92) translate(-32 -31.5)';
const TT='translate(32 32) scale(1.3) translate(-32 -31.5)';
const inkArc=s=>s.replace(/fill="none" stroke-width/g,'fill="none" stroke="'+INK+'" stroke-width');
function master(n,p=''){const d=D[n];const tf=d.big?M4:d.badge?M1:'';
 const gh=`<path d="${G}" fill="url(#${p}gh)" stroke="url(#${p}gh)" stroke-width="2.2" stroke-linejoin="round"/>`;
 let body;
 if(d.mask) body=`<mask id="${p}m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="1.2" stroke-linejoin="round">${d.face(0).replace(/fill="none" stroke-width/g,'fill="none" stroke="#000" stroke-width')}</g></mask><g mask="url(#${p}m)">${gh}</g>`;
 else body=`<g transform="${tf}">${gh}<g fill="${INK}" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round">${inkArc(d.face(0))}</g></g>`;
 if(d.badge) body+=`<g fill="#fff" stroke="#fff" stroke-width="1" stroke-linejoin="round">${d.big?bolt(50,8,.8):bolt(49,9,.85)}</g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Vibe Studio ghost v2 — direction ${n}: ${d.name}</title><defs>${defs(p)}</defs><rect width="64" height="64" rx="15" fill="url(#${p}bg)"/><rect width="64" height="64" rx="15" fill="url(#${p}gl)"/>${body}</svg>`;}
function tray(n,p=''){const d=D[n];const tf=d.badge?T1:TT;
 const face=d.face(1).replace(/fill="none" stroke-width/g,'fill="none" stroke="#000" stroke-width');
 let extra='';
 if(d.badge) extra=`<g fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${bolt(50,8,1.0)}</g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Vibe Studio ghost tray v2 — direction ${n}: ${d.name}</title><defs><mask id="${p}k" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><g transform="${tf}" fill="#000" stroke="#000" stroke-width="1.2" stroke-linejoin="round">${face}</g></mask></defs><g mask="url(#${p}k)"><path transform="${tf}" d="${G}" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></g>${extra}</svg>`;}
for(const n of [1,2,3,4]){fs.writeFileSync(`ghost-v2-${n}.svg`,master(n)+'\n');fs.writeFileSync(`ghost-v2-${n}-tray.svg`,tray(n)+'\n');}
// ---- sheet
let uid=0;
const uniq=s=>{const p='u'+(uid++)+'-';return s.replace(/id="([^"]+)"/g,`id="${p}$1"`).replace(/url\(#([^)]+)\)/g,`url(#${p}$1)`).replace(/<title>.*?<\/title>/,'');};
const sv=(s,c)=>uniq(s).replace('<svg ',`<svg class="${c}" aria-hidden="true" `);
const rd=f=>fs.readFileSync(R+f,'utf8');
const cur=rd('ghost-sheet.html').match(/<svg class="s256"[\s\S]*?<\/svg>/)[0].replace(/class="s256" aria-hidden="true" /,'');
const curTray=fs.readFileSync('../../../../../../electron/assets/logo-ghost.svg','utf8');
const items=[{k:'CURRENT',m:cur,t:curTray},{k:'B (base)',m:rd('ghost-b.svg'),t:rd('ghost-b-tray.svg')},
 ...[1,2,3,4].map(n=>({k:`${n} · ${D[n].name}`,m:master(n),t:tray(n)}))];
const row=(f)=>items.map(f).join('');
const sheet=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ghost v2 — clean directions</title>
<style>
:root{--bg:#f4f5fb;--ink:#1b1d3a;--mut:#6a6e92;--card:#fff;--line:#dfe1f2}
*{box-sizing:border-box}body{margin:0;padding:24px;background:var(--bg);color:var(--ink);font:14px/1.45 "Segoe UI",system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.sub{color:var(--mut);margin:0 0 18px}
h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:24px 0 10px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cell{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:12px}
.lbl{font-weight:700;font-size:12px;color:var(--mut);align-self:flex-start}
svg.s256{width:256px;height:256px}svg.s48{width:48px;height:48px}svg.s32{width:32px;height:32px}svg.s16{width:16px;height:16px}svg.s24{width:24px;height:24px}
.sizes{display:flex;align-items:flex-end;gap:18px}
.strip{width:100%;border-radius:10px;padding:12px;display:flex;gap:18px;align-items:center;justify-content:center}
.light{background:#f3f3f5;color:#1f1f24}.dark{background:#202127;color:#e9e9ee}
.brand{width:100%;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px}
.brand.light{background:#fff;color:#1b1d3a;border:1px solid var(--line)}.brand.dark{background:#17182c;color:#ecedff}
.mark{width:34px;height:34px;flex:0 0 34px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.mark svg{width:26px;height:26px;display:block}
.light .mark{background:#eceeff;border:1px solid #cfd3ff;color:#4651C4}.dark .mark{background:#262a5c;border:1px solid #3c4290;color:#aeb6ff}
.mark.full{background:none;border:0}.mark.full svg{width:34px;height:34px}
.bn{font-weight:600;font-size:14px;line-height:1.3;display:block}.bs{font-size:12px;opacity:.65;display:block}
.brandrow{display:flex;flex-direction:column;gap:8px;width:100%}
</style></head><body>
<h1>Ghost v2 — clean directions from B</h1><p class="sub">CURRENT · B · 1 face + bolt badge · 2 bolt negative space · 3 minimal wink · 4 balanced pick. Concept only.</p>
<h2>App icon — 256 / 48 / 32 / 16 px</h2><div class="grid">${row(it=>`<div class="cell"><div class="lbl">${it.k}</div><div class="sizes">${sv(it.m,'s256')}</div><div class="sizes">${[48,32,16].map(s=>sv(it.m,'s'+s)).join('')}</div></div>`)}</div>
<h2>Tray — 16 / 24 px, single colour, light + dark</h2><div class="grid">${row(it=>`<div class="cell"><div class="lbl">${it.k}</div>${['light','dark'].map(m=>`<div class="strip ${m}">${sv(it.t,'s16')}${sv(it.t,'s24')}${sv(it.t,'s16')}</div>`).join('')}</div>`)}</div>
<h2>In-app brand mark — "Vibe Studio" light / dark</h2><div class="grid">${row(it=>`<div class="cell"><div class="lbl">${it.k}</div><div class="brandrow">${['light','dark'].map(m=>`<div class="brand ${m}"><div class="mark">${sv(it.t,'')}</div><div class="mark full">${sv(it.m,'')}</div><div><span class="bn">Vibe Studio</span><span class="bs">Discord presence</span></div></div>`).join('')}</div></div>`)}</div>
</body></html>`;
fs.writeFileSync('ghost-v2-sheet.html',sheet);
