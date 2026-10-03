import fs from 'fs';
const GHOST_BODY = fs.readFileSync('assets/ghost-09.svg', 'utf8').match(/<path d="M32\.5[^>]*>/)[0];
const EYES = '<g fill="#3A34C8"><circle cx="23.4" cy="28.8" r="2.9"/><path d="M42.4 22.4Q42.9 24.3 44.8 24.8Q42.9 25.3 42.4 27.2Q41.9 25.3 40 24.8Q41.9 24.3 42.4 22.4Z"/></g><circle cx="22.6" cy="27.7" r=".95" fill="#fff"/><g fill="none" stroke="#3A34C8" stroke-width="1.5" stroke-linecap="round"><path d="M34.2 29.4Q37.2 25.2 40.5 29"/><path d="M27.4 32.4Q30.6 36.6 33.8 32.4"/></g>';
const mark = (s, id) => `<svg class="gm" style="width:${s}px;height:${s}px" viewBox="0 0 64 64"><defs><linearGradient id="gg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8794FF"/><stop offset=".5" stop-color="#6670F8"/><stop offset="1" stop-color="#4C43EE"/></linearGradient></defs><rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="url(#gg${id})"/>${GHOST_BODY}${EYES}</svg>`;
const free = s => `<svg viewBox="8 6 52 52" style="width:${s}px;height:${s}px;display:block">${GHOST_BODY}${EYES}</svg>`;

const CSS = `
html,body{margin:0;padding:0;width:1600px;height:1000px;overflow:hidden;background:#0b0a24;font-family:"IBM Plex Sans","IBM Plex Sans Thai",system-ui,sans-serif;color:#fff}
.poster{position:relative;width:1600px;height:1000px;overflow:hidden}
.hd{position:absolute;left:72px;top:52px;display:flex;align-items:center;gap:20px;z-index:20}
.hd .gm{display:block;filter:drop-shadow(0 6px 18px rgba(76,67,238,.55))}
.hd .wm{font-weight:600;font-size:44px;letter-spacing:-.015em;line-height:1}
.hd .tg{margin-top:9px;font-size:21px;color:#d3d6ff;font-weight:400}
.fict{position:absolute;right:48px;bottom:24px;z-index:30;font-size:15px;letter-spacing:.04em;color:#d0d3ff;border:1px solid rgba(208,211,255,.4);padding:5px 12px;border-radius:999px;background:rgba(11,10,36,.6)}
.cap{position:absolute;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#b6bbff;font-weight:600;z-index:15}
.win{position:absolute;width:712px;height:520px;background:#f5f6fa;border-radius:10px;overflow:hidden;color:#23253a;box-shadow:0 18px 40px rgba(5,3,30,.5),0 0 0 2px #6670F8}
.win .tb{height:38px;background:#fff;border-bottom:1px solid #e3e5ee;display:flex;align-items:center;padding:0 14px;gap:10px;font-size:14px}
.win .tb img{width:20px;height:20px;border-radius:5px}
.win .tb .ctl{margin-left:auto;letter-spacing:10px;color:#8a8ea6;font-size:13px}
.win .bd{display:flex;height:calc(100% - 38px - 56px)}
.win .tools{width:46px;background:#fff;border-right:1px solid #e3e5ee;display:flex;flex-direction:column;align-items:center;gap:16px;padding-top:16px}
.win .tools u{width:18px;height:18px;border:2px solid #8a8ea6;border-radius:4px;display:block}.win .tools u:first-child{border-color:#4C43EE;background:#e7e9ff}
.win .cv{flex:1;position:relative;background:#e9eaf1;background-image:radial-gradient(#cfd2e0 1px,transparent 1px);background-size:20px 20px;overflow:hidden}
.board{position:absolute;left:40px;top:34px;width:380px;height:300px;background:#fff;border-radius:6px;box-shadow:0 2px 10px rgba(35,37,58,.15)}
.board .lb{position:absolute;left:0;top:-22px;font-size:12px;color:#6a6e88}
.frm{position:absolute;border-radius:6px}.frm i{position:absolute;left:12px;top:14px;height:8px;border-radius:4px;background:#23253a;opacity:.75}.frm b{position:absolute;right:12px;bottom:12px;width:26px;height:26px;border-radius:50%}
.sel{position:absolute;left:40px;top:34px;width:380px;height:300px;border:2px solid #6670F8;border-radius:2px}
.props{position:absolute;right:0;top:0;width:150px;height:100%;background:#fff;border-left:1px solid #e3e5ee;padding:14px;font-size:12px;color:#6a6e88;box-sizing:border-box}
.props .r{height:8px;border-radius:4px;background:#e3e5ee;margin:12px 0}
.tk{position:absolute;left:0;right:0;bottom:0;height:56px;background:#1a1450;display:flex;align-items:center;justify-content:center;gap:18px}
.tk img{width:32px;height:32px;object-fit:contain}
.tk .dot{position:relative;display:inline-block;line-height:0}.tk .dot:after{content:"";position:absolute;bottom:-8px;left:50%;width:18px;height:3px;margin-left:-9px;border-radius:2px;background:#8794FF}
.desk{position:absolute;overflow:hidden;border-radius:14px;background:radial-gradient(500px 360px at 20% 20%,#5f5bd8,transparent 70%),linear-gradient(135deg,#2c2578,#4a3aa8 55%,#2a1f6b);box-shadow:0 30px 70px rgba(5,3,30,.6),0 0 0 1px rgba(255,255,255,.1)}
.dc{position:absolute;width:340px;background:#111214;border-radius:10px;overflow:hidden;font-family:"gg sans","Noto Sans",Whitney,"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.3;color:#dbdee1;padding-bottom:14px;transform-origin:0 0}
.dc-ban{height:96px;background:linear-gradient(120deg,#4C43EE 0%,#8b5cf6 55%,#d946a8 100%);position:relative}
.dc-ban:after{content:"";position:absolute;inset:0;background:radial-gradient(120px 60px at 80% 20%,rgba(255,255,255,.28),transparent 70%)}
.dc-av{position:absolute;left:16px;top:56px;width:92px;height:92px;border-radius:50%;background:#111214;padding:6px;box-sizing:border-box}
.dc-av img{width:100%;height:100%;border-radius:50%;display:block;background:#2b2d31;box-shadow:0 0 0 3px #23a55a}
.dc-av i{position:absolute;right:2px;bottom:2px;width:26px;height:26px;border-radius:50%;background:#23a55a;border:6px solid #111214;box-sizing:border-box}
.dc-id{padding:56px 16px 0}
.dc-id b{display:block;font-size:22px;font-weight:700;color:#f2f3f5;line-height:1.2}
.dc-id span{font-size:14px;color:#dbdee1}
.dc-card{margin:12px 12px 0;background:#1e1f22;border-radius:8px;padding:12px;box-sizing:border-box}
.dc-card h6{margin:0 0 6px;font-size:12px;font-weight:700;color:#f2f3f5;text-transform:uppercase;letter-spacing:.02em}
.dc-card p{margin:0;font-size:14px;color:#dbdee1}
.dc-row{display:flex;gap:12px;align-items:center}
.dc-img{position:relative;width:76px;height:76px;flex:none;border-radius:8px;background:#232f4d;overflow:hidden}
.dc-img img{width:100%;height:100%;display:block;object-fit:cover}
.dc-sm{position:absolute;right:-6px;bottom:-6px;width:30px;height:30px;border-radius:50%;background:#1e1f22;padding:3px;box-sizing:border-box}
.dc-sm img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.dc-imgw{position:relative;flex:none}
.dc-tx{min-width:0;display:flex;flex-direction:column;gap:1px}.dc-tx b{font-size:14px;font-weight:600;color:#f2f3f5}.dc-tx span{font-size:14px;white-space:nowrap}
.glow{position:absolute;border-radius:50%}
`;

const win = (x, y) => `<div class="win" style="left:${x}px;top:${y}px"><div class="tb"><img src="assets/apps/figma.png" alt=""><span>Landing page v3 – Figma</span><span class="ctl">– ▫ ✕</span></div>
<div class="bd"><div class="tools"><u></u><u></u><u></u><u></u></div><div class="cv"><div class="board"><span class="lb">Landing page v3</span>
<div class="frm" style="left:18px;top:18px;width:180px;height:120px;background:#e7e9ff"><i style="width:90px"></i><i style="width:126px;top:60px;opacity:.6"></i><b style="background:#4C43EE"></b></div>
<div class="frm" style="left:216px;top:18px;width:146px;height:120px;background:#ffe3ee"><i style="width:73px"></i><i style="width:102px;top:60px;opacity:.6"></i><b style="background:#e8368f"></b></div>
<div class="frm" style="left:18px;top:156px;width:110px;height:126px;background:#ffe6dc"><i style="width:55px"></i><i style="width:77px;top:63px;opacity:.6"></i><b style="background:#e86a3d"></b></div>
<div class="frm" style="left:146px;top:156px;width:216px;height:126px;background:#e3f4ee"><i style="width:108px"></i><i style="width:151px;top:63px;opacity:.6"></i><b style="background:#6670F8"></b></div></div><div class="sel"></div>
<div class="props"><b style="color:#23253a">Design</b><div class="r" style="width:70%"></div><div class="r"></div><div class="r" style="width:50%"></div><div class="r"></div></div></div></div>
<div class="tk"><img src="assets/apps/visual-studio-code.png" alt=""><img src="assets/apps/google-chrome.png" alt=""><span class="dot"><img src="assets/apps/figma.png" alt=""></span><img src="assets/apps/file-explorer.png" alt=""><img src="assets/apps/spotify.png" alt=""></div></div>`;

const card = (x, y, tf) => `<div class="dc" style="left:${x}px;top:${y}px;transform:${tf}" role="img" aria-label="Vibe Demo profile, Playing Design in Figma">
<div class="dc-ban"></div><div class="dc-av"><img src="assets/art/avatar-2.svg" alt=""><i></i></div>
<div class="dc-id"><b>Vibe Demo</b><span>@vibe.demo</span></div>
<div class="dc-card"><h6>About Me</h6><p>Designer. Set it once — my status follows the app I’m in.</p><h6 style="margin-top:10px">Member Since</h6><p>Mar 14, 2024</p></div>
<div class="dc-card"><h6>Playing</h6><div class="dc-row"><div class="dc-imgw"><div class="dc-img"><img src="assets/art/app.svg" alt=""></div><span class="dc-sm"><img src="assets/apps/figma.png" alt=""></span></div>
<div class="dc-tx"><b>Design</b><span>Designing in Figma</span><span>Landing page v3</span></div></div></div></div>`;

const page = (title, css, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="assets/studio-ci.css"><link rel="stylesheet" href="assets/mockup-extra.css"><link rel="stylesheet" href="assets/coordinator.css">
<style>${CSS}${css}</style></head><body><div class="poster">${body}
<div class="hd">${mark(64, 'h')}<div><div class="wm">Vibe Studio</div><div class="tg">Set it once — your Discord status follows the app you’re in.</div></div></div>
<div class="fict">Fictional demo</div></div></body></html>`;

// ---------- A: focal Discord ----------
const A = page('Vibe Studio — P1-a', `
.poster{background:radial-gradient(1000px 800px at 78% 55%,rgba(138,92,246,.5),transparent 65%),radial-gradient(700px 600px at 10% 100%,rgba(76,67,238,.35),transparent 70%),linear-gradient(160deg,#17114a,#0d0a2a 70%)}
.dim{position:absolute;left:30px;top:300px;width:760px;transform:scale(.82);transform-origin:0 0;filter:blur(2.5px) brightness(.62) saturate(.9)}
.gl1{left:900px;top:200px;width:640px;height:760px;background:radial-gradient(closest-side,rgba(217,70,168,.55),rgba(105,92,246,.35) 55%,transparent);filter:blur(70px)}
.path{position:absolute;left:0;top:0;width:1600px;height:1000px;z-index:8}
.ghost{position:absolute;left:640px;top:612px;z-index:12;filter:drop-shadow(0 0 18px rgba(217,70,168,.9)) drop-shadow(0 8px 20px rgba(76,67,238,.8));transform:rotate(-8deg)}
.cardwrap{position:absolute;left:0;top:0;z-index:10}
.cardwrap .dc{box-shadow:0 60px 120px rgba(4,2,26,.85),0 0 0 1px rgba(255,255,255,.14),0 0 80px rgba(160,110,255,.4)}
`, `<div class="glow gl1" style="position:absolute"></div>
<div class="dim"><div class="desk" style="left:0;top:0;width:800px;height:620px">${win(44, 36)}</div></div>
<svg class="path" viewBox="0 0 1600 1000"><defs><linearGradient id="pl" x1="0" x2="1"><stop offset="0" stop-color="#8794FF" stop-opacity=".1"/><stop offset=".55" stop-color="#a78bfa"/><stop offset="1" stop-color="#ff5fb8"/></linearGradient><filter id="bl"><feGaussianBlur stdDeviation="9"/></filter></defs>
<path d="M430 790 C640 800 700 560 900 560" fill="none" stroke="url(#pl)" stroke-width="14" opacity=".8" filter="url(#bl)"/><path d="M430 790 C640 800 700 560 900 560" fill="none" stroke="url(#pl)" stroke-width="4" stroke-linecap="round"/><circle cx="430" cy="790" r="9" fill="#8794FF"/><circle cx="430" cy="790" r="20" fill="none" stroke="#8794FF" stroke-opacity=".4" stroke-width="3"/></svg>
<div class="ghost">${free(88)}</div>
<div class="cardwrap">${card(960, 150, 'perspective(2000px) rotateY(-11deg) rotateX(3deg) rotateZ(1.2deg) scale(1.52)')}</div>`);

// ---------- B: split ----------
const B = page('Vibe Studio — P1-b', `
.poster{background:linear-gradient(135deg,#070a2c 0%,#0b1040 100%)}
.right{position:absolute;inset:0;clip-path:polygon(790px 0,1600px 0,1600px 1000px,610px 1000px);background:radial-gradient(800px 700px at 85% 60%,rgba(255,61,139,.5),transparent 65%),linear-gradient(150deg,#3b1d9c,#6d2bd6 55%,#9b2fd0)}
.seam{position:absolute;inset:0;pointer-events:none;z-index:6}
.trail{position:absolute;inset:0;z-index:12}
.hl{position:absolute;font-size:15px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;z-index:15;padding:6px 14px;border-radius:999px}
.cardwrap{position:absolute;left:0;top:0;z-index:10}
.cardwrap .dc{box-shadow:0 50px 100px rgba(10,2,40,.7),0 0 0 1px rgba(255,255,255,.16),0 0 70px rgba(255,61,139,.35)}
`, `<div class="right"></div>
<svg class="seam" viewBox="0 0 1600 1000"><line x1="790" y1="0" x2="610" y2="1000" stroke="#ff3d8b" stroke-width="3" opacity=".9"/></svg>
<div class="hl" style="left:72px;top:232px;background:rgba(135,148,255,.18);color:#c9ceff;border:1px solid rgba(135,148,255,.4)">Before · working in Figma</div>
<div class="hl" style="left:1000px;top:232px;background:#ff3d8b;color:#fff;box-shadow:0 8px 24px rgba(255,61,139,.5)">After · what Discord shows</div>
<div class="desk" style="left:60px;top:300px;width:600px;height:600px"><div style="position:absolute;left:30px;top:50px;width:712px;height:520px;transform:scale(.8);transform-origin:0 0">${win(0, 0)}</div></div>
<svg class="trail" viewBox="0 0 1600 1000"><defs><linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="#ffb23d" stop-opacity="0"/><stop offset=".5" stop-color="#ff3d8b"/><stop offset="1" stop-color="#fff"/></linearGradient><filter id="tb"><feGaussianBlur stdDeviation="10"/></filter></defs>
<path d="M300 880 C560 960 600 560 880 520" fill="none" stroke="url(#tr)" stroke-width="30" opacity=".75" filter="url(#tb)"/>
<path d="M300 880 C560 960 600 560 880 520" fill="none" stroke="url(#tr)" stroke-width="9" stroke-linecap="round"/>
<path d="M870 482 L936 520 L872 562 Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>
<div class="cardwrap">${card(960, 290, 'scale(1.3)')}</div>`);

// ---------- C: big type ----------
const C = page('Vibe Studio — P1-c', `
.poster{background:radial-gradient(900px 700px at 90% 100%,rgba(102,112,248,.45),transparent 65%),linear-gradient(180deg,#0a0920,#0f0d33)}
.big{position:absolute;left:68px;top:150px;z-index:9;font-weight:600;font-size:158px;line-height:.95;text-shadow:0 6px 40px rgba(5,3,30,.7);letter-spacing:-.055em;white-space:nowrap}
.big em{font-style:normal;background:linear-gradient(90deg,#8794FF,#c084fc 55%,#ff5fb8);-webkit-background-clip:text;background-clip:text;color:transparent}
.cardwrap{position:absolute;left:0;top:0;z-index:8}.cardwrap .dc{box-shadow:0 40px 90px rgba(4,2,26,.85),0 0 0 1px rgba(255,255,255,.14),0 0 70px rgba(135,148,255,.4)}
.lk{position:absolute;left:1000px;top:672px;z-index:9;width:200px;height:6px;border-radius:3px;background:linear-gradient(90deg,#8794FF,#ff5fb8);box-shadow:0 0 18px #c084fc}
.lg{position:absolute;left:1030px;top:624px;z-index:10;filter:drop-shadow(0 0 16px rgba(192,132,252,.9))}
`, `<div class="big">Your status<br><em>follows</em> your apps.</div>
<div class="desk" style="left:230px;top:455px;width:800px;height:600px;z-index:6"><div style="position:absolute;left:44px;top:34px;width:712px;height:520px">${win(0, 0)}</div></div>
<div class="lk"></div><div class="lg">${free(64)}</div>
<div class="cardwrap">${card(1130, 440, "scale(1.1)")}</div>`);

fs.writeFileSync('p1-a.html', A); fs.writeFileSync('p1-b.html', B); fs.writeFileSync('p1-c.html', C);
