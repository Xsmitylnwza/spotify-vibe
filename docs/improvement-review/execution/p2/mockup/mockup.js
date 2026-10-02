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

const DCID = { name: '', handle: '', id: '', avatarUrl: '' };
let profileStatus = 'loading', profilePending = null;
const LIVE = { enabled: false, busy: false, connected: false, active: false, scene: null, error: '', checked: false };
const REAL = { enabled: false, loading: false, ready: false, workspaceLoaded: false, error: '', observedAt: '', savedApps: [], saving: false, revision: 0, resave: false, presenceEnabled: false, selectedSceneId: '', selectedAppId: '', touched: false, applyAgain: false };
const profileEndpoint = () => LIVE.enabled ? location.origin + '/api/discord-profile' : 'http://127.0.0.1:17347/api/discord-profile';
const idOn = () => REAL.enabled ? !!DCID.id : profileStatus === 'ready' && !(S.screen === 'first' ? S.fr.discord === 'off' : ['discordoff', 'unreachable'].includes(S.mode));
const idAv = (on, sz) => on ? `<img class="mk-av ${sz || ''}" src="${esc(DCID.avatarUrl)}" referrerpolicy="no-referrer" alt="">` : `<span class="mk-av mk-av-off ${sz || ''}" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%" fill="currentColor"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg></span>`;
const idLine = on => on ? T('Connected as ', 'เชื่อมต่อเป็น ') + `<b>${esc(DCID.handle)}</b>` : `<b>${T('Open Discord Desktop', 'เปิด Discord Desktop')}</b>`;
const GEAR = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="4.2"/><circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none"/><path d="M16.2 10h1.6M10 16.2v1.6M3.8 10H2.2M10 3.8V2.2M14.4 14.4l1.1 1.1M5.6 14.4l-1.1 1.1M5.6 5.6L4.5 4.5M14.4 5.6l1.1-1.1"/></svg>';
function acctStatus() {
  const n = (curScene() || {}).name || '';
  return { auto: [T('Showing: ', 'กำลังแสดง: ') + n, 'on'], pinned: [T('Pinned: ', 'ปักไว้: ') + n, 'on'], paused: [T('Paused', 'หยุดสลับ'), 'warn'], hidden: [T('Hidden', 'ซ่อนอยู่'), 'warn'], autohide: [T('Hidden by rule', 'ซ่อนตามกฎ'), 'warn'], none: [T('Nothing to show', 'ไม่มีอะไรแสดง'), 'on'], discordoff: [T('Discord not running', 'Discord ไม่ได้เปิด'), 'off'], unreachable: [T('Companion not responding', 'companion ไม่ตอบสนอง'), 'off'] }[S.mode];
}
/* Discord-style account bar: avatar + status dot, name, one-line status, gear -> Settings. Narrow: avatar + gear only. */
function acctPanel(compact) {
  const on = idOn(), [txt, modeSt] = acctStatus(), st = on ? modeSt : 'off', name = on ? DCID.name : 'Discord';
  const pop = S.acctOpen ? `<div class="mk-menu mk-acct-pop" role="dialog" aria-label="${T('Discord account', 'บัญชี Discord')}"><div class="mk-acct-pop-h">${idAv(on)}<span><b>${esc(name)}</b><small>${on ? esc(DCID.handle) : T('Not connected', 'ยังไม่เชื่อมต่อ')}</small></span></div><p class="vs-caption" style="margin:6px 10px">${esc(txt)}</p><button type="button" data-act="toast" data-arg="${T('Prototype: this would open Discord Desktop', 'ตัวอย่าง: จะเปิด Discord Desktop')}">${T('Open Discord', 'เปิด Discord')}</button></div>` : '';
  return `<div class="mk-acct ${compact ? 'compact' : ''}" data-st="${st}" data-open="${!!S.acctOpen}"><button type="button" class="mk-acct-id" data-act="acctpop" data-k="acct" aria-haspopup="dialog" aria-expanded="${!!S.acctOpen}" aria-label="${T('Discord account', 'บัญชี Discord')}: ${esc(name)}. ${esc(txt)}"><span class="mk-acct-av">${idAv(on)}<span class="mk-acct-dot" data-s="${st}"></span></span><span class="mk-acct-t"><b class="mk-acct-n">${esc(name)}</b><small class="mk-acct-s">${esc(txt)}</small></span></button><button type="button" class="vs-icon-btn mk-gear" data-act="screen" data-arg="settings" title="${T('Settings', 'ตั้งค่า')}" aria-label="${T('Settings', 'ตั้งค่า')}">${GEAR}</button>${pop}</div>`;
}
function closeAcct(cb) { const p = $('.mk-acct-pop'); if (!p || reduced()) { S.acctOpen = false; render(); cb && cb(); return; } p.classList.add('mk-out'); setTimeout(() => { S.acctOpen = false; render(); cb && cb(); }, 120); }
const PV = { view: 'popout' };
const mkScene = o => Object.assign({ name: '', type: 'playing', actName: 'Vibe', l1: '', l1url: '', l2: '', l2url: '', art: 'a1', artText: '', artUrl: '', small: '', smallText: '', smallUrl: '', vars: false, btns: [{ label: '', url: '' }, { label: '', url: '' }] }, o);
const S = {
  lang: 'en', theme: 'light', screen: 'now', mode: 'auto', prevMode: 'auto',
  pinned: 'coding', pinnedRule: 'r2', frozen: 'coding', menuOpen: false, noticeSeen: false, noticeHidden: false, trayTab: 'menu',
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
  set: { giphy: true, hostKey: true, host: 'ImgBB', autostart: true, hotkey: 'Ctrl + Alt + H', capture: false, hist: true, retention: '30', histCleared: false, confirmClear: false, confirmQuit: false, imp: false, appId: '' },
  pairQuery: '', fixtureCount: 6, lastFocus: null, pvView: 'popout', iconUp: {},
};
S.scenes = S.scenes.map(mkScene); Object.assign(S.scenes[0], { artText: 'Hinata at his desk', smallText: 'Online', l1url: 'https://example.com/work' });
const appBy = id => [...APPS, ...INSTALLED, ...SYSTEM].find(a => a.id === id) || { id, name: id, exe: id + '.exe', g: id.slice(0, 2) };
const sceneBy = id => S.scenes.find(s => s.id === id);
const T = (en, th) => (S.lang === 'th' ? th : en);

/* Prototype-only scale fixtures; never read installed apps or change real config. */
function seedPairedApps(count) {
  count = [6, 36, 120].includes(Number(count)) ? Number(count) : 6;
  S.rules = S.rules.filter(r => !r.id.startsWith('fixture-'));
  for (let i = INSTALLED.length - 1; i >= 0; i--) if (INSTALLED[i].id.startsWith('fixture-')) INSTALLED.splice(i, 1);
  const names = ['Notion', 'Slack', 'Obsidian', 'Blender', 'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro', 'DaVinci Resolve', 'OBS Studio', 'Unity', 'Unreal Engine', 'Godot', 'Rider', 'WebStorm', 'IntelliJ IDEA', 'PyCharm', 'Android Studio', 'Postman', 'Insomnia', 'Docker Desktop', 'DBeaver', 'TablePlus', 'GitHub Desktop', 'Sourcetree', 'Linear', 'Todoist', 'Microsoft Teams', 'Zoom', 'Firefox', 'Microsoft Edge', 'Brave', 'VLC', 'Steam', 'Discord', 'Audacity', 'Ableton Live', 'FL Studio'];
  const scenes = ['coding', 'design', 'focus', 'music', 'gaming', 'watch'];
  for (let i = 0; i < count - 6; i++) {
    const id = 'fixture-' + i, name = names[i % names.length] + (i >= names.length ? ' · Workspace ' + (Math.floor(i / names.length) + 1) : '');
    INSTALLED.push({ id, name, exe: id + '.exe', g: name.slice(0, 2) });
    S.rules.push({ id, kind: 'app', app: id, scene: scenes[i % scenes.length] });
  }
  S.fixtureCount = count; S.pairQuery = '';
  if (S.pinnedRule.startsWith('fixture-')) setMode('auto');
}

/* ---------- small helpers (real classes) ---------- */
const icoOf = (a, lg) => a.icon ? `<img class="mk-ico ${lg ? 'mk-ico-lg' : ''}" src="${esc(a.icon)}" alt="">` : a.img ? `<img class="mk-ico ${lg ? 'mk-ico-lg' : ''}" src="${A_}${a.img}" alt="">` : `<span class="mk-ico-fb ${lg ? 'mk-ico-lg' : ''}" aria-hidden="true">${esc(a.g || a.name.slice(0, 2))}</span>`;
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
    case 'auto': case 'discordoff': case 'unreachable': return sceneBy((S.rules.find(r => r.id === 'r1') || {}).scene) || S.scenes[0];
    case 'pinned': return sceneBy(S.pinned);
    case 'paused': return sceneBy(S.frozen);
    default: return null;
  }
}
const reasonApp = a => `${icoOf(a)}<span>${T('from ', 'จาก ')}${esc(a.name)}</span>`;
const activeRuleId = () => (S.mode === 'auto' || S.mode === 'discordoff' ? 'r1' : S.mode === 'autohide' ? 'r7' : null);
const subst = (s, c) => s.replace(/\{app\}/g, c.app).replace(/\{window\}/g, c.win);
function sceneApp(sc) {
  const paired = S.rules.filter(r => r.scene === sc.id && r.kind === 'app');
  const selected = paired.find(r => r.app === REAL.selectedAppId);
  const running = paired.find(r => APPS.some(a => a.id === r.app && a.foreground)) || paired.find(r => APPS.some(a => a.id === r.app));
  const rule = selected || running || paired[0];
  return rule ? appBy(rule.app) : null;
}
function resolveSceneText(text, sc) { return String(text || '').replace(/\{app\}/g, sceneApp(sc)?.name || sc.name || T('Your app', 'แอปของคุณ')); }
/* Discord Desktop replicas: real identity, simulated activity. */
function dcCard(sc, o = {}) {
  const on = idOn(), list = o.view === 'list';
  const name = on ? DCID.name : T('Discord user', 'ผู้ใช้ Discord'), handle = on ? DCID.handle : T('Not connected', 'ยังไม่เชื่อมต่อ');
  const ctx = { app: REAL.enabled && sc ? sceneApp(sc)?.name || sc.name : o.app || 'Figma', win: REAL.enabled ? '' : o.win || 'Landing page v3 – Figma' };
  const dim = o.ghost ? 'opacity:.6' : '';
  const dot = `<span class="dcp-dot ${on ? '' : 'off'}" aria-hidden="true"></span>`;
  if (!sc) {
    const none = esc(o.sub || T('Nothing is shown on your profile.', 'ไม่มีอะไรแสดงบนโปรไฟล์ของคุณ'));
    if (list) return `<div class="dcp dcp-list" style="${dim}" role="img" aria-label="${esc(name)}"><div class="dcp-mlh">${T('ONLINE — 1', 'ออนไลน์ — 1')}</div><div class="dcp-mrow"><span class="dcp-mav">${idAv(on)}${dot}</span><span class="dcp-mt"><b>${esc(name)}</b></span></div></div>`;
    return `<div class="dcp" style="${dim}" role="img" aria-label="${esc(name + '. ' + none)}"><div class="dcp-top"><div class="dcp-banner"></div><div class="dcp-av">${idAv(on)}${dot}</div></div><div class="dcp-id"><b>${esc(name)}</b><span>${esc(handle)}</span></div><div class="dcp-hr"></div><div class="dcp-none"><b>${esc(o.title || T('No activity', 'ไม่มีกิจกรรม'))}</b><span>${none}</span></div></div>`;
  }
  const lbl = { playing: T('Playing', 'กำลังเล่น'), listening: T('Listening to', 'กำลังฟัง'), watching: T('Watching', 'กำลังดู'), competing: T('Competing in', 'กำลังแข่งใน') }[sc.type];
  const l1 = REAL.enabled ? resolveSceneText(sc.l1, sc) : sc.vars ? subst(sc.l1, ctx) : sc.l1, l2 = REAL.enabled ? resolveSceneText(sc.l2, sc) : sc.vars ? subst(sc.l2, ctx) : sc.l2, an = REAL.enabled ? resolveSceneText(sc.actName || 'Vibe', sc) : sc.actName || 'Vibe';
  if (list) return `<div class="dcp dcp-list" style="${dim}" role="img" aria-label="${esc(name + ', ' + lbl + ' ' + an)}"><div class="dcp-mlh">${T('ONLINE — 1', 'ออนไลน์ — 1')}</div><div class="dcp-mrow"><span class="dcp-mav">${idAv(on)}${dot}</span><span class="dcp-mt"><b>${esc(name)}</b><small data-pv="act">${lbl} <b>${esc(an)}</b></small></span></div></div>`;
  const b = sc.btns.map((x, i) => [x, i]).filter(x => x[0].label);
  const lk = (cls, area, txt, url) => `<span class="${cls} ${url ? 'dcp-link' : ''}" data-pv="${area}">${esc(txt)}</span>`;
  return `<div class="dcp" style="${dim}" role="img" aria-label="${esc(name + ', ' + lbl + ' ' + an + '. ' + l1 + '. ' + l2)}">
    <div class="dcp-top"><div class="dcp-banner"></div><div class="dcp-av">${idAv(on)}${dot}</div></div>
    <div class="dcp-id"><b>${esc(name)}</b><span>${esc(handle)}</span></div><div class="dcp-hr"></div>
    <div class="dcp-act"><div class="dcp-lbl" data-pv="act">${lbl}</div>
     <div class="dcp-row"><div class="dcp-img" data-pv="large" ${sc.artText ? `data-tip="${esc(sc.artText)}"` : ''}>${sc.art ? `<img src="${artSrc(sc.art, sc)}" alt="">` : ''}${sc.small ? `<span class="dcp-sm" data-pv="small" ${sc.smallText ? `data-tip="${esc(sc.smallText)}"` : ''}><img src="${artSrc(sc.small, sc)}" alt=""></span>` : ''}</div>
      <div class="dcp-tx"><b class="dcp-name" data-pv="act">${esc(an)}</b>${lk('dcp-l', 'details', l1 || '—', sc.l1url)}${lk('dcp-l', 'state', l2 || ' ', sc.l2url)}</div></div>
     ${b.length ? `<div class="dcp-btns">${b.map(x => `<span class="dcp-btn" data-pv="btn${x[1]}">${esc(x[0].label)}</span>`).join('')}</div>` : ''}</div></div>`;
}
const pvToggle = () => `<div class="vs-segmented mk-pvt" role="radiogroup" aria-label="${T('Preview type', 'ประเภทตัวอย่าง')}"><button type="button" role="radio" aria-checked="${S.pvView !== 'list'}" class="${S.pvView !== 'list' ? 'is-on' : ''}" data-act="pvview" data-arg="popout">${T('Profile popout', 'โปรไฟล์ป๊อปอัป')}</button><button type="button" role="radio" aria-checked="${S.pvView === 'list'}" class="${S.pvView === 'list' ? 'is-on' : ''}" data-act="pvview" data-arg="list">${T('Member list', 'รายชื่อสมาชิก')}</button></div>`;
const dcWrap = (sc, o = {}) => `<div class="mk-pvwrap">${dcCard(sc, Object.assign({ view: S.pvView }, o))}${pvToggle()}${S.pvView === 'list' && sc ? `<p class="vs-preview-foot">${T('The member list only shows the activity type and name. Other fields appear in the profile popout.', 'รายชื่อสมาชิกแสดงเฉพาะประเภทและชื่อกิจกรรม ช่องอื่นดูได้ในโปรไฟล์ป๊อปอัป')}</p>` : ''}</div>`;

/* ---------- Now ---------- */
/* Now (#30): one focal point = the Discord preview. Status line + preview + one control row + pairing summary. */
function nowView() {
  const mode = S.mode, sc = REAL.enabled ? realSelectedScene() : curScene();
  const tile = g => `<span class="mk-stico" aria-hidden="true">${g}</span>`;
  const link = sc ? `<button type="button" class="mk-scenelink" data-act="editscene" data-arg="${sc.id}" data-k="edit-now" title="${T('Edit this Scene', 'แก้ Scene นี้')}">${esc(sc.name)}</button>` : '';
  const btn = (cls, act, arg, ico, txt, extra = '') => `<button class="vs-btn ${cls}" type="button" data-act="${act}" ${arg ? `data-arg="${arg}"` : ''} ${extra}>${ico}${txt}</button>`;
  let icon, text, chip, ctl = '';
  if (mode === 'auto') { text = `${link}<small>${reasonApp(appBy('figma'))}</small>`; chip = ['good', T('Auto', 'อัตโนมัติ')]; }
  else if (mode === 'pinned') { text = `${link}<small>${T('Pinned', 'ปักไว้')}</small>`; chip = ['accent', T('Pinned', 'ปักไว้')]; }
  else if (mode === 'paused') { text = `${link}<small>${T('Paused', 'หยุดสลับ')}</small>`; chip = ['warn', T('Paused', 'หยุดสลับ')]; }
  else if (mode === 'hidden') { icon = tile(I.hide); text = T('Hidden from Discord', 'ซ่อนจาก Discord'); chip = ['neutral', T('Hidden', 'ซ่อนอยู่')]; }
  else if (mode === 'autohide') { icon = tile(I.hide); text = T('Hidden while MyBank Desktop is open', 'ซ่อนขณะที่ MyBank Desktop เปิดอยู่'); chip = ['neutral', T('Hidden by rule', 'ซ่อนตามกฎ')]; ctl = btn('', 'gotoprivacy', '', '', T('Privacy settings', 'ตั้งค่าความเป็นส่วนตัว')); }
  else if (mode === 'none') { icon = tile(I.search); text = T('No paired app is open', 'ไม่มีแอปที่จับคู่เปิดอยู่'); chip = ['neutral', T('Not shown', 'ไม่แสดง')]; ctl = btn('', 'screen', 'scenes', '', T('Manage in Scenes', 'จัดการใน Scene')); }
  else if (mode === 'discordoff') { icon = tile(I.warn); text = T('Discord isn’t running — open Discord Desktop', 'Discord ไม่ได้เปิด — เปิด Discord Desktop'); chip = ['warn', T('Discord closed', 'Discord ปิดอยู่')]; ctl = btn('vs-btn-primary', 'mode', 'auto', '', T('Check again', 'ตรวจสอบอีกครั้ง')); }
  else { icon = tile(I.warn); text = T('Can’t reach the Vibe companion', 'ติดต่อ Vibe companion ไม่ได้'); chip = ['warn', T('Not connected', 'ติดต่อไม่ได้')]; ctl = btn('vs-btn-primary', 'mode', 'auto', '', T('Reconnect', 'เชื่อมต่อใหม่')); }
  if (mode === 'paused') ctl = btn('', 'mode', 'auto', I.play, T('Resume automatic switching', 'กลับไปสลับอัตโนมัติ'));
  const available = !['discordoff', 'unreachable'].includes(mode);
  if (LIVE.enabled) {
    text = `${link || esc((LIVE.scene || {}).sceneName || T('No Scene', 'ยังไม่มี Scene'))}<small>${REAL.enabled ? (REAL.selectedAppId && sceneApp(sc || {}) ? reasonApp(sceneApp(sc)) : T('Pinned', 'ปักไว้')) : T('Manual control · no automatic app switching', 'ควบคุมด้วยมือ · ยังไม่สลับตามแอปอัตโนมัติ')}</small>`;
    chip = REAL.enabled ? (REAL.presenceEnabled ? ['good', LIVE.active && LIVE.scene?.id === sc?.id && !LIVE.busy ? T('Showing', 'กำลังแสดง') : T('On', 'เปิดอยู่')] : ['neutral', T('Off', 'ปิดอยู่')]) : LIVE.active ? ['good', T('Live', 'ส่งจริงแล้ว')] : ['neutral', T('Not sent', 'ยังไม่ส่ง')];
    if (REAL.enabled) ctl = LIVE.error ? `<p class="field-error" role="alert">${esc(LIVE.error)}</p>${!LIVE.connected ? `<button class="vs-btn vs-btn-sm" data-act="livecheck">${T('Reconnect Discord', 'เชื่อมต่อ Discord ใหม่')}</button>` : ''}` : '';
  }
  const sceneMode = sc && (REAL.enabled || ['auto', 'pinned', 'paused'].includes(mode));
  if (sceneMode) icon = `<img class="mk-scthumb" src="${artSrc(sc.art, sc)}" alt="">`;
  if (REAL.enabled && !sc) text = T('No Scene yet', 'ยังไม่มี Scene');
  const isPinned = REAL.enabled ? !REAL.selectedAppId : mode === 'pinned';
  if (sceneMode && (REAL.enabled || mode === 'auto' || mode === 'pinned' || mode === 'paused')) {
    const back = (isPinned || mode === 'paused') && (!REAL.enabled || S.rules.some(r => r.kind === 'app' && APPS.some(x => x.id === r.app)));
    const pk = `<button type="button" class="vs-btn vs-btn-sm" data-act="scenepick" data-k="scenepick" aria-expanded="${!!S.pickOpen}">${I.pin}${isPinned ? T('Change…', 'เปลี่ยน…') : T('Pin…', 'ปักหมุด…')}</button>${back && mode !== 'paused' ? `<button type="button" class="vs-btn vs-btn-sm" data-act="backauto">${T('Back to Auto', 'กลับสู่อัตโนมัติ')}</button>` : ''}`;
    const list = S.pickOpen ? `<ul class="mk-pickscene" role="list">${S.scenes.map(x => `<li><button type="button" class="mk-pickrow ${x.id === sc.id ? 'is-on' : ''}" data-act="pickscene" data-arg="${x.id}" ${x.id === sc.id ? 'aria-current="true"' : ''}><img src="${artSrc(x.art, x)}" alt=""><span>${esc(x.name)}</span></button></li>`).join('')}</ul>` : '';
    ctl = pk + list + ctl;
  }
  const enabled = REAL.enabled ? REAL.presenceEnabled : LIVE.enabled ? LIVE.active : mode !== 'hidden';
  const power = `<label class="mk-presence-power"><span>${T('Show on Discord', 'แสดงบน Discord')}</span><span class="vs-switch"><input type="checkbox" role="switch" data-bind="presence" aria-label="${T('Show on Discord', 'แสดงบน Discord')}" ${enabled ? 'checked' : ''} ${!REAL.enabled && (!available || (LIVE.enabled && (LIVE.busy || !LIVE.checked))) ? 'disabled' : ''}><span></span></span></label>`;
  const none = title => ({ title, sub: mode === 'discordoff' ? T('Nothing to show until Discord starts.', 'ไม่มีอะไรให้แสดงจนกว่า Discord จะเปิด') : undefined });
  const actual = LIVE.active && LIVE.scene ? mkScene({ id: LIVE.scene.id, name: LIVE.scene.sceneName, type: LIVE.scene.activityType, actName: LIVE.scene.activityName, l1: LIVE.scene.details, l2: LIVE.scene.state, art: LIVE.scene.largeImage, small: LIVE.scene.smallImage, btns: LIVE.scene.buttons || [] }) : null;
  const pv = view => LIVE.enabled ? dcCard(actual, { view, title: T('No live activity', 'ไม่มีกิจกรรมจริง') }) : mode === 'unreachable' ? dcCard(sc, { ghost: true, view }) : mode === 'discordoff' ? dcCard(null, Object.assign(none(T('Discord not running', 'Discord ไม่ได้เปิด')), { view })) : sc ? dcCard(sc, { view }) : dcCard(null, { title: mode === 'hidden' || mode === 'autohide' ? T('Hidden', 'ซ่อนอยู่') : T('No activity', 'ไม่มีกิจกรรม'), view });
  const label = LIVE.enabled ? T('Preview · last Scene accepted by Discord', 'ตัวอย่าง · Scene ล่าสุดที่ Discord รับแล้ว') : mode === 'unreachable' ? T('Last known · may be out of date', 'ข้อมูลล่าสุด · อาจไม่ตรงปัจจุบัน') : T('Preview — how others see you on Discord', 'ตัวอย่าง — คนอื่นเห็นคุณบน Discord แบบนี้');
  const lay = (v, extra = '') => `<div class="mk-pvlayer ${S.pvView === v || (v === 'popout' && S.pvView !== 'list') ? 'is-on' : ''}" data-view="${v}" ${(S.pvView === 'list') === (v === 'list') ? '' : 'inert aria-hidden="true"'}>${pv(v)}${extra}</div>`;
  return `<div class="vs-page-head" style="margin-bottom:16px"><h1 class="vs-title" style="margin:0">${T('Now', 'ตอนนี้')}</h1></div>
  ${LIVE.enabled && !REAL.enabled ? livePanel() : ''}
  <div class="mk-nowgrid"><div class="mk-nowleft">
    <section class="vs-card mk-hero" aria-label="${T('Status', 'สถานะ')}"><div class="mk-hero-top"><span class="vs-pill vs-pill-${chip[0]}">${chip[1]}</span>${available ? power : ''}</div>
      <div class="mk-hero-line" role="status">${icon}<span class="mk-st-text">${text}</span></div>
      ${ctl ? `<div class="mk-ctlrow is-single">${ctl}</div>` : ''}</section>
    ${pairedPanel()}</div>
    <section class="vs-card mk-pvpanel" aria-label="${T('Discord preview', 'ตัวอย่าง Discord')}"><div class="mk-pv-h"><span class="mk-pv-t">${label}</span>${pvToggle()}</div>
      <div class="mk-pvbody">${lay('popout')}${lay('list', `<p class="vs-preview-foot" style="text-align:center">${T('The member list shows only the activity type and name.', 'รายชื่อสมาชิกแสดงเฉพาะประเภทและชื่อกิจกรรม')}</p>`)}</div></section>
  </div>`;
}
function pairedPanel() {
  const rules = S.rules.filter(r => r.kind !== 'hide'), hides = S.rules.filter(r => r.kind === 'hide').length;
  const query = S.pairQuery.trim().toLocaleLowerCase();
  const visible = rules.filter(r => !query || [appBy(r.app).name, r.contains || '', (sceneBy(r.scene) || {}).name || ''].some(v => v.toLocaleLowerCase().includes(query)));
  const tiles = visible.map(r => {
    const a = appBy(r.app), sc = sceneBy(r.scene), web = r.kind === 'web', run = APPS.some(x => x.id === a.id), pinned = REAL.enabled ? REAL.selectedAppId === r.app && REAL.selectedSceneId === r.scene : (S.mode === 'pinned' || (S.mode === 'hidden' && S.prevMode === 'pinned')) && S.pinnedRule === r.id && S.pinned === r.scene, active = S.mode === 'pinned' ? pinned : activeRuleId() === r.id;
    const nm = web ? T(`${a.name} tab “${r.contains}”`, `${a.name} แท็บ “${r.contains}”`) : a.name;
    const pinLabel = pinned ? T('Unpin', 'เลิกปักหมุด') : T('Pin', 'ปักหมุด');
    const blocked = REAL.enabled ? !REAL.ready : LIVE.enabled ? LIVE.busy || !LIVE.checked : ['hidden', 'autohide', 'discordoff', 'unreachable'].includes(S.mode);
    return `<div data-key="pair-${r.id}" class="mk-ptile ${active ? 'is-active' : ''}"><button type="button" class="mk-pt-main" data-key="pt-${r.id}" data-k="pt-${r.id}" data-act="editpair" data-arg="${r.scene}" aria-label="${esc(nm)} → ${esc(sc.name)}${run ? ', ' + T('running', 'กำลังทำงาน') : ''}${active ? ', ' + T('showing now', 'กำลังแสดง') : ''}"><span class="mk-st-i" style="margin:0">${icoOf(a)}${web ? `<span class="mk-globe">${I.globe}</span>` : ''}${run ? `<span class="mk-run" title="${T('Running', 'กำลังทำงาน')}"></span>` : ''}</span><span class="mk-pt-n">${esc(web ? '“' + r.contains + '”' : a.name)}</span><span class="mk-arrow" aria-hidden="true">→</span><span class="mk-pt-s"><img src="${artSrc(sc.art, sc)}" alt=""><span>${esc(sc.name)}</span></span></button><button type="button" class="mk-pt-pin" data-act="pinpair" data-arg="${r.id}" data-k="pin-${r.id}" aria-pressed="${pinned}" aria-label="${esc(pinLabel + ' ' + nm + ' → ' + sc.name)}" title="${blocked ? T('Enable Discord presence and resolve the status above to pin', 'เปิดการแสดงบน Discord และแก้สถานะด้านบนก่อนปักหมุด') : esc(pinLabel + ' ' + nm)}" ${blocked ? 'disabled' : ''}>${I.pin}<span>${pinLabel}</span></button></div>`;
  }).join('');
  return `<section class="vs-card mk-paired" aria-labelledby="pph"><div class="mk-phead"><h2 id="pph">${T('Paired apps', 'แอปที่จับคู่')} <span class="mk-pair-count">${rules.length}</span></h2>${REAL.enabled ? `<div class="mk-phead-act"><button class="vs-btn vs-btn-sm" data-act="realadd" ${!REAL.ready ? 'disabled' : ''}>${I.plus}${T('Add app', 'เพิ่มแอป')}</button><button class="vs-btn vs-btn-sm" data-act="refreshapps" ${REAL.loading ? 'disabled' : ''}>${T('Refresh', 'อ่านใหม่')}</button></div>` : ''}</div>
    <div class="mk-keeprow"><span class="vs-hint">${T('Choose an app to keep showing', 'เลือกแอปที่ต้องการแสดงค้างไว้')}</span>${REAL.enabled ? `<span class="mk-keepstat" role="status">${REAL.loading ? T('Reading apps from this PC…', 'กำลังอ่านแอปจากเครื่อง…') : REAL.ready ? T(`${APPS.length} running · ${INSTALLED.length} available`, `กำลังเปิด ${APPS.length} แอป · เลือกได้ ${INSTALLED.length} แอป`) : T('Apps could not be loaded', 'อ่านแอปไม่ได้')}</span>` : ''}</div>
    ${REAL.enabled && REAL.error ? `<p class="field-error" role="alert">${esc(REAL.error)}</p>` : ''}
    ${rules.length > 8 ? `<div class="mk-pair-search">${I.search}<input class="vs-input" type="search" data-bind="pairsearch" data-k="pairsearch" aria-label="${T('Find paired apps or Scenes', 'ค้นหาแอปหรือ Scene ที่จับคู่')}" placeholder="${T('Find an app or Scene…', 'ค้นหาแอปหรือ Scene…')}" value="${esc(S.pairQuery)}"><span role="status" aria-live="polite">${visible.length} / ${rules.length}</span></div>` : ''}
    ${rules.length ? `<div class="mk-ptiles ${rules.length > 8 ? 'is-scrollable' : ''}" role="region" aria-label="${T('Paired app list', 'รายการแอปที่จับคู่')}" tabindex="${rules.length > 8 ? '0' : '-1'}">${tiles || `<p class="mk-pair-empty">${T('No matching apps or Scenes.', 'ไม่พบแอปหรือ Scene ที่ค้นหา')}</p>`}</div>` : `<p class="mk-pair-empty">${T('No apps paired yet — open a Scene and add one.', 'ยังไม่ได้จับคู่แอป — เปิด Scene แล้วเพิ่มแอป')}</p>`}
    ${REAL.enabled ? '' : `<div class="mk-pfoot"><span>${T(`${hides} auto-hide ${hides === 1 ? 'rule' : 'rules'}`, `กฎซ่อนอัตโนมัติ ${hides} ข้อ`)} ·</span><button type="button" class="vs-quiet-link" data-act="gotoprivacy">${T('Privacy settings', 'ตั้งค่าความเป็นส่วนตัว')}</button></div>`}</section>`;
}
function ruleRow(r) { /* auto-hide rules only (Settings > Privacy) */
  const a = appBy(r.app), web = !!r.contains, active = activeRuleId() === r.id;
  const name = web ? T('Tab: “' + r.contains + '”', 'แท็บ: “' + r.contains + '”') : a.name, sub = web ? T(`${a.name} · title contains “${r.contains}”`, `${a.name} · ชื่อแท็บมีคำว่า “${r.contains}”`) : a.exe;
  return `<li class="mk-rule ${active ? 'is-active' : ''} ${S.fresh === r.id ? 'mk-row-in' : ''}" data-rule="${r.id}"><span class="vs-visually-hidden">${T('Auto-hide rule', 'กฎซ่อนอัตโนมัติ')}</span><span class="mk-label">${web ? `<span class="mk-ico-fb" aria-hidden="true">${I.globe}</span>` : icoOf(a)}<span style="min-width:0"><strong>${esc(name)}</strong><small>${esc(sub)}</small></span></span><span class="mk-arrow" aria-hidden="true">→</span><span class="mk-target">${I.hide}${T('Hide from Discord while open', 'ซ่อนจาก Discord ขณะเปิดอยู่')}</span>
    <span class="mk-acts">${active ? `<span class="vs-pill vs-pill-good">${T('Active', 'ใช้อยู่')}</span>` : ''}<button class="vs-icon-btn-danger" type="button" data-act="rmrule" data-arg="${r.id}" aria-label="${T('Remove rule', 'ลบกฎ')}: ${esc(name)}">${I.x}</button></span></li>`;
}

/* ---------- Scenes ---------- */
function scenesView() {
  const rows = S.scenes.map(s => {
    const live = curScene() && curScene().id === s.id && ['auto', 'pinned', 'paused'].includes(S.mode);
    const tl = TYPES.find(t => t[0] === s.type)[S.lang === 'th' ? 2 : 1];
    return `<div data-key="sc-${s.id}" class="vs-scene-row mk-srow ${live ? 'is-live' : ''} ${S.fresh === s.id ? 'mk-row-in' : ''}"><button type="button" class="mk-srow-main" data-act="editscene" data-arg="${s.id}" data-k="lib-${s.id}"><span class="vs-scene-icon">${s.art ? `<img src="${artSrc(s.art, s)}" alt="">` : ''}${live ? `<span class="mk-livedot" role="img" aria-label="${T('Showing on Discord now', 'กำลังแสดงบน Discord')}"></span>` : ''}</span>
      <span class="vs-scene-meta"><span class="vs-scene-name">${esc(s.name)}</span><span class="vs-scene-sub">${esc(tl)} · ${esc(s.l1 || '—')}${s.l2 ? ' · ' + esc(s.l2) : ''}</span></span></button>
      <span class="mk-srow-r">${stackHtml(s.id)}</span></div>`;
  }).join('');
  return `${pageHead(T('Library', 'คลัง'), T('Scenes', 'Scene ทั้งหมด'), T('A Scene is the text and artwork that appears on Discord. Pair apps inside a Scene to show it automatically.', 'Scene คือชุดข้อความและภาพที่จะขึ้นบน Discord จับคู่แอปใน Scene เพื่อให้แสดงอัตโนมัติ'))}
  <section class="vs-card vs-library" aria-labelledby="slt"><div class="vs-card-head mk-head-row"><h2 id="slt">${T('Scene library', 'คลัง Scene')}</h2><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="newscene" data-k="newscene">${I.plus}${T('New Scene', 'สร้าง Scene ใหม่')}</button></div><div id="sceneList">${rows || `<div class="mk-empty-scenes"><strong>${T('No Scenes yet', 'ยังไม่มี Scene')}</strong><p class="vs-hint">${T('Create your first Scene, then pair an app with it.', 'สร้าง Scene แรก แล้วจับคู่แอปกับ Scene นั้น')}</p></div>`}</div>
  <div class="vs-toolbar"><span class="vs-hint">${T('Select a Scene to edit it. The icons show which apps use it; “+ app” adds a rule.', 'เลือก Scene เพื่อแก้ไข ไอคอนแสดงแอปที่ใช้ Scene นี้ “+ แอป” เพิ่มกฎ')}</span></div></section>`;
}

/* ---------- Settings ---------- */
function histRows() {
  if (S.set.histCleared) return `<p class="vs-caption">${T('History is empty.', 'ประวัติว่างเปล่า')}</p>`;
  return `<div class="mk-hist">${[['11:02', 'Design · Figma', '1h 12m'], ['09:41', 'Coding · Visual Studio Code', '1h 21m'], ['09:10', T('Hidden · MyBank Desktop', 'ซ่อน · MyBank Desktop'), '12m'], ['08:30', 'Music · Spotify', '40m']].map(r => `<div><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span></div>`).join('')}</div>`;
}
function settingsView() {
  if (REAL.enabled) return `${pageHead('', T('Settings', 'ตั้งค่า'), '')}<section class="vs-card"><div class="vs-card-head"><h2>${T('Discord profile', 'โปรไฟล์ Discord')}</h2></div>${discordProfilePanel()}</section><section class="vs-card"><h2>${T('Your workspace', 'ข้อมูลของคุณ')}</h2><p class="vs-caption">${T('Choose a Scene or pin a paired app. Your changes apply while Show on Discord is on.', 'เลือก Scene หรือปักหมุดแอปที่จับคู่ การแก้ไขจะใช้ทันทีเมื่อเปิดแสดงบน Discord')}</p><button class="vs-btn" data-act="refreshapps" ${REAL.loading ? 'disabled' : ''}>${T('Refresh apps from this PC', 'อ่านแอปจากเครื่องใหม่')}</button>${REAL.error ? `<p class="field-error" role="alert">${esc(REAL.error)}</p>` : ''}</section>`;
  const s = S.set;
  const card = (title, sub, body) => `<section class="vs-card"><div class="vs-card-head"><h2>${title}</h2>${sub ? `<p class="vs-subcopy">${sub}</p>` : ''}</div>${body}</section>`;
  return `${pageHead(T('Preferences', 'การตั้งค่า'), T('Settings', 'ตั้งค่า'), T('Connection, startup, shortcuts and your data. Everything here is stored on this PC.', 'การเชื่อมต่อ การเริ่มต้น ปุ่มลัด และข้อมูลของคุณ ทั้งหมดเก็บในเครื่องนี้'))}
  ${card(T('Discord connection', 'การเชื่อมต่อ Discord'), '', discordProfilePanel() + `
    <details class="vs-disclosure"><summary>${T('Advanced', 'ขั้นสูง')}</summary><div class="vs-disclosure-body"><div class="vs-field"><label class="vs-label" for="appid">Discord Application ID</label><input class="vs-input" type="text" id="appid" inputmode="numeric" placeholder="${T('Built-in ID in use — leave empty', 'ใช้ ID ที่มาพร้อมโปรแกรม — เว้นว่างได้')}" value="${esc(s.appId)}" data-bind="appid"><p class="vs-hint">${T('Only if you want your own Discord app name and artwork. Leave empty to use the built-in one.', 'ใช้เมื่ออยากใช้ชื่อและภาพของแอป Discord ของคุณเอง เว้นว่างเพื่อใช้ค่าที่มาพร้อมโปรแกรม')}</p></div></div></details>`)}
  ${card(T('Startup & window', 'เริ่มต้นและหน้าต่าง'), '', `${sw('autostart', T('Start with Windows', 'เริ่มพร้อม Windows'), T('Vibe starts in the tray and shows your Scene without opening this window.', 'Vibe เริ่มในถาดระบบและแสดงซีนโดยไม่ต้องเปิดหน้าต่างนี้'), s.autostart)}
    <div class="vs-row"><div class="vs-row-copy"><strong>${T('Closing this window (✕)', 'เมื่อกดปิดหน้าต่าง (✕)')}</strong><small>${T('Hides to the tray; Vibe keeps running. Quit from the tray menu or from the bottom of this page.', 'ย่อไปที่ถาดระบบ Vibe ยังทำงานต่อ ออกจากโปรแกรมได้จากเมนูถาดหรือด้านล่างของหน้านี้')}</small></div><button class="vs-btn vs-btn-sm" type="button" data-act="trayscreen" data-arg="notice">${T('Show the notice again', 'แสดงประกาศอีกครั้ง')}</button></div>`)}
  ${card(T('Global hotkey', 'ปุ่มลัดทั่วระบบ'), '', `<div class="vs-row"><div class="vs-row-copy"><strong>${T('Hide / show on Discord', 'ซ่อน / แสดงบน Discord')}</strong><small>${T('Works from any app, even when Studio is closed.', 'ใช้ได้จากทุกแอป แม้ปิด Studio อยู่')}</small></div><span class="mk-kbd" aria-live="polite">${s.capture ? T('Press keys…', 'กดปุ่มที่ต้องการ…') : esc(s.hotkey)}</span><button class="vs-btn vs-btn-sm" type="button" data-act="capture" data-k="capture">${s.capture ? T('Cancel', 'ยกเลิก') : T('Change', 'เปลี่ยน')}</button></div>
    <p class="vs-caption">${T('Registered. If another app already uses this shortcut, Vibe says so here instead of failing silently.', 'ลงทะเบียนแล้ว หากแอปอื่นใช้ปุ่มนี้อยู่ Vibe จะแจ้งตรงนี้ ไม่ปล่อยให้ล้มเหลวเงียบๆ')}</p>`)}
  ${card(T('Back up & move', 'สำรองและย้ายข้อมูล'), T('One file with your Scenes, app rules and web rules. Saved on this PC only; secrets are never included.', 'ไฟล์เดียวที่มีซีน กฎแอป และกฎเว็บ เก็บในเครื่องนี้เท่านั้น ไม่รวมคีย์ลับ'), `<div class="vs-form-actions" style="margin-top:0"><button class="vs-btn vs-btn-sm" type="button" data-act="toast" data-arg="${T('Saved vibe-backup-2026-10-02.json — 6 Scenes, 7 rules', 'บันทึก vibe-backup-2026-10-02.json แล้ว — 6 ซีน, 7 กฎ')}">${I.up}${T('Export…', 'ส่งออก…')}</button><button class="vs-btn vs-btn-sm" type="button" data-act="import">${I.down}${T('Import…', 'นำเข้า…')}</button></div>
    ${s.imp ? `<div class="vs-pair-bar" role="group" aria-label="${T('Import preview', 'ตัวอย่างการนำเข้า')}" style="margin-top:16px;flex-direction:column;align-items:flex-start"><strong>vibe-backup-2026-09-20.json</strong><span class="vs-hint" style="margin:0">${T('Contains 4 Scenes and 5 rules. Nothing changes until you confirm.', 'มี 4 ซีน และ 5 กฎ ยังไม่มีอะไรเปลี่ยนจนกว่าคุณจะยืนยัน')}</span>
      <label><input type="radio" name="imp" checked> ${T('Merge (keep mine, add new)', 'รวม (เก็บของเดิม เพิ่มของใหม่)')}</label><label><input type="radio" name="imp"> ${T('Replace everything', 'แทนที่ทั้งหมด')}</label>
      <div class="vs-actions"><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="importgo">${T('Import', 'นำเข้า')}</button><button class="vs-btn vs-btn-sm" type="button" data-act="import">${T('Cancel', 'ยกเลิก')}</button></div></div>` : ''}`)}
  ${hostingCard(card)}
  ${privacyCard(card)}
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
  let title, sub, body, foot;
  if (step === 1) {
    title = T('Let’s get Discord showing your apps', 'มาให้ Discord แสดงแอปของคุณกัน'); sub = T('Vibe talks to the Discord app on this PC. No login, no copy-pasting IDs.', 'Vibe คุยกับแอป Discord ในเครื่องนี้ ไม่ต้องล็อกอิน ไม่ต้องคัดลอก ID');
    body = `<div class="mk-ob-body"><div class="vs-pair-bar">${f.discord === 'ok' ? `<span class="vs-pill vs-pill-good">${T('Discord found', 'พบ Discord')}</span><span>${T('Discord is running and Vibe is connected.', 'Discord เปิดอยู่และ Vibe เชื่อมต่อแล้ว')}</span>` : `<span class="vs-pill vs-pill-warn">${T('Discord not found', 'ไม่พบ Discord')}</span><span>${T('Open the Discord desktop app, then check again.', 'เปิดแอป Discord บนเดสก์ท็อป แล้วตรวจสอบอีกครั้ง')}</span><button class="vs-btn vs-btn-sm vs-btn-primary" type="button" data-act="frdiscord" data-arg="ok">${T('Check again', 'ตรวจสอบอีกครั้ง')}</button>`}</div></div>`;
    foot = act(0, `<button class="vs-btn vs-btn-primary" type="button" data-act="frstep" data-arg="2" ${f.discord === 'ok' ? '' : 'disabled'}>${T('Continue', 'ต่อไป')}</button>`);
  } else if (step === 2) {
    title = T('Which app should Discord show?', 'ให้ Discord แสดงแอปไหน?'); sub = T('These are running right now. Pick one — you can add more later.', 'แอปเหล่านี้กำลังทำงานอยู่ เลือกหนึ่งแอป เพิ่มทีหลังได้');
    body = `<div class="mk-ob-body"><div class="mk-tiles" role="radiogroup" aria-label="${T('Running apps', 'แอปที่กำลังทำงาน')}">${APPS.filter(a => a.id !== 'mybank').map(a => `<button class="mk-tile" type="button" role="radio" aria-checked="${f.app === a.id}" aria-pressed="${f.app === a.id}" data-act="frapp" data-arg="${a.id}"><span class="vs-tile-icon">${icoOf(a, 1)}<span class="vs-tile-running" title="${T('Running now', 'กำลังทำงาน')}"></span></span><strong>${esc(a.name)}</strong></button>`).join('')}</div>
      <div class="vs-actions"><button class="vs-btn vs-btn-sm" type="button" data-act="toast" data-arg="Picked C:\\Tools\\sync.exe">${I.folder}${T('Browse for .exe…', 'เลือกไฟล์ .exe…')}</button><span class="vs-hint" style="margin:0">${T('System apps are hidden.', 'ซ่อนแอประบบแล้ว')}</span></div></div>`;
    foot = act(1, `<button class="vs-btn vs-btn-primary" type="button" data-act="frstep" data-arg="3">${T('Continue', 'ต่อไป')}</button>`);
  } else if (!S.scenes.length) {
    const a = appBy(f.app); title = T('Create your first Scene', 'สร้าง Scene แรกของคุณ'); sub = T(`When ${a.name} is open, Discord will show this.`, `เมื่อเปิด ${a.name} Discord จะแสดงสิ่งนี้`);
    body = `<div class="mk-ob-body"><div class="vs-field"><label class="vs-label" for="frname">${T('Scene name', 'ชื่อ Scene')}</label><input class="vs-input" type="text" id="frname" data-bind="frname" value="${esc(f.newName || '')}" placeholder="${T('e.g. Design', 'เช่น Design')}"></div></div>`;
    foot = act(2, `<button class="vs-btn vs-btn-primary" type="button" data-act="frcreate" ${(f.newName || '').trim() ? '' : 'disabled'}>${T('Create Scene', 'สร้าง Scene')}</button>`);
  } else {
    const sc = sceneBy(f.scene), a = appBy(f.app), sent = f.sent;
    title = T('Pick a Scene and see it on Discord', 'เลือกซีนแล้วดูบน Discord ทันที'); sub = T(`When ${a.name} is open, Discord will show this.`, `เมื่อเปิด ${a.name} Discord จะแสดงสิ่งนี้`);
    body = `<div class="mk-ob-body mk-ob-split"><div class="mk-ob-left"><div class="vs-looks" role="radiogroup" aria-label="Scene" style="margin-top:0">${S.scenes.slice(0, 4).map(s => `<button class="vs-look" type="button" role="radio" aria-checked="${f.scene === s.id}" aria-pressed="${f.scene === s.id}" data-act="frscene" data-arg="${s.id}"><img src="${artSrc(s.art, s)}" alt="">${esc(s.name)}</button>`).join('')}</div>
      <div class="vs-grid2"><div class="vs-field"><label class="vs-label" for="frl1">${T('Line 1', 'บรรทัดที่ 1')}</label><input class="vs-input" type="text" id="frl1" value="${esc(sc.l1)}" data-bind="frline" data-line="l1"></div><div class="vs-field"><label class="vs-label" for="frl2">${T('Line 2', 'บรรทัดที่ 2')}</label><input class="vs-input" type="text" id="frl2" value="${esc(sc.l2)}" data-bind="frline" data-line="l2"></div></div>
      <div class="${sent === 'fail' ? 'vs-alert is-bad' : 'vs-pair-bar'}" role="status" aria-live="polite" style="margin:0">${sent === 'ok' ? `<span class="vs-pill vs-pill-good">${T('On Discord', 'อยู่บน Discord')}</span>` : sent === 'sending' ? `<span class="vs-pill vs-pill-neutral">${T('Sending…', 'กำลังส่ง…')}</span>` : sent === 'fail' ? '' : `<span class="vs-pill vs-pill-neutral">${T('Not on Discord yet', 'ยังไม่อยู่บน Discord')}</span>`}<span>${sent === 'idle' ? T('Press “Show on Discord” to try it.', 'กด “แสดงบน Discord” เพื่อลอง') : sent === 'sending' ? T('Waiting for Discord to confirm…', 'รอ Discord ยืนยัน…') : sent === 'ok' ? T('Discord confirmed — it’s on your profile now.', 'Discord ยืนยันแล้ว — แสดงบนโปรไฟล์ของคุณตอนนี้') : T('Discord didn’t accept it. Your text is kept; try again.', 'Discord ไม่รับข้อมูล ข้อความของคุณยังอยู่ ลองอีกครั้ง')}</span></div></div><div class="mk-ob-right">${dcCard(sc, { app: a.name })}</div></div>`;
    foot = `<div class="vs-ob-actions"><button class="vs-btn" type="button" data-act="frstep" data-arg="2">${T('Back', 'ย้อนกลับ')}</button><button class="vs-btn" type="button" data-act="frsend" ${sent === 'sending' ? 'disabled' : ''}>${sent === 'ok' ? T('Send again', 'ส่งอีกครั้ง') : T('Show on Discord', 'แสดงบน Discord')}</button><button class="vs-btn vs-btn-primary" type="button" data-act="frfinish" ${sent === 'sending' ? 'disabled' : ''}>${sent === 'ok' ? T('Finish — go to Now', 'เสร็จสิ้น — ไปที่หน้าตอนนี้') : T('Show on Discord & finish', 'แสดงบน Discord แล้วเสร็จสิ้น')}</button></div>`;
  }
  return `<div class="vs-scrim"></div><div class="vs-onboard" data-step="${step}" role="dialog" aria-modal="true" aria-labelledby="obt"><div class="mk-ob-head"><div class="vs-ob-mark mk-logo" aria-hidden="true"><img src="assets/ghost-final-d.svg" alt=""></div>${steps}</div><div class="mk-ob-scroll"><div class="mk-ob-step" data-swap><h2 class="vs-ob-title" id="obt">${title}</h2><p class="vs-ob-sub">${sub}</p>${body}</div></div><div class="mk-ob-foot">${foot}</div></div>`;
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
/* ---------- render rules: keyed, incremental DOM updates (no innerHTML swaps of shells, pages or modals) ----------
   morph(a, b) makes a's subtree match b's while keeping existing nodes (identity, focus, scroll, running transitions).
   Changed text/images get a short fade-in; swapRegion() cross-fades a modal body and animates the frame height. */
const KEEP_CLS = ['mk-in', 'mk-hl', 'mk-flash', 'mk-id-swap', 'mk-swap', 'is-over', 'mk-show', 'mk-out', 'mk-row-out'];
const keyOf = n => (n.nodeType === 1 ? (n.id || n.getAttribute('data-rule') || n.getAttribute('data-key') || n.getAttribute('data-k') || '') : '');
function flash(el) { if (!el || !el.classList || reduced()) return; el.classList.remove('mk-flash'); void el.offsetWidth; el.classList.add('mk-flash'); el.addEventListener('animationend', () => el.classList.remove('mk-flash'), { once: true }); }
function syncAttrs(a, b) {
  [...a.attributes].forEach(at => { if (!b.hasAttribute(at.name) && !['class', 'open', 'style'].includes(at.name)) a.removeAttribute(at.name); });
  [...b.attributes].forEach(at => { if (['class', 'open', 'style'].includes(at.name)) return; if (a.getAttribute(at.name) !== at.value) { a.setAttribute(at.name, at.value); if (at.name === 'src') flash(a); } });
  const want = (b.getAttribute('class') || '').split(/\s+/).filter(Boolean), have = [...a.classList], keep = have.filter(c => KEEP_CLS.includes(c)), cur = have.filter(c => !KEEP_CLS.includes(c));
  if ([...want].sort().join(' ') !== [...cur].sort().join(' ')) { if (want.length || keep.length) a.setAttribute('class', [...want, ...keep.filter(c => !want.includes(c))].join(' ')); else a.removeAttribute('class'); }
  const bs = b.getAttribute('style') || ''; if ((a.getAttribute('style') || '') !== bs) { bs ? a.setAttribute('style', bs) : a.removeAttribute('style'); }
}
function morph(a, b) {
  const bc = [...b.childNodes];
  for (let i = 0; i < bc.length; i++) {
    const bn = bc[i]; let an = a.childNodes[i]; const k = keyOf(bn);
    if (k && (!an || keyOf(an) !== k)) { const m = [...a.children].find(n => keyOf(n) === k); if (m) { a.insertBefore(m, an || null); an = m; } }
    if (!an) { a.appendChild(bn.cloneNode(true)); continue; }
    if (an.nodeType !== bn.nodeType || an.nodeName !== bn.nodeName || keyOf(an) !== keyOf(bn)) { a.replaceChild(bn.cloneNode(true), an); continue; }
    if (an.nodeType !== 1) { if (an.nodeValue !== bn.nodeValue) { an.nodeValue = bn.nodeValue; flash(an.parentElement); } continue; }
    syncAttrs(an, bn);
    if (an.namespaceURI !== 'http://www.w3.org/1999/xhtml') { if (an.innerHTML !== bn.innerHTML) an.innerHTML = bn.innerHTML; continue; }
    if (an.tagName === 'INPUT') { if (an.type === 'checkbox' || an.type === 'radio') an.checked = bn.hasAttribute('checked'); else if (an !== document.activeElement) { const v = bn.getAttribute('value') || ''; if (an.value !== v) an.value = v; } }
    morph(an, bn);
    if (an.tagName === 'SELECT') { const sel = [...bn.options].find(o => o.hasAttribute('selected')); if (sel && an.value !== sel.value) an.value = sel.value; }
  }
  while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
}
function morphInto(el, html) { if (!el) return; const t = el.cloneNode(false); t.innerHTML = html; morph(el, t); }
function swapRegion(container, sel, mutate) {
  const reg = container && container.querySelector(sel); if (!reg || reduced()) { mutate(); return; }
  const r = reg.getBoundingClientRect(), h0 = container.offsetHeight, g = reg.cloneNode(true);
  g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); g.removeAttribute('id'); g.setAttribute('inert', ''); g.setAttribute('aria-hidden', 'true');
  Object.assign(g.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', margin: '0', pointerEvents: 'none', zIndex: 900 }); document.body.appendChild(g);
  mutate();
  const nr = container.querySelector(sel), h1 = container.offsetHeight;
  if (nr) nr.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, delay: 40, easing: EASE, fill: 'backwards' });
  g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE, fill: 'forwards' }).onfinish = () => g.remove(); setTimeout(() => g.remove(), 500);
  if (h1 !== h0) container.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 220, easing: EASE });
}
function ghostOut() { /* fixed, inert snapshot of the outgoing content; fades out on top, never affects layout or input */
  if (reduced()) return [];
  const g = [];
  document.querySelectorAll('#main, .vs-onboard, .vs-scrim').forEach(el => {
    const r = el.getBoundingClientRect(), c = el.cloneNode(true), ob = el.classList.contains('vs-onboard');
    c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', ''); c.removeAttribute('tabindex');
    c.classList.add('mk-ghost'); Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', margin: '0', maxHeight: ob ? r.height + 'px' : 'none', height: el.classList.contains('vs-scrim') ? r.height + 'px' : '', transform: 'none', pointerEvents: 'none', zIndex: 5, animation: 'none' });
    document.body.appendChild(c); g.push(c);
  });
  return g;
}
function enterIn(g) {
  if (reduced()) return;
  g.forEach(c => { const a = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE, fill: 'forwards' }); a.onfinish = () => c.remove(); setTimeout(() => c.remove(), 500); });
  document.querySelectorAll('#main, .vs-onboard').forEach(el => el.animate(el.classList.contains('vs-onboard') ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, delay: 40, easing: EASE, fill: 'backwards' }));
}
function render(opt = {}) {
  const root = $('#root'), prev = root._screen, step = root._step;
  const screenChanged = prev !== undefined && prev !== S.screen && opt.fade !== false, g = screenChanged ? ghostOut() : [];
  const stepSwap = !screenChanged && S.screen === 'first' && prev === 'first' && step !== undefined && step !== S.fr.step && !reduced();
  if (stepSwap) swapRegion($('.vs-onboard'), '[data-swap]', renderCore); else renderCore();
  root._screen = S.screen; root._step = S.fr.step;
  if (screenChanged) enterIn(g);
}
const FADE = new Set(['screen', 'mode', 'pinpair', 'trayscreen', 'traytab', 'fakeclose', 'noticeok', 'noticereset', 'frstep', 'frapp', 'frscene', 'frdiscord', 'frfinish', 'finishskip', 'quit', 'import', 'askclear', 'clearhist', 'askquit', 'capture']);
function leaveLayer(done, L0) { /* exit animation: remove .mk-in, wait for the transition, then drop from the DOM */
  const L = L0 || layer(), parts = L.querySelectorAll('.mk-drawer,.mk-backdrop,.mk-picker .vs-dialog,.gif-picker-backdrop');
  if (reduced() || !parts.length) { L.innerHTML = ''; done && done(); return; }
  const tok = L._tok = (L._tok || 0) + 1; L.inert = true; parts.forEach(p => p.classList.remove('mk-in'));
  const fin = () => { if (L._tok !== tok) return; L.innerHTML = ''; L.inert = false; done && done(); };
  parts[0].addEventListener('transitionend', fin, { once: true }); setTimeout(fin, 260);
}
function enterLayer(L0) { const L = L0 || layer(); L._tok = (L._tok || 0) + 1; L.inert = false; void L.offsetWidth; L.querySelectorAll('.mk-drawer,.mk-backdrop,.mk-picker .vs-dialog,.gif-picker-backdrop').forEach(p => p.classList.add('mk-in')); }
function closeMenu(cb) { const m = $('.mk-menu'); if (!m || reduced()) { S.menuOpen = false; cb && cb(); return; } m.classList.add('mk-out'); setTimeout(() => { S.menuOpen = false; cb && cb(); }, 120); }

/* Reconcile instead of rebuilding: sidebar, top strip and bottom nav keep their DOM (no flash, colour transitions run); only the content swaps. */
function mount(root, html) {
  if (!root.querySelector('.vs-app')) { root.innerHTML = html; return; }
  const t = document.createElement('template'); t.innerHTML = html; morph(root, t.content);
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
    <div class="vs-main"><div class="vs-mobile-status">${acctPanel(true)}</div><main class="vs-page ${S.screen === 'now' ? 'vs-page-wide' : ''}" id="main" tabindex="-1">${view}</main></div></div>
    <nav class="vs-bottomnav" aria-label="${T('Main', 'หลัก')}">${NAVS.map(bottomLink).join('')}</nav>${S.screen === 'first' ? firstView() : ''}`;
  mount(root, html);
  $('#root').inert = !!S.drawer || !!S.picker;
}

/* Read identity once on opening, then only on explicit refresh. */
function applyDeviceCatalog(catalog) {
  if (catalog.source !== 'windows' || !Array.isArray(catalog.running) || !Array.isArray(catalog.installed)) throw new Error('Invalid device catalog');
  const clean = apps => apps.filter(a => /^device-[a-f0-9]{24}$/.test(a.id) && typeof a.name === 'string' && typeof a.exe === 'string').map(a => ({ ...a, icon: /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(a.icon || '') ? a.icon : '' }));
  const running = clean(catalog.running), open = new Set(running.map(a => a.id));
  const installed = new Map(clean(catalog.installed).map(a => [a.id, a]));
  for (const app of REAL.savedApps) if (!installed.has(app.id) && !open.has(app.id)) installed.set(app.id, app);
  APPS.splice(0, APPS.length, ...running); INSTALLED.splice(0, INSTALLED.length, ...[...installed.values()].filter(a => !open.has(a.id))); SYSTEM.length = 0;
  REAL.observedAt = catalog.observedAt;
}
async function loadDeviceApps(refresh = false, restore = false) {
  if (REAL.loading) return;
  restore ||= !REAL.workspaceLoaded;
  REAL.loading = true; REAL.error = ''; render(); if (S.picker) updatePicker();
  try {
    const [response, workspaceResponse] = await Promise.all([fetch(location.origin + '/api/device-apps' + (refresh ? '?refresh=1' : ''), { cache: 'no-store', signal: AbortSignal.timeout(140000) }), restore ? fetch(location.origin + '/api/device-workspace', { cache: 'no-store' }) : Promise.resolve(null)]);
    if (workspaceResponse) {
      if (!workspaceResponse.ok) throw new Error('Could not load saved workspace');
      const saved = await workspaceResponse.json();
      if (saved) {
        if (saved.version !== 1 || !Array.isArray(saved.scenes) || !Array.isArray(saved.rules) || !Array.isArray(saved.apps)) throw new Error('Saved workspace could not be loaded');
        S.scenes = saved.scenes.map(mkScene); S.rules = saved.rules; REAL.savedApps = saved.apps;
        if (!REAL.touched) {
          REAL.presenceEnabled = saved.presenceEnabled ?? LIVE.active;
          REAL.selectedSceneId = saved.selectedSceneId || LIVE.scene?.id || S.scenes[0]?.id || '';
          REAL.selectedAppId = saved.selectedAppId || '';
        }
      }
      REAL.workspaceLoaded = true;
    }
    if (!response.ok) throw new Error((await response.json()).error || 'Could not read apps');
    applyDeviceCatalog(await response.json()); REAL.ready = true;
    REAL.selectedSceneId ||= LIVE.scene?.id || S.scenes[0]?.id || '';
  } catch (error) { REAL.error = error.message; }
  finally { REAL.loading = false; render(); if (S.drawer) buildDrawer(); if (S.picker) updatePicker(); if (REAL.ready && REAL.touched) void saveDeviceWorkspace(); else if (REAL.ready && REAL.presenceEnabled) void applyRealPresence(); }
}
async function saveDeviceWorkspace() {
  if (!REAL.ready) return;
  if (REAL.saving) { REAL.resave = true; return; }
  REAL.saving = true; S.save = 'saving'; const revision = REAL.revision;
  try {
    const apps = [...new Set(S.rules.map(r => r.app))].map(id => { const a = appBy(id); return { id: a.id, name: a.name, exe: a.exe, publicIcon: a.publicIcon || '' }; });
    const response = await fetch(location.origin + '/api/device-workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' }, body: JSON.stringify({ scenes: S.scenes, rules: S.rules, apps, presenceEnabled: REAL.presenceEnabled, selectedSceneId: REAL.selectedSceneId, selectedAppId: REAL.selectedAppId }), signal: AbortSignal.timeout(10000) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save');
    REAL.savedApps = apps; if (revision === REAL.revision) { S.save = 'saved'; S.saveAt = new Date(result.savedAt).toLocaleTimeString(); REAL.error = ''; if (REAL.presenceEnabled) void applyRealPresence(); }
  } catch (error) { S.save = 'failed'; REAL.error = error.message; }
  finally { REAL.saving = false; if (S.drawer) updateDrawer(); if (REAL.resave) { REAL.resave = false; void saveDeviceWorkspace(); } }
}
function applyDiscordProfile(data) {
  const user = data && data.connected && data.discordUser;
  let avatar;
  try { avatar = new URL(user && user.avatarUrl); } catch {}
  if (!user || !/^\d+$/.test(user.id) || typeof user.username !== 'string' || !user.username || !avatar || avatar.protocol !== 'https:' || avatar.hostname !== 'cdn.discordapp.com') {
    Object.assign(DCID, { name: '', handle: '', id: '', avatarUrl: '' }); profileStatus = 'unavailable'; return;
  }
  Object.assign(DCID, { id: user.id, name: user.displayName || user.username, handle: '@' + user.username, avatarUrl: avatar.href }); profileStatus = 'ready';
}
async function loadDiscordProfile() {
  if (profilePending) return profilePending;
  profileStatus = 'loading'; render();
  profilePending = (async () => {
    try {
      const response = await fetch(profileEndpoint(), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Profile request failed');
      applyDiscordProfile(await response.json());
    } catch { applyDiscordProfile(null); }
    finally { profilePending = null; render(); if (S.drawer) updateDrawer(); }
  })();
  return profilePending;
}
function liveArt(reference, sc) {
  if (!reference) return '';
  if (reference === '@app' && REAL.enabled) return sceneApp(sc)?.publicIcon || '';
  const known = { a1: 'builtin:hinata-poster', a2: 'builtin:hinata-chill-poster', a3: 'builtin:hinata-gaming-poster', a5: 'builtin:hinata-idle' };
  if (known[reference]) return known[reference];
  if (reference === 'a4') return DCID.avatarUrl || '';
  if (/^https:\/\//i.test(reference)) return reference;
  throw new Error(T('Choose built-in artwork or a public HTTPS image for the live test.', 'เลือกภาพในตัวหรือลิงก์ภาพ HTTPS สาธารณะสำหรับทดสอบจริง'));
}
function liveScenePayload(sc) {
  if (!sc) throw new Error(T('Choose a Scene first.', 'เลือก Scene ก่อน'));
  if (sc.vars && !REAL.enabled) throw new Error(T('Turn off app/window variables for this manual test.', 'ปิดตัวแปรชื่อแอป/หน้าต่างสำหรับการทดสอบด้วยมือก่อน'));
  if (REAL.enabled && [sc.actName, sc.l1, sc.l2].some(text => String(text || '').includes('{window}'))) throw new Error(T('Use {app} here. Window-title sharing is not enabled.', 'ใช้ {app} ได้ ส่วนชื่อหน้าต่างยังไม่ได้เปิดให้แชร์'));
  const text = value => REAL.enabled ? resolveSceneText(value, sc) : value;
  return { id: sc.id, sceneName: sc.name, activityType: sc.type, activityName: text(sc.actName || 'Vibe'), details: text(sc.l1), state: text(sc.l2),
    detailsUrl: sc.l1url, stateUrl: sc.l2url, largeImage: liveArt(sc.art, sc), smallImage: liveArt(sc.small, sc), largeImageText: text(sc.artText), smallImageText: text(sc.smallText),
    largeImageUrl: sc.artUrl, smallImageUrl: sc.smallUrl, timerMode: 'none', buttons: sc.btns.filter(b => b.label || b.url) };
}
function realSelectedScene() { return sceneBy(REAL.selectedSceneId) || sceneBy(LIVE.scene?.id) || S.scenes[0] || null; }
async function applyRealPresence() {
  if (LIVE.busy) { REAL.applyAgain = true; return; }
  REAL.applyAgain = false;
  const sc = realSelectedScene();
  if (REAL.presenceEnabled && !sc) return;
  await liveCommand(REAL.presenceEnabled ? 'send' : 'hide', sc, S.rules.find(r => r.app === REAL.selectedAppId && r.scene === sc?.id)?.id);
}
async function liveCommand(action, sc, ruleId) {
  if (!LIVE.enabled || LIVE.busy) return;
  LIVE.busy = true; LIVE.error = ''; render();
  try {
    const response = await fetch(location.origin + '/api/mock-live', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' }, body: JSON.stringify({ action, scene: action === 'send' ? liveScenePayload(sc) : undefined }), signal: AbortSignal.timeout(18000) });
    const result = await response.json();
    if (typeof result.active === 'boolean') { LIVE.connected = result.connected; LIVE.active = result.active; LIVE.scene = result.scene; LIVE.checked = true; }
    if (!response.ok) throw new Error(result.error || 'Discord request failed');
    if (action === 'send') { S.pinned = sc.id; S.pinnedRule = ruleId || (S.rules.find(r => r.scene === sc.id) || {}).id || ''; setMode('pinned'); }
    else setMode('hidden');
    toast(action === 'send' ? T('Discord accepted this Scene', 'Discord รับ Scene นี้แล้ว') : T('Cleared from Discord', 'ล้างกิจกรรมจาก Discord แล้ว'));
  } catch (error) { LIVE.error = error.message; }
  finally { LIVE.busy = false; render(); if (S.drawer) updateDrawer(); if (REAL.enabled && REAL.applyAgain) void applyRealPresence(); }
}
async function checkLiveState() {
  try {
    const response = await fetch(location.origin + '/api/mock-live', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' }, body: JSON.stringify({ action: 'connect' }), signal: AbortSignal.timeout(10000) });
    const result = await response.json();
    Object.assign(LIVE, { connected: !!result.connected, active: !!result.active, scene: result.scene || null, error: result.error || '', checked: true });
    if (!response.ok) throw new Error(result.error || 'Could not connect to Discord Desktop');
    if (result.active && result.scene) { S.pinned = result.scene.id; S.pinnedRule = (S.rules.find(r => r.scene === result.scene.id) || {}).id || ''; setMode('pinned'); }
  } catch (error) { LIVE.error = error.message; LIVE.connected = false; LIVE.checked = false; }
  render();
  await loadDiscordProfile();
}
function livePanel() {
  const status = LIVE.busy ? T('Sending to Discord…', 'กำลังส่งไป Discord…') : !LIVE.checked ? T('Connecting to Discord…', 'กำลังเชื่อมต่อ Discord…') : LIVE.active ? T('Discord accepted: ', 'Discord รับแล้ว: ') + LIVE.scene.sceneName : LIVE.connected ? T('Connected to Discord · ready to send', 'เชื่อมต่อ Discord แล้ว · พร้อมส่ง') : T('Disconnected from Discord', 'ยังไม่เชื่อมต่อ Discord');
  return `<section class="mk-live-panel" aria-label="${T('Real Discord test', 'ทดสอบ Discord จริง')}"><div><strong>${REAL.enabled ? T('Discord presence', 'กิจกรรมบน Discord') : T('Real Discord · manual test', 'Discord จริง · ทดสอบด้วยมือ')}</strong><p role="status">${esc(status)}</p><small>${REAL.enabled ? T('Choose a paired app or send a Scene. Changes reach Discord when you press Send or Pin.', 'เลือกแอปที่จับคู่หรือส่ง Scene การแก้ไขจะไปถึง Discord เมื่อกด Send หรือ Pin') : T('Pin or send a Scene. App detection is simulated; the preview below shows the last acknowledged Scene.', 'กด Pin หรือส่ง Scene การตรวจแอปยังจำลองอยู่ ส่วน preview ด้านล่างแสดง Scene ที่ Discord รับล่าสุด')}</small>${LIVE.error ? `<p class="field-error" role="alert">${esc(LIVE.error)}</p>` : ''}</div><div class="vs-form-actions"><button class="vs-btn vs-btn-primary vs-btn-sm" data-act="livesend" ${LIVE.busy || !LIVE.checked || (REAL.enabled && !REAL.ready) ? 'disabled' : ''}>${T('Send current Scene', 'ส่ง Scene นี้')}</button><button class="vs-btn vs-btn-sm" data-act="livecheck" ${LIVE.busy ? 'disabled' : ''}>${T('Check status', 'ตรวจสถานะ')}</button><button class="vs-btn vs-btn-sm" data-act="liveend" ${LIVE.busy ? 'disabled' : ''}>${REAL.enabled ? T('Clear activity', 'ล้างกิจกรรม') : T('End test & clear', 'จบทดสอบและล้าง')}</button></div></section>`;
}
function discordProfilePanel() {
  const available = profileStatus === 'ready', loading = profileStatus === 'loading';
  return `<div class="vs-keystatus mk-real-profile"><div class="mk-profile-head">${idAv(available)}<div class="mk-profile-name"><strong>${available ? esc(DCID.name) : loading ? T('Reading Discord profile…', 'กำลังอ่านโปรไฟล์ Discord…') : T('Discord profile unavailable', 'อ่านโปรไฟล์ Discord ไม่ได้')}</strong>${available ? `<span>${esc(DCID.handle)}</span>` : `<span>${T('Open Discord Desktop, then refresh.', 'เปิด Discord Desktop แล้วกดรีเฟรช')}</span>`}</div><span class="vs-statuspill ${available ? 'ok' : 'warn'}">${available ? T('Profile loaded', 'อ่านโปรไฟล์แล้ว') : loading ? T('Loading', 'กำลังโหลด') : T('Unavailable', 'ไม่พร้อม')}</span></div>
    ${available ? `<div class="mk-profile-id"><span>User ID</span><code>${esc(DCID.id)}</code><button type="button" class="vs-btn vs-btn-sm" data-act="copydiscordid">${T('Copy', 'คัดลอก')}</button></div>` : ''}
    <div class="mk-profile-foot"><p class="vs-caption">${LIVE.enabled ? T('Real Discord profile and manual activity delivery. App selection is manual.', 'โปรไฟล์และการส่งกิจกรรมไป Discord เป็นของจริง เลือกแอปเพื่อส่งด้วยมือ') : T('Real profile from Discord Desktop. Refresh after switching accounts. Activity previews and app pairings are simulated.', 'โปรไฟล์จริงจาก Discord Desktop กดรีเฟรชหลังเปลี่ยนบัญชี ส่วน preview กิจกรรมและการจับคู่แอปเป็นข้อมูลจำลอง')}</p><button type="button" class="vs-btn vs-btn-sm" data-act="refreshdiscord" ${loading ? 'disabled' : ''}>${T('Refresh profile', 'รีเฟรชโปรไฟล์')}</button></div></div>`;
}

/* ---------- Dev toolbar ---------- */
const MODES = ['auto', 'pinned', 'paused', 'hidden', 'autohide', 'none', 'discordoff', 'unreachable'];
const MODE_NAMES = { auto: 'Auto — following Figma', pinned: 'Pinned (until cancelled)', paused: 'Paused', hidden: 'Hidden', autohide: 'Hidden by auto-hide rule', none: 'Nothing shown (no ruled app)', discordoff: 'Discord not running', unreachable: 'Companion unreachable' };
function devH() { const d = $('#dev'); document.documentElement.style.setProperty('--dev-h', (document.body.classList.contains('nodev') || !d || getComputedStyle(d).position === 'static' ? 0 : d.offsetHeight) + 'px'); }
addEventListener('resize', () => devH());
function renderDev() {
  const d = $('#dev');
  d.innerHTML = `<b class="keep">PROTOTYPE</b><button class="keep" data-dev="toggle">${d.classList.contains('collapsed') ? 'show controls' : 'hide'}</button>
   <label>Screen <select data-dev="screen">${[['first', 'First run'], ['now', 'Now'], ['scenes', 'Scene library'], ['settings', 'Settings'], ['tray', 'Tray & notice']].map(o => `<option value="${o[0]}" ${S.screen === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>
   <label>Paired apps <select data-dev="paircount">${[6, 36, 120].map(n => `<option value="${n}" ${S.fixtureCount === n ? 'selected' : ''}>${n} apps</option>`).join('')}</select></label>
   <label>Now state <select data-dev="mode">${MODES.map(m => `<option value="${m}" ${S.mode === m ? 'selected' : ''}>${MODE_NAMES[m]}</option>`).join('')}</select></label>
   <button data-dev="picker">Pair app (editor)</button><button data-dev="pickerweb">Pair web tab (editor)</button><button data-dev="hidepicker">Auto-hide rule (Settings)</button>
   <button data-dev="failnext" ${S.failNext ? 'style="background:#7a2a2c"' : ''}>${S.failNext ? 'Next save WILL fail ✓' : 'Make next save fail'}</button>
   <button data-dev="frdiscord">First run: Discord closed</button><button data-dev="restart">Reset first run</button>`;
  devH();
}

/* ---------- overlays: focus helpers ---------- */
const layer = () => $('#layer');
function rememberFocus(el) { const k = el && el.closest && el.closest('[data-k]'); S.lastFocus = k ? k.dataset.k : null; }
function restoreFocus() { const k = S.lastFocus; let t = k && $(`[data-k="${k}"]`); if (!t) t = $('#main'); if (t) t.focus(); }
function trap(c) {
  c.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tipFor) { e.stopPropagation(); const b = tipFor; hideTip(); b.focus(); return; }
    if (e.key === 'Escape') { e.stopPropagation(); c.dataset.kind === 'drawer' ? closeDrawer() : c.dataset.kind === 'ov' ? closeOverlay() : closePicker(); return; }
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
const MOCKIMG = {};
const APPGLYPH = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h6v6H9z"/></svg>';
const sceneApps = id => { const seen = [], out = []; S.rules.filter(r => r.scene === id && r.kind !== 'hide').forEach(r => { const a = appBy(r.app); if (!seen.includes(a.id)) { seen.push(a.id); out.push(a); } }); return out.sort((x, y) => { const ix = APPS.findIndex(q => q.id === x.id), iy = APPS.findIndex(q => q.id === y.id); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }); };
const iconReady = a => !!(S.iconUp[a.id] || a.img);
const appIconSrc = a => REAL.enabled ? (a.publicIcon || a.icon || A_ + 'app.svg') : (S.iconUp[a.id] ? (MOCKIMG[S.iconUp[a.id]] || S.iconUp[a.id]) : (a.img ? A_ + a.img : A_ + 'app.svg'));
const imgSrc = (v, sc) => REAL.enabled && v === 'a4' ? (DCID.avatarUrl || A_ + 'app.svg') : REAL.enabled && v === '@app' ? (sceneApp(sc || {}) ? appIconSrc(sceneApp(sc)) : A_ + 'app.svg') : v === '@app' ? (sceneApps((sc || {}).id)[0] ? appIconSrc(sceneApps(sc.id)[0]) : A_ + 'app.svg') : ART[v] ? A_ + ART[v] : LIVE.enabled && /^https:\/\//i.test(v || '') ? v : MOCKIMG[v] || (isUrl(v) ? A_ + 'poster.png' : A_ + ART.a1);
const artSrc = imgSrc;

function openDrawer(id, opener) {
  if (REAL.enabled && !REAL.ready) { toast(T('Loading your Scenes and apps…', 'กำลังโหลด Scene และแอปของคุณ…')); return; }
  rememberFocus(opener);
  if (id === 'new') { const n = mkScene({ id: 'new' + Date.now(), name: '', l1: '', l2: '', isNew: true }); S.scenes.push(n); id = n.id; }
  S.drawer = { id, dirty: false }; S.doneErr = false; S.save = 'saved'; S.saveAt = '09:41';
  buildDrawer(true); $('#root').inert = true; const f = $('#sc-name', layer()); (f || $('.mk-drawer', layer())).focus({ preventScroll: true });
}
function secHead(h, hint) { return `<h3>${h}</h3>${hint ? `<p class="vs-hint">${hint}</p>` : ''}`; }
function fld(id, label, key, field, val, o = {}) {
  return `<div class="vs-field"><label class="vs-label" for="${id}">${label}${key ? helpBtn(key) : ''}</label><input class="vs-input" type="text" id="${id}" value="${esc(val)}" data-bind="sc" data-f="${field}" ${o.hl ? `data-hl="${o.hl}"` : ''} ${o.url ? 'data-url="1" data-mono="1" placeholder="https://…"' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''}>${o.url ? '<p class="field-error" hidden></p>' : ''}</div>`;
}
function imageSection(prefix, sc, title, hint, key, textKey, urlKey, artField, textField, urlField, area) {
  const p = prefix === 'lg' ? 'lg' : 'sm';
  return `<section class="mk-sec" data-sec="${prefix}">${secHead(title, hint)}${wellHtml(p, sc, T('Image', 'ภาพ'), key)}
    ${fld(prefix + '-text', T('Hover text', 'ข้อความเมื่อชี้'), textKey, textField, sc[textField], { hl: area, max: 128 })}${fld(prefix + '-link', T('Click link', 'ลิงก์เมื่อกด'), urlKey, urlField, sc[urlField], { hl: area, url: 1 })}</section>`;
}
function chipHtml(r) {
  const a = appBy(r.app), web = r.kind === 'web', label = web ? T(`${a.name} · title contains “${r.contains}”`, `${a.name} · ชื่อแท็บมีคำว่า “${r.contains}”`) : a.name;
  return `<span class="mk-chip ${S.fresh === r.id ? 'mk-chip-in' : ''}" data-key="pc-${r.id}"><span class="mk-st-i" style="margin:0">${icoOf(a)}${web ? `<span class="mk-globe">${I.globe}</span>` : ''}</span><span class="mk-chip-t">${esc(label)}</span><button type="button" class="mk-chip-x" data-act="pairrm" data-arg="${r.id}" aria-label="${T('Remove', 'ลบ')} ${esc(label)}">${I.x}</button></span>`;
}
function pairSection(sc) {
  const items = S.rules.filter(r => r.scene === sc.id && r.kind !== 'hide');
  return `<section class="mk-sec" id="pairsec" data-sec="pair">${secHead(REAL.enabled ? T('Apps for this Scene', 'แอปของ Scene นี้') : T('Shows when these apps are open', 'แสดงเมื่อเปิดแอปเหล่านี้'), REAL.enabled ? T('Paired apps supply the name and icon for this Scene. Pin an app on Now to select it.', 'แอปที่จับคู่จะให้ชื่อและไอคอนกับ Scene นี้ กด Pin ในหน้า Now เพื่อเลือกแอป') : T('An app or browser tab belongs to one Scene. If several paired apps are open, the one you used last wins.', 'แอปหรือแท็บหนึ่งใช้ได้กับหนึ่ง Scene ถ้าเปิดหลายแอปที่จับคู่ไว้ จะใช้แอปที่ใช้ล่าสุด'))}<div class="mk-pairs" id="pairlist">${items.length ? items.map(chipHtml).join('') : `<p class="mk-pair-empty">${T('Not shown automatically yet — add an app', 'ยังไม่แสดงอัตโนมัติ — เพิ่มแอป')}</p>`}</div><button class="vs-btn vs-btn-sm" type="button" data-act="pairadd" data-k="pairadd" style="margin-top:12px">${I.plus}${T('Add app', 'เพิ่มแอป')}</button></section>`;
}
function buildDrawer(first) {
  const sc = sceneBy(S.drawer.id); if (!sc) return;
  const old = $('.mk-drawer-body', layer()), top = old ? old.scrollTop : 0;
  const live = curScene() && curScene().id === sc.id && ['auto', 'pinned', 'paused'].includes(S.mode);
  const fade = first ? 'mk-fade' : '';
  const html = `<div class="mk-backdrop ${fade}" data-act="closedrawer"></div>
  <div class="mk-drawer ${fade}" role="dialog" aria-modal="true" aria-labelledby="dtitle" data-kind="drawer" tabindex="-1">
   <div class="mk-drawer-head"><div><h2 id="dtitle">${sc.isNew ? T('New Scene', 'Scene ใหม่') : T('Edit Scene', 'แก้ไข Scene')}</h2><p class="vs-subcopy">${T('Every field Discord supports. Changes save as you type; the preview stays beside the form.', 'ทุกช่องที่ Discord รองรับ บันทึกขณะพิมพ์ และตัวอย่างอยู่ข้างฟอร์มตลอด')}</p></div><button class="vs-icon-btn" type="button" data-act="closedrawer" aria-label="${T('Close and go back', 'ปิดและย้อนกลับ')}">✕</button></div>
   <div class="mk-drawer-body">
    <div class="mk-form">
     <section class="mk-sec">${secHead(T('Scene', 'Scene'), T('Only you see this name.', 'มีแต่คุณที่เห็นชื่อนี้'))}${fld('sc-name', T('Scene name', 'ชื่อ Scene'), 'name', 'name', sc.name, { max: 40, ph: T('e.g. Deep work', 'เช่น โฟกัสทำงาน') })}</section>
     <section class="mk-sec">${secHead(T('Activity', 'กิจกรรม'), T('The heading of the card, e.g. “Playing Vibe”.', 'หัวการ์ด เช่น “กำลังเล่น Vibe”'))}
      <div class="vs-field" role="radiogroup" aria-labelledby="typelbl"><span class="vs-label" id="typelbl">${T('Activity type', 'ประเภทกิจกรรม')}${helpBtn('actType')}</span><div class="vs-segmented" style="flex-wrap:wrap">${TYPES.map(t => `<button type="button" role="radio" aria-checked="${sc.type === t[0]}" class="${sc.type === t[0] ? 'is-on' : ''}" data-act="stype" data-arg="${t[0]}" data-hl="act">${t[S.lang === 'th' ? 2 : 1]}</button>`).join('')}</div></div>
      ${fld('sc-act', T('Activity name', 'ชื่อกิจกรรม'), 'actName', 'actName', sc.actName, { hl: 'act', max: 128 })}</section>
     ${pairSection(sc)}
     <section class="mk-sec">${secHead(T('Details line', 'ข้อความบรรทัดแรก'), T('Bold first line.', 'ตัวหนาบรรทัดแรก'))}${fld('sc-l1', T('Details text', 'ข้อความ'), 'details', 'l1', sc.l1, { hl: 'details', max: 128 })}${fld('sc-l1u', T('Details link', 'ลิงก์'), 'detailsUrl', 'l1url', sc.l1url, { hl: 'details', url: 1 })}</section>
     <section class="mk-sec">${secHead(T('State line', 'ข้อความบรรทัดที่สอง'), T('Second line under Details.', 'บรรทัดที่สองใต้บรรทัดแรก'))}${fld('sc-l2', T('State text', 'ข้อความ'), 'state', 'l2', sc.l2, { hl: 'state', max: 128 })}${fld('sc-l2u', T('State link', 'ลิงก์'), 'stateUrl', 'l2url', sc.l2url, { hl: 'state', url: 1 })}
      <div class="mk-var-row" ${REAL.enabled ? 'hidden' : ''}><span class="vs-label" style="margin:0"><label for="sc-vars">${T('Insert app or window name', 'ใส่ชื่อแอปหรือหน้าต่าง')}</label>${helpBtn('vars')}</span><label class="vs-switch"><input type="checkbox" id="sc-vars" data-bind="scvars" ${sc.vars ? 'checked' : ''}><span></span></label></div>
      <div class="vs-looks"><button class="vs-look" type="button" data-act="ins" data-arg="{app}" ${sc.vars ? '' : 'disabled'}>{app}</button><button class="vs-look" type="button" data-act="ins" data-arg="{window}" ${sc.vars ? '' : 'disabled'}>{window}</button></div>
      <div class="mk-note">${I.lock}<span>${T('{app} is the program name. {window} is the title of the window you’re using — it can include document names, chat names or web pages, and it goes to Discord for anyone who can see your profile. Off by default for each Scene; history keeps it only while history is on.', '{app} คือชื่อโปรแกรม {window} คือชื่อหน้าต่างที่คุณใช้อยู่ อาจมีชื่อเอกสาร ชื่อแชต หรือหน้าเว็บ และจะส่งไปยัง Discord ให้ทุกคนที่เห็นโปรไฟล์ของคุณเห็น ปิดไว้เป็นค่าเริ่มต้นในแต่ละ Scene ประวัติเก็บเฉพาะเมื่อเปิดประวัติอยู่')}</span></div></section>
     ${imageSection('lg', sc, T('Large image', 'ภาพใหญ่'), T('The main picture beside the text.', 'ภาพหลักข้างข้อความ'), 'large', 'largeText', 'largeUrl', 'art', 'artText', 'artUrl', 'large')}
     ${imageSection('sm', sc, T('Small image', 'ภาพเล็ก'), T('Optional round badge on the corner of the large image.', 'ป้ายกลมที่มุมภาพใหญ่ (ไม่บังคับ)'), 'small', 'smallText', 'smallUrl', 'small', 'smallText', 'smallUrl', 'small')}
     <section class="mk-sec">${secHead(T('Buttons', 'ปุ่ม'), T('Up to two. Links must be https.', 'สูงสุดสองปุ่ม ลิงก์ต้องเป็น https'))}
      ${sc.btns.map((b, i) => `<div class="vs-field"><span class="vs-label">${T('Button', 'ปุ่ม')} ${i + 1}${helpBtn('btn' + i)}</span><div class="mk-two"><input class="vs-input" type="text" aria-label="${T('Button label', 'ข้อความปุ่ม')} ${i + 1}" placeholder="${T('Label', 'ข้อความ')}" value="${esc(b.label)}" data-bind="btn" data-i="${i}" data-f="label" data-hl="btn${i}" maxlength="32"><input class="vs-input" type="text" data-mono="1" data-url="1" aria-label="${T('Button link', 'ลิงก์ปุ่ม')} ${i + 1}" placeholder="https://…" value="${esc(b.url)}" data-bind="btn" data-i="${i}" data-f="url" data-hl="btn${i}"></div><p class="field-error" hidden></p></div>`).join('')}</section>
     <section class="mk-sec mk-danger">${secHead(T('Delete Scene', 'ลบ Scene'), T('Removes this Scene from your library. You’ll be asked what to do with the rules that use it.', 'ลบ Scene นี้ออกจากคลัง ระบบจะถามว่าจะทำอย่างไรกับกฎที่ใช้ Scene นี้'))}
      <button class="vs-btn vs-btn-sm vs-btn-danger" type="button" data-act="askdel" data-k="del" ${S.scenes.length < 2 ? 'disabled' : ''}>${T('Delete Scene…', 'ลบ Scene…')}</button>${S.scenes.length < 2 ? `<p class="vs-hint" style="margin-top:8px">${T('This is your only Scene. Vibe needs at least one — create another before deleting this one.', 'นี่คือ Scene เดียวของคุณ Vibe ต้องมีอย่างน้อยหนึ่ง Scene — สร้างอันใหม่ก่อนจึงจะลบอันนี้ได้')}</p>` : ''}</section>
    </div>
    <aside class="mk-prev" aria-label="${T('Discord preview', 'ตัวอย่าง Discord')}"><div class="vs-preview-label"><span>${T('Preview — how others see you on Discord', 'ตัวอย่าง — คนอื่นเห็นคุณบน Discord แบบนี้')}</span>${live ? `<span class="vs-pill vs-pill-good">${T('On Discord now', 'กำลังแสดงบน Discord')}</span>` : `<span class="vs-pill vs-pill-neutral">${T('Preview only', 'ตัวอย่างเท่านั้น')}</span>`}</div><div id="dpreview"></div><p class="vs-preview-foot" id="dprevnote"></p></aside>
   </div>
   <div class="mk-drawer-foot"><div class="vs-savebar" id="savebar" role="status" aria-live="polite"><span class="vs-savebar-dot" aria-hidden="true"></span><span class="vs-savebar-text" id="savetext"></span><button class="vs-btn vs-btn-sm vs-btn-ghost vs-savebar-btn" type="button" data-act="retry">${T('Retry', 'ลองใหม่')}</button></div>${S.doneErr && S.save === 'failed' ? `<p class="field-error" role="alert" style="margin:0">${T('Couldn’t save this Scene. Fix the problem or retry, then press Done.', 'บันทึก Scene นี้ไม่สำเร็จ แก้ไขหรือลองใหม่ แล้วกดเสร็จ')}</p>` : ''}<button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="donedrawer">${T('Done', 'เสร็จ')}</button></div></div>`;
  if (first || !$('.mk-drawer', layer())) { layer().innerHTML = html; trap($('.mk-drawer', layer())); enterLayer(); } else morphInto(layer(), html);
  updateDrawer(); const nb = $('.mk-drawer-body', layer()); if (nb && !first) nb.scrollTop = top;
}
function updateDrawer() {
  const sc = sceneBy(S.drawer && S.drawer.id); if (!sc) return;
  const hl = document.querySelector('#dpreview .mk-hl'); const area = hl ? hl.dataset.pv : null;
  morphInto($('#dpreview', layer()), dcWrap(sc, { app: 'Figma', win: 'Landing page v3 – Figma' }));
  if (area) highlight(area);
  if (S.imgFlash && !reduced()) { const f = document.querySelectorAll(S.imgFlash === 'lg' ? '#dpreview .dcp-img > img' : '#dpreview .dcp-sm'); f.forEach(x => x.classList.add('mk-id-swap')); } S.imgFlash = null;
  const multi = (sc.art === '@app' || sc.small === '@app') && sceneApps(sc.id).length > 1;
  $('#dprevnote', layer()).textContent = REAL.enabled ? (sceneApp(sc) ? T('{app} = ', '{app} = ') + sceneApp(sc).name : T('{app} uses the Scene name until an app is paired.', '{app} ใช้ชื่อ Scene จนกว่าจะจับคู่แอป')) : multi ? T('App icon changes with the app that is showing.', 'ไอคอนแอปเปลี่ยนตามแอปที่กำลังแสดง') : sc.vars ? T('Preview uses sample values: {app} = Figma, {window} = “Landing page v3 – Figma”.', 'ตัวอย่างใช้ค่าสมมติ: {app} = Figma, {window} = “Landing page v3 – Figma”') : '';
  layer().querySelectorAll('input[data-url]').forEach(inp => {
    const err = inp.closest('.vs-field').querySelector('.field-error'); const bad = inp.value && !/^https:\/\/\S+$/i.test(inp.value);
    inp.setAttribute('aria-invalid', bad ? 'true' : 'false'); if (err) { err.hidden = !bad; err.textContent = bad ? T('Must start with https://', 'ต้องขึ้นต้นด้วย https://') : ''; }
  });
  const bar = $('#savebar', layer()), k = S.save;
  const st = k === 'failed' ? 'error' : k; if (bar.dataset.state && bar.dataset.state !== st) { bar.classList.remove('mk-swap'); void bar.offsetWidth; bar.classList.add('mk-swap'); } bar.dataset.state = st;
  $('#savetext', layer()).textContent = REAL.enabled ? (S.save === 'failed' ? T('Could not save · your draft is still here', 'บันทึกไม่ได้ · ร่างของคุณยังอยู่') : S.save === 'saving' ? T('Saving…', 'กำลังบันทึก…') : T('Saved · changes apply while sharing is on', 'บันทึกแล้ว · ใช้การแก้ไขทันทีเมื่อเปิดการแสดง')) : LIVE.enabled ? T('Draft in this tab · press Send to apply', 'ร่างในแท็บนี้ · กดส่งเพื่อใช้จริง') : k === 'saving' ? T('Saving…', 'กำลังบันทึก…') : k === 'failed' ? T('Couldn’t save — your changes are still here', 'บันทึกไม่สำเร็จ — การแก้ไขของคุณยังอยู่') : T('Saved', 'บันทึกแล้ว') + ' · ' + S.saveAt;
}
function scheduleSave() {
  if (REAL.enabled) { if (S.drawer) S.drawer.dirty = true; REAL.revision++; S.save = 'saving'; if (S.drawer) updateDrawer(); clearTimeout(S.saveTimer); S.saveTimer = setTimeout(() => void saveDeviceWorkspace(), 500); return; }
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
  if (REAL.enabled && dirty) void saveDeviceWorkspace();
  clearTimeout(S.saveTimer); S.drawer = null; $('#root').inert = false;
  if (dirty) { const y = scrollY; render(); scrollTo(0, y); setTimeout(() => { S.fresh = null; }, 400); } /* only when something changed; same scroll position */
  restoreFocus(); leaveLayer(); /* focus is already back; the panel fades out on top */
}

/* ---------- Add-rule picker (real .gif-picker + .vs-dialog shell) ---------- */
const pl = () => (S._pHost === 'l2' ? layer2() : layer());
function pickTitle() { const p = S.picker || {}; if (p.mode === 'pair') { const n = (sceneBy(p.scene) || {}).name || ''; return [T('Add app to “' + n + '”', 'เพิ่มแอปให้ “' + n + '”'), REAL.enabled ? T('Pair this app, then press Pin to send its Scene to Discord.', 'จับคู่แอปนี้ แล้วกด Pin เพื่อส่ง Scene ไป Discord') : T('Discord shows this Scene while the app or tab is open.', 'Discord จะแสดง Scene นี้ขณะที่แอปหรือแท็บเปิดอยู่')]; } if (p.mode === 'hide') return [T('Add an auto-hide rule', 'เพิ่มกฎซ่อนอัตโนมัติ'), T('Discord shows nothing while this app or tab is open.', 'Discord จะไม่แสดงอะไรขณะที่แอปหรือแท็บนี้เปิดอยู่')]; return [T('Add a rule', 'เพิ่มกฎ'), T('Choose what to watch for, then what Discord should do.', 'เลือกสิ่งที่จะตรวจจับ แล้วเลือกว่า Discord ควรทำอะไร')]; }
function pairConflict(p) { if (p.tab === 'web') { const c = (p.contains || '').trim().toLowerCase(); return c ? S.rules.find(r => r.kind === 'web' && (r.contains || '').toLowerCase() === c) || null : null; } return p.app ? S.rules.find(r => r.kind === 'app' && r.app === p.app) || null : null; }
function openPicker(tab, opener, opts = {}) {
  S._pHost = opts.host === 'l2' ? 'l2' : 'l1'; if (!opts.mode || opts.mode === 'free') rememberFocus(opener);
  S.pickerBuilt = false; S.picker = Object.assign({ tab, q: '', app: null, scene: 'design', hide: false, showSys: false, browser: 'Google Chrome', contains: 'Figma' }, opts);
  buildPicker(); $('#root').inert = true; if (S._pHost === 'l2') layer().inert = true; const m = $('.vs-dialog', pl()); (tab === 'web' ? $('#wcontains', m) : $('#pq', m)).focus();
}
function buildPicker() {
  const p = S.picker;
  if (REAL.enabled) p.tab = 'app';
  const html = `<div class="gif-picker mk-picker"><button class="gif-picker-backdrop" type="button" data-act="closepicker" aria-label="${T('Close', 'ปิด')}" tabindex="-1"></button>
  <div class="vs-dialog" role="dialog" aria-modal="true" aria-labelledby="ptitle" data-kind="picker">
  <div class="gif-dialog-head"><div><h2 id="ptitle">${pickTitle()[0]}</h2><p>${pickTitle()[1]}</p></div><button class="vs-icon-btn" type="button" data-act="closepicker" aria-label="${T('Close', 'ปิด')}">✕</button></div>
  <div class="vs-segmented mk-tabs" role="tablist" style="align-self:flex-start"><button type="button" role="tab" class="${p.tab === 'app' ? 'is-on' : ''}" aria-selected="${p.tab === 'app'}" data-act="ptab" data-arg="app">${T('An app', 'แอป')}</button><button type="button" role="tab" class="${p.tab === 'web' ? 'is-on' : ''}" aria-selected="${p.tab === 'web'}" data-act="ptab" data-arg="web" ${REAL.enabled ? 'hidden' : ''}>${T('A web page (tab title)', 'หน้าเว็บ (ชื่อแท็บ)')}</button></div>
  <div class="gif-search-panel">${p.tab === 'app' ? `<label class="vs-visually-hidden" for="pq">${T('Search apps', 'ค้นหาแอป')}</label><div class="vs-app-search">${I.search}<input type="text" id="pq" value="${esc(p.q)}" placeholder="${T('Search by name or .exe…', 'ค้นหาชื่อแอปหรือ .exe…')}" data-bind="pq" autocomplete="off"></div><div id="plistwrap"></div>
   ${REAL.enabled ? `<div class="vs-actions"><button class="vs-btn vs-btn-sm" type="button" data-act="refreshapps" ${REAL.loading ? 'disabled' : ''}>${T('Refresh apps', 'อ่านแอปใหม่')}</button><span class="vs-hint">${REAL.loading ? T('Reading apps from this PC…', 'กำลังอ่านแอปจากเครื่อง…') : T('Read from this PC', 'อ่านจากเครื่องนี้')}</span></div>` : `<div class="vs-actions"><button class="vs-btn vs-btn-sm" type="button" data-act="browse">${I.folder}${T('Browse for .exe…', 'เลือกไฟล์ .exe…')}</button><button class="vs-quiet-link" type="button" data-act="sys">${p.showSys ? T('Hide system entries', 'ซ่อนรายการระบบ') : T('4 system & uninstaller entries hidden — show', 'ซ่อนรายการระบบและตัวถอนการติดตั้ง 4 รายการ — แสดง')}</button></div>`}`
      : `<div class="vs-field"><label class="vs-label" for="wbrowser">${T('Browser', 'เบราว์เซอร์')}</label><select class="vs-select" id="wbrowser" data-bind="wbrowser" style="width:100%"><option ${p.browser === 'Google Chrome' ? 'selected' : ''}>Google Chrome</option><option ${p.browser === 'Microsoft Edge' ? 'selected' : ''}>Microsoft Edge</option><option ${p.browser === 'Any browser' ? 'selected' : ''}>${T('Any browser', 'เบราว์เซอร์ใดก็ได้')}</option></select></div>
   <div class="vs-field"><label class="vs-label" for="wcontains">${T('When the tab title contains', 'เมื่อชื่อแท็บมีคำว่า')}</label><input class="vs-input" type="text" id="wcontains" value="${esc(p.contains)}" data-bind="wcontains" autocomplete="off"></div><div id="wmatch"></div>
   <div class="mk-note">${I.lock}<span>${T('Vibe reads the title of your active browser tab only to compare it with this text. Nothing is sent anywhere unless a Scene’s text uses {window}.', 'Vibe อ่านชื่อแท็บที่ใช้งานอยู่เพื่อเทียบกับข้อความนี้เท่านั้น ไม่ส่งไปไหน เว้นแต่ข้อความของซีนใช้ {window}')}</span></div>`}
  </div><div id="pthen" class="mk-picker-summary"></div>
  <div class="vs-form-actions mk-picker-footer" style="justify-content:flex-end"><button class="vs-btn" type="button" data-act="closepicker">${T('Cancel', 'ยกเลิก')}</button><button class="vs-btn vs-btn-primary" type="button" id="padd" data-act="paddgo">${p.mode === 'pair' ? T('Add app', 'เพิ่มแอป') : T('Add rule', 'เพิ่มกฎ')}</button></div></div></div>`;
  if (!S.pickerBuilt || !$('.mk-picker .vs-dialog', pl())) { pl().innerHTML = html; trap($('.vs-dialog', pl())); updatePicker(); enterLayer(pl()); S.pickerBuilt = true; }
  else swapRegion($('.mk-picker .vs-dialog', pl()), '.gif-search-panel', () => { morphInto(pl(), html); updatePicker(); });
}
const pitem = (a, sel, dim) => `<button class="mk-item" type="button" role="radio" aria-checked="${sel}" aria-pressed="${sel}" data-act="ppick" data-arg="${a.id}" ${dim ? 'style="opacity:.65"' : ''}>${icoOf(a)}<span style="min-width:0"><strong style="font-weight:500;display:block">${esc(a.name)}</strong><small class="vs-hint" style="margin:0;display:block">${esc(a.exe)}</small></span>${sel ? `<span class="vs-pill vs-pill-accent">${T('Selected', 'เลือกแล้ว')}</span>` : ''}</button>`;
function updatePicker() {
  const p = S.picker, m = $('.vs-dialog', pl()); if (!m) return;
  if (p.tab === 'app') {
    const q = p.q.trim().toLowerCase(), f = a => !q || a.name.toLowerCase().includes(q) || a.exe.toLowerCase().includes(q);
    const run = APPS.filter(f), inst = INSTALLED.filter(f), sys = p.showSys ? SYSTEM.filter(f) : [];
    const tile = a => `<button class="mk-tile" type="button" role="radio" aria-checked="${p.app === a.id}" aria-pressed="${p.app === a.id}" data-act="ppick" data-arg="${a.id}"><span class="vs-tile-icon">${icoOf(a, 1)}<span class="vs-tile-running" title="${T('Running now', 'กำลังทำงาน')}"></span></span><strong>${esc(a.name)}</strong></button>`;
    morphInto($('#plistwrap', m), `${REAL.loading ? `<p role="status" class="vs-hint">${T('Reading apps from your PC…', 'กำลังอ่านแอปจากเครื่องของคุณ…')}</p>` : ''}${REAL.error ? `<p role="alert" class="field-error">${esc(REAL.error)}</p>` : ''}<div role="radiogroup" aria-label="${T('Apps', 'แอป')}"><p class="mk-section">${T('Running now', 'กำลังทำงานอยู่')} <span class="vs-hint" style="display:inline;font-weight:400">· ${REAL.enabled ? T('foreground app first', 'แอปที่ใช้อยู่ก่อน') : T('most recently used first', 'ใช้ล่าสุดก่อน')}</span></p>
      ${run.length ? `<div class="mk-tiles">${run.map(tile).join('')}</div>` : `<p class="vs-hint" style="margin:0 0 16px">${T('No running app matches.', 'ไม่มีแอปที่กำลังทำงานตรงกับคำค้น')}</p>`}
      <p class="mk-section">${T('Available apps', 'แอปที่เลือกได้')} <span class="vs-hint" style="display:inline;font-weight:400">· ${inst.length}</span></p><div class="mk-list">${inst.map(a => pitem(a, p.app === a.id)).join('') || `<p class="vs-hint" role="status" style="padding:10px 0;margin:0">${T('No apps match. Try a name or .exe filename.', 'ไม่พบแอป ลองค้นหาชื่อหรือชื่อไฟล์ .exe')}</p>`}</div>
      ${sys.length ? `<p class="mk-section">${T('System (hidden by default)', 'ระบบ (ซ่อนโดยปริยาย)')}</p><div class="mk-list">${sys.map(a => pitem(a, p.app === a.id, true)).join('')}</div>` : ''}</div>`);
  } else {
    const q = p.contains.trim().toLowerCase();
    morphInto($('#wmatch', m), `<p class="mk-section">${T('Tabs open right now', 'แท็บที่เปิดอยู่ตอนนี้')}</p><div class="mk-list">${TABS.map(t => { const hit = q && t.title.toLowerCase().includes(q); return `<div class="mk-item" style="cursor:default"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span><span class="vs-pill ${hit ? 'vs-pill-good' : 'vs-pill-neutral'}">${hit ? T('matches', 'ตรงกัน') : T('no match', 'ไม่ตรง')}</span></div>`; }).join('')}</div>`);
  }
  const showThen = p.tab === 'web' ? !!p.contains.trim() : !!p.app;
  const cf = p.mode === 'pair' ? pairConflict(p) : null, here = cf && cf.scene === p.scene;
  const nm = p.tab === 'web' ? T('tab “' + p.contains + '”', 'แท็บ “' + p.contains + '”') : p.app ? appBy(p.app).name : '';
  let then = '';
  if (showThen && p.mode === 'pair') then = cf ? (here ? `<div class="vs-alert is-warn" role="status" style="margin:0"><span class="vs-alert-text">${T(nm + ' is already shown by this Scene.', nm + ' ใช้ Scene นี้อยู่แล้ว')}</span></div>` : `<div class="vs-alert is-warn" role="group" aria-label="${T('Move confirmation', 'ยืนยันการย้าย')}" style="margin:0"><span class="vs-alert-text"><strong>${T('Move ' + nm + ' from ' + esc(sceneBy(cf.scene).name) + ' to this Scene?', 'ย้าย ' + nm + ' จาก ' + esc(sceneBy(cf.scene).name) + ' มาที่ Scene นี้?')}</strong> ${T('An app or tab belongs to one Scene only.', 'แอปหรือแท็บหนึ่งใช้ได้กับหนึ่ง Scene เท่านั้น')}</span></div>`) : `<p class="vs-hint" style="margin:0">${T('Discord will show this Scene whenever it is open.', 'Discord จะแสดง Scene นี้เมื่อเปิดสิ่งนี้อยู่')}</p>`;
  else if (showThen && p.mode === 'hide') then = `<p class="vs-hint" style="margin:0">${T('Discord will show nothing while this is open.', 'Discord จะไม่แสดงอะไรขณะที่เปิดสิ่งนี้อยู่')}</p>`;
  else if (false) then = `<p class="mk-section">${T('Then', 'แล้ว')}</p>
    <div class="vs-row" style="padding-top:0"><div class="vs-row-copy"><strong>${T('Hide Discord while this is open instead', 'ซ่อน Discord ขณะที่เปิดสิ่งนี้อยู่แทน')}</strong><small>${T('Auto-hide rule — good for banking or private apps.', 'กฎซ่อนอัตโนมัติ — เหมาะกับแอปธนาคารหรือแอปส่วนตัว')}</small></div><label class="vs-switch"><input type="checkbox" data-bind="phide" aria-label="${T('Hide Discord while this is open', 'ซ่อน Discord ขณะเปิดอยู่')}" ${p.hide ? 'checked' : ''}><span></span></label></div>
    ${p.hide ? '' : `<div class="vs-field"><label class="vs-label" for="pscene">${T('Show this Scene', 'แสดงซีนนี้')}</label><select class="vs-select" id="pscene" data-bind="pscene" style="width:100%">${S.scenes.map(s => `<option value="${s.id}" ${p.scene === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>`}`;
  morphInto($('#pthen', m), then);
  const pa = $('#padd', m); pa.textContent = p.mode === 'pair' ? (cf && !here ? T('Move here', 'ย้ายมาที่นี่') : T('Add app', 'เพิ่มแอป')) : T('Add rule', 'เพิ่มกฎ');
  $('#padd', m).disabled = !showThen || !!here;
}
function closePicker() { const L = pl(), pair = S.picker && S.picker.mode === 'pair'; S.picker = null; S.pickerBuilt = false; $('#root').inert = !!S.drawer; layer().inert = false; if (pair) { const b = $('[data-k="pairadd"]'); b && b.focus({ preventScroll: true }); } else restoreFocus(); leaveLayer(null, L); }

/* ---------- toast ---------- */
let toastT;
function toast(msg, undo) {
  $('#toastbox') && $('#toastbox').remove();
  const box = document.createElement('div'); box.id = 'toastbox';
  box.innerHTML = `<div class="mk-toast" role="status"><span>${esc(msg)}</span>${undo ? `<button type="button" data-act="undo">${T('Undo', 'เลิกทำ')}</button>` : ''}</div>`; document.body.appendChild(box);
  clearTimeout(toastT); toastT = setTimeout(() => { const t = box.firstChild; if (t && !reduced()) { t.classList.add('mk-out'); setTimeout(() => box.remove(), 160); } else box.remove(); }, undo ? 5000 : 3200);
}

/* ---------- actions ---------- */
let removed = null, lastText = null, undoFn = null;
function setMode(m) { if (m === 'hidden' && S.mode !== 'hidden') S.prevMode = ['discordoff', 'unreachable'].includes(S.mode) ? 'auto' : S.mode; if (m === 'paused') S.frozen = (curScene() || S.scenes[0]).id; S.mode = m; S.menuOpen = false; }
const keep = (sel) => { buildDrawer(); const e = $(sel, layer()); e && e.focus({ preventScroll: true }); };
const ACT = {
  screen: a => { S.screen = a; S.menuOpen = false; S.acctOpen = false; },
  lang: a => { S.lang = a; }, theme: a => { S.theme = a; }, mode: a => { if (LIVE.enabled) { void liveCommand(a === 'hidden' ? 'hide' : 'send', curScene()); return 'overlay'; } setMode(a); },
  livesend: a => { void liveCommand('send', a ? sceneBy(a) : curScene() || sceneBy(S.pinned) || S.scenes[0]); return 'overlay'; },
  liveend: () => { void liveCommand(REAL.enabled ? 'hide' : 'end'); return 'overlay'; },
  refreshapps: () => { void loadDeviceApps(true); return 'overlay'; },
  scenepick: () => { S.pickOpen = !S.pickOpen; },
  pickscene: a => { S.pickOpen = false; if (REAL.enabled) { REAL.touched = true; REAL.selectedSceneId = a; REAL.selectedAppId = ''; scheduleSave(); return; } if (LIVE.enabled) { void liveCommand('send', sceneBy(a)); S.pinned = a; return 'overlay'; } S.pinned = a; S.pinnedRule = (S.rules.find(r => r.scene === a) || {}).id || ''; setMode('pinned'); },
  backauto: () => { S.pickOpen = false; if (REAL.enabled) { const r = S.rules.find(r => r.kind === 'app' && APPS.some(x => x.id === r.app && x.foreground)) || S.rules.find(r => r.kind === 'app' && APPS.some(x => x.id === r.app)); if (r) { REAL.touched = true; REAL.selectedSceneId = r.scene; REAL.selectedAppId = r.app; scheduleSave(); } return; } setMode('auto'); },
  usescene: a => { REAL.touched = true; REAL.selectedSceneId = a; REAL.selectedAppId = ''; scheduleSave(); if (S.drawer) buildDrawer(); else render(); return 'overlay'; },
  realadd: (a, el) => { if (REAL.ready) { openDrawer(a || S.scenes[0].id, el); openPicker('app', null, { scene: a || S.scenes[0].id, mode: 'pair', host: 'l2' }); } return 'overlay'; },
  livecheck: () => { void checkLiveState(); return 'overlay'; },
  noop: () => toast(T('Prototype: there is no real companion here', 'ตัวอย่าง: ไม่มี companion จริงที่นี่')),
  refreshdiscord: () => { void loadDiscordProfile(); return 'overlay'; },
  copydiscordid: () => { if (!DCID.id) return; Promise.resolve().then(() => navigator.clipboard.writeText(DCID.id)).then(() => toast(T('User ID copied', 'คัดลอก User ID แล้ว'))).catch(() => toast(T('Could not copy — select the User ID and copy it manually.', 'คัดลอกไม่ได้ — เลือก User ID แล้วคัดลอกเองได้'))); return 'overlay'; },
  acctpop: () => { if (S.acctOpen) { closeAcct(() => { const b = $('[data-k="acct"]'); b && b.focus(); }); return 'overlay'; } S.acctOpen = true; },
  pinpair: a => {
    const rule = S.rules.find(r => r.id === a && r.kind !== 'hide');
    if (REAL.enabled) { if (!rule) return 'overlay'; REAL.touched = true; REAL.selectedSceneId = rule.scene; REAL.selectedAppId = REAL.selectedAppId === rule.app ? '' : rule.app; render(); scheduleSave(); return 'overlay'; }
    if (LIVE.enabled) { if (rule) void liveCommand(LIVE.active && S.pinnedRule === a ? 'hide' : 'send', sceneBy(rule.scene), a); return 'overlay'; }
    if (!rule || !sceneBy(rule.scene) || ['hidden', 'autohide', 'discordoff', 'unreachable'].includes(S.mode)) return;
    if (S.mode === 'pinned' && S.pinnedRule === a && S.pinned === rule.scene) {
      setMode('auto'); toast(T('Back to automatic app switching', 'กลับไปสลับตามแอปอัตโนมัติ'));
    } else {
      S.pinnedRule = a; S.pinned = rule.scene; setMode('pinned');
      toast(T('Pinned ' + appBy(rule.app).name + ' → ' + sceneBy(rule.scene).name, 'ปักหมุด ' + appBy(rule.app).name + ' → ' + sceneBy(rule.scene).name));
    }
  },
  gotoprivacy: () => { S.screen = 'settings'; S.menuOpen = false; S.acctOpen = false; setTimeout(() => { const e = $('#privacy'); e && e.scrollIntoView({ block: 'start' }); }, 80); },
  hideadd: (a, el) => { openPicker('app', el, { mode: 'hide', hide: true }); return 'overlay'; },
  pairadd: (a, el) => { openPicker('app', el, { scene: S.drawer.id, mode: 'pair', host: 'l2' }); return 'overlay'; },
  pairrm: a => {
    const i = S.rules.findIndex(r => r.id === a), rr = S.rules[i]; if (!rr) return 'overlay'; const nm = rr.kind === 'web' ? T('tab “' + rr.contains + '”', 'แท็บ “' + rr.contains + '”') : appBy(rr.app).name;
    S.rules.splice(i, 1); S.drawer.dirty = true; scheduleSave();
    undoFn = () => { S.rules.splice(Math.min(i, S.rules.length), 0, rr); S.fresh = rr.id; if (S.drawer) { S.drawer.dirty = true; buildDrawer(); scheduleSave(); } else render(); setTimeout(() => { S.fresh = null; }, 400); };
    toast(T('Removed ' + nm, 'ลบ ' + nm + ' แล้ว'), true);
    const chip = $(`[data-key="pc-${a}"]`, layer()), pb = $('[data-k="pairadd"]', layer()); pb && pb.focus({ preventScroll: true });
    if (chip && !reduced()) { chip.classList.add('mk-chip-out'); chip.setAttribute('inert', ''); setTimeout(() => { chip.remove(); buildDrawer(); }, 200); } else buildDrawer();
    return 'overlay';
  },
  editpair: (a, el) => { openDrawer(a, el); const sec = $('#pairsec', layer()); sec && sec.scrollIntoView({ block: 'start' }); return 'overlay'; },
  editscene: (a, el) => { openDrawer(a, el); return 'overlay'; }, newscene: (a, el) => { openDrawer('new', el); return 'overlay'; },
  dup: a => { const s = sceneBy(a), c = JSON.parse(JSON.stringify(s)); c.id = a + '-copy' + Date.now(); S.fresh = c.id; setTimeout(() => { S.fresh = null; }, 400); c.name = s.name + ' ' + T('(copy)', '(สำเนา)'); S.scenes.push(c); toast(T('Duplicated — not used by any rule yet', 'ทำสำเนาแล้ว — ยังไม่มีกฎที่ใช้')); },
  rmrule: a => { const i = S.rules.findIndex(r => r.id === a), rr = S.rules[i]; S.rules.splice(i, 1);
    undoFn = () => { S.rules.splice(Math.min(i, S.rules.length), 0, rr); S.fresh = rr.id; render(); setTimeout(() => { S.fresh = null; }, 400); }; toast(T('Rule removed', 'ลบกฎแล้ว'), true);
    const li = $(`[data-rule="${a}"]`); if (!li || reduced()) return; li.classList.add('mk-row-out'); li.setAttribute('inert', ''); setTimeout(() => li.remove(), 220); const add = $('[data-k="hideadd"]'); add && add.focus(); return 'overlay'; },
  undo: () => { const f = undoFn; undoFn = null; const b = $('#toastbox'); b && b.remove(); f && f(); return 'overlay'; },
  toast: a => toast(a),
  trayscreen: a => { S.screen = 'tray'; S.trayTab = a; S.noticeHidden = false; S.noticeSeen = false; }, traytab: a => { S.trayTab = a; },
  fakeclose: () => { S.noticeHidden = true; }, noticeok: () => { S.noticeSeen = true; }, noticereset: () => { S.noticeHidden = false; S.noticeSeen = false; },
  capture: () => { S.set.capture = !S.set.capture; }, import: () => { S.set.imp = !S.set.imp; },
  importgo: () => { S.set.imp = false; toast(T('Imported 4 Scenes, 5 rules (merged)', 'นำเข้า 4 ซีน 5 กฎ (รวมข้อมูล) แล้ว')); },
  askclear: () => { S.set.confirmClear = !S.set.confirmClear; },
  clearhist: () => { S.set.histCleared = true; S.set.confirmClear = false; toast(T('History cleared', 'ล้างประวัติแล้ว')); },
  askquit: () => { S.set.confirmQuit = !S.set.confirmQuit; },
  quit: () => { S.set.confirmQuit = false; S.mode = 'unreachable'; S.screen = 'now'; toast(T('Vibe quit — Discord now shows nothing.', 'ออกจาก Vibe แล้ว — Discord ไม่แสดงอะไร')); },
  frcreate: () => { const f = S.fr, n = mkScene({ id: 'sc' + Date.now(), name: (f.newName || '').trim() }); S.scenes.push(n); f.scene = n.id; f.sent = 'idle'; },
  frstep: a => { S.fr.step = +a; }, frdiscord: a => { S.fr.discord = a; }, frapp: a => { S.fr.app = a; }, frscene: a => { const ae = document.activeElement; if (ae && ae.tagName === 'INPUT') ae.blur(); S.fr.scene = a; S.fr.sent = 'idle'; },
  frsend: () => { S.fr.sent = 'sending'; setTimeout(() => { S.fr.sent = S.fr.discord === 'ok' ? 'ok' : 'fail'; if (S.screen === 'first') render(); }, 1100); },
  frfinish: () => { const f = S.fr; if (f.sent !== 'ok') f.sent = 'ok'; { const ex = S.rules.find(r => r.app === f.app && r.kind === 'app'); if (ex) ex.scene = f.scene; else S.rules.unshift({ id: 'rn' + Date.now(), kind: 'app', app: f.app, scene: f.scene }); } S.screen = 'now'; S.mode = 'auto'; toast(T('All set — Vibe runs in the background now.', 'เสร็จแล้ว — Vibe ทำงานเบื้องหลังต่อไป')); },
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
  paddgo: () => {
    const p = S.picker, id = 'rn' + Date.now(), web = p.tab === 'web';
    if (!(web ? p.contains.trim() : p.app)) return 'overlay';
    if (p.mode === 'pair') {
      const cf = pairConflict(p), nm = web ? T('tab “' + p.contains + '”', 'แท็บ “' + p.contains + '”') : appBy(p.app).name; let msg;
      if (cf && cf.scene === p.scene) return 'overlay';
      if (cf) { const old = cf.scene, from = sceneBy(old).name; cf.scene = p.scene; S.fresh = cf.id; msg = T(`Moved ${nm} from ${from}`, `ย้าย ${nm} จาก ${from} แล้ว`); undoFn = () => { cf.scene = old; if (S.drawer) { buildDrawer(); scheduleSave(); } else render(); }; }
      else { const r = web ? { id, kind: 'web', app: 'chrome', contains: p.contains, scene: p.scene } : { id, kind: 'app', app: p.app, scene: p.scene }; S.rules.push(r); S.fresh = id; msg = T('Added ' + nm, 'เพิ่ม ' + nm + ' แล้ว'); undoFn = () => { S.rules = S.rules.filter(x => x !== r); if (S.drawer) { buildDrawer(); scheduleSave(); } else render(); }; }
      closePicker(); if (S.drawer) { S.drawer.dirty = true; buildDrawer(); scheduleSave(); } setTimeout(() => { S.fresh = null; }, 400); toast(msg, true); return 'overlay';
    }
    if (p.mode === 'hide') { const r = web ? { id, kind: 'hide', app: 'chrome', contains: p.contains } : { id, kind: 'hide', app: p.app }; if (!S.rules.some(x => x.kind === 'hide' && x.app === r.app && (x.contains || '') === (r.contains || ''))) S.rules.push(r); S.fresh = id; closePicker(); render(); setTimeout(() => { S.fresh = null; }, 400); toast(T('Auto-hide rule added', 'เพิ่มกฎซ่อนอัตโนมัติแล้ว')); return 'overlay'; }
    return 'overlay';
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) {
    if (el.tagName === 'A') e.preventDefault();
    const fn = ACT[el.dataset.act]; if (!fn) return;
    const r = fn(el.dataset.arg, el);
    if (REAL.enabled && ['dup', 'rmrule', 'newscene', 'imgclear', 'pickimg'].includes(el.dataset.act)) scheduleSave();
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
  else if (b === 'frname') { S.fr.newName = t.value; const btn = $('[data-act="frcreate"]'); if (btn) btn.disabled = !t.value.trim(); }
  else if (b === 'frline') { sceneBy(S.fr.scene)[t.dataset.line] = t.value; S.fr.sent = 'idle'; const id = t.id, pos = t.selectionStart; render(); const n = $('#' + id); n.focus(); n.setSelectionRange(pos, pos); }
  else if (b === 'pairsearch') { S.pairQuery = t.value; const list = $('.mk-ptiles'); if (list) list.scrollTop = 0; render(); }
  else if (b === 'pq') { S.picker.q = t.value; updatePicker(); }
  else if (b === 'wcontains') { S.picker.contains = t.value; updatePicker(); }
  else if (b === 'appid') S.set.appId = t.value;
});
document.addEventListener('change', e => {
  const t = e.target, b = t.dataset.bind, d = t.dataset.dev;
  if (d) { if (S.drawer) { S.drawer = null; layer().innerHTML = ''; } if (S.picker) { S.picker = null; layer().innerHTML = ''; }
    if (d === 'paircount') { seedPairedApps(t.value); S.screen = 'now'; }
    if (d === 'screen') S.screen = t.value; if (d === 'mode') { S.mode = t.value; if (S.screen === 'first') S.screen = 'now'; S.menuOpen = false; } render({ fade: true }); renderDev(); return; }
  if (!b) return;
  if (b === 'presence') {
    if (REAL.enabled) { REAL.touched = true; REAL.presenceEnabled = t.checked; render(); REAL.revision++; void saveDeviceWorkspace(); if (!t.checked) void applyRealPresence(); return; }
    if (LIVE.enabled) { void liveCommand(t.checked ? 'send' : 'hide', curScene() || sceneBy(S.pinned) || S.scenes[0]); return; }
    if (['discordoff', 'unreachable'].includes(S.mode)) return;
    setMode(t.checked ? (S.prevMode === 'hidden' ? 'auto' : S.prevMode) : 'hidden');
    render(); renderDev();
    const toggle = $('[data-bind="presence"]'); toggle && toggle.focus({ preventScroll: true });
  }
  else if (b === 'realscene') { REAL.touched = true; REAL.selectedSceneId = t.value; REAL.selectedAppId = ''; render(); scheduleSave(); }
  else if (b === 'rulescene') { const k = t.dataset.id; S.rules.find(r => r.id === k).scene = t.value; render(); const n = $(`[data-bind="rulescene"][data-id="${k}"]`); n && n.focus(); toast(T('Rule updated', 'อัปเดตกฎแล้ว')); }
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
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'h' && S.screen !== 'first') {
    if (LIVE.enabled) { e.preventDefault(); void liveCommand(LIVE.active ? 'hide' : 'send', curScene() || sceneBy(S.pinned) || S.scenes[0]); return; } setMode(S.mode === 'hidden' ? 'auto' : 'hidden'); render({ fade: true }); renderDev(); toast(S.mode === 'hidden' ? T('Hidden from Discord (hotkey)', 'ซ่อนจาก Discord แล้ว (ปุ่มลัด)') : T('Showing on Discord again', 'แสดงบน Discord อีกครั้ง')); }
});
function devAct(a) {
  if (a === 'toggle') $('#dev').classList.toggle('collapsed');
  if (a === 'picker' || a === 'pickerweb') { if (S.screen === 'first') S.screen = 'now'; S.acctOpen = false; render(); openDrawer('design', null); openPicker(a === 'picker' ? 'app' : 'web', $('[data-k="pairadd"]', layer()), { scene: 'design', mode: 'pair', host: 'l2' }); }
  if (a === 'hidepicker') { S.screen = 'settings'; render(); openPicker('app', null, { mode: 'hide', hide: true }); }
  if (a === 'failnext') S.failNext = !S.failNext;
  if (a === 'frdiscord') { S.screen = 'first'; S.fr.step = 1; S.fr.discord = 'off'; }
  if (a === 'restart') { S.screen = 'first'; S.fr = { step: 1, discord: 'ok', app: 'figma', scene: 'design', sent: 'idle' }; }
  renderDev(); if (!['picker', 'pickerweb', 'hidepicker'].includes(a)) render();
}

/* ================= D1-M5: stacked overlays (image picker, delete confirm), library icon stack, image hosting ================= */
const layer2 = () => $('#layer2');
const GIFS = [
  ['lofi-cat', 'lofi cat', 'idle.gif'], ['typing', 'typing fast', 'gaming-poster.png'], ['celebrate', 'celebrate', 'poster.png'], ['chill', 'chill vibes', 'chill-poster.png'],
  ['game-on', 'game on', 'gaming-poster.png'], ['coffee', 'coffee time', 'idle.gif'], ['rain', 'rain window', 'chill-poster.png'], ['headphones', 'headphones', 'poster.png'],
].map(g => ({ id: g[0], title: g[1], local: g[2], url: `https://media.giphy.com/media/${g[0]}/giphy.gif` }));
GIFS.forEach(g => { MOCKIMG[g.url] = A_ + g.local; });
const HOSTS = ['ImgBB', 'Imgur', 'Cloudinary'];
const hostName = () => S.set.host || 'ImgBB';
const fmtSize = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const FIELD = { lg: 'art', sm: 'small' };
function srcLabel(sc, p) {
  const v = sc[FIELD[p]], t = sc[FIELD[p] + '_t'];
  if (!v) return [T('No image', 'ไม่มีภาพ'), p === 'lg' ? T('Discord shows a placeholder', 'Discord จะแสดงพื้นที่ว่าง') : T('No badge on the image', 'ไม่มีป้ายบนภาพ')];
  if (v === '@app') return [T('App icon · automatic', 'ไอคอนแอป · อัตโนมัติ'), T('follows the app that’s showing', 'ตามแอปที่กำลังแสดง')];
  if (ART[v]) return [T('Built-in art ', 'ภาพในตัว ') + v.slice(1), T('Included with Vibe', 'มาพร้อม Vibe')];
  let host = ''; try { host = new URL(v).host; } catch (e) { host = v; }
  const k = t || (/giphy\.com/.test(host) ? 'gif' : 'link');
  return [{ gif: T('GIF from GIPHY', 'GIF จาก GIPHY'), upload: T('Uploaded image', 'ภาพที่อัปโหลด'), link: T('Image link', 'ลิงก์ภาพ') }[k], host];
}
function wellHtml(p, sc, label, key) {
  const v = sc[FIELD[p]], [t1, t2] = srcLabel(sc, p);
  return `<div class="vs-field"><span class="vs-label" id="${p}-wl">${label}${helpBtn(key)}</span><div class="mk-well" role="group" aria-labelledby="${p}-wl"><button type="button" class="mk-well-thumb ${v === '@app' ? 'is-app' : ''}" data-act="openimg" data-arg="${p}" tabindex="-1" aria-hidden="true">${v === '@app' ? `<span class="mk-appbadge">${APPGLYPH}</span>` : ''}${v ? `<img src="${artSrc(v, sc)}" alt="">` : `<span class="mk-well-empty">${I.plus}</span>`}</button><span class="mk-well-t"><b>${esc(t1)}</b><small>${esc(t2)}</small></span><button type="button" class="vs-btn vs-btn-sm" data-act="openimg" data-arg="${p}" data-k="well-${p}" data-hl="${p === 'lg' ? 'large' : 'small'}">${v ? T('Change', 'เปลี่ยน') : T('Choose', 'เลือก')}</button>${v ? `<button type="button" class="vs-icon-btn-danger" data-act="imgclear" data-arg="${p}" aria-label="${T('Remove image', 'ลบภาพ')}">${I.x}</button>` : ''}</div></div>`;
}
function applyImage(p, value, type) {
  const sc = sceneBy(S.drawer.id); sc[FIELD[p]] = value; sc[FIELD[p] + '_t'] = type || ''; S.imgFlash = p; scheduleSave(); buildDrawer();
}
/* generic stacked overlay: fade + 8px rise in, animated exit, focus returns to the opener */
function showOv(kind, label, inner, retKey) {
  const L = layer2(); L._tok = (L._tok || 0) + 1; L.inert = false; S.ovReturn = retKey || S.ovReturn;
  L.innerHTML = `<div class="gif-picker mk-picker mk-ov"><button class="gif-picker-backdrop" type="button" data-act="closeov" tabindex="-1" aria-label="${T('Close', 'ปิด')}"></button><div class="vs-dialog mk-ovd" role="${kind === 'del' ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-label="${esc(label)}" data-kind="ov">${inner}</div></div>`;
  layer().inert = true; $('#root').inert = true; trap($('.vs-dialog', L)); void L.offsetWidth;
  L.querySelectorAll('.vs-dialog,.gif-picker-backdrop').forEach(x => x.classList.add('mk-in'));
}
function closeOverlay() {
  const L = layer2(); S.ov = null; if (!L.firstChild) return;
  layer().inert = false; $('#root').inert = !!S.drawer || !!S.picker;
  const t = $(`[data-k="${S.ovReturn}"]`); t && t.focus({ preventScroll: true });
  const parts = L.querySelectorAll('.vs-dialog,.gif-picker-backdrop');
  if (reduced()) { L.innerHTML = ''; return; }
  const tok = L._tok = (L._tok || 0) + 1; L.inert = true; parts.forEach(x => x.classList.remove('mk-in'));
  setTimeout(() => { if (L._tok === tok) { L.innerHTML = ''; L.inert = false; } }, 240);
}
function ovFocus(sel) { const e = sel && $(sel, layer2()); e && e.focus({ preventScroll: true }); }

/* ---- image picker ---- */
function openImg(p, opener, o = {}) {
  rememberFocus(opener); S.ov = Object.assign({ kind: 'img', p, tab: (sceneBy(S.drawer.id)[FIELD[p]] === '@app' ? 'app' : 'builtin'), q: '', loading: false, link: '', file: null, up: 'idle', pct: 0, err: '' }, o);
  if (REAL.enabled && !['app', 'builtin', 'link'].includes(S.ov.tab)) S.ov.tab = 'builtin';
  showOv('img', T('Choose image', 'เลือกภาพ'), imgInner(), `well-${p}`); ovFocus('[role=tab][aria-selected=true]');
  if (S.ov.tab === 'gif' && !o.noSearch) searchGifs(S.ov.q);
}
const IMGTABS = [['app', 'App icon', 'ไอคอนแอป'], ['builtin', 'Built-in art', 'ภาพในตัว'], ['gif', 'GIF search', 'ค้นหา GIF'], ['link', 'Link', 'ลิงก์'], ['upload', 'Upload', 'อัปโหลด']];
function imgInner() {
  const o = S.ov, who = o.p === 'lg' ? T('Large image', 'ภาพใหญ่') : T('Small image', 'ภาพเล็ก');
  return `<div class="gif-dialog-head"><div><h2>${T('Choose image', 'เลือกภาพ')}</h2><p>${who}</p></div><button class="vs-icon-btn" type="button" data-act="closeov" aria-label="${T('Close', 'ปิด')}">✕</button></div>
  <div class="vs-segmented mk-tabs" role="tablist" aria-label="${T('Image source', 'แหล่งภาพ')}">${IMGTABS.map(t => `<button type="button" role="tab" id="ovt-${t[0]}" class="${o.tab === t[0] ? 'is-on' : ''}" aria-selected="${o.tab === t[0]}" tabindex="${o.tab === t[0] ? 0 : -1}" data-act="ovtab" data-arg="${t[0]}">${T(t[1], t[2])}</button>`).join('')}</div>
  <div class="gif-search-panel" role="tabpanel" aria-labelledby="ovt-${o.tab}" id="ovpanel">${imgTab()}</div>`;
}
function imgTab() {
  const o = S.ov, sc = sceneBy(S.drawer.id), cur = sc[FIELD[o.p]];
  if (o.tab === 'app') {
    const apps = sceneApps(sc.id), more = apps.length > 1;
    if (REAL.enabled) return `<p class="vs-hint">${T('Uses the icon of the app selected for this Scene. Supported apps use a public icon on Discord; other apps use Discord’s default image.', 'ใช้ไอคอนแอปที่เลือกให้ Scene นี้ แอปที่รองรับจะแสดงไอคอนสาธารณะบน Discord ส่วนแอปอื่นใช้ภาพเริ่มต้นของ Discord')}</p><div class="mk-igrid"><button class="mk-art-btn mk-app-art" type="button" data-act="pickimg" data-arg="app:" aria-pressed="${cur === '@app'}" aria-label="${T('Use the selected app icon', 'ใช้ไอคอนแอปที่เลือก')}"><img src="${imgSrc('@app', sc)}" alt=""><span>${T('App icon', 'ไอคอนแอป')}</span></button></div>${apps.length ? `<p class="vs-hint">${apps.map(a => esc(a.name)).join(' · ')}</p>` : `<p class="vs-hint">${T('Pair an app with this Scene to use its icon.', 'จับคู่แอปกับ Scene นี้เพื่อใช้ไอคอน')}</p>`}`;
    return `<p class="vs-hint" style="margin:0 0 12px">${T('Discord shows the icon of the app that is showing this Scene. It changes by itself when you switch to another paired app.', 'Discord จะแสดงไอคอนของแอปที่กำลังใช้ Scene นี้ และเปลี่ยนเองเมื่อคุณสลับไปแอปอื่นที่จับคู่ไว้')}${more ? ' ' + T('Most recently used app wins.', 'ใช้แอปที่ใช้ล่าสุด') : ''}</p>
    ${apps.length ? `<ul class="mk-aff">${apps.map(a => { const ok = iconReady(a); return `<li><span class="mk-st-i"><img class="mk-ico" src="${appIconSrc(a)}" alt=""></span><span class="mk-aff-t"><b>${esc(a.name)}</b><small>${ok ? T('Ready', 'พร้อมใช้') : T('Needs upload — uses a generic icon until uploaded', 'ต้องอัปโหลด — ใช้ไอคอนทั่วไปจนกว่าจะอัปโหลด')}</small></span><span class="vs-pill ${ok ? 'vs-pill-good' : 'vs-pill-warn'}" style="margin-left:auto">${ok ? T('Ready', 'พร้อม') : T('Needs upload', 'ต้องอัปโหลด')}</span>${ok ? '' : `<button class="vs-btn vs-btn-sm" type="button" data-act="iconup" data-arg="${a.id}" ${S.set.hostKey ? '' : 'disabled title="' + T('Set up image hosting in Settings first', 'ตั้งค่าโฮสต์ภาพในตั้งค่าก่อน') + '"'}>${T('Upload icon', 'อัปโหลดไอคอน')}</button>`}</li>`; }).join('')}</ul>` : `<div class="mk-empty"><b>${T('No paired app yet', 'ยังไม่มีแอปที่จับคู่')}</b><p>${T('Add an app in “Shows when these apps are open”. Until then a generic icon is shown.', 'เพิ่มแอปในส่วน “แสดงเมื่อเปิดแอปเหล่านี้” ก่อนหน้านั้นจะแสดงไอคอนทั่วไป')}</p></div>`}
    <div class="vs-form-actions" style="justify-content:flex-end"><button class="vs-btn" type="button" data-act="closeov">${T('Cancel', 'ยกเลิก')}</button><button class="vs-btn vs-btn-primary" type="button" data-act="pickimg" data-arg="app:" data-k="useapp">${cur === '@app' ? T('Keep app icon', 'ใช้ไอคอนแอปต่อไป') : T('Use app icon', 'ใช้ไอคอนแอป')}</button></div>`;
  }
  if (o.tab === 'builtin') return `<p class="vs-hint" style="margin:0 0 12px">${T('Choose an image or use the app’s icon.', 'เลือกภาพ หรือใช้ไอคอนแอป')}</p><div class="mk-igrid" role="listbox" aria-label="${T('Built-in art', 'ภาพในตัว')}">${REAL.enabled ? `<button type="button" role="option" class="mk-art-btn mk-app-art" aria-selected="${cur === '@app'}" data-act="pickimg" data-arg="app:" aria-label="${T('Use app icon', 'ใช้ไอคอนแอป')}"><img src="${imgSrc('@app', sc)}" alt=""><span>${T('App icon', 'ไอคอนแอป')}</span></button>` : ''}${o.p === 'sm' ? `<button type="button" role="option" class="mk-art-btn mk-none" aria-selected="${!cur}" data-act="pickimg" data-arg="builtin:">${T('None', 'ไม่มี')}</button>` : ''}${ARTS.map(a => `<button type="button" role="option" class="mk-art-btn" aria-selected="${cur === a}" aria-pressed="${cur === a}" aria-label="${T('Built-in art', 'ภาพในตัว')} ${a.slice(1)}" data-act="pickimg" data-arg="builtin:${a}"><img src="${REAL.enabled && a === 'a4' ? DCID.avatarUrl || A_ + 'app.svg' : A_ + ART[a]}" alt=""></button>`).join('')}</div>`;
  if (o.tab === 'gif') {
    if (!S.set.giphy) return `<div class="mk-empty"><b>${T('GIPHY isn’t set up', 'ยังไม่ได้ตั้งค่า GIPHY')}</b><p>${T('Add a GIPHY API key in Settings to search GIFs here.', 'เพิ่ม GIPHY API key ในตั้งค่าเพื่อค้นหา GIF ที่นี่')}</p><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="gotoimg">${T('Open Settings → Image hosting', 'ไปที่ตั้งค่า → โฮสต์ภาพ')}</button></div>`;
    return `<div class="gif-search-row"><input type="text" id="gifq" value="${esc(o.q)}" placeholder="${T('Search GIPHY…', 'ค้นหาใน GIPHY…')}" aria-label="${T('Search GIFs', 'ค้นหา GIF')}" data-bind="gifq" autocomplete="off"></div><p class="gif-search-status" id="gifst" role="status" aria-live="polite"></p><div id="gifres"></div><p class="gif-provider">${T('GIFs provided by', 'GIF จาก')} <span class="giphy-mark">GIPHY</span></p>`;
  }
  if (o.tab === 'link') return `<div class="vs-field"><label class="vs-label" for="lnk">${T('Image link (https)', 'ลิงก์ภาพ (https)')}</label><input class="vs-input" type="text" id="lnk" data-mono="1" value="${esc(o.link)}" placeholder="https://…/image.png" data-bind="lnk" autocomplete="off"><p class="field-error" id="lnkerr" hidden></p><p class="vs-hint">${T('Direct link to a .png, .jpg, .gif or .webp image.', 'ลิงก์ตรงไปยังภาพ .png .jpg .gif หรือ .webp')} <button type="button" class="vs-quiet-link" data-act="lnkex">${T('Try an example', 'ลองตัวอย่าง')}</button></p></div><div id="lnkprev"></div><div class="vs-form-actions" style="justify-content:flex-end"><button class="vs-btn" type="button" data-act="closeov">${T('Cancel', 'ยกเลิก')}</button><button class="vs-btn vs-btn-primary" type="button" id="lnkapply" data-act="lnkapply" disabled>${T('Apply', 'ใช้ภาพนี้')}</button></div>`;
  /* upload */
  if (!S.set.hostKey) return `<div class="mk-empty"><b>${T('Image hosting isn’t set up', 'ยังไม่ได้ตั้งค่าโฮสต์ภาพ')}</b><p>${T('Uploads need a public image host so Discord can show your picture. Add one in Settings.', 'การอัปโหลดต้องมีโฮสต์ภาพสาธารณะเพื่อให้ Discord แสดงภาพของคุณ เพิ่มได้ในตั้งค่า')}</p><button class="vs-btn vs-btn-primary vs-btn-sm" type="button" data-act="gotoimg">${T('Open Settings → Image hosting', 'ไปที่ตั้งค่า → โฮสต์ภาพ')}</button></div><div class="mk-drop is-disabled" aria-disabled="true"><span>${T('Drag an image here', 'ลากภาพมาวางที่นี่')}</span><button class="vs-btn vs-btn-sm" type="button" disabled>${T('Browse…', 'เลือกไฟล์…')}</button></div>`;
  if (!o.file) return `<div class="mk-drop" id="drop" tabindex="0" role="button" aria-label="${T('Drop an image here or press Enter to browse', 'วางภาพที่นี่ หรือกด Enter เพื่อเลือกไฟล์')}"><span>${T('Drag an image here', 'ลากภาพมาวางที่นี่')}</span><small>${T('PNG, JPG, GIF or WebP · up to 8 MB', 'PNG, JPG, GIF หรือ WebP · ไม่เกิน 8 MB')}</small><button class="vs-btn vs-btn-sm" type="button" data-act="browse2">${T('Browse…', 'เลือกไฟล์…')}</button><input type="file" id="fileIn" accept="image/png,image/jpeg,image/gif,image/webp" hidden></div>${o.err ? `<p class="field-error" role="alert">${esc(o.err)}</p>` : ''}`;
  const busy = o.up === 'busy';
  return `${o.iconFor ? `<p class="vs-hint" style="margin:0 0 8px">${T('Icon for ', 'ไอคอนของ ')}<b>${esc(appBy(o.iconFor).name)}</b></p>` : ''}<div class="mk-upfile"><img src="${o.file.url}" alt=""><span class="mk-well-t"><b>${esc(o.file.name)}</b><small>${fmtSize(o.file.size)}</small></span></div>
   <div class="vs-alert is-warn" role="group" aria-label="${T('Upload confirmation', 'ยืนยันการอัปโหลด')}" style="margin:12px 0"><span class="vs-alert-text"><strong>${T('This image will be uploaded to ', 'ภาพนี้จะถูกอัปโหลดไปยัง ')}${esc(hostName())}${T(' and become public so Discord can show it.', ' และเป็นสาธารณะเพื่อให้ Discord แสดงได้')}</strong> ${T('Anyone with the link can see it. Nothing is uploaded until you press Upload.', 'ใครมีลิงก์ก็เห็นได้ ไม่มีการอัปโหลดจนกว่าคุณจะกดอัปโหลด')}</span></div>
   ${busy ? `<div class="mk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${o.pct}"><i style="width:${o.pct}%"></i></div><p class="vs-hint" role="status">${T('Uploading… ', 'กำลังอัปโหลด… ')}${o.pct}%</p>` : ''}
   ${o.err ? `<p class="field-error" role="alert">${esc(o.err)}</p>` : ''}
   <div class="vs-form-actions" style="justify-content:flex-end"><button class="vs-btn" type="button" data-act="upcancel" ${busy ? 'disabled' : ''}>${T('Cancel', 'ยกเลิก')}</button><button class="vs-btn vs-btn-primary" type="button" data-act="upgo" data-k="upgo" ${busy ? 'disabled' : ''}>${o.err ? T('Try again', 'ลองอีกครั้ง') : T('Upload', 'อัปโหลด')}</button></div>`;
}
function renderOv(focusSel, swap) { const d = $('.vs-dialog', layer2()); if (!d || !S.ov || S.ov.kind !== 'img') return; const run = () => { morphInto(d, imgInner()); if (S.ov.tab === 'gif') updateGifs(); if (S.ov.tab === 'link') updateLink(); }; if (swap) swapRegion(d, '#ovpanel', run); else run(); ovFocus(focusSel); }
let gifT = null;
function searchGifs(q) { S.ov.q = q; S.ov.loading = true; updateGifs(); clearTimeout(gifT); gifT = setTimeout(() => { if (S.ov && S.ov.kind === 'img') { S.ov.loading = false; updateGifs(); } }, reduced() ? 0 : 450); }
function updateGifs() {
  const box = $('#gifres', layer2()), st = $('#gifst', layer2()); if (!box) return;
  const q = (S.ov.q || '').trim().toLowerCase(), res = GIFS.filter(g => !q || g.title.includes(q));
  if (S.ov.loading) { st.textContent = T('Searching…', 'กำลังค้นหา…'); morphInto(box, `<div class="mk-load"><span class="spin"></span></div>`); return; }
  st.textContent = res.length ? (q ? T(`${res.length} results for “${S.ov.q}”`, `พบ ${res.length} รายการสำหรับ “${S.ov.q}”`) : T('Trending', 'ยอดนิยม')) : '';
  morphInto(box, res.length ? `<div class="gif-results mk-gifgrid" role="listbox" aria-label="GIFs">${res.map(g => `<button type="button" role="option" class="gif-result" aria-selected="false" data-act="pickimg" data-arg="gif:${g.id}"><img src="${A_}${g.local}" alt=""><span>${esc(g.title)}</span></button>`).join('')}</div>` : `<div class="mk-empty"><b>${T('No GIFs found', 'ไม่พบ GIF')}</b><p>${T(`Nothing for “${S.ov.q}”. Try another word.`, `ไม่พบ “${S.ov.q}” ลองคำอื่น`)}</p></div>`);
}
function linkCheck(v) {
  v = v.trim(); if (!v) return { ok: false, msg: '' };
  if (!/^https:\/\//i.test(v)) return { ok: false, msg: T('Must start with https://', 'ต้องขึ้นต้นด้วย https://') };
  if (!/^https:\/\/[^\s/]+\.[^\s/]+\/\S+/i.test(v)) return { ok: false, msg: T('That doesn’t look like a full link.', 'ลิงก์ไม่สมบูรณ์') };
  if (!MOCKIMG[v] && !/\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(v)) return { ok: false, msg: T('It must end in .png, .jpg, .gif or .webp.', 'ต้องลงท้ายด้วย .png .jpg .gif หรือ .webp') };
  return { ok: true, msg: '' };
}
function updateLink() {
  const v = S.ov.link, c = linkCheck(v), er = $('#lnkerr', layer2()), pv = $('#lnkprev', layer2()), ap = $('#lnkapply', layer2()), inp = $('#lnk', layer2());
  if (!er) return; er.hidden = !c.msg; er.textContent = c.msg; inp.setAttribute('aria-invalid', c.msg ? 'true' : 'false'); ap.disabled = !c.ok;
  let host = ''; try { host = new URL(v).host; } catch (e) { }
  morphInto(pv, c.ok ? `<div class="mk-upfile"><img src="${imgSrc(v)}" alt=""><span class="mk-well-t"><b>${T('Looks good', 'ใช้ได้')}</b><small>${esc(host)} · ${REAL.enabled ? T('Public image', 'ภาพจากลิงก์สาธารณะ') : T('simulated thumbnail', 'ภาพตัวอย่างจำลอง')}</small></span></div>` : '');
}
function pickImg(a) {
  const [kind, v] = a.split(':'), p = S.ov.p;
  if (kind === 'app') applyImage(p, '@app', 'app');
  else if (kind === 'builtin') applyImage(p, v, 'builtin');
  else if (kind === 'gif') applyImage(p, GIFS.find(g => g.id === v).url, 'gif');
  closeOverlay();
}
function startUpload() {
  const o = S.ov; o.up = 'busy'; o.pct = 0; o.err = ''; renderOv();
  const step = () => {
    if (!S.ov || S.ov !== o) return; o.pct = Math.min(100, o.pct + 20);
    if (o.pct >= 60 && S.failNext) { S.failNext = false; o.up = 'idle'; o.err = T(`Upload to ${hostName()} failed. Nothing was published; try again.`, `อัปโหลดไป ${hostName()} ไม่สำเร็จ ยังไม่มีอะไรถูกเผยแพร่ ลองอีกครั้ง`); renderOv('[data-k=upgo]'); renderDev(); return; }
    if (o.pct >= 100 && o.iconFor) { const ap = appBy(o.iconFor), link = `https://i.ibb.co/${Math.random().toString(36).slice(2, 8)}/${o.file.name}`; MOCKIMG[link] = o.file.url; S.iconUp[ap.id] = link; o.iconFor = null; o.file = null; o.up = 'idle'; o.tab = 'app'; renderOv('[data-k=useapp]', true); if (S.drawer) updateDrawer(); toast(T(`Icon for ${ap.name} uploaded — it’s public now`, `อัปโหลดไอคอนของ ${ap.name} แล้ว — เป็นสาธารณะแล้ว`)); return; }
    if (o.pct >= 100) { const link = `https://i.ibb.co/${Math.random().toString(36).slice(2, 8)}/${o.file.name.replace(/\s+/g, '-')}`; MOCKIMG[link] = o.file.url; applyImage(o.p, link, 'upload'); closeOverlay(); toast(T('Uploaded — public link set', 'อัปโหลดแล้ว — ตั้งลิงก์สาธารณะแล้ว')); return; }
    renderOv('[data-act=upcancel]'); setTimeout(step, reduced() ? 0 : 280);
  };
  setTimeout(step, 200);
}
function takeFile(f) {
  const o = S.ov; if (!f) return;
  if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) { o.err = T('That file isn’t a PNG, JPG, GIF or WebP image.', 'ไฟล์นี้ไม่ใช่ภาพ PNG JPG GIF หรือ WebP'); renderOv('#drop'); return; }
  if (f.size > 8 * 1048576) { o.err = T('Too large — the limit is 8 MB.', 'ใหญ่เกินไป — จำกัด 8 MB'); renderOv('#drop'); return; }
  o.err = ''; o.file = { name: f.name, size: f.size, url: URL.createObjectURL(f) }; renderOv('[data-k=upgo]', true);
}

/* ---- delete Scene ---- */
function openDelete(opener) {
  rememberFocus(opener); const sc = sceneBy(S.drawer.id), others = S.scenes.filter(s => s.id !== sc.id);
  S.ov = { kind: 'del', id: sc.id, mode: 'reassign', to: others[0].id, busy: false, err: false };
  showOv('del', T('Delete Scene', 'ลบ Scene'), delInner(), 'del'); ovFocus('[data-act=closeov]');
}
function sceneWhen(id) {
  const names = S.rules.filter(r => r.scene === id && r.kind !== 'hide').map(r => r.kind === 'web' ? '“' + r.contains + '”' : appBy(r.app).name);
  if (!names.length) return '';
  const j = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + T(' or ', ' หรือ ') + names[names.length - 1];
  return j;
}
function summaryInner() {
  const sc = sceneBy(S.ov.id), apps = sceneWhen(sc.id), esn = esc(sc.name);
  return `<div class="mk-sum"><span class="mk-sum-th"><img src="${artSrc(sc.art, sc)}" alt=""></span><h2>${T(esn + ' saved', 'บันทึก ' + esn + ' แล้ว')}</h2>
  <p class="vs-hint">${apps ? T('Shows when ' + esc(apps) + ' is open', 'แสดงเมื่อเปิด ' + esc(apps)) : T('Not paired — it won’t show automatically', 'ยังไม่ได้จับคู่ — จะไม่แสดงอัตโนมัติ')}</p>
  <div class="vs-form-actions" style="justify-content:center"><button class="vs-btn vs-btn-primary" type="button" data-act="sumshow" data-arg="${sc.id}">${T('Show on Discord now', 'แสดงบน Discord ตอนนี้')}</button>${apps ? '' : `<button class="vs-btn" type="button" data-act="sumadd" data-arg="${sc.id}">${I.plus}${T('Add app', 'เพิ่มแอป')}</button>`}<button class="vs-btn vs-btn-ghost" type="button" data-act="closeov">${T('Close', 'ปิด')}</button></div></div>`;
}
function openSummary(id) {
  if (!sceneBy(id)) return;
  S.ov = { kind: 'sum', id }; S.ovReturn = $(`[data-k="lib-${id}"]`) ? 'lib-' + id : (S.lastFocus || 'newscene');
  showOv('sum', T('Scene saved', 'บันทึก Scene แล้ว'), summaryInner(), S.ovReturn); ovFocus('[data-act=sumshow]');
}
function delInner() {
  const o = S.ov, sc = sceneBy(o.id), aff = S.rules.filter(r => r.scene === o.id), others = S.scenes.filter(s => s.id !== o.id);
  return `<div class="gif-dialog-head"><div><h2>${T('Delete “' + esc(sc.name) + '”?', 'ลบ “' + esc(sc.name) + '” หรือไม่?')}</h2><p>${T('This Scene will be removed from your library.', 'Scene นี้จะถูกลบออกจากคลังของคุณ')}</p></div><button class="vs-icon-btn" type="button" data-act="closeov" aria-label="${T('Close', 'ปิด')}" ${o.busy ? 'disabled' : ''}>✕</button></div>
  <div class="gif-search-panel">${aff.length ? `<p class="mk-section">${T(`Used by ${aff.length} rule${aff.length > 1 ? 's' : ''}`, `ใช้โดย ${aff.length} กฎ`)}</p><ul class="mk-aff">${aff.map(r => { const a = appBy(r.app); return `<li><span class="mk-st-i">${icoOf(a)}</span><span class="mk-aff-t"><b>${esc(r.kind === 'web' ? T('Tab: “' + r.contains + '”', 'แท็บ: “' + r.contains + '”') : a.name)}</b><small>${esc(r.kind === 'web' ? a.name : a.exe)}</small></span></li>`; }).join('')}</ul>
   <fieldset class="mk-fs" ${o.busy ? 'disabled' : ''}><legend class="vs-visually-hidden">${T('What happens to these rules', 'จะทำอย่างไรกับกฎเหล่านี้')}</legend>
    <label class="mk-radio"><input type="radio" name="dmode" value="reassign" data-bind="dmode" ${o.mode === 'reassign' ? 'checked' : ''}> <span>${T('Reassign them to', 'ย้ายไปใช้')}</span> <select class="vs-select" data-bind="dto" aria-label="${T('Scene to reassign to', 'Scene ที่จะย้ายไป')}">${others.map(s => `<option value="${s.id}" ${o.to === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    <label class="mk-radio"><input type="radio" name="dmode" value="remove" data-bind="dmode" ${o.mode === 'remove' ? 'checked' : ''}> <span>${T('Remove these rules', 'ลบกฎเหล่านี้ด้วย')}</span></label></fieldset>` : `<p class="vs-hint" style="margin:0 0 12px">${T('No rules use this Scene.', 'ไม่มีกฎที่ใช้ Scene นี้')}</p>`}
   ${o.err ? `<div class="vs-alert is-bad" role="alert" style="margin:12px 0 0"><span class="vs-alert-text"><strong>${T('Couldn’t delete.', 'ลบไม่สำเร็จ')}</strong> ${T('Nothing was changed. Try again.', 'ไม่มีอะไรเปลี่ยนแปลง ลองอีกครั้ง')}</span></div>` : ''}
   <p class="vs-hint">${T('You can undo for a few seconds after deleting.', 'เลิกทำได้ภายในไม่กี่วินาทีหลังลบ')}</p>
   <div class="vs-form-actions" style="justify-content:flex-end"><button class="vs-btn" type="button" data-act="closeov" ${o.busy ? 'disabled' : ''}>${T('Cancel', 'ยกเลิก')}</button><button class="vs-btn vs-btn-danger" type="button" data-act="delgo" ${o.busy ? 'disabled' : ''}>${o.busy ? `<span class="spin"></span>${T('Deleting…', 'กำลังลบ…')}` : o.err ? T('Try again', 'ลองอีกครั้ง') : T('Delete Scene', 'ลบ Scene')}</button></div></div>`;
}
function renderDel(f) { const d = $('.vs-dialog', layer2()); if (!d || !S.ov || S.ov.kind !== 'del') return; morphInto(d, delInner()); ovFocus(f); }
function doDelete() {
  const o = S.ov; o.busy = true; o.err = false; renderDel('[data-act=delgo]');
  setTimeout(() => {
    if (S.ov !== o) return;
    if (S.failNext) { S.failNext = false; o.busy = false; o.err = true; renderDel('[data-act=delgo]'); renderDev(); return; }
    const idx = S.scenes.findIndex(s => s.id === o.id), sc = S.scenes[idx], aff = S.rules.filter(r => r.scene === o.id);
    const snap = { sc, idx, rules: aff.map(r => ({ r, i: S.rules.indexOf(r) })), pinned: S.pinned, frozen: S.frozen };
    const fallback = S.scenes.find(s => s.id !== o.id).id;
    if (S.pinned === o.id) S.pinned = fallback; if (S.frozen === o.id) S.frozen = fallback;
    S.scenes.splice(idx, 1);
    if (o.mode === 'remove') S.rules = S.rules.filter(r => r.scene !== o.id); else aff.forEach(r => { r.scene = o.to; });
    if (REAL.enabled) scheduleSave();
    const reassigned = o.mode !== 'remove'; const to = o.to;
    clearTimeout(S.saveTimer); S.drawer = null; closeOverlay(); $('#root').inert = false; layer().inert = false; leaveLayer();
    const row = $(`[data-k="lib-${o.id}"]`), li = row && row.closest('.vs-scene-row');
    const done = () => { render(); const nb = $('[data-k="newscene"]') || $('#main'); nb && nb.focus({ preventScroll: true }); };
    if (li && !reduced()) { li.classList.add('mk-row-out'); li.setAttribute('inert', ''); setTimeout(done, 200); } else done();
    undoFn = () => {
      S.scenes.splice(snap.idx, 0, snap.sc); S.pinned = snap.pinned; S.frozen = snap.frozen;
      snap.rules.forEach(x => { if (reassigned) x.r.scene = snap.sc.id; else S.rules.splice(Math.min(x.i, S.rules.length), 0, x.r); });
      S.fresh = snap.sc.id; render(); setTimeout(() => { S.fresh = null; }, 400);
    };
    toast(T(`Deleted “${sc.name}”`, `ลบ “${sc.name}” แล้ว`), true);
  }, reduced() ? 0 : 700);
}

/* ---- library icon stack (#24) ---- */
function stackItems(id) { const out = []; S.rules.filter(r => r.scene === id && r.kind !== 'hide').forEach(r => { const a = appBy(r.app), key = r.kind + ':' + a.id; if (!out.find(x => x.key === key)) out.push({ key, r, a }); }); return out; }
function stackHtml(id) {
  const it = stackItems(id);
  if (!it.length) return `<button type="button" class="mk-addapp" data-act="addrulefor" data-arg="${id}" data-k="addapp-${id}" aria-label="${T('Add an app rule for this Scene', 'เพิ่มกฎแอปให้ Scene นี้')}">${I.plus}<span>${T('app', 'แอป')}</span></button>`;
  const names = it.map(x => x.r.kind === 'web' ? T(`${x.a.name} tab “${x.r.contains}”`, `${x.a.name} แท็บ “${x.r.contains}”`) : x.a.name).join(', '), more = it.length - 4;
  return `<span class="mk-stack" tabindex="0" role="img" aria-label="${T('Used by: ', 'ใช้โดย: ')}${esc(names)}" data-names="${esc(names)}">${it.slice(0, 4).map(x => `<span class="mk-st-i">${icoOf(x.a)}${x.r.kind === 'web' ? `<span class="mk-globe">${I.globe}</span>` : ''}</span>`).join('')}${more > 0 ? `<span class="mk-st-i mk-st-more">+${more}</span>` : ''}</span>`;
}

/* ---- Settings: image hosting ---- */
function privacyCard(card) {
  const hides = S.rules.filter(r => r.kind === 'hide');
  const list = hides.length ? `<ul class="mk-rules">${hides.map(ruleRow).join('')}</ul>` : `<p class="vs-caption" style="margin:0 0 8px">${T('No auto-hide rules yet.', 'ยังไม่มีกฎซ่อนอัตโนมัติ')}</p>`;
  const html = card(T('Privacy', 'ความเป็นส่วนตัว'), T('What Vibe reads, shows and keeps. Everything stays on this PC.', 'สิ่งที่ Vibe อ่าน แสดง และเก็บ ทั้งหมดอยู่ในเครื่องนี้'),
    `<p class="vs-section-label" style="margin-top:0">${T('Auto-hide rules', 'กฎซ่อนอัตโนมัติ')}</p><p class="vs-hint" style="margin:0 0 8px">${T('While one of these is open, Discord shows nothing — whichever Scene would apply. Good for banking or private apps.', 'ขณะที่แอปเหล่านี้เปิดอยู่ Discord จะไม่แสดงอะไร ไม่ว่าจะเป็น Scene ไหน เหมาะกับแอปธนาคารหรือแอปส่วนตัว')}</p>${list}
     <div class="vs-form-actions"><button class="vs-btn vs-btn-sm" type="button" data-act="hideadd" data-k="hideadd">${I.plus}${T('Add auto-hide rule', 'เพิ่มกฎซ่อนอัตโนมัติ')}</button></div>
     <ul class="mk-privnotes"><li>${I.lock}<span>${T('Window titles are read only for the window you are using now, and only to match a web-tab rule or fill {window} in a Scene that opts in.', 'อ่านชื่อหน้าต่างเฉพาะหน้าต่างที่คุณใช้อยู่ เพื่อจับคู่กฎแท็บเว็บหรือเติม {window} ใน Scene ที่เลือกใช้เท่านั้น')}</span></li><li>${I.lock}<span>${T('{window} text goes to Discord for anyone who can see your profile. It is off by default in every Scene.', 'ข้อความ {window} จะส่งไปยัง Discord ให้ทุกคนที่เห็นโปรไฟล์ของคุณเห็น ปิดไว้เป็นค่าเริ่มต้นในทุก Scene')}</span></li><li>${I.lock}<span>${T('History stays on this PC and is deleted after the retention period — see History below to change or clear it.', 'ประวัติเก็บในเครื่องนี้และถูกลบเมื่อครบระยะเวลา — ดูส่วนประวัติด้านล่างเพื่อเปลี่ยนหรือล้าง')}</span></li></ul>`);
  return html.replace('<section class="vs-card">', '<section class="vs-card" id="privacy">');
}
function hostingCard(card) {
  const s = S.set, pill = on => `<span class="vs-statuspill ${on ? 'ok' : 'warn'}">${on ? T('Set', 'ตั้งค่าแล้ว') : T('Not set', 'ยังไม่ตั้งค่า')}</span>`;
  const keyRow = (id, label, on, ph) => `<div class="vs-keystatus-row"><strong>${label}</strong>${pill(on)}</div><div class="vs-form-actions" style="margin:0"><input class="vs-input" style="flex:1;min-width:160px" type="password" id="${id}" autocomplete="off" placeholder="${on ? '••••••••••••' : ph}" aria-label="${label}"><button class="vs-btn vs-btn-sm" type="button" data-act="savekey" data-arg="${id}">${T('Save', 'บันทึก')}</button>${on ? `<button class="vs-btn vs-btn-sm vs-btn-danger" type="button" data-act="rmkey" data-arg="${id}">${T('Remove', 'ลบ')}</button>` : ''}</div>`;
  return card(T('Image hosting', 'โฮสต์ภาพ'), T('Used by the Scene editor’s image picker. Keys are stored on this PC only and never shown again.', 'ใช้โดยตัวเลือกภาพในตัวแก้ไข Scene คีย์เก็บในเครื่องนี้เท่านั้นและไม่แสดงซ้ำ'),
    `<div class="vs-keystatus">${keyRow('giphy', T('GIPHY key (GIF search)', 'GIPHY key (ค้นหา GIF)'), s.giphy, T('Paste your GIPHY API key', 'วาง GIPHY API key'))}</div>
     <div class="vs-keystatus"><div class="vs-keystatus-row"><strong><label for="hostSel">${T('Upload host', 'โฮสต์สำหรับอัปโหลด')}</label></strong><select class="vs-select" id="hostSel" data-bind="hostsel">${HOSTS.map(h => `<option ${hostName() === h ? 'selected' : ''}>${h}</option>`).join('')}</select></div>${keyRow('hostkey', T(hostName() + ' API key', hostName() + ' API key'), s.hostKey, T('Paste your API key', 'วาง API key'))}
     <p class="vs-caption">${T('Uploads make the image public on this host so Discord viewers can see it. Each upload asks you to confirm first. Without a key, Upload is disabled.', 'การอัปโหลดทำให้ภาพเป็นสาธารณะบนโฮสต์นี้เพื่อให้ผู้ชมบน Discord เห็น ทุกครั้งจะถามยืนยันก่อน หากไม่มีคีย์จะอัปโหลดไม่ได้')}</p></div>`);
}

/* ---- delegated events for the new pieces ---- */
Object.assign(ACT, {
  openimg: (a, el) => { openImg(a, el); return 'overlay'; },
  imgclear: a => { applyImage(a, '', ''); const b = $(`[data-k="well-${a}"]`, layer()); b && b.focus({ preventScroll: true }); return 'overlay'; },
  donedrawer: () => {
    if (S.save === 'failed') { S.doneErr = true; buildDrawer(); return 'overlay'; }
    const id = S.drawer && S.drawer.id; closeDrawer(); setTimeout(() => openSummary(id), 0); return 'overlay';
  },
  sumshow: a => { closeOverlay(); if (REAL.enabled) REAL.presenceEnabled = true; const r = ACT.pickscene(a); if (r !== 'overlay') render({ fade: true }); else render(); renderDev(); return 'overlay'; },
  sumadd: a => { closeOverlay(); setTimeout(() => { openDrawer(a, $(`[data-k="lib-${a}"]`)); const p = $('#pairsec'); p && p.scrollIntoView({ block: 'center' }); if (!REAL.enabled || REAL.ready) openPicker('app', null, { scene: a, mode: 'pair', host: 'l2' }); }, 260); return 'overlay'; },
  closeov: () => { closeOverlay(); return 'overlay'; },
  ovtab: a => { S.ov.tab = a; if (a === 'gif') { S.ov.q = S.ov.q || ''; } renderOv(`#ovt-${a}`, true); if (a === 'gif' && S.set.giphy) searchGifs(S.ov.q); return 'overlay'; },
  pickimg: a => { pickImg(a); return 'overlay'; },
  lnkex: () => { S.ov.link = 'https://example.com/images/cover.png'; renderOv('#lnk'); return 'overlay'; },
  lnkapply: () => { applyImage(S.ov.p, S.ov.link.trim(), 'link'); closeOverlay(); return 'overlay'; },
  browse2: () => { const f = $('#fileIn', layer2()); f && f.click(); return 'overlay'; },
  upgo: () => { startUpload(); return 'overlay'; },
  iconup: a => { const ap = appBy(a); S.ov.iconFor = a; S.ov.tab = 'upload'; S.ov.err = ''; S.ov.up = 'idle'; S.ov.file = { name: ap.name.replace(/\s+/g, '-').toLowerCase() + '-icon.png', size: 31000, url: A_ + 'app.svg' }; renderOv('[data-k=upgo]', true); return 'overlay'; },
  upcancel: () => { if (S.ov.iconFor) { S.ov.iconFor = null; S.ov.file = null; S.ov.err = ''; S.ov.up = 'idle'; renderOv('#ovt-app', true); S.ov.tab = 'app'; return 'overlay'; } S.ov.file = null; S.ov.err = ''; S.ov.up = 'idle'; renderOv('#drop', true); return 'overlay'; },
  gotoimg: () => { S.ov = null; layer2().innerHTML = ''; layer2().inert = false; clearTimeout(S.saveTimer); S.drawer = null; layer().innerHTML = ''; layer().inert = false; $('#root').inert = false; S.screen = 'settings'; S.picker = null; render({ fade: true }); const e = $('#giphy'); e && e.scrollIntoView(); return 'overlay'; },
  askdel: (a, el) => { openDelete(el); return 'overlay'; },
  delgo: () => { doDelete(); return 'overlay'; },
  addrulefor: (a, el) => { openDrawer(a, el); const sec = $('#pairsec', layer()); sec && sec.scrollIntoView({ block: 'start' }); openPicker('app', $('[data-k="pairadd"]', layer()), { scene: a, mode: 'pair', host: 'l2' }); return 'overlay'; },
  savekey: a => { const v = ($('#' + a) || {}).value; if (!v || !v.trim()) { toast(T('Paste a key first', 'วางคีย์ก่อน')); return 'overlay'; } if (a === 'giphy') S.set.giphy = true; else S.set.hostKey = true; render(); toast(T('Key saved on this PC', 'บันทึกคีย์ในเครื่องแล้ว')); return 'overlay'; },
  rmkey: a => { if (a === 'giphy') S.set.giphy = false; else S.set.hostKey = false; render(); toast(T('Key removed', 'ลบคีย์แล้ว')); return 'overlay'; },
});
document.addEventListener('input', e => {
  const t = e.target, b = t.dataset && t.dataset.bind; if (!S.ov) return;
  if (b === 'gifq') { clearTimeout(gifT); searchGifs(t.value); }
  if (b === 'lnk') { S.ov.link = t.value; updateLink(); }
});
document.addEventListener('change', e => {
  const t = e.target, b = t.dataset && t.dataset.bind;
  if (b === 'hostsel') { S.set.host = t.value; render(); const x = $('#hostSel'); x && x.focus(); }
  if (!S.ov) return;
  if (b === 'dmode') { S.ov.mode = t.value; }
  if (b === 'dto') { S.ov.to = t.value; }
  if (t.id === 'fileIn') takeFile(t.files[0]);
});
document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('is-over'); } });
document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('#drop'); if (d) d.classList.remove('is-over'); });
document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('is-over'); takeFile(e.dataTransfer.files[0]); } });
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t.id === 'drop' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const f = $('#fileIn', layer2()); f && f.click(); return; }
  if (t.getAttribute && t.getAttribute('role') === 'tab' && t.closest('.mk-ovd') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    e.preventDefault(); const i = IMGTABS.findIndex(x => x[0] === S.ov.tab), n = IMGTABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + IMGTABS.length) % IMGTABS.length][0]; ACT.ovtab(n); return;
  }
  const g = t.closest && t.closest('.mk-igrid, .mk-gifgrid'); if (g && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
    const bs = [...g.querySelectorAll('button')], i = bs.indexOf(t); if (i < 0) return; e.preventDefault();
    const cols = bs.filter(b => b.offsetTop === bs[0].offsetTop).length || 1; let n = i;
    if (e.key === 'ArrowRight') n = Math.min(bs.length - 1, i + 1); if (e.key === 'ArrowLeft') n = Math.max(0, i - 1); if (e.key === 'ArrowDown') n = Math.min(bs.length - 1, i + cols); if (e.key === 'ArrowUp') n = Math.max(0, i - cols); if (e.key === 'Home') n = 0; if (e.key === 'End') n = bs.length - 1;
    bs[n].focus();
  }
});


/* ---------- field help (#18): hover / focus / tap, Escape closes; also highlights the preview area ---------- */
document.addEventListener('mouseover', e => { const h = e.target.closest && e.target.closest('.mk-help'); if (h && tipFor !== h) showTip(h); });
document.addEventListener('mouseout', e => { const h = e.target.closest && e.target.closest('.mk-help'); if (h && document.activeElement !== h) hideTip(); });
document.addEventListener('focusin', e => { const t = e.target; if (t.classList && t.classList.contains('mk-help')) showTip(t); else { if (tipFor) hideTip(); if (t.dataset && t.dataset.hl && S.drawer) highlight(t.dataset.hl); } });
document.addEventListener('focusout', e => { const t = e.target; if (t.classList && t.classList.contains('mk-help')) hideTip(); else if (t.dataset && t.dataset.hl) highlight(null); });
document.addEventListener('click', e => { const h = e.target.closest && e.target.closest('.mk-help'); if (h) { e.preventDefault(); tipFor === h && h.getAttribute('aria-expanded') === 'true' && e.detail === 0 ? hideTip() : showTip(h); } }, true);

/* Enter in a first-run field submits the step when valid (send first, then finish) */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || S.screen !== 'first' || e.isComposing) return; const t = e.target;
  if (!t.matches || !t.matches('.vs-onboard input[type=text]')) return; e.preventDefault();
  const bt = $('.mk-ob-foot [data-act=frfinish]:not(:disabled)') || $('.mk-ob-foot [data-act=frsend]:not(:disabled)'); bt && bt.click();
});

/* ---------- boot ---------- */
(function boot() {
  const q = new URLSearchParams(location.search);
  if (q.get('lang')) S.lang = q.get('lang'); if (q.get('theme')) S.theme = q.get('theme');
  S.screen = q.get('screen') || 'first';
  LIVE.enabled = (q.get('live') === '1' || ['17348', '17349'].includes(location.port)) && location.hostname === '127.0.0.1';
  REAL.enabled = (q.get('real') === '1' || location.port === '17349') && LIVE.enabled;
  if (LIVE.enabled) { S.scenes = []; S.rules = []; S.pinned = ''; S.frozen = ''; } /* live mode never seeds demo Scenes; only the pure demo keeps them */
  if (REAL.enabled) { APPS.length = 0; INSTALLED.length = 0; SYSTEM.length = 0; TABS.length = 0; S.rules = []; S.mode = 'none'; S.scenes.forEach(sc => { sc.vars = false; }); IMGTABS.splice(0, IMGTABS.length, ...IMGTABS.filter(t => ['app', 'builtin', 'link'].includes(t[0]))); }
  else if (q.get('apps') || S.screen === 'now') seedPairedApps(q.get('apps') || 36);
  if (q.get('state')) { S.mode = q.get('state'); if (S.mode === 'pinned') S.pinned = 'coding'; }
  if (REAL.enabled && S.screen === 'first') S.screen = 'now';
  if (S.screen === 'first' && !q.get('state')) S.mode = 'none';
  if (q.get('step')) S.fr.step = +q.get('step');
  if (q.get('step') === '3' && q.get('sent')) S.fr.sent = q.get('sent');
  if (q.get('discord') === 'off') S.fr.discord = 'off';
  if (q.get('tray')) { S.trayTab = q.get('tray'); S.noticeHidden = q.get('hidden') === '1'; }
  if (q.get('imp')) S.set.imp = true;
  if (q.get('pv')) S.pvView = q.get('pv');
  if (q.get('acct')) S.acctOpen = true;
  if (q.get('giphy') === '0') S.set.giphy = false; if (q.get('host') === '0') S.set.hostKey = false;
  if (REAL.enabled || q.get('dev') === '0') { document.body.classList.add('nodev'); $('#dev').style.display = 'none'; }
  render(); renderDev();
  if (LIVE.enabled) void checkLiveState();
  else void loadDiscordProfile();
  if (REAL.enabled) void loadDeviceApps(false, true);
  const o = q.get('open');
  if (['drawer', 'drawerfail', 'drawersaving', 'drawervars'].includes(o)) { if (o === 'drawervars') sceneBy('focus').vars = true; openDrawer(o === 'drawervars' ? 'focus' : (q.get('scene') || 'design'), null); if (o === 'drawerfail') { S.save = 'failed'; updateDrawer(); } if (o === 'drawersaving') { S.save = 'saving'; updateDrawer(); } }
  if (o === 'picker') openPicker('app', null);
  if (o === 'picksearch') openPicker('app', null, { q: 'blen', app: 'blender' });
  if (o === 'pickerweb') openPicker('web', null);
  if (q.get('scenesdrawer')) { S.screen = 'scenes'; render(); openDrawer(q.get('scene') || 'music', null); }
  if (q.get('tip')) { const hb = $(`.mk-help[data-help="${q.get('tip')}"]`, layer()); if (hb) { hb.scrollIntoView({ block: 'nearest' }); requestAnimationFrame(() => showTip(hb)); } }
  if (q.get('formscroll')) { const nb = $('.mk-drawer-body', layer()); if (nb) nb.scrollTop = +q.get('formscroll'); }
  if (q.get('img')) { const [p, tab] = q.get('img').split(':'); openImg(p, null, { tab, q: q.get('gq') || '', noSearch: !!q.get('gq') === false && false }); if (q.get('up') === 'confirm') { S.ov.file = { name: 'cover-art.png', size: 182400, url: A_ + 'poster.png' }; renderOv('[data-k=upgo]'); } if (q.get('up') === 'busy') { S.ov.file = { name: 'cover-art.png', size: 182400, url: A_ + 'poster.png' }; S.ov.up = 'busy'; S.ov.pct = 60; renderOv(); } if (q.get('lnk')) { S.ov.link = q.get('lnk'); renderOv('#lnk'); } }
  if (q.get('del')) { openDelete(null); if (q.get('del') === 'err') { S.ov.err = true; renderDel(); } if (q.get('del') === 'remove') { S.ov.mode = 'remove'; renderDel(); } if (q.get('del') === 'done') { doDelete(); setTimeout(() => clearTimeout(toastT), 1100); } }
  if (q.get('pair') === 'picker') { openPicker('app', $('[data-k="pairadd"]', layer()), { scene: S.drawer.id, mode: 'pair', host: 'l2', app: q.get('papp') || null }); }
  if (q.get('hidepick')) { openPicker('app', null, { mode: 'hide', hide: true, app: q.get('papp') || null }); }
  if (q.get('pair') === 'scroll') { const sc = $('#pairsec', layer()); sc && sc.scrollIntoView({ block: 'start' }); }
  if (q.get('scrollend')) setTimeout(() => window.scrollTo(0, document.documentElement.scrollHeight), 50);
  if (q.get('adv')) { const d = $('.mk-drawer details', layer()); if (d) d.open = true; }
  if (q.get('scrollidx')) { const e = document.querySelectorAll('.vs-page > .vs-card')[+q.get('scrollidx')]; if (e) e.scrollIntoView(); }
})();
