/* Vibe Studio — new journey mockup. Fake data, no network, no build.
   Markup reuses the real Studio components from studio-ci.css (vs-*). New pieces are in mockup-extra.css.
   URL params (screenshots): screen=first|now|scenes|settings|tray  state=<mode>  lang=en|th  theme=light|dark
   dev=0  open=drawer|drawervars|drawerfail|drawersaving|picker|picksearch|pickerweb  step=1..3  tray=menu|notice */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const A_ = 'assets/art/';

/* ---------- fake data ---------- */
const APPS = [ // running apps, most recently focused first
  { id: 'figma', name: 'Figma', exe: 'figma.exe', g: 'Fi' },
  { id: 'code', name: 'Visual Studio Code', exe: 'Code.exe', img: 'code.svg' },
  { id: 'spotify', name: 'Spotify', exe: 'Spotify.exe', img: 'spotify.svg' },
  { id: 'chrome', name: 'Google Chrome', exe: 'chrome.exe', img: 'google-chrome.png' },
  { id: 'hades', name: 'Hades', exe: 'Hades.exe', img: 'game.svg' },
  { id: 'mybank', name: 'MyBank Desktop', exe: 'mybank.exe', img: 'app.svg' },
];
const INSTALLED = [
  { id: 'ps', name: 'Adobe Photoshop 2026', exe: 'Photoshop.exe', g: 'Ps' },
  { id: 'blender', name: 'Blender 4.4', exe: 'blender.exe', g: 'Bl' },
  { id: 'obs', name: 'OBS Studio', exe: 'obs64.exe', g: 'OB' },
  { id: 'notion', name: 'Notion', exe: 'Notion.exe', g: 'No' },
  { id: 'slack', name: 'Slack', exe: 'slack.exe', img: 'chat.svg' },
  { id: 'vlc', name: 'VLC media player', exe: 'vlc.exe', img: 'music.svg' },
  { id: 'steam', name: 'Steam', exe: 'steam.exe', img: 'game.svg' },
  { id: 'excel', name: 'Microsoft Excel', exe: 'EXCEL.EXE', g: 'Xl' },
];
const SYSTEM = [
  { id: 's1', name: 'Windows Security', exe: 'SecHealthUI.exe', g: '!' },
  { id: 's2', name: 'Uninstall Blender 4.4', exe: 'uninstall.exe', g: '!' },
  { id: 's3', name: 'Microsoft Edge WebView2 Runtime', exe: 'msedgewebview2.exe', g: '!' },
  { id: 's4', name: 'Administrative Tools', exe: 'mmc.exe', g: '!' },
];
const TABS = [{ title: 'Landing page v3 – Figma' }, { title: 'lofi hip hop radio – YouTube' }, { title: 'Inbox (3) – Mail' }];
const ART = { a1: 'poster.png', a2: 'chill-poster.png', a3: 'gaming-poster.png', a4: 'avatar-1.svg', a5: 'idle.gif' };
const ARTS = Object.keys(ART);
const TYPES = [['playing', 'Playing', 'กำลังเล่น'], ['listening', 'Listening', 'กำลังฟัง'], ['watching', 'Watching', 'กำลังดู'], ['competing', 'Competing', 'กำลังแข่ง']];
const GHOST = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><mask id="vs-ghost-mask"><rect width="64" height="64" fill="#fff"/><path d="M22 27l8 1.5-1.5 7-8-1.5Z" fill="#000"/><path d="M39 30Q43 33.5 47 29.5" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M25 38.5Q32.5 44 40 37" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30.5 13l4.5 0-2.5 5.5 4 0-6.5 8.5 2-6-4 0Z" fill="#000"/></mask></defs><path d="M32 10C21 10 14 20 14 31V44l9-6 9 6 9-6 9 6V31C50 20 43 10 32 10Z" fill="currentColor" mask="url(#vs-ghost-mask)"/></svg>';
function ghostSvg() { const id = 'gm' + (ghostSvg.n = (ghostSvg.n || 0) + 1); return GHOST.replace('id="vs-ghost-mask"', `id="${id}"`).replace('url(#vs-ghost-mask)', `url(#${id})`); }

const DCID = { name: 'golf', handle: '@golf', avatar: 'avatar-2.svg' };
const idOn = () => !(S.screen === 'first' ? S.fr.discord === 'off' : ['discordoff', 'unreachable'].includes(S.mode));
const idAv = (on, sz) => on ? `<img class="mk-av ${sz || ''}" src="${A_}${DCID.avatar}" alt="">` : `<span class="mk-av mk-av-off ${sz || ''}" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%" fill="currentColor"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg></span>`;
const idLine = on => on ? T('Connected as ', 'เชื่อมต่อเป็น ') + `<b>${DCID.handle}</b>` : `<b>${T('Open Discord Desktop', 'เปิด Discord Desktop')}</b>`;
const GEAR = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="4.2"/><circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none"/><path d="M16.2 10h1.6M10 16.2v1.6M3.8 10H2.2M10 3.8V2.2M14.4 14.4l1.1 1.1M5.6 14.4l-1.1 1.1M5.6 5.6L4.5 4.5M14.4 5.6l1.1-1.1"/></svg>';
function acctStatus() {
  const n = (curScene() || {}).name || '';
  return { auto: [T('Showing: ', 'กำลังแสดง: ') + n, 'on'], pinned: [T('Pinned: ', 'ปักไว้: ') + n, 'on'], paused: [T('Paused', 'หยุดสลับ'), 'warn'], hidden: [T('Hidden', 'ซ่อนอยู่'), 'warn'], autohide: [T('Hidden by rule', 'ซ่อนตามกฎ'), 'warn'], none: [T('Nothing to show', 'ไม่มีอะไรแสดง'), 'on'], discordoff: [T('Discord not running', 'Discord ไม่ได้เปิด'), 'off'], unreachable: [T('Companion not responding', 'companion ไม่ตอบสนอง'), 'off'] }[S.mode];
}
/* Discord-style account bar: avatar + status dot, name, one-line status, gear -> Settings. Narrow: avatar + gear only. */
function acctPanel(compact) {
  const on = idOn(), [txt, st] = acctStatus(), name = on ? DCID.name : 'Discord';
  const pop = S.acctOpen ? `<div class="mk-menu mk-acct-pop" role="dialog" aria-label="${T('Discord account', 'บัญชี Discord')}"><div class="mk-acct-pop-h">${idAv(on)}<span><b>${esc(name)}</b><small>${on ? DCID.handle : T('Not connected', 'ยังไม่เชื่อมต่อ')}</small></span></div><p class="vs-caption" style="margin:6px 10px">${esc(txt)}</p><button type="button" data-act="toast" data-arg="${T('Prototype: this would open Discord Desktop', 'ตัวอย่าง: จะเปิด Discord Desktop')}">${T('Open Discord', 'เปิด Discord')}</button></div>` : '';
  return `<div class="mk-acct ${compact ? 'compact' : ''}" data-st="${st}" data-open="${!!S.acctOpen}"><button type="button" class="mk-acct-id" data-act="acctpop" data-k="acct" aria-haspopup="dialog" aria-expanded="${!!S.acctOpen}" aria-label="${T('Discord account', 'บัญชี Discord')}: ${esc(name)}. ${esc(txt)}"><span class="mk-acct-av">${idAv(on)}<span class="mk-acct-dot" data-s="${st}"></span></span><span class="mk-acct-t"><b class="mk-acct-n">${esc(name)}</b><small class="mk-acct-s">${esc(txt)}</small></span></button><button type="button" class="vs-icon-btn mk-gear" data-act="screen" data-arg="settings" title="${T('Settings', 'ตั้งค่า')}" aria-label="${T('Settings', 'ตั้งค่า')}">${GEAR}</button>${pop}</div>`;
}
function closeAcct(cb) { const p = $('.mk-acct-pop'); if (!p || reduced()) { S.acctOpen = false; render(); cb && cb(); return; } p.classList.add('mk-out'); setTimeout(() => { S.acctOpen = false; render(); cb && cb(); }, 120); }
const PV = { view: 'popout' };
const mkScene = o => Object.assign({ name: '', type: 'playing', actName: 'Vibe', l1: '', l1url: '', l2: '', l2url: '', art: 'a1', artText: '', artUrl: '', small: '', smallText: '', smallUrl: '', vars: false, btns: [{ label: '', url: '' }, { label: '', url: '' }] }, o);
const S = {
  lang: 'en', theme: 'light', screen: 'now', mode: 'auto', prevMode: 'auto',
  pinned: 'coding', frozen: 'coding', menuOpen: false, noticeSeen: false, noticeHidden: false, trayTab: 'menu',
  scenes: [
    { id: 'design', name: 'Design', type: 'playing', l1: 'Designing in Figma', l2: 'Pixel-pushing since 9 AM', art: 'a1', small: 'a4', vars: false, btns: [{ label: 'Portfolio', url: 'https://example.com/me' }, { label: '', url: '' }] },
    { id: 'coding', name: 'Coding', type: 'playing', l1: 'Writing code', l2: 'Tests are green (mostly)', art: 'a4', small: '', vars: false, btns: [{ label: '', url: '' }, { label: '', url: '' }] },
    { id: 'music', name: 'Music', type: 'listening', l1: 'Spotify on repeat', l2: 'Lo-fi beats to refactor to', art: 'a2', small: '', vars: false, btns: [{ label: '', url: '' }, { label: '', url: '' }] },
    { id: 'gaming', name: 'Gaming', type: 'playing', l1: 'Escaping the underworld', l2: 'Run #214', art: 'a3', small: '', vars: false, btns: [{ label: '', url: '' }, { label: '', url: '' }] },
    { id: 'focus', name: 'Focus (names the app)', type: 'playing', l1: 'Working in {app}', l2: '{window}', art: 'a1', small: '', vars: true, btns: [{ label: '', url: '' }, { label: '', url: '' }] },
    { id: 'watch', name: 'Watching', type: 'watching', l1: 'Watching videos', l2: 'Chill break', art: 'a2', small: '', vars: false, btns: [{ label: '', url: '' }, { label: '', url: '' }] },
  ],
  rules: [
    { id: 'r1', kind: 'app', app: 'figma', scene: 'design' },
    { id: 'r2', kind: 'app', app: 'code', scene: 'coding' },
    { id: 'r3', kind: 'app', app: 'spotify', scene: 'music' },
    { id: 'r4', kind: 'app', app: 'hades', scene: 'gaming' },
    { id: 'r5', kind: 'web', app: 'chrome', contains: 'YouTube', scene: 'watch' },
    { id: 'r6', kind: 'web', app: 'chrome', contains: 'Figma', scene: 'design' },
    { id: 'r7', kind: 'hide', app: 'mybank' },
  ],
  drawer: null, picker: null, save: 'saved', saveAt: '09:41', failNext: false, saveTimer: null,
  fr: { step: 1, discord: 'ok', app: 'figma', scene: 'design', sent: 'idle' },
  set: { autostart: true, hotkey: 'Ctrl + Alt + H', capture: false, hist: true, retention: '30', histCleared: false, confirmClear: false, confirmQuit: false, imp: false, appId: '' },
  lastFocus: null, pvView: 'popout',
};
S.scenes = S.scenes.map(mkScene); Object.assign(S.scenes[0], { artText: 'Hinata at his desk', smallText: 'Online', l1url: 'https://example.com/work' });
const appBy = id => [...APPS, ...INSTALLED, ...SYSTEM].find(a => a.id === id) || { id, name: id, exe: id + '.exe', g: id.slice(0, 2) };
const sceneBy = id => S.scenes.find(s => s.id === id);
const T = (en, th) => (S.lang === 'th' ? th : en);

/* ---------- small helpers (real classes) ---------- */
const icoOf = (a, lg) => a.img ? `<img class="mk-ico ${lg ? 'mk-ico-lg' : ''}" src="${A_}${a.img}" alt="">` : `<span class="mk-ico-fb ${lg ? 'mk-ico-lg' : ''}" aria-hidden="true">${esc(a.g || a.name.slice(0, 2))}</span>`;
const sv = (d, w = 14) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  pin: sv('<path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z"/>'), pause: sv('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  hide: sv('<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.6 7.6A17 17 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'), x: sv('<path d="M6 6l12 12M18 6L6 18"/>'), edit: sv('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', 16), play: sv('<path d="M7 4l13 8-13 8z"/>'), globe: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', 16),
  folder: sv('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'), lock: sv('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  up: sv('<path d="M12 20V8M6 13l6-6 6 6M4 4h16"/>'), down: sv('<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>'),
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};
const NAV_ICO = {
  now: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 10h4.2l1.7-4 2.4 8 1.7-4h5"/></svg>',
  scenes: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.8l7.2 4.2L10 11.2 2.8 7 10 2.8Z"/><path d="M4.3 12.3L10 15.6l5.7-3.3"/></svg>',
  settings: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="4.2"/><circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none"/><path d="M16.2 10h1.6M10 16.2v1.6M3.8 10H2.2M10 3.8V2.2M14.4 14.4l1.1 1.1M5.6 14.4l-1.1 1.1M5.6 5.6L4.5 4.5M14.4 5.6l1.1-1.1"/></svg>',
};
const pageHead = (kicker, title, sub) => `<div class="vs-page-head"><span class="vs-kicker">${kicker}</span><h1 class="vs-title">${title}</h1>${sub ? `<p class="vs-subcopy">${sub}</p>` : ''}</div>`;
const sw = (id, label, hint, on) => `<div class="vs-row"><div class="vs-row-copy"><strong>${label}</strong><small>${hint}</small></div><label class="vs-switch"><input type="checkbox" id="${id}" data-bind="tgl" data-id="${id}" aria-label="${esc(label)}" ${on ? 'checked' : ''}><span></span></label></div>`;
const langSeg = () => `<div class="vs-seg" role="group" aria-label="Language / ภาษา"><button type="button" data-act="lang" data-arg="th" aria-pressed="${S.lang === 'th'}">TH</button><button type="button" data-act="lang" data-arg="en" aria-pressed="${S.lang === 'en'}">EN</button></div>`;
const themeBtn = () => `<button type="button" class="vs-icon-btn" data-act="theme" data-arg="${S.theme === 'dark' ? 'light' : 'dark'}" aria-label="${T('Switch light / dark theme', 'สลับธีมสว่าง/มืด')}">${S.theme === 'dark' ? I.sun : I.moon}</button>`;
const cluster = () => `<div class="vs-toggle-cluster">${langSeg()}${themeBtn()}</div>`;

/* ---------- derived state ---------- */
function curScene() {
  switch (S.mode) {
    case 'auto': case 'discordoff': case 'unreachable': return sceneBy('design');
    case 'pinned': return sceneBy(S.pinned);
    case 'paused': return sceneBy(S.frozen);
    default: return null;
  }
}
const activeRuleId = () => (S.mode === 'auto' || S.mode === 'discordoff' ? 'r1' : S.mode === 'autohide' ? 'r7' : null);
const subst = (s, c) => s.replace(/\{app\}/g, c.app).replace(/\{window\}/g, c.win);
/* Discord Desktop dark "user profile popout" + "member list" replicas. Fake identity (golf / @golf); the real app uses state.discordUser {id, username, displayName, avatarUrl}. */
function dcCard(sc, o = {}) {
  const on = idOn(), list = o.view === 'list';
  const name = on ? DCID.name : T('Discord user', 'ผู้ใช้ Discord'), handle = on ? DCID.handle : T('Not connected', 'ยังไม่เชื่อมต่อ');
  const ctx = { app: o.app || 'Figma', win: o.win || 'Landing page v3 – Figma' };
  const dim = o.ghost ? 'opacity:.6' : '';
  const dot = `<span class="dcp-dot ${on ? '' : 'off'}" aria-hidden="true"></span>`;
  if (!sc) {
    const none = esc(o.sub || T('Nothing is shown on your profile.', 'ไม่มีอะไรแสดงบนโปรไฟล์ของคุณ'));
    if (list) return `<div class="dcp dcp-list" style="${dim}" role="img" aria-label="${esc(name)}"><div class="dcp-mlh">${T('ONLINE — 1', 'ออนไลน์ — 1')}</div><div class="dcp-mrow"><span class="dcp-mav">${idAv(on)}${dot}</span><span class="dcp-mt"><b>${esc(name)}</b></span></div></div>`;
    return `<div class="dcp" style="${dim}" role="img" aria-label="${esc(name + '. ' + none)}"><div class="dcp-top"><div class="dcp-banner"></div><div class="dcp-av">${idAv(on)}${dot}</div></div><div class="dcp-id"><b>${esc(name)}</b><span>${esc(handle)}</span></div><div class="dcp-hr"></div><div class="dcp-none"><b>${esc(o.title || T('No activity', 'ไม่มีกิจกรรม'))}</b><span>${none}</span></div></div>`;
  }
  const lbl = { playing: T('Playing', 'กำลังเล่น'), listening: T('Listening to', 'กำลังฟัง'), watching: T('Watching', 'กำลังดู'), competing: T('Competing in', 'กำลังแข่งใน') }[sc.type];
  const l1 = sc.vars ? subst(sc.l1, ctx) : sc.l1, l2 = sc.vars ? subst(sc.l2, ctx) : sc.l2, an = sc.actName || 'Vibe';
  if (list) return `<div class="dcp dcp-list" style="${dim}" role="img" aria-label="${esc(name + ', ' + lbl + ' ' + an)}"><div class="dcp-mlh">${T('ONLINE — 1', 'ออนไลน์ — 1')}</div><div class="dcp-mrow"><span class="dcp-mav">${idAv(on)}${dot}</span><span class="dcp-mt"><b>${esc(name)}</b><small data-pv="act">${lbl} <b>${esc(an)}</b></small></span></div></div>`;
  const b = sc.btns.map((x, i) => [x, i]).filter(x => x[0].label);
  const lk = (cls, area, txt, url) => `<span class="${cls} ${url ? 'dcp-link' : ''}" data-pv="${area}">${esc(txt)}</span>`;
  return `<div class="dcp" style="${dim}" role="img" aria-label="${esc(name + ', ' + lbl + ' ' + an + '. ' + l1 + '. ' + l2)}">
    <div class="dcp-top"><div class="dcp-banner"></div><div class="dcp-av">${idAv(on)}${dot}</div></div>
    <div class="dcp-id"><b>${esc(name)}</b><span>${esc(handle)}</span></div><div class="dcp-hr"></div>
    <div class="dcp-act"><div class="dcp-lbl" data-pv="act">${lbl}</div>
     <div class="dcp-row"><div class="dcp-img" data-pv="large" ${sc.artText ? `data-tip="${esc(sc.artText)}"` : ''}><img src="${artSrc(sc.art)}" alt="">${sc.small ? `<span class="dcp-sm" data-pv="small" ${sc.smallText ? `data-tip="${esc(sc.smallText)}"` : ''}><img src="${artSrc(sc.small)}" alt=""></span>` : ''}</div>
      <div class="dcp-tx"><b class="dcp-name" data-pv="act">${esc(an)}</b>${lk('dcp-l', 'details', l1 || '—', sc.l1url)}${lk('dcp-l', 'state', l2 || ' ', sc.l2url)}</div></div>
     ${b.length ? `<div class="dcp-btns">${b.map(x => `<span class="dcp-btn" data-pv="btn${x[1]}">${esc(x[0].label)}</span>`).join('')}</div>` : ''}</div></div>`;
}
const pvToggle = () => `<div class="vs-segmented mk-pvt" role="radiogroup" aria-label="${T('Preview type', 'ประเภทตัวอย่าง')}"><button type="button" role="radio" aria-checked="${S.pvView !== 'list'}" class="${S.pvView !== 'list' ? 'is-on' : ''}" data-act="pvview" data-arg="popout">${T('Profile popout', 'โปรไฟล์ป๊อปอัป')}</button><button type="button" role="radio" aria-checked="${S.pvView === 'list'}" class="${S.pvView === 'list' ? 'is-on' : ''}" data-act="pvview" data-arg="list">${T('Member list', 'รายชื่อสมาชิก')}</button></div>`;
const dcWrap = (sc, o = {}) => `<div class="mk-pvwrap">${dcCard(sc, Object.assign({ view: S.pvView }, o))}${pvToggle()}${S.pvView === 'list' && sc ? `<p class="vs-preview-foot">${T('The member list only shows the activity type and name. Other fields appear in the profile popout.', 'รายชื่อสมาชิกแสดงเฉพาะประเภทและชื่อกิจกรรม ช่องอื่นดูได้ในโปรไฟล์ป๊อปอัป')}</p>` : ''}</div>`;

/* ---------- Now ---------- */
function modeInfo() {
  const sc = curScene(), n = sc && sc.name;
  const conn = [T('Discord', 'Discord'), `<span class="mk-idv">${idAv(true, 'sm')}${T('Connected as ', 'เชื่อมต่อเป็น ')}${DCID.handle}</span>`];
  return {
    auto: { pill: 'good', badge: T('Auto', 'อัตโนมัติ'), title: T('Showing “' + n + '” on Discord', 'กำลังแสดง “' + n + '” บน Discord'),
      why: T('Because Figma is the app you used most recently, and your rule says Figma → Design.', 'เพราะ Figma คือแอปที่คุณใช้ล่าสุด และกฎของคุณกำหนดว่า Figma → Design'),
      facts: [[T('Why', 'เหตุผล'), T('Rule: Figma → Design', 'กฎ: Figma → Design')], [T('Also open', 'เปิดอยู่ด้วย'), 'VS Code, Spotify'], conn] },
    pinned: { pill: 'accent', badge: T('Pinned', 'ปักไว้'), title: T('Pinned: ' + n, 'ปักไว้: ' + n),
      why: T('You pinned this Scene. It stays on Discord until you press Back to Auto — closing apps or restarting Vibe won’t change it.', 'คุณปักซีนนี้ไว้ จะแสดงบน Discord จนกว่าจะกด กลับสู่อัตโนมัติ — การปิดแอปหรือรีสตาร์ท Vibe ไม่เปลี่ยนซีน'),
      facts: [[T('Why', 'เหตุผล'), T('Pinned by you', 'คุณปักไว้')], [T('Until', 'จนถึง'), T('You cancel it', 'คุณยกเลิก')], conn] },
    paused: { pill: 'warn', badge: T('Paused', 'หยุดสลับ'), title: T('Paused on “' + n + '”', 'หยุดสลับที่ “' + n + '”'),
      why: T('Auto-switching is off. Discord keeps showing this Scene even if you change apps, until you resume.', 'ปิดการสลับอัตโนมัติ Discord จะแสดงซีนนี้ต่อแม้คุณเปลี่ยนแอป จนกว่าจะกลับมาทำงานต่อ'),
      facts: [[T('Why', 'เหตุผล'), T('You paused switching', 'คุณหยุดการสลับ')], [T('Switching', 'การสลับ'), T('Off', 'ปิด')], conn] },
    hidden: { pill: 'neutral', badge: T('Hidden', 'ซ่อนอยู่'), title: T('Hidden from Discord', 'ซ่อนจาก Discord'),
      why: T('You chose to hide. Discord shows nothing until you turn it back on (button here, tray, or Ctrl + Alt + H).', 'คุณเลือกซ่อน Discord จะไม่แสดงอะไรจนกว่าจะเปิดกลับ (ปุ่มนี้ ถาดระบบ หรือ Ctrl + Alt + H)'),
      facts: [[T('Why', 'เหตุผล'), T('Hidden by you', 'คุณซ่อนไว้')], [T('Shows', 'แสดง'), T('Nothing', 'ไม่มีอะไร')], conn] },
    autohide: { pill: 'neutral', badge: T('Hidden by rule', 'ซ่อนตามกฎ'), title: T('Hidden while MyBank Desktop is open', 'ซ่อนขณะที่ MyBank Desktop เปิดอยู่'),
      why: T('Your auto-hide rule: while MyBank Desktop is open, Discord shows nothing. It comes back when you close that app.', 'กฎซ่อนอัตโนมัติของคุณ: ขณะที่ MyBank Desktop เปิดอยู่ Discord จะไม่แสดงอะไร และจะกลับมาเมื่อปิดแอปนั้น'),
      facts: [[T('Why', 'เหตุผล'), T('Auto-hide: MyBank', 'ซ่อนอัตโนมัติ: MyBank')], [T('Shows', 'แสดง'), T('Nothing', 'ไม่มีอะไร')], conn] },
    none: { pill: 'neutral', badge: T('Nothing to show', 'ไม่มีอะไรแสดง'), title: T('No ruled app open — Discord shows nothing', 'ไม่มีแอปที่มีกฎเปิดอยู่ — Discord จึงไม่แสดงอะไร'),
      why: T('None of the apps in your rules are running. Open one of them, or add a rule for the app you’re using.', 'ไม่มีแอปในกฎของคุณที่กำลังทำงาน เปิดแอปที่มีกฎ หรือเพิ่มกฎให้แอปที่คุณใช้'),
      facts: [[T('Why', 'เหตุผล'), T('No rule matches', 'ไม่มีกฎที่ตรง')], [T('Shows', 'แสดง'), T('Nothing', 'ไม่มีอะไร')], conn] },
    discordoff: { pill: 'warn', badge: T('Discord not running', 'Discord ไม่ได้เปิด'), title: T('Discord isn’t running', 'Discord ไม่ได้เปิดอยู่'),
      why: T('Vibe can’t show anything until Discord is open. When it starts, Vibe will show “Design” (Figma rule) by itself — nothing to do.', 'Vibe แสดงอะไรไม่ได้จนกว่าจะเปิด Discord เมื่อเปิดแล้ว Vibe จะแสดง “Design” (กฎ Figma) ให้เอง ไม่ต้องทำอะไร'),
      facts: [[T('Why', 'เหตุผล'), T('Rule: Figma → Design', 'กฎ: Figma → Design')], [T('Shows', 'แสดง'), T('Nothing yet', 'ยังไม่มี')], [T('Discord', 'Discord'), `<span class="mk-idv">${idAv(false, 'sm')}${T('Open Discord Desktop', 'เปิด Discord Desktop')}</span>`]] },
    unreachable: { pill: 'warn', badge: T('Not connected', 'ติดต่อไม่ได้'), title: T('Can’t reach the Vibe companion', 'ติดต่อ Vibe companion ไม่ได้'),
      why: T('Studio can’t tell what Discord shows. The last thing we knew is dimmed on the right and may be wrong.', 'Studio ไม่ทราบว่า Discord แสดงอะไรอยู่ สิ่งที่เห็นทางขวาเป็นข้อมูลล่าสุดที่รู้และอาจไม่ถูกต้อง'),
      facts: [[T('Why', 'เหตุผล'), T('Unknown', 'ไม่ทราบ')], [T('Shows', 'แสดง'), T('Unknown', 'ไม่ทราบ')], [T('Discord', 'Discord'), `<span class="mk-idv">${idAv(false, 'sm')}${T('Unknown', 'ไม่ทราบ')}</span>`]] },
  }[S.mode];
}
function nowView() {
  const m = modeInfo(), sc = curScene(), mode = S.mode;
  const dis = mode === 'unreachable' ? 'disabled' : '';
  const b = (cls, act, arg, ico, txt, extra = '') => `<button class="vs-btn vs-btn-sm ${cls}" type="button" data-act="${act}" ${arg ? `data-arg="${arg}"` : ''} ${extra}>${ico}${txt}</button>`;
  const pinBtn = `<span class="mk-pop"><button class="vs-btn vs-btn-sm" type="button" data-act="pinmenu" data-k="pin" aria-haspopup="menu" aria-expanded="${S.menuOpen}" ${dis}>${I.pin}${mode === 'pinned' ? T('Change pinned Scene', 'เปลี่ยนซีนที่ปัก') : T('Pin a Scene', 'ปักซีน')}</button>${S.menuOpen ? `<div class="mk-menu" role="menu" aria-label="${T('Pick a Scene to pin', 'เลือกซีนที่จะปัก')}">${S.scenes.map(s => `<button type="button" role="menuitem" data-act="pin" data-arg="${s.id}"><img src="${A_}${ART[s.art]}" alt="">${esc(s.name)}</button>`).join('')}<p class="vs-caption">${T('Stays until you press Back to Auto.', 'อยู่จนกว่าจะกดกลับสู่อัตโนมัติ')}</p></div>` : ''}</span>`;
  const pauseOff = dis || ['none', 'hidden', 'autohide', 'pinned', 'paused'].includes(mode);
  const pauseBtn = b('', 'mode', 'paused', I.pause, T('Pause', 'พักการสลับ'), pauseOff ? 'disabled' : '');
  const hideBtn = b('', 'mode', 'hidden', I.hide, T('Hide from Discord', 'ซ่อนจาก Discord'), dis || mode === 'hidden' || mode === 'autohide' ? 'disabled' : '');
  let ctl;
  if (mode === 'pinned') ctl = b('vs-btn-primary', 'mode', 'auto', '', T('Back to Auto', 'กลับสู่อัตโนมัติ')) + pinBtn + hideBtn;
  else if (mode === 'paused') ctl = b('vs-btn-primary', 'mode', 'auto', I.play, T('Resume Auto', 'กลับไปสลับอัตโนมัติ')) + pinBtn + hideBtn;
  else if (mode === 'hidden') ctl = b('vs-btn-primary', 'mode', S.prevMode === 'hidden' ? 'auto' : S.prevMode, '', T('Show on Discord again', 'แสดงบน Discord อีกครั้ง'));
  else if (mode === 'autohide') ctl = b('', 'scrollrules', '', '', T('See the auto-hide rule', 'ดูกฎซ่อนอัตโนมัติ'));
  else if (mode === 'unreachable') ctl = b('vs-btn-primary', 'mode', 'auto', '', T('Try again', 'ลองอีกครั้ง')) + b('', 'noop', '', '', T('Start companion', 'เริ่ม companion'));
  else if (mode === 'discordoff') ctl = b('vs-btn-primary', 'mode', 'auto', '', T('Check again', 'ตรวจสอบอีกครั้ง')) + pinBtn + hideBtn;
  else ctl = pinBtn + pauseBtn + hideBtn;
  const alert = mode === 'unreachable' ? `<div class="vs-alert is-bad" role="alert"><span class="vs-alert-text"><strong>${T('Companion not responding.', 'companion ไม่ตอบสนอง')}</strong> ${T('Vibe runs as a background companion; it may have been closed or crashed. Your Scenes and rules are safe on disk.', 'Vibe ทำงานเป็น companion เบื้องหลัง อาจถูกปิดหรือหยุดทำงาน ซีนและกฎของคุณยังปลอดภัยในเครื่อง')}</span></div>`
    : mode === 'discordoff' ? `<div class="vs-alert is-warn" role="status"><span class="vs-alert-text"><strong>${T('Open Discord to show your Scene.', 'เปิด Discord เพื่อแสดงซีนของคุณ')}</strong> ${T('The Discord desktop app must be running on this PC; Discord in a browser doesn’t support Rich Presence.', 'ต้องเปิดแอป Discord บนเดสก์ท็อปในเครื่องนี้ Discord บนเบราว์เซอร์ไม่รองรับ Rich Presence')}</span></div>` : '';
  const preview = mode === 'unreachable' ? dcWrap(sc, { ghost: true }) : mode === 'discordoff' ? dcWrap(null, { title: T('Discord not running', 'Discord ไม่ได้เปิด'), sub: T('Would show “Design” as soon as Discord starts.', 'จะแสดง “Design” ทันทีที่เปิด Discord') }) : sc ? dcWrap(sc) : dcWrap(null, { title: mode === 'hidden' || mode === 'autohide' ? T('Hidden', 'ซ่อนอยู่') : T('No activity', 'ไม่มีกิจกรรม') });
  const previewLabel = mode === 'unreachable' ? T('Last known · may be out of date', 'ข้อมูลล่าสุด · อาจไม่ตรงปัจจุบัน') : T('Preview — how others see you on Discord', 'ตัวอย่าง — คนอื่นเห็นคุณบน Discord แบบนี้');
  const hero = `<section class="vs-now-hero" aria-labelledby="nowScene"><span class="vs-kicker"><span class="vs-pill vs-pill-${m.pill}">${m.badge}</span></span>
    <h2 class="vs-now-scene" id="nowScene">${esc(m.title)}</h2><p class="vs-now-sub">${esc(m.why)}</p>
    <div class="vs-facts">${m.facts.map(f => `<div class="vs-fact"><span class="vs-fact-label">${f[0]}</span><span class="vs-fact-value">${f[1]}</span></div>`).join('')}</div>
    <div class="vs-actions">${ctl}</div>
    <p class="vs-footnote">${T('You can close this window — the companion keeps running in the tray. Open Studio again when you want to change something.', 'ปิดหน้านี้ได้เลย — companion ทำงานต่อในถาดระบบ เปิด Studio อีกครั้งเมื่ออยากเปลี่ยนอะไร')}</p></section>`;
  const rules = [...S.rules].sort((a, b) => (b.kind === 'hide') - (a.kind === 'hide')).map(ruleRow).join('');
  return `${pageHead(T('Overview', 'ภาพรวม'), T('Now', 'ตอนนี้'), T('What Discord is showing, and why — then the apps that decide it.', 'สิ่งที่ Discord กำลังแสดงและเพราะอะไร แล้วตามด้วยแอปที่เป็นตัวกำหนด'))}${alert}
  <div class="vs-ed-grid">${hero}<aside class="vs-preview-col" aria-label="${T('Discord preview', 'ตัวอย่าง Discord')}"><div class="vs-preview-label"><span>${previewLabel}</span></div>${preview}</aside></div>
  <section class="vs-card" id="rules" aria-labelledby="rh" style="margin-top:24px"><div class="vs-card-head mk-head-row"><div><h2 id="rh">${T('App rules', 'กฎของแอป')}</h2>
    <p class="vs-subcopy">${T('When an app below is open, Discord shows its Scene. If several are open, the one you used most recently wins. Auto-hide rules come first and win over everything.', 'เมื่อแอปด้านล่างเปิดอยู่ Discord จะแสดงซีนของแอปนั้น ถ้าเปิดหลายแอป จะใช้แอปที่ใช้ล่าสุด กฎซ่อนอัตโนมัติอยู่บนสุดและมีผลเหนือกฎอื่น')}</p></div>
    <button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="addrule" data-k="addrule">${I.plus}${T('Add rule', 'เพิ่มกฎ')}</button></div>
    <ul class="mk-rules">${rules}</ul></section>`;
}
function ruleRow(r) {
  const a = appBy(r.app), active = activeRuleId() === r.id;
  const web = r.kind === 'web', hide = r.kind === 'hide';
  const name = web ? T('Tab: “' + r.contains + '”', 'แท็บ: “' + r.contains + '”') : a.name;
  const sub = web ? T(`${a.name} · title contains “${r.contains}”`, `${a.name} · ชื่อแท็บมีคำว่า “${r.contains}”`) : a.exe;
  const kind = web ? T('Web rule', 'กฎเว็บ') : hide ? T('Auto-hide rule', 'กฎซ่อนอัตโนมัติ') : T('App rule', 'กฎแอป');
  const tgt = hide ? `<span class="mk-target">${I.hide}${T('Hide from Discord while open', 'ซ่อนจาก Discord ขณะเปิดอยู่')}</span>`
    : `<select aria-label="${T('Scene for ', 'ซีนของ ')}${esc(name)}" data-bind="rulescene" data-id="${r.id}">${S.scenes.map(s => `<option value="${s.id}" ${s.id === r.scene ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
  return `<li class="mk-rule ${active ? 'is-active' : ''} ${S.fresh === r.id ? 'mk-row-in' : ''}" data-rule="${r.id}"><span class="vs-visually-hidden">${kind}</span><span class="mk-label">${web ? `<span class="mk-ico-fb" aria-hidden="true">${I.globe}</span>` : icoOf(a)}<span style="min-width:0"><strong>${esc(name)}</strong><small>${esc(sub)}</small></span></span><span class="mk-arrow" aria-hidden="true">→</span>${tgt}
    <span class="mk-acts">${active ? `<span class="vs-pill vs-pill-good">${T('Active', 'ใช้อยู่')}</span>` : ''}${hide ? '' : `<button class="vs-btn vs-btn-sm vs-btn-ghost" type="button" data-act="editscene" data-arg="${r.scene}" data-k="edit-${r.id}">${I.edit}${T('Edit Scene', 'แก้ซีน')}<span class="vs-visually-hidden"> ${esc(sceneBy(r.scene).name)}</span></button>`}<button class="vs-icon-btn-danger" type="button" data-act="rmrule" data-arg="${r.id}" aria-label="${T('Remove rule', 'ลบกฎ')}: ${esc(name)}">${I.x}</button></span></li>`;
}

/* ---------- Scenes ---------- */
function scenesView() {
  const rows = S.scenes.map(s => {
    const used = S.rules.filter(r => r.scene === s.id).map(r => r.kind === 'web' ? T('tab “' + r.contains + '”', 'แท็บ “' + r.contains + '”') : appBy(r.app).name);
    const live = curScene() && curScene().id === s.id && ['auto', 'pinned', 'paused'].includes(S.mode);
    return `<button type="button" class="vs-scene-row ${live ? 'is-live' : ''} ${S.fresh === s.id ? 'mk-row-in' : ''}" data-act="editscene" data-arg="${s.id}" data-k="lib-${s.id}"><span class="vs-scene-icon"><img src="${A_}${ART[s.art]}" alt=""></span>
      <span class="vs-scene-meta"><span class="vs-scene-name">${esc(s.name)}</span><span class="vs-scene-sub">${esc(s.l1)}${s.l2 ? ' · ' + esc(s.l2) : ''}</span><span class="vs-scene-willshow">${used.length ? T('Used by: ', 'ใช้โดย: ') + esc(used.join(', ')) : T('Not used by any rule yet', 'ยังไม่มีกฎที่ใช้ซีนนี้')}</span></span>
      ${live ? `<span class="vs-pill vs-pill-accent">${T('On Discord', 'กำลังแสดง')}</span>` : ''}<span class="vs-pill vs-pill-neutral">${esc(TYPES.find(t => t[0] === s.type)[S.lang === 'th' ? 2 : 1])}</span></button>`;
  }).join('');
  return `${pageHead(T('Library', 'คลัง'), T('Scenes', 'Scene ทั้งหมด'), T('A Scene is the text and artwork that appears on Discord. Rules on Now decide when each one is used.', 'Scene คือชุดข้อความและภาพที่จะขึ้นบน Discord กฎในหน้าตอนนี้เป็นตัวกำหนดว่าจะใช้อันไหนเมื่อไร'))}
  <section class="vs-card vs-library" aria-labelledby="slt"><div class="vs-card-head mk-head-row"><h2 id="slt">${T('Scene library', 'คลัง Scene')}</h2><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="newscene" data-k="newscene">${I.plus}${T('New Scene', 'สร้าง Scene ใหม่')}</button></div><div id="sceneList">${rows}</div>
  <div class="vs-toolbar"><span class="vs-hint">${T('Select a Scene to edit it — the editor opens beside this list.', 'เลือก Scene เพื่อแก้ไข — ตัวแก้ไขจะเปิดด้านข้างของรายการนี้')}</span></div></section>`;
}

/* ---------- Settings ---------- */
function histRows() {
  if (S.set.histCleared) return `<p class="vs-caption">${T('History is empty.', 'ประวัติว่างเปล่า')}</p>`;
  return `<div class="mk-hist">${[['11:02', 'Design · Figma', '1h 12m'], ['09:41', 'Coding · Visual Studio Code', '1h 21m'], ['09:10', T('Hidden · MyBank Desktop', 'ซ่อน · MyBank Desktop'), '12m'], ['08:30', 'Music · Spotify', '40m']].map(r => `<div><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span></div>`).join('')}</div>`;
}
function settingsView() {
  const s = S.set;
  const card = (title, sub, body) => `<section class="vs-card"><div class="vs-card-head"><h2>${title}</h2>${sub ? `<p class="vs-subcopy">${sub}</p>` : ''}</div>${body}</section>`;
  return `${pageHead(T('Preferences', 'การตั้งค่า'), T('Settings', 'ตั้งค่า'), T('Connection, startup, shortcuts and your data. Everything here is stored on this PC.', 'การเชื่อมต่อ การเริ่มต้น ปุ่มลัด และข้อมูลของคุณ ทั้งหมดเก็บในเครื่องนี้'))}
  ${card(T('Discord connection', 'การเชื่อมต่อ Discord'), '', `<div class="vs-keystatus"><div class="vs-keystatus-row"><strong class="mk-idv">${idAv(idOn(), 'sm')}<span>${idLine(idOn())}</span></strong><span class="vs-statuspill ${idOn() ? 'ok' : 'warn'}">${idOn() ? T('Connected', 'เชื่อมต่อแล้ว') : T('Not running', 'ไม่ได้เปิด')}</span></div><p class="vs-caption">${T('Read from your local Discord Desktop — no login, no password, nothing stored. Uses Vibe’s built-in Discord application.', 'อ่านจาก Discord Desktop ในเครื่อง — ไม่ต้องล็อกอิน ไม่เก็บรหัสผ่านหรือข้อมูลใด ๆ ใช้แอปพลิเคชัน Discord ที่มาพร้อม Vibe')}</p></div>
    <div class="vs-form-actions" style="margin-top:0"><button class="vs-btn vs-btn-sm" type="button" data-act="toast" data-arg="${T('Reconnected to Discord', 'เชื่อมต่อ Discord ใหม่แล้ว')}">${T('Reconnect', 'เชื่อมต่อใหม่')}</button></div>
    <details class="vs-disclosure"><summary>${T('Advanced', 'ขั้นสูง')}</summary><div class="vs-disclosure-body"><div class="vs-field"><label class="vs-label" for="appid">Discord Application ID</label><input class="vs-input" type="text" id="appid" inputmode="numeric" placeholder="${T('Built-in ID in use — leave empty', 'ใช้ ID ที่มาพร้อมโปรแกรม — เว้นว่างได้')}" value="${esc(s.appId)}" data-bind="appid"><p class="vs-hint">${T('Only if you want your own Discord app name and artwork. Leave empty to use the built-in one.', 'ใช้เมื่ออยากใช้ชื่อและภาพของแอป Discord ของคุณเอง เว้นว่างเพื่อใช้ค่าที่มาพร้อมโปรแกรม')}</p></div></div></details>`)}
  ${card(T('Startup & window', 'เริ่มต้นและหน้าต่าง'), '', `${sw('autostart', T('Start with Windows', 'เริ่มพร้อม Windows'), T('Vibe starts in the tray and shows your Scene without opening this window.', 'Vibe เริ่มในถาดระบบและแสดงซีนโดยไม่ต้องเปิดหน้าต่างนี้'), s.autostart)}
    <div class="vs-row"><div class="vs-row-copy"><strong>${T('Closing this window (✕)', 'เมื่อกดปิดหน้าต่าง (✕)')}</strong><small>${T('Hides to the tray; Vibe keeps running. Quit from the tray menu or from the bottom of this page.', 'ย่อไปที่ถาดระบบ Vibe ยังทำงานต่อ ออกจากโปรแกรมได้จากเมนูถาดหรือด้านล่างของหน้านี้')}</small></div><button class="vs-btn vs-btn-sm" type="button" data-act="trayscreen" data-arg="notice">${T('Show the notice again', 'แสดงประกาศอีกครั้ง')}</button></div>`)}
  ${card(T('Global hotkey', 'ปุ่มลัดทั่วระบบ'), '', `<div class="vs-row"><div class="vs-row-copy"><strong>${T('Hide / show on Discord', 'ซ่อน / แสดงบน Discord')}</strong><small>${T('Works from any app, even when Studio is closed.', 'ใช้ได้จากทุกแอป แม้ปิด Studio อยู่')}</small></div><span class="mk-kbd" aria-live="polite">${s.capture ? T('Press keys…', 'กดปุ่มที่ต้องการ…') : esc(s.hotkey)}</span><button class="vs-btn vs-btn-sm" type="button" data-act="capture" data-k="capture">${s.capture ? T('Cancel', 'ยกเลิก') : T('Change', 'เปลี่ยน')}</button></div>
    <p class="vs-caption">${T('Registered. If another app already uses this shortcut, Vibe says so here instead of failing silently.', 'ลงทะเบียนแล้ว หากแอปอื่นใช้ปุ่มนี้อยู่ Vibe จะแจ้งตรงนี้ ไม่ปล่อยให้ล้มเหลวเงียบๆ')}</p>`)}
  ${card(T('Back up & move', 'สำรองและย้ายข้อมูล'), T('One file with your Scenes, app rules and web rules. Saved on this PC only; secrets are never included.', 'ไฟล์เดียวที่มีซีน กฎแอป และกฎเว็บ เก็บในเครื่องนี้เท่านั้น ไม่รวมคีย์ลับ'), `<div class="vs-form-actions" style="margin-top:0"><button class="vs-btn vs-btn-sm" type="button" data-act="toast" data-arg="${T('Saved vibe-backup-2026-10-02.json — 6 Scenes, 7 rules', 'บันทึก vibe-backup-2026-10-02.json แล้ว — 6 ซีน, 7 กฎ')}">${I.up}${T('Export…', 'ส่งออก…')}</button><button class="vs-btn vs-btn-sm" type="button" data-act="import">${I.down}${T('Import…', 'นำเข้า…')}</button></div>
    ${s.imp ? `<div class="vs-pair-bar" role="group" aria-label="${T('Import preview', 'ตัวอย่างการนำเข้า')}" style="margin-top:16px;flex-direction:column;align-items:flex-start"><strong>vibe-backup-2026-09-20.json</strong><span class="vs-hint" style="margin:0">${T('Contains 4 Scenes and 5 rules. Nothing changes until you confirm.', 'มี 4 ซีน และ 5 กฎ ยังไม่มีอะไรเปลี่ยนจนกว่าคุณจะยืนยัน')}</span>
      <label><input type="radio" name="imp" checked> ${T('Merge (keep mine, add new)', 'รวม (เก็บของเดิม เพิ่มของใหม่)')}</label><label><input type="radio" name="imp"> ${T('Replace everything', 'แทนที่ทั้งหมด')}</label>
      <div class="vs-actions"><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="importgo">${T('Import', 'นำเข้า')}</button><button class="vs-btn vs-btn-sm" type="button" data-act="import">${T('Cancel', 'ยกเลิก')}</button></div></div>` : ''}`)}
  ${card(T('History', 'ประวัติ'), '', `${sw('hist', T('Remember what Discord showed', 'จดจำสิ่งที่ Discord เคยแสดง'), T('Stored on this PC only. Window titles are kept only if a Scene uses {window}.', 'เก็บในเครื่องนี้เท่านั้น ชื่อหน้าต่างจะถูกเก็บเฉพาะเมื่อซีนใช้ {window}'), s.hist)}
    <div class="vs-row"><div class="vs-row-copy"><strong><label for="ret">${T('Keep history for', 'เก็บประวัติไว้')}</label></strong></div><select class="vs-select" id="ret" data-bind="ret"><option value="7" ${s.retention === '7' ? 'selected' : ''}>${T('7 days', '7 วัน')}</option><option value="30" ${s.retention === '30' ? 'selected' : ''}>${T('30 days', '30 วัน')}</option><option value="90" ${s.retention === '90' ? 'selected' : ''}>${T('90 days', '90 วัน')}</option></select></div>
    <p class="vs-section-label">${T('Today', 'วันนี้')}</p>${histRows()}
    <div class="vs-form-actions">${s.confirmClear ? `<span class="vs-hint" style="margin:0;align-self:center">${T('Delete all history?', 'ลบประวัติทั้งหมด?')}</span><button class="vs-btn vs-btn-sm vs-btn-danger" type="button" data-act="clearhist">${T('Yes, clear', 'ใช่ ล้างเลย')}</button><button class="vs-btn vs-btn-sm" type="button" data-act="askclear">${T('Cancel', 'ยกเลิก')}</button>` : `<button class="vs-btn vs-btn-sm" type="button" data-act="askclear" ${s.histCleared ? 'disabled' : ''}>${T('Clear history', 'ล้างประวัติ')}</button>`}</div>`)}
  ${card(T('Appearance', 'รูปลักษณ์'), T('Language and theme live here, at every window width.', 'ภาษาและธีมอยู่ที่นี่ ทุกขนาดหน้าต่าง'), `<div class="vs-row"><div class="vs-row-copy"><strong>${T('Language', 'ภาษา')}</strong></div>${langSeg()}</div><div class="vs-row"><div class="vs-row-copy"><strong>${T('Theme', 'ธีม')}</strong></div><div class="vs-seg" role="group" aria-label="${T('Theme', 'ธีม')}"><button type="button" data-act="theme" data-arg="light" aria-pressed="${S.theme === 'light'}">${T('Light', 'สว่าง')}</button><button type="button" data-act="theme" data-arg="dark" aria-pressed="${S.theme === 'dark'}">${T('Dark', 'มืด')}</button></div></div>`)}
  ${card(T('Quit Vibe', 'ออกจาก Vibe'), T('Quitting stops Discord presence until you start Vibe again. Closing the window (✕) does not quit.', 'การออกจะหยุดการแสดงบน Discord จนกว่าจะเปิด Vibe ใหม่ การกดปิดหน้าต่าง (✕) ไม่ใช่การออก'), s.confirmQuit ? `<div class="vs-form-actions" style="margin-top:0"><button class="vs-btn vs-btn-sm vs-btn-danger" type="button" data-act="quit">${T('Yes, quit Vibe', 'ใช่ ออกจาก Vibe')}</button><button class="vs-btn vs-btn-sm" type="button" data-act="askquit">${T('Cancel', 'ยกเลิก')}</button></div>` : `<div class="vs-form-actions" style="margin-top:0"><button class="vs-btn vs-btn-sm vs-btn-danger" type="button" data-act="askquit">${T('Quit Vibe', 'ออกจาก Vibe')}</button></div>`)}`;
}

/* ---------- First run (real .vs-scrim + .vs-onboard) ---------- */
function firstView() {
  const f = S.fr, step = f.step;
  const names = [T('Discord', 'Discord'), T('App', 'แอป'), T('Scene', 'ซีน')];
  const steps = `<ol class="vs-steps" aria-label="${T('Setup progress', 'ความคืบหน้า')}">${names.map((n, i) => `<li class="vs-step ${step === i + 1 ? 'is-on' : ''} ${step > i + 1 ? 'is-done' : ''}" ${step === i + 1 ? 'aria-current="step"' : ''}><span class="vs-step-n">${step > i + 1 ? '✓' : i + 1}</span>${n}</li>`).join('')}</ol>`;
  const act = (back, primary) => `<div class="vs-ob-actions">${back ? `<button class="vs-btn" type="button" data-act="frstep" data-arg="${back}">${T('Back', 'ย้อนกลับ')}</button>` : ''}${primary}<button class="vs-skip" type="button" data-act="finishskip">${T('Skip', 'ข้าม')}</button></div>`;
  let title, sub, body;
  if (step === 1) {
    title = T('Let’s get Discord showing your apps', 'มาให้ Discord แสดงแอปของคุณกัน'); sub = T('Vibe talks to the Discord app on this PC. No login, no copy-pasting IDs.', 'Vibe คุยกับแอป Discord ในเครื่องนี้ ไม่ต้องล็อกอิน ไม่ต้องคัดลอก ID');
    body = `<div class="mk-ob-body"><div class="vs-pair-bar">${f.discord === 'ok' ? `<span class="vs-pill vs-pill-good">${T('Discord found', 'พบ Discord')}</span><span>${T('Discord is running and Vibe is connected.', 'Discord เปิดอยู่และ Vibe เชื่อมต่อแล้ว')}</span>` : `<span class="vs-pill vs-pill-warn">${T('Discord not found', 'ไม่พบ Discord')}</span><span>${T('Open the Discord desktop app, then check again.', 'เปิดแอป Discord บนเดสก์ท็อป แล้วตรวจสอบอีกครั้ง')}</span><button class="vs-btn vs-btn-sm vs-btn-primary" type="button" data-act="frdiscord" data-arg="ok">${T('Check again', 'ตรวจสอบอีกครั้ง')}</button>`}</div></div>${act(0, `<button class="vs-btn vs-btn-primary" type="button" data-act="frstep" data-arg="2" ${f.discord === 'ok' ? '' : 'disabled'}>${T('Continue', 'ต่อไป')}</button>`)}`;
  } else if (step === 2) {
    title = T('Which app should Discord show?', 'ให้ Discord แสดงแอปไหน?'); sub = T('These are running right now. Pick one — you can add more later.', 'แอปเหล่านี้กำลังทำงานอยู่ เลือกหนึ่งแอป เพิ่มทีหลังได้');
    body = `<div class="mk-ob-body"><div class="mk-tiles" role="radiogroup" aria-label="${T('Running apps', 'แอปที่กำลังทำงาน')}">${APPS.filter(a => a.id !== 'mybank').map(a => `<button class="mk-tile" type="button" role="radio" aria-checked="${f.app === a.id}" aria-pressed="${f.app === a.id}" data-act="frapp" data-arg="${a.id}"><span class="vs-tile-icon">${icoOf(a, 1)}<span class="vs-tile-running" title="${T('Running now', 'กำลังทำงาน')}"></span></span><strong>${esc(a.name)}</strong></button>`).join('')}</div>
      <div class="vs-actions"><button class="vs-btn vs-btn-sm" type="button" data-act="toast" data-arg="Picked C:\\Tools\\sync.exe">${I.folder}${T('Browse for .exe…', 'เลือกไฟล์ .exe…')}</button><span class="vs-hint" style="margin:0">${T('System apps are hidden.', 'ซ่อนแอประบบแล้ว')}</span></div></div>${act(1, `<button class="vs-btn vs-btn-primary" type="button" data-act="frstep" data-arg="3">${T('Continue', 'ต่อไป')}</button>`)}`;
  } else {
    const sc = sceneBy(f.scene), a = appBy(f.app), sent = f.sent;
    title = T('Pick a Scene and see it on Discord', 'เลือกซีนแล้วดูบน Discord ทันที'); sub = T(`When ${a.name} is open, Discord will show this.`, `เมื่อเปิด ${a.name} Discord จะแสดงสิ่งนี้`);
    body = `<div class="mk-ob-body"><div class="vs-looks" role="radiogroup" aria-label="Scene" style="margin-top:0">${S.scenes.slice(0, 4).map(s => `<button class="vs-look" type="button" role="radio" aria-checked="${f.scene === s.id}" aria-pressed="${f.scene === s.id}" data-act="frscene" data-arg="${s.id}"><img src="${A_}${ART[s.art]}" alt="">${esc(s.name)}</button>`).join('')}</div>
      ${dcCard(sc, { app: a.name })}
      <div class="vs-grid2"><div class="vs-field"><label class="vs-label" for="frl1">${T('Line 1', 'บรรทัดที่ 1')}</label><input class="vs-input" type="text" id="frl1" value="${esc(sc.l1)}" data-bind="frline" data-line="l1"></div><div class="vs-field"><label class="vs-label" for="frl2">${T('Line 2', 'บรรทัดที่ 2')}</label><input class="vs-input" type="text" id="frl2" value="${esc(sc.l2)}" data-bind="frline" data-line="l2"></div></div>
      <div class="${sent === 'fail' ? 'vs-alert is-bad' : 'vs-pair-bar'}" role="status" aria-live="polite" style="margin:0">${sent === 'ok' ? `<span class="vs-pill vs-pill-good">${T('On Discord', 'อยู่บน Discord')}</span>` : sent === 'sending' ? `<span class="vs-pill vs-pill-neutral">${T('Sending…', 'กำลังส่ง…')}</span>` : sent === 'fail' ? '' : `<span class="vs-pill vs-pill-neutral">${T('Not on Discord yet', 'ยังไม่อยู่บน Discord')}</span>`}<span>${sent === 'idle' ? T('Press “Show on Discord” to try it.', 'กด “แสดงบน Discord” เพื่อลอง') : sent === 'sending' ? T('Waiting for Discord to confirm…', 'รอ Discord ยืนยัน…') : sent === 'ok' ? T('Discord confirmed — it’s on your profile now.', 'Discord ยืนยันแล้ว — แสดงบนโปรไฟล์ของคุณตอนนี้') : T('Discord didn’t accept it. Your text is kept; try again.', 'Discord ไม่รับข้อมูล ข้อความของคุณยังอยู่ ลองอีกครั้ง')}</span></div></div>
      <div class="vs-ob-actions"><button class="vs-btn" type="button" data-act="frstep" data-arg="2">${T('Back', 'ย้อนกลับ')}</button><button class="vs-btn" type="button" data-act="frsend" ${sent === 'sending' ? 'disabled' : ''}>${sent === 'ok' ? T('Send again', 'ส่งอีกครั้ง') : T('Show on Discord', 'แสดงบน Discord')}</button><button class="vs-btn vs-btn-primary" type="button" data-act="frfinish" ${sent === 'ok' ? '' : 'disabled'}>${T('Finish — go to Now', 'เสร็จสิ้น — ไปที่หน้าตอนนี้')}</button></div>`;
  }
  return `<div class="vs-scrim"></div><div class="vs-onboard" role="dialog" aria-modal="true" aria-labelledby="obt"><div class="vs-ob-mark mk-logo" aria-hidden="true"><img src="assets/ghost-final-d.svg" alt=""></div>${steps}<h2 class="vs-ob-title" id="obt">${title}</h2><p class="vs-ob-sub">${sub}</p>${body}</div>`;
}

/* ---------- Tray ---------- */
function trayView() {
  const sc = curScene(), nowLine = { auto: T('Auto · ', 'อัตโนมัติ · ') + (sc && sc.name), pinned: T('Pinned · ', 'ปักไว้ · ') + (sc && sc.name), paused: T('Paused · ', 'หยุดสลับ · ') + (sc && sc.name), hidden: T('Hidden', 'ซ่อนอยู่'), autohide: T('Hidden by rule', 'ซ่อนตามกฎ'), none: T('Nothing shown', 'ไม่แสดงอะไร'), discordoff: T('Discord not running', 'Discord ไม่ได้เปิด'), unreachable: T('Not connected', 'ติดต่อไม่ได้') }[S.mode];
  const tabs = `<div class="vs-segmented" role="tablist" style="align-self:flex-start"><button type="button" role="tab" class="${S.trayTab === 'menu' ? 'is-on' : ''}" aria-selected="${S.trayTab === 'menu'}" data-act="traytab" data-arg="menu">${T('Tray menu', 'เมนูถาดระบบ')}</button><button type="button" role="tab" class="${S.trayTab === 'notice' ? 'is-on' : ''}" aria-selected="${S.trayTab === 'notice'}" data-act="traytab" data-arg="notice">${T('Close (✕) notice', 'ประกาศเมื่อกดปิด (✕)')}</button></div>`;
  const on = m => (S.mode === m ? 'on' : '');
  const menu = `<div class="mk-wmenu" role="menu" aria-label="Vibe tray menu"><div class="mh"><span class="ghost"><img src="assets/ghost-final-d.svg" alt="" width="100%" height="100%"></span><div><b>Vibe Studio</b><small>${T('Now: ', 'ตอนนี้: ')}${esc(nowLine)}</small></div></div>
    <button type="button" role="menuitem" data-act="screen" data-arg="now">${T('Open Studio', 'เปิด Studio')}</button><hr>
    <button type="button" role="menuitem" class="${S.mode === 'pinned' ? 'on' : ''}">${T('Pin a Scene', 'ปักซีน')} <span class="k">▸</span></button>
    <div class="sub">${S.scenes.slice(0, 4).map(s => `<button type="button" role="menuitem" data-act="pin" data-arg="${s.id}" class="${S.mode === 'pinned' && S.pinned === s.id ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div>
    <button type="button" role="menuitem" class="${on('paused')}" data-act="mode" data-arg="${S.mode === 'paused' ? 'auto' : 'paused'}">${T('Pause automatic switching', 'หยุดสลับอัตโนมัติ')}</button>
    <button type="button" role="menuitem" class="${on('hidden')}" data-act="mode" data-arg="${S.mode === 'hidden' ? 'auto' : 'hidden'}">${T('Hide from Discord', 'ซ่อนจาก Discord')} <span class="k">${esc(S.set.hotkey.replace(/ /g, ''))}</span></button>
    ${S.mode === 'pinned' || S.mode === 'paused' ? `<button type="button" role="menuitem" data-act="mode" data-arg="auto">${T('Back to Auto', 'กลับสู่อัตโนมัติ')}</button>` : ''}<hr>
    <button type="button" role="menuitem" data-act="toast" data-arg="${T('The real app asks to confirm before quitting', 'ในโปรแกรมจริงจะถามยืนยันก่อนออก')}">${T('Quit Vibe', 'ออกจาก Vibe')}</button></div>`;
  const taskbar = `<div class="mk-taskbar"><span>⊞ &nbsp; ${T('Search', 'ค้นหา')}</span><div class="mk-tray" aria-hidden="true"><span class="tr"></span><span class="tr"></span><span class="ghost"><img src="assets/ghost-final-d.svg" alt="" width="100%" height="100%"></span><span>09:41</span></div></div>`;
  let stage;
  if (S.trayTab === 'menu') stage = `<div class="mk-desk">${menu}${taskbar}</div>`;
  else if (!S.noticeHidden) stage = `<div class="mk-desk"><div class="mk-fakewin"><div class="vs-titlebar"><div class="vs-titlebar-drag">${ghostSvg()}Vibe Studio</div><div class="vs-titlebar-controls"><button class="vs-winbtn vs-winbtn-close" type="button" data-act="fakeclose" data-k="fakeclose" aria-label="${T('Close window', 'ปิดหน้าต่าง')}"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 1l8 8M9 1L1 9"/></svg></button></div></div><div class="pad"><b>${T('Studio window', 'หน้าต่าง Studio')}</b><p class="vs-hint">${T('Press ✕ to see what happens the first time.', 'กด ✕ เพื่อดูสิ่งที่เกิดขึ้นครั้งแรก')}</p></div></div>${taskbar}</div>`;
  else if (!S.noticeSeen) stage = `<div class="mk-desk"><div class="mk-wtoast" role="status"><div class="t">${ghostSvg()}${T('Vibe is still running', 'Vibe ยังทำงานอยู่')}</div><div>${T('Closing the window only hides it. Vibe keeps your Scene on Discord from the tray. Quit from the tray menu.', 'การปิดหน้าต่างแค่ซ่อนไว้ Vibe ยังแสดงซีนบน Discord จากถาดระบบ ออกจากโปรแกรมได้จากเมนูถาด')}</div><button type="button" data-act="noticeok">${T('Got it', 'เข้าใจแล้ว')}</button></div>${taskbar}</div>`;
  else stage = `<div class="mk-desk"><div class="mk-fakewin"><div class="pad"><b>${T('Window hidden — no notice this time.', 'ซ่อนหน้าต่างแล้ว ครั้งนี้ไม่มีประกาศ')}</b><p class="vs-hint">${T('The notice is shown only once.', 'ประกาศนี้แสดงเพียงครั้งเดียว')}</p><button class="vs-btn vs-btn-sm" type="button" data-act="noticereset">${T('Reset prototype', 'รีเซ็ตตัวอย่าง')}</button></div></div>${taskbar}</div>`;
  return `${pageHead(T('Desktop', 'เดสก์ท็อป'), T('Tray', 'ถาดระบบ'), S.trayTab === 'menu' ? T('Right-click the Vibe icon in the Windows tray. Items act on the same state as Now.', 'คลิกขวาไอคอน Vibe ในถาดระบบ Windows รายการทำงานกับสถานะเดียวกับหน้าตอนนี้') : T('Shown once, the first time the window is closed with ✕.', 'แสดงครั้งเดียว เมื่อกดปิดหน้าต่างด้วย ✕ เป็นครั้งแรก'))}<div style="display:flex;flex-direction:column;gap:16px">${tabs}${stage}</div>`;
}

/* ---------- shell ---------- */
const NAVS = [['now', 'Now', 'ตอนนี้'], ['scenes', 'Scenes', 'ซีน'], ['settings', 'Settings', 'ตั้งค่า']];
function connPill() {
  const m = S.mode, text = { auto: T('Showing: Design', 'กำลังแสดง: Design'), pinned: T('Pinned: ', 'ปักไว้: ') + ((curScene() || {}).name || ''), paused: T('Paused', 'หยุดสลับ'), hidden: T('Hidden', 'ซ่อนอยู่'), autohide: T('Hidden by rule', 'ซ่อนตามกฎ'), none: T('Showing nothing', 'ไม่แสดงอะไร'), discordoff: T('Discord not running', 'Discord ไม่ได้เปิด'), unreachable: T('Companion not responding', 'companion ไม่ตอบสนอง') }[m];
  const cls = ['auto', 'pinned', 'paused', 'hidden', 'autohide', 'none'].includes(m) ? 'connected' : 'connecting';
  return `<div class="connection-pill ${cls}"><span class="connection-dot" aria-hidden="true"></span><span id="connectionText">${text}</span></div>`;
}
/* ---------- motion (D1-M3): tokens live in mockup-extra.css; JS only orchestrates enter/exit ---------- */
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.2,.8,.2,1)';
function ghostOut() { /* fixed, inert snapshot of the outgoing content; fades out on top, never affects layout or input */
  if (reduced()) return [];
  const g = [];
  document.querySelectorAll('#main, .vs-onboard').forEach(el => {
    const r = el.getBoundingClientRect(), c = el.cloneNode(true), ob = el.classList.contains('vs-onboard');
    c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', ''); c.removeAttribute('tabindex');
    c.classList.add('mk-ghost'); Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', margin: '0', maxHeight: ob ? r.height + 'px' : 'none', transform: 'none', pointerEvents: 'none', zIndex: 5, animation: 'none' });
    document.body.appendChild(c); g.push(c);
  });
  return g;
}
function enterIn(g) {
  if (reduced()) return;
  g.forEach(c => { const a = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE, fill: 'forwards' }); a.onfinish = () => c.remove(); setTimeout(() => c.remove(), 500); });
  document.querySelectorAll('#main, .vs-onboard').forEach(el => el.animate(el.classList.contains('vs-onboard') ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, delay: 40, easing: EASE, fill: 'backwards' }));
}
function render(opt = {}) { const g = opt.fade ? ghostOut() : []; renderCore(); if (opt.fade) enterIn(g); }
const FADE = new Set(['screen', 'mode', 'pin', 'trayscreen', 'traytab', 'fakeclose', 'noticeok', 'noticereset', 'frstep', 'frapp', 'frscene', 'frdiscord', 'frfinish', 'finishskip', 'quit', 'import', 'askclear', 'clearhist', 'askquit', 'capture']);
function leaveLayer(done) { /* exit animation: remove .mk-in, wait for the transition, then drop from the DOM */
  const L = layer(), parts = L.querySelectorAll('.mk-drawer,.mk-backdrop,.mk-picker .vs-dialog,.gif-picker-backdrop');
  if (reduced() || !parts.length) { L.innerHTML = ''; done && done(); return; }
  const tok = L._tok = (L._tok || 0) + 1; L.inert = true; parts.forEach(p => p.classList.remove('mk-in'));
  const fin = () => { if (L._tok !== tok) return; L.innerHTML = ''; L.inert = false; done && done(); };
  parts[0].addEventListener('transitionend', fin, { once: true }); setTimeout(fin, 260);
}
function enterLayer() { const L = layer(); L._tok = (L._tok || 0) + 1; L.inert = false; void L.offsetWidth; L.querySelectorAll('.mk-drawer,.mk-backdrop,.mk-picker .vs-dialog,.gif-picker-backdrop').forEach(p => p.classList.add('mk-in')); }
function closeMenu(cb) { const m = $('.mk-menu'); if (!m || reduced()) { S.menuOpen = false; cb && cb(); return; } m.classList.add('mk-out'); setTimeout(() => { S.menuOpen = false; cb && cb(); }, 120); }

/* Reconcile instead of rebuilding: sidebar, top strip and bottom nav keep their DOM (no flash, colour transitions run); only the content swaps. */
function mount(root, html) {
  const first = S.screen === 'first', old = root.querySelector('.vs-app');
  if (!old || root._lang !== S.lang || root._first !== first) { root.innerHTML = html; root._lang = S.lang; root._first = first; return; }
  const t = document.createElement('template'); t.innerHTML = html; const n = t.content;
  const same = (a, b, sel) => { const x = a.querySelector(sel), y = b.querySelector(sel); if (x && y && x.innerHTML !== y.innerHTML) x.innerHTML = y.innerHTML; };
  ['.vs-nav-link', '.bottom-link'].forEach(sel => { const o = root.querySelectorAll(sel), w = n.querySelectorAll(sel); o.forEach((el, i) => { if (w[i]) { const v = w[i].getAttribute('aria-current'); v === null ? el.removeAttribute('aria-current') : el.setAttribute('aria-current', v); } }); });
  const oa = root.querySelectorAll('.mk-acct'), na = n.querySelectorAll('.mk-acct');
  oa.forEach((o, i) => patchAcct(o, na[i]));
  same(root, n, '#main');
  const ob = root.querySelector('.vs-onboard'), nb = n.querySelector('.vs-onboard'); if (ob && nb) ob.replaceWith(nb);
}
function patchAcct(o, w) {
  if (!w) return;
  if (o.dataset.open !== w.dataset.open) { o.replaceWith(w); return; }
  ['.mk-acct-n', '.mk-acct-s'].forEach(sel => { const x = o.querySelector(sel), y = w.querySelector(sel); if (x && y && x.textContent !== y.textContent) { x.textContent = y.textContent; if (!reduced()) { x.classList.remove('mk-id-swap'); void x.offsetWidth; x.classList.add('mk-id-swap'); } } });
  const d = o.querySelector('.mk-acct-dot'), e = w.querySelector('.mk-acct-dot'); if (d && e) d.dataset.s = e.dataset.s;
  const av = o.querySelector('.mk-acct-av'), ev = w.querySelector('.mk-acct-av'); if (av && ev) { const ai = av.firstElementChild, ei = ev.firstElementChild; if (ai.outerHTML !== ei.outerHTML) { ai.replaceWith(ei); if (!reduced()) ei.classList.add('mk-id-swap'); } }
  const l = o.querySelector('.mk-acct-id'); l && l.setAttribute('aria-label', w.querySelector('.mk-acct-id').getAttribute('aria-label')); o.dataset.st = w.dataset.st;
}
function renderCore() {
  document.documentElement.lang = S.lang; document.documentElement.dataset.theme = S.theme;
  const root = $('#root');
  const navLink = n => `<a class="vs-nav-link" href="#" data-act="screen" data-arg="${n[0]}" aria-current="${S.screen === n[0] || (S.screen === 'first' && n[0] === 'now') ? 'page' : 'false'}">${NAV_ICO[n[0]]}<span>${T(n[1], n[2])}</span></a>`;
  const bottomLink = n => `<a class="bottom-link" href="#" data-act="screen" data-arg="${n[0]}" ${S.screen === n[0] ? 'aria-current="page"' : ''}>${NAV_ICO[n[0]].replace('viewBox="0 0 20 20"', 'viewBox="0 0 20 20" width="20" height="20"')}<span>${T(n[1], n[2])}</span></a>`;
  const view = S.screen === 'first' ? nowView() : { now: nowView, scenes: scenesView, settings: settingsView, tray: trayView }[S.screen]();
  const html = `<div class="vs-app"><aside class="vs-sidebar"><div class="vs-brand"><span class="vs-brand-mark mk-logo" aria-hidden="true"><img src="assets/ghost-final-d.svg" alt=""></span><span><span class="vs-brand-name">Vibe Studio</span><span class="vs-brand-sub">${T('Your Discord corner', 'มุม Discord ของคุณ')}</span></span></div>
    <p class="vs-nav-label" aria-hidden="true">${T('MENU', 'เมนู')}</p><nav class="vs-nav" aria-label="${T('Main', 'หลัก')}">${NAVS.map(navLink).join('')}</nav>
    <div class="vs-side-foot">${acctPanel(false)}</div></aside>
    <div class="vs-main"><div class="vs-mobile-status">${acctPanel(true)}</div><main class="vs-page" id="main" tabindex="-1">${view}</main></div></div>
    <nav class="vs-bottomnav" aria-label="${T('Main', 'หลัก')}">${NAVS.map(bottomLink).join('')}</nav>${S.screen === 'first' ? firstView() : ''}`;
  mount(root, html);
  $('#root').inert = !!S.drawer || !!S.picker;
}

/* ---------- Dev toolbar ---------- */
const MODES = ['auto', 'pinned', 'paused', 'hidden', 'autohide', 'none', 'discordoff', 'unreachable'];
const MODE_NAMES = { auto: 'Auto — following Figma', pinned: 'Pinned (until cancelled)', paused: 'Paused', hidden: 'Hidden', autohide: 'Hidden by auto-hide rule', none: 'Nothing shown (no ruled app)', discordoff: 'Discord not running', unreachable: 'Companion unreachable' };
function renderDev() {
  const d = $('#dev');
  d.innerHTML = `<b class="keep">PROTOTYPE</b><button class="keep" data-dev="toggle">${d.classList.contains('collapsed') ? 'show controls' : 'hide'}</button>
   <label>Screen <select data-dev="screen">${[['first', 'First run'], ['now', 'Now'], ['scenes', 'Scene library'], ['settings', 'Settings'], ['tray', 'Tray & notice']].map(o => `<option value="${o[0]}" ${S.screen === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>
   <label>Now state <select data-dev="mode">${MODES.map(m => `<option value="${m}" ${S.mode === m ? 'selected' : ''}>${MODE_NAMES[m]}</option>`).join('')}</select></label>
   <button data-dev="picker">Add rule</button><button data-dev="pickerweb">Web rule</button>
   <button data-dev="failnext" ${S.failNext ? 'style="background:#7a2a2c"' : ''}>${S.failNext ? 'Next save WILL fail ✓' : 'Make next save fail'}</button>
   <button data-dev="frdiscord">First run: Discord closed</button><button data-dev="restart">Reset first run</button>`;
}

/* ---------- overlays: focus helpers ---------- */
const layer = () => $('#layer');
function rememberFocus(el) { const k = el && el.closest && el.closest('[data-k]'); S.lastFocus = k ? k.dataset.k : null; }
function restoreFocus() { const k = S.lastFocus; let t = k && $(`[data-k="${k}"]`); if (!t) t = $('#main'); if (t) t.focus(); }
function trap(c) {
  c.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tipFor) { e.stopPropagation(); const b = tipFor; hideTip(); b.focus(); return; }
    if (e.key === 'Escape') { e.stopPropagation(); c.dataset.kind === 'drawer' ? closeDrawer() : closePicker(); return; }
    if (e.key !== 'Tab') return;
    const f = [...c.querySelectorAll('button:not([disabled]),input,select,textarea,summary')].filter(x => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ---------- Scene editor (side panel). Opens with a short fade only; the page behind is never re-rendered or moved. ---------- */
const HELP = {
  name: ['Scene name', 'ชื่อ Scene', 'Only for you — how this Scene is listed in Studio. It never appears on Discord.', 'ใช้ดูเองใน Studio เท่านั้น ไม่แสดงบน Discord', null, 'not shown on Discord', 'ไม่แสดงบน Discord'],
  actType: ['Activity type', 'ประเภทกิจกรรม', 'Sets the verb in the card heading: Playing, Listening to, Watching or Competing in.', 'กำหนดคำนำในหัวการ์ด เช่น กำลังเล่น กำลังฟัง กำลังดู', 'act', 'card heading', 'หัวการ์ด'],
  actName: ['Activity name', 'ชื่อกิจกรรม', 'The name after the verb in the heading, e.g. “Playing Vibe”. 2–128 characters.', 'ชื่อที่ต่อท้ายคำนำในหัวการ์ด เช่น “กำลังเล่น Vibe” 2–128 ตัวอักษร', 'act', 'card heading', 'หัวการ์ด'],
  details: ['Details line', 'ข้อความบรรทัดแรก', 'The first, bold line of text next to the image. 2–128 characters.', 'ข้อความตัวหนาบรรทัดแรกข้างรูป 2–128 ตัวอักษร', 'details', 'first text line', 'ข้อความบรรทัดแรก'],
  detailsUrl: ['Details link', 'ลิงก์บรรทัดแรก', 'Optional https link. Makes the first line clickable on Discord.', 'ลิงก์ https (ไม่บังคับ) ทำให้บรรทัดแรกกดได้บน Discord', 'details', 'first text line', 'ข้อความบรรทัดแรก'],
  state: ['State line', 'ข้อความบรรทัดที่สอง', 'The second line of text under Details. 2–128 characters.', 'ข้อความบรรทัดที่สองใต้บรรทัดแรก 2–128 ตัวอักษร', 'state', 'second text line', 'ข้อความบรรทัดที่สอง'],
  stateUrl: ['State link', 'ลิงก์บรรทัดที่สอง', 'Optional https link. Makes the second line clickable on Discord.', 'ลิงก์ https (ไม่บังคับ) ทำให้บรรทัดที่สองกดได้บน Discord', 'state', 'second text line', 'ข้อความบรรทัดที่สอง'],
  vars: ['App / window name', 'ชื่อแอป / หน้าต่าง', 'When on, {app} and {window} in your text are replaced live. {window} is a window title and is visible to anyone who sees your profile.', 'เมื่อเปิด {app} และ {window} ในข้อความจะถูกแทนที่ทันที {window} คือชื่อหน้าต่าง ซึ่งทุกคนที่เห็นโปรไฟล์จะเห็น', 'details', 'both text lines', 'ข้อความทั้งสองบรรทัด'],
  large: ['Large image', 'ภาพใหญ่', 'The main picture: built-in art, a GIF or an https image link.', 'ภาพหลัก: ภาพในตัว GIF หรือลิงก์ภาพ https', 'large', 'big square image', 'ภาพสี่เหลี่ยมใหญ่'],
  largeText: ['Large image hover text', 'ข้อความเมื่อชี้ภาพใหญ่', 'Shown as a tooltip when someone hovers the big image. 2–128 characters.', 'แสดงเป็นทูลทิปเมื่อชี้ที่ภาพใหญ่ 2–128 ตัวอักษร', 'large', 'big square image', 'ภาพสี่เหลี่ยมใหญ่'],
  largeUrl: ['Large image link', 'ลิงก์ภาพใหญ่', 'Optional https link opened when the big image is clicked.', 'ลิงก์ https (ไม่บังคับ) ที่เปิดเมื่อกดภาพใหญ่', 'large', 'big square image', 'ภาพสี่เหลี่ยมใหญ่'],
  small: ['Small image', 'ภาพเล็ก', 'A small round badge on the corner of the big image.', 'ป้ายกลมเล็กที่มุมของภาพใหญ่', 'small', 'round badge on the image', 'ป้ายกลมที่มุมภาพ'],
  smallText: ['Small image hover text', 'ข้อความเมื่อชี้ภาพเล็ก', 'Tooltip when someone hovers the small badge. 2–128 characters.', 'ทูลทิปเมื่อชี้ที่ป้ายเล็ก 2–128 ตัวอักษร', 'small', 'round badge on the image', 'ป้ายกลมที่มุมภาพ'],
  smallUrl: ['Small image link', 'ลิงก์ภาพเล็ก', 'Optional https link opened when the badge is clicked.', 'ลิงก์ https (ไม่บังคับ) ที่เปิดเมื่อกดป้ายเล็ก', 'small', 'round badge on the image', 'ป้ายกลมที่มุมภาพ'],
  btn0: ['Button 1', 'ปุ่มที่ 1', 'A button under the card. Label up to 32 characters; link must be https.', 'ปุ่มใต้การ์ด ข้อความไม่เกิน 32 ตัวอักษร ลิงก์ต้องเป็น https', 'btn0', 'button under the card', 'ปุ่มใต้การ์ด'],
  btn1: ['Button 2', 'ปุ่มที่ 2', 'A second button next to the first. Discord allows two buttons at most.', 'ปุ่มที่สองข้างปุ่มแรก Discord อนุญาตสูงสุดสองปุ่ม', 'btn1', 'button under the card', 'ปุ่มใต้การ์ด'],
};
const helpBtn = k => `<button type="button" class="mk-help" data-help="${k}" aria-label="${T('What is this?', 'ช่องนี้คืออะไร')}: ${esc(HELP[k][S.lang === 'th' ? 1 : 0])}" aria-expanded="false">?</button>`;
let tipFor = null;
function highlight(area) { document.querySelectorAll('.mk-hl').forEach(e => e.classList.remove('mk-hl')); if (area) document.querySelectorAll(`#dpreview [data-pv="${area}"]`).forEach(e => e.classList.add('mk-hl')); }
function showTip(btn) {
  const k = btn.dataset.help, h = HELP[k], th = S.lang === 'th'; let tip = $('#mkTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'mkTip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  tip.innerHTML = `<b>${esc(h[th ? 1 : 0])}</b><span>${esc(h[th ? 3 : 2])}</span><em>${h[4] ? T('Highlighted in the preview: ', 'ไฮไลต์ในตัวอย่าง: ') : ''}${esc(h[th ? 6 : 5])}</em>`;
  tip.hidden = false; btn.setAttribute('aria-describedby', 'mkTip'); btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(), tw = tip.offsetWidth, tH = tip.offsetHeight;
  const x = Math.min(Math.max(8, r.left - 8), innerWidth - tw - 8); let y = r.bottom + 8; if (y + tH > innerHeight - 8) y = r.top - tH - 8;
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('mk-show'); tipFor = btn; highlight(h[4]);
}
function hideTip() { const tip = $('#mkTip'); if (tip) tip.classList.remove('mk-show'); if (tipFor) { tipFor.removeAttribute('aria-describedby'); tipFor.setAttribute('aria-expanded', 'false'); } tipFor = null; highlight(null); }
const isUrl = v => /^[a-z]+:\/\//i.test(v || '');
const artSrc = v => (isUrl(v) ? v : A_ + (ART[v] || ART.a1));

function openDrawer(id, opener) {
  rememberFocus(opener);
  if (id === 'new') { const n = mkScene({ id: 'new' + Date.now(), name: '', l1: '', l2: '', isNew: true }); S.scenes.push(n); id = n.id; }
  S.drawer = { id, dirty: false }; S.save = 'saved'; S.saveAt = '09:41';
  buildDrawer(true); $('#root').inert = true; const f = $('#sc-name', layer()); (f || $('.mk-drawer', layer())).focus({ preventScroll: true });
}
function secHead(h, hint) { return `<h3>${h}</h3>${hint ? `<p class="vs-hint">${hint}</p>` : ''}`; }
function fld(id, label, key, field, val, o = {}) {
  return `<div class="vs-field"><label class="vs-label" for="${id}">${label}${key ? helpBtn(key) : ''}</label><input class="vs-input" type="text" id="${id}" value="${esc(val)}" data-bind="sc" data-f="${field}" ${o.hl ? `data-hl="${o.hl}"` : ''} ${o.url ? 'data-url="1" data-mono="1" placeholder="https://…"' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''}>${o.url ? '<p class="field-error" hidden></p>' : ''}</div>`;
}
function imageSection(prefix, sc, title, hint, key, textKey, urlKey, artField, textField, urlField, area) {
  const v = sc[artField], mode = S.drawer[prefix + 'Mode'] || (isUrl(v) ? 'url' : 'art');
  const picker = mode === 'url' ? `<div class="vs-field"><label class="vs-label" for="${prefix}-url">${T('GIF or image link (https)', 'ลิงก์ GIF หรือภาพ (https)')}</label><input class="vs-input" type="text" id="${prefix}-url" data-mono="1" data-url="1" placeholder="https://…" value="${esc(isUrl(v) ? v : '')}" data-bind="sc" data-f="${artField}" data-hl="${area}"><p class="field-error" hidden></p></div>`
    : `<div class="mk-arts" role="group" aria-label="${title}">${prefix === 'sm' ? `<button class="mk-art-btn mk-none" type="button" data-act="art" data-arg="${prefix}:" aria-pressed="${!v}">${T('None', 'ไม่มี')}</button>` : ''}${ARTS.map(a => `<button class="mk-art-btn" type="button" data-act="art" data-arg="${prefix}:${a}" aria-pressed="${v === a}" aria-label="${T('Built-in art', 'ภาพในตัว')} ${a.slice(1)}"><img src="${A_}${ART[a]}" alt=""></button>`).join('')}</div>`;
  return `<section class="mk-sec" data-sec="${prefix}">${secHead(title, hint)}
    <div class="vs-field"><span class="vs-label" id="${prefix}-lbl">${T('Image source', 'แหล่งภาพ')}${helpBtn(key)}</span><div class="vs-segmented mk-seg-sm" role="radiogroup" aria-labelledby="${prefix}-lbl"><button type="button" role="radio" aria-checked="${mode === 'art'}" class="${mode === 'art' ? 'is-on' : ''}" data-act="imgmode" data-arg="${prefix}:art">${T('Built-in art', 'ภาพในตัว')}</button><button type="button" role="radio" aria-checked="${mode === 'url'}" class="${mode === 'url' ? 'is-on' : ''}" data-act="imgmode" data-arg="${prefix}:url">${T('GIF / https link', 'GIF / ลิงก์ https')}</button></div>${picker}</div>
    ${fld(prefix + '-text', T('Hover text', 'ข้อความเมื่อชี้'), textKey, textField, sc[textField], { hl: area, max: 128 })}${fld(prefix + '-link', T('Click link', 'ลิงก์เมื่อกด'), urlKey, urlField, sc[urlField], { hl: area, url: 1 })}</section>`;
}
function buildDrawer(first) {
  const sc = sceneBy(S.drawer.id); if (!sc) return;
  const old = $('.mk-drawer-body', layer()), top = old ? old.scrollTop : 0;
  const live = curScene() && curScene().id === sc.id && ['auto', 'pinned', 'paused'].includes(S.mode);
  const fade = first ? 'mk-fade' : '';
  layer().innerHTML = `<div class="mk-backdrop ${fade}" data-act="closedrawer"></div>
  <div class="mk-drawer ${fade}" role="dialog" aria-modal="true" aria-labelledby="dtitle" data-kind="drawer" tabindex="-1">
   <div class="mk-drawer-head"><div><h2 id="dtitle">${sc.isNew ? T('New Scene', 'Scene ใหม่') : T('Edit Scene', 'แก้ไข Scene')}</h2><p class="vs-subcopy">${T('Every field Discord supports. Changes save as you type; the preview stays beside the form.', 'ทุกช่องที่ Discord รองรับ บันทึกขณะพิมพ์ และตัวอย่างอยู่ข้างฟอร์มตลอด')}</p></div><button class="vs-icon-btn" type="button" data-act="closedrawer" aria-label="${T('Close and go back', 'ปิดและย้อนกลับ')}">✕</button></div>
   <div class="mk-drawer-body">
    <div class="mk-form">
     <section class="mk-sec">${secHead(T('Scene', 'Scene'), T('Only you see this name.', 'มีแต่คุณที่เห็นชื่อนี้'))}${fld('sc-name', T('Scene name', 'ชื่อ Scene'), 'name', 'name', sc.name, { max: 40, ph: T('e.g. Deep work', 'เช่น โฟกัสทำงาน') })}</section>
     <section class="mk-sec">${secHead(T('Activity', 'กิจกรรม'), T('The heading of the card, e.g. “Playing Vibe”.', 'หัวการ์ด เช่น “กำลังเล่น Vibe”'))}
      <div class="vs-field" role="radiogroup" aria-labelledby="typelbl"><span class="vs-label" id="typelbl">${T('Activity type', 'ประเภทกิจกรรม')}${helpBtn('actType')}</span><div class="vs-segmented" style="flex-wrap:wrap">${TYPES.map(t => `<button type="button" role="radio" aria-checked="${sc.type === t[0]}" class="${sc.type === t[0] ? 'is-on' : ''}" data-act="stype" data-arg="${t[0]}" data-hl="act">${t[S.lang === 'th' ? 2 : 1]}</button>`).join('')}</div></div>
      ${fld('sc-act', T('Activity name', 'ชื่อกิจกรรม'), 'actName', 'actName', sc.actName, { hl: 'act', max: 128 })}</section>
     <section class="mk-sec">${secHead(T('Details line', 'ข้อความบรรทัดแรก'), T('Bold first line.', 'ตัวหนาบรรทัดแรก'))}${fld('sc-l1', T('Details text', 'ข้อความ'), 'details', 'l1', sc.l1, { hl: 'details', max: 128 })}${fld('sc-l1u', T('Details link', 'ลิงก์'), 'detailsUrl', 'l1url', sc.l1url, { hl: 'details', url: 1 })}</section>
     <section class="mk-sec">${secHead(T('State line', 'ข้อความบรรทัดที่สอง'), T('Second line under Details.', 'บรรทัดที่สองใต้บรรทัดแรก'))}${fld('sc-l2', T('State text', 'ข้อความ'), 'state', 'l2', sc.l2, { hl: 'state', max: 128 })}${fld('sc-l2u', T('State link', 'ลิงก์'), 'stateUrl', 'l2url', sc.l2url, { hl: 'state', url: 1 })}
      <div class="mk-var-row"><span class="vs-label" style="margin:0"><label for="sc-vars">${T('Insert app or window name', 'ใส่ชื่อแอปหรือหน้าต่าง')}</label>${helpBtn('vars')}</span><label class="vs-switch"><input type="checkbox" id="sc-vars" data-bind="scvars" ${sc.vars ? 'checked' : ''}><span></span></label></div>
      <div class="vs-looks"><button class="vs-look" type="button" data-act="ins" data-arg="{app}" ${sc.vars ? '' : 'disabled'}>{app}</button><button class="vs-look" type="button" data-act="ins" data-arg="{window}" ${sc.vars ? '' : 'disabled'}>{window}</button></div>
      <div class="mk-note">${I.lock}<span>${T('{app} is the program name. {window} is the title of the window you’re using — it can include document names, chat names or web pages, and it goes to Discord for anyone who can see your profile. Off by default for each Scene; history keeps it only while history is on.', '{app} คือชื่อโปรแกรม {window} คือชื่อหน้าต่างที่คุณใช้อยู่ อาจมีชื่อเอกสาร ชื่อแชต หรือหน้าเว็บ และจะส่งไปยัง Discord ให้ทุกคนที่เห็นโปรไฟล์ของคุณเห็น ปิดไว้เป็นค่าเริ่มต้นในแต่ละ Scene ประวัติเก็บเฉพาะเมื่อเปิดประวัติอยู่')}</span></div></section>
     ${imageSection('lg', sc, T('Large image', 'ภาพใหญ่'), T('The main picture beside the text.', 'ภาพหลักข้างข้อความ'), 'large', 'largeText', 'largeUrl', 'art', 'artText', 'artUrl', 'large')}
     ${imageSection('sm', sc, T('Small image', 'ภาพเล็ก'), T('Optional round badge on the corner of the large image.', 'ป้ายกลมที่มุมภาพใหญ่ (ไม่บังคับ)'), 'small', 'smallText', 'smallUrl', 'small', 'smallText', 'smallUrl', 'small')}
     <section class="mk-sec">${secHead(T('Buttons', 'ปุ่ม'), T('Up to two. Links must be https.', 'สูงสุดสองปุ่ม ลิงก์ต้องเป็น https'))}
      ${sc.btns.map((b, i) => `<div class="vs-field"><span class="vs-label">${T('Button', 'ปุ่ม')} ${i + 1}${helpBtn('btn' + i)}</span><div class="mk-two"><input class="vs-input" type="text" aria-label="${T('Button label', 'ข้อความปุ่ม')} ${i + 1}" placeholder="${T('Label', 'ข้อความ')}" value="${esc(b.label)}" data-bind="btn" data-i="${i}" data-f="label" data-hl="btn${i}" maxlength="32"><input class="vs-input" type="text" data-mono="1" data-url="1" aria-label="${T('Button link', 'ลิงก์ปุ่ม')} ${i + 1}" placeholder="https://…" value="${esc(b.url)}" data-bind="btn" data-i="${i}" data-f="url" data-hl="btn${i}"></div><p class="field-error" hidden></p></div>`).join('')}</section>
    </div>
    <aside class="mk-prev" aria-label="${T('Discord preview', 'ตัวอย่าง Discord')}"><div class="vs-preview-label"><span>${T('Preview — how others see you on Discord', 'ตัวอย่าง — คนอื่นเห็นคุณบน Discord แบบนี้')}</span>${live ? `<span class="vs-pill vs-pill-good">${T('On Discord now', 'กำลังแสดงบน Discord')}</span>` : `<span class="vs-pill vs-pill-neutral">${T('Preview only', 'ตัวอย่างเท่านั้น')}</span>`}</div><div id="dpreview"></div><p class="vs-preview-foot" id="dprevnote"></p></aside>
   </div>
   <div class="mk-drawer-foot"><div class="vs-savebar" id="savebar" role="status" aria-live="polite"><span class="vs-savebar-dot" aria-hidden="true"></span><span class="vs-savebar-text" id="savetext"></span><button class="vs-btn vs-btn-sm vs-btn-ghost vs-savebar-btn" type="button" data-act="retry">${T('Retry', 'ลองใหม่')}</button></div><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="closedrawer">${T('Done', 'เสร็จ')}</button></div></div>`;
  trap($('.mk-drawer', layer())); if (first) enterLayer(); else layer().querySelectorAll('.mk-drawer,.mk-backdrop').forEach(p => p.classList.add('mk-in')); updateDrawer(); const nb = $('.mk-drawer-body', layer()); if (nb) nb.scrollTop = top;
}
function updateDrawer() {
  const sc = sceneBy(S.drawer && S.drawer.id); if (!sc) return;
  const hl = document.querySelector('#dpreview .mk-hl'); const area = hl ? hl.dataset.pv : null;
  $('#dpreview', layer()).innerHTML = dcWrap(sc, { app: 'Figma', win: 'Landing page v3 – Figma' });
  if (area) highlight(area);
  $('#dprevnote', layer()).textContent = sc.vars ? T('Preview uses sample values: {app} = Figma, {window} = “Landing page v3 – Figma”.', 'ตัวอย่างใช้ค่าสมมติ: {app} = Figma, {window} = “Landing page v3 – Figma”') : '';
  layer().querySelectorAll('input[data-url]').forEach(inp => {
    const err = inp.closest('.vs-field').querySelector('.field-error'); const bad = inp.value && !/^https:\/\/\S+$/i.test(inp.value);
    inp.setAttribute('aria-invalid', bad ? 'true' : 'false'); if (err) { err.hidden = !bad; err.textContent = bad ? T('Must start with https://', 'ต้องขึ้นต้นด้วย https://') : ''; }
  });
  const bar = $('#savebar', layer()), k = S.save;
  const st = k === 'failed' ? 'error' : k; if (bar.dataset.state && bar.dataset.state !== st) { bar.classList.remove('mk-swap'); void bar.offsetWidth; bar.classList.add('mk-swap'); } bar.dataset.state = st;
  $('#savetext', layer()).textContent = k === 'saving' ? T('Saving…', 'กำลังบันทึก…') : k === 'failed' ? T('Couldn’t save — your changes are still here', 'บันทึกไม่สำเร็จ — การแก้ไขของคุณยังอยู่') : T('Saved', 'บันทึกแล้ว') + ' · ' + S.saveAt;
}
function scheduleSave() {
  if (S.drawer) S.drawer.dirty = true;
  S.save = 'saving'; updateDrawer(); clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => {
    if (S.failNext) { S.failNext = false; S.save = 'failed'; renderDev(); }
    else { S.save = 'saved'; const n = new Date(); S.saveAt = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); }
    if (S.drawer) updateDrawer();
  }, 900);
}
function closeDrawer() {
  hideTip();
  const sc = S.drawer && sceneBy(S.drawer.id); let dirty = S.drawer && S.drawer.dirty;
  if (sc && sc.isNew && !sc.name && !sc.l1 && !sc.l2) { S.scenes = S.scenes.filter(s => s !== sc); dirty = true; } else if (sc) { if (sc.isNew) { dirty = true; S.fresh = sc.id; } sc.isNew = false; if (!sc.name) { sc.name = T('Untitled Scene', 'Scene ไม่มีชื่อ'); dirty = true; } }
  clearTimeout(S.saveTimer); S.drawer = null; $('#root').inert = false;
  if (dirty) { const y = scrollY; render(); scrollTo(0, y); setTimeout(() => { S.fresh = null; }, 400); } /* only when something changed; same scroll position */
  restoreFocus(); leaveLayer(); /* focus is already back; the panel fades out on top */
}

/* ---------- Add-rule picker (real .gif-picker + .vs-dialog shell) ---------- */
function openPicker(tab, opener, opts = {}) {
  rememberFocus(opener);
  S.pickerBuilt = false; S.picker = Object.assign({ tab, q: '', app: null, scene: 'design', hide: false, showSys: false, browser: 'Google Chrome', contains: 'Figma' }, opts);
  buildPicker(); $('#root').inert = true; const m = $('.vs-dialog', layer()); (tab === 'web' ? $('#wcontains', m) : $('#pq', m)).focus();
}
function buildPicker() {
  const p = S.picker;
  layer().innerHTML = `<div class="gif-picker mk-picker"><button class="gif-picker-backdrop" type="button" data-act="closepicker" aria-label="${T('Close', 'ปิด')}" tabindex="-1"></button>
  <div class="vs-dialog" role="dialog" aria-modal="true" aria-labelledby="ptitle" data-kind="picker">
  <div class="gif-dialog-head"><div><h2 id="ptitle">${T('Add a rule', 'เพิ่มกฎ')}</h2><p>${T('Choose what to watch for, then what Discord should do.', 'เลือกสิ่งที่จะตรวจจับ แล้วเลือกว่า Discord ควรทำอะไร')}</p></div><button class="vs-icon-btn" type="button" data-act="closepicker" aria-label="${T('Close', 'ปิด')}">✕</button></div>
  <div class="vs-segmented mk-tabs" role="tablist" style="align-self:flex-start"><button type="button" role="tab" class="${p.tab === 'app' ? 'is-on' : ''}" aria-selected="${p.tab === 'app'}" data-act="ptab" data-arg="app">${T('An app', 'แอป')}</button><button type="button" role="tab" class="${p.tab === 'web' ? 'is-on' : ''}" aria-selected="${p.tab === 'web'}" data-act="ptab" data-arg="web">${T('A web page (tab title)', 'หน้าเว็บ (ชื่อแท็บ)')}</button></div>
  <div class="gif-search-panel">${p.tab === 'app' ? `<label class="vs-visually-hidden" for="pq">${T('Search apps', 'ค้นหาแอป')}</label><div class="vs-app-search">${I.search}<input type="text" id="pq" value="${esc(p.q)}" placeholder="${T('Search installed apps…', 'ค้นหาแอปที่ติดตั้ง…')}" data-bind="pq" autocomplete="off"></div><div id="plistwrap"></div>
   <div class="vs-actions"><button class="vs-btn vs-btn-sm" type="button" data-act="browse">${I.folder}${T('Browse for .exe…', 'เลือกไฟล์ .exe…')}</button><button class="vs-quiet-link" type="button" data-act="sys">${p.showSys ? T('Hide system entries', 'ซ่อนรายการระบบ') : T('4 system & uninstaller entries hidden — show', 'ซ่อนรายการระบบและตัวถอนการติดตั้ง 4 รายการ — แสดง')}</button></div>`
      : `<div class="vs-field"><label class="vs-label" for="wbrowser">${T('Browser', 'เบราว์เซอร์')}</label><select class="vs-select" id="wbrowser" data-bind="wbrowser" style="width:100%"><option ${p.browser === 'Google Chrome' ? 'selected' : ''}>Google Chrome</option><option ${p.browser === 'Microsoft Edge' ? 'selected' : ''}>Microsoft Edge</option><option ${p.browser === 'Any browser' ? 'selected' : ''}>${T('Any browser', 'เบราว์เซอร์ใดก็ได้')}</option></select></div>
   <div class="vs-field"><label class="vs-label" for="wcontains">${T('When the tab title contains', 'เมื่อชื่อแท็บมีคำว่า')}</label><input class="vs-input" type="text" id="wcontains" value="${esc(p.contains)}" data-bind="wcontains" autocomplete="off"></div><div id="wmatch"></div>
   <div class="mk-note">${I.lock}<span>${T('Vibe reads the title of your active browser tab only to compare it with this text. Nothing is sent anywhere unless a Scene’s text uses {window}.', 'Vibe อ่านชื่อแท็บที่ใช้งานอยู่เพื่อเทียบกับข้อความนี้เท่านั้น ไม่ส่งไปไหน เว้นแต่ข้อความของซีนใช้ {window}')}</span></div>`}
  <div id="pthen"></div>
  <div class="vs-form-actions" style="justify-content:flex-end"><button class="vs-btn" type="button" data-act="closepicker">${T('Cancel', 'ยกเลิก')}</button><button class="vs-btn vs-btn-primary" type="button" id="padd" data-act="paddgo">${T('Add rule', 'เพิ่มกฎ')}</button></div></div></div></div>`;
  trap($('.vs-dialog', layer())); updatePicker(); if (!S.pickerBuilt) { enterLayer(); S.pickerBuilt = true; } else layer().querySelectorAll('.mk-picker .vs-dialog,.gif-picker-backdrop').forEach(p => p.classList.add('mk-in'));
}
const pitem = (a, sel, dim) => `<button class="mk-item" type="button" role="radio" aria-checked="${sel}" aria-pressed="${sel}" data-act="ppick" data-arg="${a.id}" ${dim ? 'style="opacity:.65"' : ''}>${icoOf(a)}<span style="min-width:0"><strong style="font-weight:500;display:block">${esc(a.name)}</strong><small class="vs-hint" style="margin:0;display:block">${esc(a.exe)}</small></span>${sel ? `<span class="vs-pill vs-pill-accent">${T('Selected', 'เลือกแล้ว')}</span>` : ''}</button>`;
function updatePicker() {
  const p = S.picker, m = $('.vs-dialog', layer()); if (!m) return;
  if (p.tab === 'app') {
    const q = p.q.trim().toLowerCase(), f = a => !q || a.name.toLowerCase().includes(q) || a.exe.toLowerCase().includes(q);
    const run = APPS.filter(f), inst = q ? INSTALLED.filter(f) : [], sys = p.showSys ? SYSTEM.filter(f) : [];
    const tile = a => `<button class="mk-tile" type="button" role="radio" aria-checked="${p.app === a.id}" aria-pressed="${p.app === a.id}" data-act="ppick" data-arg="${a.id}"><span class="vs-tile-icon">${icoOf(a, 1)}<span class="vs-tile-running" title="${T('Running now', 'กำลังทำงาน')}"></span></span><strong>${esc(a.name)}</strong></button>`;
    $('#plistwrap', m).innerHTML = `<div role="radiogroup" aria-label="${T('Apps', 'แอป')}"><p class="mk-section">${T('Running now', 'กำลังทำงานอยู่')} <span class="vs-hint" style="display:inline;font-weight:400">· ${T('most recently used first', 'ใช้ล่าสุดก่อน')}</span></p>
      ${run.length ? `<div class="mk-tiles">${run.map(tile).join('')}</div>` : `<p class="vs-hint" style="margin:0 0 16px">${T('No running app matches.', 'ไม่มีแอปที่กำลังทำงานตรงกับคำค้น')}</p>`}
      ${q ? `<p class="mk-section">${T('Installed apps', 'แอปที่ติดตั้ง')}</p><div class="mk-list">${inst.map(a => pitem(a, p.app === a.id)).join('') || `<p class="vs-hint" style="padding:10px 0;margin:0">${T('No installed app matches.', 'ไม่มีแอปที่ติดตั้งตรงกับคำค้น')}</p>`}</div>` : `<p class="vs-hint" style="margin:0 0 16px">${T('Type above to search all 127 installed apps.', 'พิมพ์ด้านบนเพื่อค้นหาจาก 127 แอปที่ติดตั้ง')}</p>`}
      ${sys.length ? `<p class="mk-section">${T('System (hidden by default)', 'ระบบ (ซ่อนโดยปริยาย)')}</p><div class="mk-list">${sys.map(a => pitem(a, p.app === a.id, true)).join('')}</div>` : ''}</div>`;
  } else {
    const q = p.contains.trim().toLowerCase();
    $('#wmatch', m).innerHTML = `<p class="mk-section">${T('Tabs open right now', 'แท็บที่เปิดอยู่ตอนนี้')}</p><div class="mk-list">${TABS.map(t => { const hit = q && t.title.toLowerCase().includes(q); return `<div class="mk-item" style="cursor:default"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span><span class="vs-pill ${hit ? 'vs-pill-good' : 'vs-pill-neutral'}">${hit ? T('matches', 'ตรงกัน') : T('no match', 'ไม่ตรง')}</span></div>`; }).join('')}</div>`;
  }
  const showThen = p.tab === 'web' || p.app;
  $('#pthen', m).innerHTML = showThen ? `<p class="mk-section">${T('Then', 'แล้ว')}</p>
    <div class="vs-row" style="padding-top:0"><div class="vs-row-copy"><strong>${T('Hide Discord while this is open instead', 'ซ่อน Discord ขณะที่เปิดสิ่งนี้อยู่แทน')}</strong><small>${T('Auto-hide rule — good for banking or private apps.', 'กฎซ่อนอัตโนมัติ — เหมาะกับแอปธนาคารหรือแอปส่วนตัว')}</small></div><label class="vs-switch"><input type="checkbox" data-bind="phide" aria-label="${T('Hide Discord while this is open', 'ซ่อน Discord ขณะเปิดอยู่')}" ${p.hide ? 'checked' : ''}><span></span></label></div>
    ${p.hide ? '' : `<div class="vs-field"><label class="vs-label" for="pscene">${T('Show this Scene', 'แสดงซีนนี้')}</label><select class="vs-select" id="pscene" data-bind="pscene" style="width:100%">${S.scenes.map(s => `<option value="${s.id}" ${p.scene === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>`}` : '';
  $('#padd', m).disabled = !showThen;
}
function closePicker() { S.picker = null; S.pickerBuilt = false; $('#root').inert = false; restoreFocus(); leaveLayer(); }

/* ---------- toast ---------- */
let toastT;
function toast(msg, undo) {
  $('#toastbox') && $('#toastbox').remove();
  const box = document.createElement('div'); box.id = 'toastbox';
  box.innerHTML = `<div class="mk-toast" role="status"><span>${esc(msg)}</span>${undo ? `<button type="button" data-act="undo">${T('Undo', 'เลิกทำ')}</button>` : ''}</div>`; document.body.appendChild(box);
  clearTimeout(toastT); toastT = setTimeout(() => { const t = box.firstChild; if (t && !reduced()) { t.classList.add('mk-out'); setTimeout(() => box.remove(), 160); } else box.remove(); }, undo ? 6000 : 3200);
}

/* ---------- actions ---------- */
let removed = null, lastText = null;
function setMode(m) { if (m === 'hidden' && S.mode !== 'hidden') S.prevMode = S.mode === 'pinned' || S.mode === 'paused' ? S.mode : 'auto'; if (m === 'paused') S.frozen = (curScene() || sceneBy('design')).id; S.mode = m; S.menuOpen = false; }
const keep = (sel) => { buildDrawer(); const e = $(sel, layer()); e && e.focus({ preventScroll: true }); };
const ACT = {
  screen: a => { S.screen = a; S.menuOpen = false; S.acctOpen = false; },
  lang: a => { S.lang = a; }, theme: a => { S.theme = a; }, mode: a => setMode(a),
  noop: () => toast(T('Prototype: there is no real companion here', 'ตัวอย่าง: ไม่มี companion จริงที่นี่')),
  acctpop: () => { if (S.acctOpen) { closeAcct(() => { const b = $('[data-k="acct"]'); b && b.focus(); }); return 'overlay'; } S.acctOpen = true; },
  pinmenu: () => { if (S.menuOpen) { closeMenu(() => render()); return 'overlay'; } S.menuOpen = true; },
  pin: a => { S.pinned = a; S.mode = 'pinned'; S.menuOpen = false; toast(T('Pinned “' + sceneBy(a).name + '” until you cancel', 'ปักซีน “' + sceneBy(a).name + '” จนกว่าคุณจะยกเลิก')); },
  scrollrules: () => { const r = $('#rules'); r && r.scrollIntoView({ behavior: 'smooth' }); },
  addrule: (a, el) => { openPicker('app', el); return 'overlay'; }, editscene: (a, el) => { openDrawer(a, el); return 'overlay'; }, newscene: (a, el) => { openDrawer('new', el); return 'overlay'; },
  dup: a => { const s = sceneBy(a), c = JSON.parse(JSON.stringify(s)); c.id = a + '-copy' + Date.now(); S.fresh = c.id; setTimeout(() => { S.fresh = null; }, 400); c.name = s.name + ' ' + T('(copy)', '(สำเนา)'); S.scenes.push(c); toast(T('Duplicated — not used by any rule yet', 'ทำสำเนาแล้ว — ยังไม่มีกฎที่ใช้')); },
  rmrule: a => { const i = S.rules.findIndex(r => r.id === a); removed = { r: S.rules[i], i }; S.rules.splice(i, 1); toast(T('Rule removed', 'ลบกฎแล้ว'), true);
    const li = $(`[data-rule="${a}"]`); if (!li || reduced()) return; li.classList.add('mk-row-out'); li.setAttribute('inert', ''); setTimeout(() => li.remove(), 220); const add = $('[data-k="addrule"]'); add && add.focus(); return 'overlay'; },
  undo: () => { if (removed) { S.rules.splice(removed.i, 0, removed.r); S.fresh = removed.r.id; removed = null; const b = $('#toastbox'); b && b.remove(); render(); setTimeout(() => { S.fresh = null; }, 400); return 'overlay'; } },
  toast: a => toast(a),
  trayscreen: a => { S.screen = 'tray'; S.trayTab = a; S.noticeHidden = false; S.noticeSeen = false; }, traytab: a => { S.trayTab = a; },
  fakeclose: () => { S.noticeHidden = true; }, noticeok: () => { S.noticeSeen = true; }, noticereset: () => { S.noticeHidden = false; S.noticeSeen = false; },
  capture: () => { S.set.capture = !S.set.capture; }, import: () => { S.set.imp = !S.set.imp; },
  importgo: () => { S.set.imp = false; toast(T('Imported 4 Scenes, 5 rules (merged)', 'นำเข้า 4 ซีน 5 กฎ (รวมข้อมูล) แล้ว')); },
  askclear: () => { S.set.confirmClear = !S.set.confirmClear; },
  clearhist: () => { S.set.histCleared = true; S.set.confirmClear = false; toast(T('History cleared', 'ล้างประวัติแล้ว')); },
  askquit: () => { S.set.confirmQuit = !S.set.confirmQuit; },
  quit: () => { S.set.confirmQuit = false; S.mode = 'unreachable'; S.screen = 'now'; toast(T('Vibe quit — Discord now shows nothing.', 'ออกจาก Vibe แล้ว — Discord ไม่แสดงอะไร')); },
  frstep: a => { S.fr.step = +a; }, frdiscord: a => { S.fr.discord = a; }, frapp: a => { S.fr.app = a; }, frscene: a => { S.fr.scene = a; S.fr.sent = 'idle'; },
  frsend: () => { S.fr.sent = 'sending'; setTimeout(() => { S.fr.sent = S.fr.discord === 'ok' ? 'ok' : 'fail'; if (S.screen === 'first') render(); }, 1100); },
  frfinish: () => { const f = S.fr; if (!S.rules.some(r => r.app === f.app && r.kind === 'app')) S.rules.unshift({ id: 'rn' + Date.now(), kind: 'app', app: f.app, scene: f.scene }); S.screen = 'now'; S.mode = 'auto'; toast(T('All set — Vibe runs in the background now.', 'เสร็จแล้ว — Vibe ทำงานเบื้องหลังต่อไป')); },
  finishskip: () => { S.screen = 'now'; S.mode = 'none'; },
  closedrawer: () => { closeDrawer(); return 'overlay'; },
  stype: a => { sceneBy(S.drawer.id).type = a; keep(`[data-act="stype"][data-arg="${a}"]`); scheduleSave(); return 'overlay'; },
  imgmode: a => { const [p, m] = a.split(':'); S.drawer[p + 'Mode'] = m; keep(`[data-act="imgmode"][data-arg="${a}"]`); return 'overlay'; },
  art: a => { const [p, v] = a.split(':'), sc = sceneBy(S.drawer.id); sc[p === 'lg' ? 'art' : 'small'] = v; keep(`[data-act="art"][data-arg="${a}"]`); scheduleSave(); return 'overlay'; },
  ins: a => { const t = lastText || $('#sc-l1'), sc = sceneBy(S.drawer.id), f = t.id === 'sc-l2' ? 'l2' : 'l1', pos = t.selectionStart ?? t.value.length; t.value = t.value.slice(0, pos) + a + t.value.slice(t.selectionEnd ?? pos); sc[f] = t.value; t.focus(); t.setSelectionRange(pos + a.length, pos + a.length); updateDrawer(); scheduleSave(); return 'overlay'; },
  retry: () => { scheduleSave(); return 'overlay'; },
  pvview: a => { S.pvView = a; if (S.drawer) updateDrawer(); else render(); const b = $(`[data-act="pvview"][data-arg="${a}"]`); b && b.focus(); return 'overlay'; },
  closepicker: () => { closePicker(); return 'overlay'; },
  ptab: a => { S.picker.tab = a; S.picker.app = null; buildPicker(); const t = $('.vs-dialog [role=tab][aria-selected=true]'); t && t.focus(); return 'overlay'; },
  ppick: a => { S.picker.app = a; updatePicker(); const b = $(`.vs-dialog [data-arg="${a}"]`); b && b.focus(); return 'overlay'; },
  browse: () => { const c = { id: 'custom', name: 'sync.exe', exe: 'C:\\Tools\\sync.exe', g: '…' }; if (!INSTALLED.find(x => x.id === 'custom')) INSTALLED.push(c); S.picker.app = 'custom'; S.picker.q = 'sync'; buildPicker(); return 'overlay'; },
  sys: () => { S.picker.showSys = !S.picker.showSys; buildPicker(); return 'overlay'; },
  paddgo: () => { const p = S.picker, id = 'rn' + Date.now();
    if (p.tab === 'web') S.rules.push(p.hide ? { id, kind: 'hide', app: 'chrome', contains: p.contains } : { id, kind: 'web', app: 'chrome', contains: p.contains, scene: p.scene });
    else S.rules.push(p.hide ? { id, kind: 'hide', app: p.app } : { id, kind: 'app', app: p.app, scene: p.scene });
    S.fresh = id; closePicker(); render(); setTimeout(() => { S.fresh = null; }, 400); toast(T('Rule added', 'เพิ่มกฎแล้ว')); return 'overlay'; },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) {
    if (el.tagName === 'A') e.preventDefault();
    const fn = ACT[el.dataset.act]; if (!fn) return;
    const r = fn(el.dataset.arg, el);
    if (r === 'overlay') return;
    if (S.drawer) { buildDrawer(); return; }
    render({ fade: FADE.has(el.dataset.act) }); renderDev();
    if (el.dataset.act === 'pinmenu' && S.menuOpen) { const m = $('.mk-menu button'); m && m.focus(); }
    else if (el.dataset.k) { const t = $(`[data-k="${el.dataset.k}"]`); t && t.focus(); }
    return;
  }
  if (S.menuOpen && !e.target.closest('.mk-pop')) { closeMenu(() => render()); }
  if (S.acctOpen && !e.target.closest('.mk-acct')) { closeAcct(); }
  const dv = e.target.closest('[data-dev]'); if (dv) devAct(dv.dataset.dev);
});
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('#sc-l1,#sc-l2')) lastText = e.target; });
document.addEventListener('input', e => {
  const t = e.target, b = t.dataset.bind; if (!b) return;
  if (b === 'sc') { sceneBy(S.drawer.id)[t.dataset.f] = t.value; updateDrawer(); scheduleSave(); }
  else if (b === 'btn') { sceneBy(S.drawer.id).btns[+t.dataset.i][t.dataset.f] = t.value; updateDrawer(); scheduleSave(); }
  else if (b === 'frline') { sceneBy(S.fr.scene)[t.dataset.line] = t.value; S.fr.sent = 'idle'; const id = t.id, pos = t.selectionStart; render(); const n = $('#' + id); n.focus(); n.setSelectionRange(pos, pos); }
  else if (b === 'pq') { S.picker.q = t.value; updatePicker(); }
  else if (b === 'wcontains') { S.picker.contains = t.value; updatePicker(); }
  else if (b === 'appid') S.set.appId = t.value;
});
document.addEventListener('change', e => {
  const t = e.target, b = t.dataset.bind, d = t.dataset.dev;
  if (d) { if (S.drawer) { S.drawer = null; layer().innerHTML = ''; } if (S.picker) { S.picker = null; layer().innerHTML = ''; }
    if (d === 'screen') S.screen = t.value; if (d === 'mode') { S.mode = t.value; if (S.screen === 'first') S.screen = 'now'; S.menuOpen = false; } render({ fade: true }); renderDev(); return; }
  if (!b) return;
  if (b === 'rulescene') { const k = t.dataset.id; S.rules.find(r => r.id === k).scene = t.value; render(); const n = $(`[data-bind="rulescene"][data-id="${k}"]`); n && n.focus(); toast(T('Rule updated', 'อัปเดตกฎแล้ว')); }
  else if (b === 'scvars') { sceneBy(S.drawer.id).vars = t.checked; keep('#sc-vars'); scheduleSave(); }
  else if (b === 'phide') { S.picker.hide = t.checked; updatePicker(); }
  else if (b === 'pscene') S.picker.scene = t.value;
  else if (b === 'wbrowser') S.picker.browser = t.value;
  else if (b === 'tgl') { if (t.dataset.id === 'autostart') S.set.autostart = t.checked; if (t.dataset.id === 'hist') S.set.hist = t.checked; }
  else if (b === 'ret') { S.set.retention = t.value; toast(T('Older history will be removed automatically', 'ประวัติที่เก่ากว่านี้จะถูกลบอัตโนมัติ')); }
});
document.addEventListener('keydown', e => {
  if (S.set.capture) {
    e.preventDefault(); if (e.key === 'Escape') { S.set.capture = false; render(); return; }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift'].filter(Boolean);
    if (!mods.length) { toast(T('Add Ctrl, Alt or Shift so it doesn’t clash with typing', 'ใช้ Ctrl, Alt หรือ Shift ร่วมด้วยเพื่อไม่ให้ชนกับการพิมพ์')); return; }
    S.set.hotkey = [...mods, e.key.length === 1 ? e.key.toUpperCase() : e.key].join(' + '); S.set.capture = false; render(); const c = $('[data-k="capture"]'); c && c.focus(); return;
  }
  if (S.acctOpen && e.key === 'Escape') { closeAcct(() => { const b = $('[data-k="acct"]'); b && b.focus(); }); }
  if (S.menuOpen && e.key === 'Escape') { const p = $('[data-k="pin"]'); p && p.focus(); closeMenu(() => { render(); const q2 = $('[data-k="pin"]'); q2 && q2.focus(); }); }
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'h' && S.screen !== 'first') { setMode(S.mode === 'hidden' ? 'auto' : 'hidden'); render({ fade: true }); renderDev(); toast(S.mode === 'hidden' ? T('Hidden from Discord (hotkey)', 'ซ่อนจาก Discord แล้ว (ปุ่มลัด)') : T('Showing on Discord again', 'แสดงบน Discord อีกครั้ง')); }
});
function devAct(a) {
  if (a === 'toggle') $('#dev').classList.toggle('collapsed');
  if (a === 'picker' || a === 'pickerweb') { if (S.screen === 'first') S.screen = 'now'; render(); openPicker(a === 'picker' ? 'app' : 'web', null); }
  if (a === 'failnext') S.failNext = !S.failNext;
  if (a === 'frdiscord') { S.screen = 'first'; S.fr.step = 1; S.fr.discord = 'off'; }
  if (a === 'restart') { S.screen = 'first'; S.fr = { step: 1, discord: 'ok', app: 'figma', scene: 'design', sent: 'idle' }; }
  renderDev(); if (a !== 'picker' && a !== 'pickerweb') render();
}

/* ---------- field help (#18): hover / focus / tap, Escape closes; also highlights the preview area ---------- */
document.addEventListener('mouseover', e => { const h = e.target.closest && e.target.closest('.mk-help'); if (h && tipFor !== h) showTip(h); });
document.addEventListener('mouseout', e => { const h = e.target.closest && e.target.closest('.mk-help'); if (h && document.activeElement !== h) hideTip(); });
document.addEventListener('focusin', e => { const t = e.target; if (t.classList && t.classList.contains('mk-help')) showTip(t); else { if (tipFor) hideTip(); if (t.dataset && t.dataset.hl && S.drawer) highlight(t.dataset.hl); } });
document.addEventListener('focusout', e => { const t = e.target; if (t.classList && t.classList.contains('mk-help')) hideTip(); else if (t.dataset && t.dataset.hl) highlight(null); });
document.addEventListener('click', e => { const h = e.target.closest && e.target.closest('.mk-help'); if (h) { e.preventDefault(); tipFor === h && h.getAttribute('aria-expanded') === 'true' && e.detail === 0 ? hideTip() : showTip(h); } }, true);

/* ---------- boot ---------- */
(function boot() {
  const q = new URLSearchParams(location.search);
  if (q.get('lang')) S.lang = q.get('lang'); if (q.get('theme')) S.theme = q.get('theme');
  S.screen = q.get('screen') || 'first';
  if (q.get('state')) { S.mode = q.get('state'); if (S.mode === 'pinned') S.pinned = 'coding'; }
  if (S.screen === 'first' && !q.get('state')) S.mode = 'none';
  if (q.get('step')) S.fr.step = +q.get('step');
  if (q.get('step') === '3' && q.get('sent')) S.fr.sent = q.get('sent');
  if (q.get('discord') === 'off') S.fr.discord = 'off';
  if (q.get('tray')) { S.trayTab = q.get('tray'); S.noticeHidden = q.get('hidden') === '1'; }
  if (q.get('imp')) S.set.imp = true;
  if (q.get('pv')) S.pvView = q.get('pv');
  if (q.get('acct')) S.acctOpen = true;
  if (q.get('dev') === '0') { document.body.classList.add('nodev'); $('#dev').style.display = 'none'; }
  render(); renderDev();
  const o = q.get('open');
  if (['drawer', 'drawerfail', 'drawersaving', 'drawervars'].includes(o)) { if (o === 'drawervars') sceneBy('focus').vars = true; openDrawer(o === 'drawervars' ? 'focus' : 'design', null); if (o === 'drawerfail') { S.save = 'failed'; updateDrawer(); } if (o === 'drawersaving') { S.save = 'saving'; updateDrawer(); } }
  if (o === 'picker') openPicker('app', null);
  if (o === 'picksearch') openPicker('app', null, { q: 'blen', app: 'blender' });
  if (o === 'pickerweb') openPicker('web', null);
  if (q.get('scenesdrawer')) { S.screen = 'scenes'; render(); openDrawer('music', null); }
  if (q.get('tip')) { const hb = $(`.mk-help[data-help="${q.get('tip')}"]`, layer()); if (hb) { hb.scrollIntoView({ block: 'nearest' }); requestAnimationFrame(() => showTip(hb)); } }
  if (q.get('formscroll')) { const nb = $('.mk-drawer-body', layer()); if (nb) nb.scrollTop = +q.get('formscroll'); }
  if (q.get('adv')) { const d = $('.mk-drawer details', layer()); if (d) d.open = true; }
  if (q.get('scrollidx')) { const e = document.querySelectorAll('.vs-page > .vs-card')[+q.get('scrollidx')]; if (e) e.scrollIntoView(); }
})();
