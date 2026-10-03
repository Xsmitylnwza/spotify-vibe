import fs from 'fs';
const F = JSON.parse(fs.readFileSync('_frag.json', 'utf8'));
const FI = '<span class="fi-tile">Fi</span>';
const fixSm = h => h.replace(/<span class="dcp-sm"([^>]*)><img[^>]*><\/span>/g, `<span class="dcp-sm"$1>${FI}</span>`).replace(/ data-tip="[^"]*"/g, '');
const GHOST_BODY = fs.readFileSync('assets/ghost-09.svg', 'utf8').match(/<path d="M32\.5[^>]*>/)[0];
const EYES = '<g fill="#3A34C8"><circle cx="23.4" cy="28.8" r="2.9"/><path d="M42.4 22.4Q42.9 24.3 44.8 24.8Q42.9 25.3 42.4 27.2Q41.9 25.3 40 24.8Q41.9 24.3 42.4 22.4Z"/></g><circle cx="22.6" cy="27.7" r=".95" fill="#fff"/><g fill="none" stroke="#3A34C8" stroke-width="1.5" stroke-linecap="round"><path d="M34.2 29.4Q37.2 25.2 40.5 29"/><path d="M27.4 32.4Q30.6 36.6 33.8 32.4"/></g>';
const ghostMark = (s, id) => `<svg class="gm" style="width:${s}px;height:${s}px" viewBox="0 0 64 64"><defs><linearGradient id="gg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8794FF"/><stop offset=".5" stop-color="#6670F8"/><stop offset="1" stop-color="#4C43EE"/></linearGradient></defs><rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="url(#gg${id})"/>${GHOST_BODY}${EYES}</svg>`;
const ghostFree = s => `<svg viewBox="8 6 52 52" style="width:${s}px;height:${s}px">${GHOST_BODY}${EYES}</svg>`;

const head = (title, extraCss) => `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="assets/studio-ci.css"><link rel="stylesheet" href="assets/mockup-extra.css"><link rel="stylesheet" href="assets/coordinator.css">
<style>
html,body{margin:0;padding:0;width:1600px;height:1000px;overflow:hidden;background:#120e33;font-family:"IBM Plex Sans","IBM Plex Sans Thai",system-ui,sans-serif;color:#fff}
.poster{position:relative;width:1600px;height:1000px;overflow:hidden;background:
 radial-gradient(900px 600px at 18% 8%,rgba(102,112,248,.38),transparent 70%),
 radial-gradient(900px 700px at 95% 100%,rgba(76,67,238,.35),transparent 70%),
 linear-gradient(160deg,#1a1450 0%,#14103f 45%,#0d0a2a 100%)}
.poster:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:40px 40px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 75%)}
.hd{position:absolute;left:72px;top:56px;display:flex;align-items:center;gap:20px;z-index:5}
.hd .gm{display:block;filter:drop-shadow(0 6px 18px rgba(76,67,238,.55))}
.hd .wm{font-weight:600;font-size:46px;letter-spacing:-.01em;line-height:1}
.hd .tg{margin-top:10px;font-size:22px;color:#c8ccff;font-weight:400}
.fict{position:absolute;right:56px;bottom:18px;z-index:5;font-size:15px;letter-spacing:.04em;color:#b8bdf5;border:1px solid rgba(184,189,245,.35);padding:5px 12px;border-radius:999px;background:rgba(18,14,51,.5)}
.cap{position:absolute;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#a9aef0;font-weight:500}
.fi-tile{display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center;background:#fff;color:#4C43EE;font-weight:600;font-size:11px;border-radius:50%}
${extraCss}
</style></head><body><div class="poster">
<div class="hd">${ghostMark(72, 'h')}<div><div class="wm">Vibe Studio</div><div class="tg">Set it once — your Discord status follows the app you’re in.</div></div></div>
`;
const foot = `<div class="fict">Fictional demo</div></div></body></html>`;

/* ---------- P1 ---------- */
const frames = [[18, 18, 200, 130, '#e7e9ff'], [238, 18, 170, 130, '#dfe3fb'], [18, 168, 120, 150, '#ffe6dc'], [158, 168, 250, 150, '#e3f4ee']].map(([x, y, w, h, c], i) => `<div class="frm" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${c}"><i style="width:${w * .5}px"></i><i style="width:${w * .7}px;top:${h * .5}px;opacity:.6"></i><b style="background:${['#4C43EE', '#e86a3d', '#2c9d78', '#6670F8'][i]}"></b></div>`).join('');
const dockImgs = f => f.map(x => `<img src="assets/apps/${x}" alt="">`).join('');
const p1 = head('Vibe Studio — Desktop ↔ Discord', `
.desk{position:absolute;left:72px;top:236px;width:800px;height:690px;border-radius:14px;overflow:hidden;box-shadow:0 30px 70px rgba(5,3,30,.6),0 0 0 1px rgba(255,255,255,.1);background:radial-gradient(500px 360px at 20% 20%,#5f5bd8,transparent 70%),linear-gradient(135deg,#2c2578,#4a3aa8 55%,#2a1f6b)}
.win{position:absolute;left:44px;top:36px;width:712px;height:560px;background:#f5f6fa;border-radius:10px;box-shadow:0 18px 40px rgba(5,3,30,.5),0 0 0 2px #6670F8;overflow:hidden;color:#23253a}
.win .tb{height:38px;background:#fff;border-bottom:1px solid #e3e5ee;display:flex;align-items:center;padding:0 14px;gap:10px;font-size:14px}
.win .tb .fi{width:20px;height:20px;border-radius:6px;background:#23253a;color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center}
.win .tb .ctl{margin-left:auto;letter-spacing:10px;color:#8a8ea6;font-size:13px}
.win .bd{display:flex;height:calc(100% - 38px)}
.win .tools{width:46px;background:#fff;border-right:1px solid #e3e5ee;display:flex;flex-direction:column;align-items:center;gap:16px;padding-top:16px}
.win .tools u{width:18px;height:18px;border:2px solid #8a8ea6;border-radius:4px;display:block}.win .tools u:first-child{border-color:#4C43EE;background:#e7e9ff}
.win .cv{flex:1;position:relative;background:#e9eaf1;background-image:radial-gradient(#cfd2e0 1px,transparent 1px);background-size:20px 20px;overflow:hidden}
.board{position:absolute;left:40px;top:34px;width:430px;height:336px;background:#fff;border-radius:6px;box-shadow:0 2px 10px rgba(35,37,58,.15)}
.board .lb{position:absolute;left:0;top:-22px;font-size:12px;color:#6a6e88}
.frm{position:absolute;border-radius:6px}.frm i{position:absolute;left:12px;top:14px;height:8px;border-radius:4px;background:#23253a;opacity:.75}.frm b{position:absolute;right:12px;bottom:12px;width:26px;height:26px;border-radius:50%}
.sel{position:absolute;left:40px;top:34px;width:430px;height:336px;border:2px solid #6670F8;border-radius:2px;pointer-events:none}
.props{position:absolute;right:0;top:0;width:150px;height:100%;background:#fff;border-left:1px solid #e3e5ee;padding:14px;font-size:12px;color:#6a6e88}
.props .r{height:8px;border-radius:4px;background:#e3e5ee;margin:12px 0}
.tk{position:absolute;left:0;right:0;bottom:0;height:52px;background:rgba(18,14,51,.72);display:flex;align-items:center;justify-content:center;gap:16px;border-top:1px solid rgba(255,255,255,.12)}
.tk img,.tk .tkf{width:30px;height:30px;border-radius:7px;object-fit:contain}
.tkf{background:#fff;color:#4C43EE;font-weight:600;font-size:12px;display:flex;align-items:center;justify-content:center;position:relative}
.tkf:after{content:"";position:absolute;bottom:-9px;left:50%;width:18px;height:3px;margin-left:-9px;border-radius:2px;background:#8794FF}
.cardw{position:absolute;left:697px;top:213px;zoom:1.5}
.cardw .dcp{box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08)}
.link{position:absolute;left:872px;top:622px;width:196px;height:2px;background:linear-gradient(90deg,rgba(135,148,255,.2),#8794FF)}
.link:before{content:"";position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:50%;background:#8794FF;box-shadow:0 0 0 4px rgba(135,148,255,.25)}
.lg{position:absolute;left:972px;top:590px;filter:drop-shadow(0 8px 20px rgba(76,67,238,.7))}
`) + `
<div class="cap" style="left:72px;top:204px">Windows · Figma in focus</div><div class="cap" style="left:1046px;top:204px">Discord · what others see</div>
<div class="desk"><div class="win"><div class="tb"><span class="fi">Fi</span><span>Landing page v3 – Figma</span><span class="ctl">– ▫ ✕</span></div>
<div class="bd"><div class="tools"><u></u><u></u><u></u><u></u></div><div class="cv"><div class="board"><span class="lb">Landing page v3</span>${frames}</div><div class="sel"></div><div class="props"><b style="color:#23253a">Design</b><div class="r" style="width:70%"></div><div class="r"></div><div class="r" style="width:50%"></div><div class="r"></div></div></div></div></div>
<div class="tk">${dockImgs(['visual-studio-code.png', 'google-chrome.png'])}<span class="tkf">Fi</span>${dockImgs(['file-explorer.png', 'spotify.svg'])}</div></div>
<div class="link"></div><div class="lg">${ghostMark(64, 'l')}</div>
<div class="cardw">${fixSm(F.designPop)}</div>
` + foot;
fs.writeFileSync('p1.html', p1);

/* ---------- P2 ---------- */
const rows = [['visual-studio-code.png', 'Visual Studio Code', 'Coding', F.codingList], ['fi', 'Figma', 'Design', F.designList], ['spotify.svg', 'Spotify', 'Chill', F.chillList]];
const p2 = head('Vibe Studio — App → Scene', `
.strip{position:absolute;left:700px;top:224px;width:820px;height:712px;background:#0b0a1f;border-radius:10px;box-shadow:0 30px 70px rgba(5,3,30,.6),0 0 0 1px rgba(255,255,255,.1)}
.strip:before,.strip:after{content:"";position:absolute;top:10px;bottom:10px;width:22px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='36'%3E%3Crect x='4' y='9' width='14' height='18' rx='4' fill='%23302a73'/%3E%3C/svg%3E") repeat-y}
.strip:before{left:8px}.strip:after{right:8px}
.fr{position:absolute;left:44px;right:44px;height:207px;background:#2b2d31;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.fr .dcp-list{zoom:2.0;width:300px;background:transparent;padding:0;box-shadow:none}
.fr .dcp-mlh{display:none}
.fr .no{position:absolute;left:12px;top:8px;font:500 12px "IBM Plex Mono",monospace;color:#6c70a8}
.ap{position:absolute;left:120px;width:128px;text-align:center}
.ap .ic{width:112px;height:112px;margin:0 auto;border-radius:26px;background:rgba(255,255,255,.96);display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px rgba(5,3,30,.5)}
.ap .ic img{width:70px;height:70px;object-fit:contain}
.ap .ic .fi-big{font-weight:600;font-size:38px;color:#4C43EE}
.ap .nm{margin-top:12px;font-size:19px;font-weight:500;color:#e6e8ff;white-space:nowrap}
.ln{position:absolute;left:290px;width:400px;height:2px;background:linear-gradient(90deg,#8794FF,rgba(135,148,255,.35))}
.ln:after{content:"";position:absolute;right:-2px;top:-5px;border-left:10px solid rgba(135,148,255,.7);border-top:6px solid transparent;border-bottom:6px solid transparent}
.chip{position:absolute;left:420px;transform:translateY(-50%);padding:6px 16px;border-radius:999px;background:#2a2470;border:1px solid #6670F8;color:#fff;font-size:17px;font-weight:500}
`) + `<div class="cap" style="left:120px;top:204px">Your apps</div><div class="cap" style="left:700px;top:196px">Discord · member list</div>
<div class="strip">${rows.map((r, i) => `<div class="fr" style="top:${22 + i * 232}px"><span class="no">0${i + 1}</span>${fixSm(r[3])}</div>`).join('')}</div>
${rows.map((r, i) => { const cy = 224 + 22 + i * 232 + 103; return `<div class="ap" style="top:${cy - 76}px"><div class="ic">${r[0] === 'fi' ? '<span class="fi-big">Fi</span>' : `<img src="assets/apps/${r[0]}" alt="">`}</div><div class="nm">${r[1]}</div></div><div class="ln" style="top:${cy - 20}px"></div><div class="chip" style="top:${cy - 20}px">${r[2]}</div>`; }).join('')}
` + foot;
fs.writeFileSync('p2.html', p2);

/* ---------- P3 ---------- */
const p3 = head('Vibe Studio — Now page', `
.ghostpeek{position:absolute;right:130px;top:96px;transform:rotate(9deg);filter:drop-shadow(0 12px 30px rgba(76,67,238,.6));z-index:1}
.winw{position:absolute;left:237px;top:250px;width:1280px;height:740px;color:#1f2140;transform:scale(.88);transform-origin:0 0;border-radius:14px;overflow:hidden;box-shadow:0 40px 90px rgba(5,3,30,.65),0 0 0 1px rgba(255,255,255,.14);background:#faf8f4;z-index:2}
.winw .vs-app{height:740px;min-height:740px}
.glow{position:absolute;left:300px;top:760px;width:1000px;height:300px;background:radial-gradient(closest-side,rgba(102,112,248,.5),transparent);filter:blur(30px)}
`) + `<div class="glow"></div><div class="ghostpeek">${ghostFree(230)}</div>
<div class="winw">${fixSm(F.root)}</div>
` + foot;
fs.writeFileSync('p3.html', p3);
