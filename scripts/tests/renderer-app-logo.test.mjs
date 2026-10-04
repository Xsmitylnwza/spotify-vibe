import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Main image: largeImageSource "custom" is an explicit override; absent/empty/"app-icon" follows the paired app's logo, else the Vibe Studio ghost.
const html = readFileSync(new URL('../discord-presence-studio.html', import.meta.url), 'utf8');
const slice = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); assert.ok(a > 0 && b > a, 'block present: ' + from); return html.slice(a, b); };
const STUDIO = 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/6f686f78f80ba7a3a54ce55bd985cf2bfc7fb09d/electron/assets/src/ghost-09-256.png';
const BS = String.fromCharCode(92);
const APPS_BY_ID = {
  chrome: { id: 'chrome', name: 'Chrome', exe: 'C:' + BS + 'Apps' + BS + 'Chrome.exe', publicIcon: 'https://files.test/chrome.png', icon: 'data:image/png;base64,AAAA' },
  code: { id: 'code', name: 'Code', exe: 'C:' + BS + 'Apps' + BS + 'Code.exe', publicIcon: '', icon: 'data:image/png;base64,AAAA', iconStatus: 'failed' },
  code2: { id: 'code2', name: 'Code', exe: 'D:' + BS + 'Other' + BS + 'Code.exe', publicIcon: 'https://files.test/code2.png' },
};

function fixture(lang = 'en') {
  const ctx = {
    S: { rules: [], drawer: null, scenes: [], ov: null, lang }, ST: { rt: null, ready: true, icon: { ok: true, consent: true }, iconBusy: false }, APPS: [],
    T: (en, th) => (lang === 'th' ? th : en), esc: s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    appBy: id => APPS_BY_ID[id] || { id, name: id }, isHttps: v => /^https:\/\//i.test(v || ''), appKey: p => String(p || '').trim().replaceAll('/', BS).toLowerCase(),
    artSrc: v => v, helpBtn: () => '', icoOf: () => '', iconDot: () => '', I: { up: '', x: '', plus: '' }, ARTMAP: { 'builtin:hinata-poster': 'poster.png' }, hostOf: v => v, layer2: () => null, $: () => null,
    sceneBy: id => ctx.S.scenes.find(s => s.id === id), mkScene: o => ({ btns: [], ...o }),
    known: () => Object.values(APPS_BY_ID), sceneApps: id => ctx.S.rules.filter(r => r.scene === id).map(r => APPS_BY_ID[r.app]),
    closeOverlay() { ctx.closed = (ctx.closed || 0) + 1; }, touch() { ctx.touched = (ctx.touched || 0) + 1; }, buildDrawer() {}, DCID: { name: 'Mint', avatarUrl: 'https://cdn.test/av.png' }, ART: [['builtin:hinata-poster', 'poster.png']], H_: '/art/', imgSrc: v => v, recentImgs: () => ['https://r.test/1.png'], APPGLYPH_L: '', addRecent() {}, reduced: () => true, rememberFocus() {}, showOv() {}, ovFocus() {}, secHead: (h, hint) => `<h3>${h}</h3>${hint || ''}`, fld: (id, label, key, field) => `<input id="${id}" data-f="${field}">`,
  };
  vm.createContext(ctx);
  vm.runInContext([
    slice('const RR = ', 'const appBy'), slice('function sceneApp(sc)', 'const loading = '), slice('function sceneToUi(', 'function sceneProblem('),
    slice('/* ---------- app icon hosting', 'function applyApps('), 'const FIELD = { lg: "art", sm: "small" }; const SRC = { lg: "artSource", sm: "smallSource" };',
    slice('function srcLabel(', 'function showOv('), slice('function imageSection(', 'function chipHtml('),
    slice('function openImg(', 'const IMGTABS'), slice('function imgHome(', '\nfunction renderOv'), slice('function imgInner()', 'const recentImgs'),
    slice('function pickImg(', '\n}') + '\n}',
    'this.m = { published, mainIcon, sceneApp, sceneToUi, sceneToRaw, wellHtml, imageSection, imgTab, imgInner, pickImg, applyImage, openImg };',
  ].join('\n'), ctx);
  return ctx;
}
const rule = (scene, app) => ({ id: 'm-' + app, scene, app, exe: APPS_BY_ID[app].exe });
const scene = (extra = {}) => ({ id: 's1', name: 'Work', type: 'playing', actName: 'Vibe', l1: 'a', l1url: '', l2: 'b', l2url: '', art: '', artSource: '', artText: '', artUrl: '', small: '', smallSource: '', smallText: '', smallUrl: '', btns: [], ...extra });

test('published main image is the paired app logo, or the Vibe Studio icon with no app / no public icon', () => {
  const c = fixture(); const sc = scene();
  assert.equal(c.m.published(sc).art, STUDIO, 'no paired app');
  c.S.rules = [rule('s1', 'chrome')];
  assert.equal(c.m.published(sc).art, 'https://files.test/chrome.png');
  c.S.rules = [rule('s1', 'code')];
  assert.equal(c.m.published(sc).art, STUDIO, 'paired app without a public icon');
  c.ST.rt = { applicationIconFallback: 'https://files.test/server-ghost.png' };
  assert.equal(c.m.published(sc).art, 'https://files.test/server-ghost.png', 'server-provided fallback wins over the built-in constant');
  c.ST.rt = { applicationIconFallback: 'http://insecure/x.png' };
  assert.equal(c.m.published(sc).art, STUDIO, 'a non-https fallback is ignored');
});

test('live acknowledged applicationImage is used only for the same paired identity and Scene', () => {
  const c = fixture(); const sc = scene({ id: 's1' });
  c.S.rules = [rule('s1', 'chrome'), rule('s1', 'code2')];
  const live = { active: true, currentSceneId: 's1', selectedApplication: 'Chrome', selectedApplicationExecutable: APPS_BY_ID.chrome.exe.toUpperCase(), applicationImage: 'https://live.test/chrome-ack.png' };
  c.ST.rt = live;
  assert.equal(c.m.published(sc).art, 'https://live.test/chrome-ack.png', 'same exe (case-insensitive) is acknowledged');
  c.ST.rt = { ...live, currentSceneId: 'other' };
  assert.equal(c.m.published(sc).art, 'https://files.test/chrome.png', 'another live Scene is not reused; the paired app preview is shown');
  c.ST.rt = { ...live, desiredSceneId: 'other' };
  assert.equal(c.m.published(sc).art, 'https://files.test/chrome.png', 'a desired-Scene mismatch is not reused');
  c.ST.rt = { ...live, selectedApplicationExecutable: APPS_BY_ID.code2.exe, selectedApplication: 'Code', applicationImage: 'https://live.test/code2-ack.png' };
  assert.equal(c.m.sceneApp(sc).id, 'code2', 'exact executable wins over a shared display name');
  assert.equal(c.m.published(sc).art, 'https://live.test/code2-ack.png');
  c.ST.rt = { ...live, applicationImage: 'http://insecure/x.png' };
  assert.equal(c.m.published(sc).art, 'https://files.test/chrome.png', 'insecure live image rejected');
  const draft = scene({ id: 's2' }); c.S.rules = [rule('s2', 'code')];
  c.ST.rt = { ...live, currentSceneId: 's2' };
  assert.equal(c.m.published(draft).art, STUDIO, 'a draft paired to a different app does not borrow the wrong live app icon');
});

test('old servers without selectedApplicationExecutable still match by app name', () => {
  const c = fixture(); const sc = scene();
  c.S.rules = [rule('s1', 'chrome'), rule('s1', 'code2')];
  c.ST.rt = { active: true, currentSceneId: 's1', selectedApplication: 'Code', applicationImage: 'https://live.test/ack.png' };
  assert.equal(c.m.sceneApp(sc).id, 'code2');
  assert.equal(c.m.published(sc).art, 'https://live.test/ack.png');
});

test('small image: automatic and app-icon are app logo then Vibe Studio; an explicit small image is unchanged', () => {
  const c = fixture();
  assert.equal(c.m.published(scene()).small, STUDIO, 'no app');
  c.S.rules = [rule('s1', 'code')];
  assert.equal(c.m.published(scene()).small, STUDIO, 'app without a public icon');
  c.S.rules = [rule('s1', 'chrome')];
  assert.equal(c.m.published(scene()).small, 'https://files.test/chrome.png', 'empty');
  assert.equal(c.m.published(scene({ smallSource: 'app-icon' })).small, 'https://files.test/chrome.png', 'app-icon source');
  c.ST.rt = { active: true, currentSceneId: 's1', selectedApplicationExecutable: APPS_BY_ID.chrome.exe, applicationBadge: 'https://live.test/badge.png' };
  assert.equal(c.m.published(scene()).small, 'https://live.test/badge.png', 'live badge for the same app and Scene');
  c.ST.rt = { active: false, currentSceneId: 's1', selectedApplicationExecutable: APPS_BY_ID.chrome.exe, applicationBadge: 'https://live.test/badge.png', applicationImage: 'https://live.test/main.png' };
  assert.equal(c.m.published(scene()).small, 'https://files.test/chrome.png', 'inactive status is not reused');
  assert.equal(c.m.published(scene()).art, 'https://files.test/chrome.png', 'inactive status is not reused for the main image either');
  const explicit = c.m.published(scene({ small: 'https://x.test/s.png', smallUrl: 'https://x.test/link' }));
  assert.equal(explicit.small, 'https://x.test/s.png'); assert.equal(explicit.smallUrl, 'https://x.test/link');
});

const draftOf = (c, sc) => { c.S.drawer = { id: sc.id, sc, get rules() { return c.S.rules; } }; return sc; };

test('custom marker round-trips through sceneToUi/sceneToRaw; absent/empty/app-icon never resurrect a stored legacy image', () => {
  const c = fixture(); c.S.rules = [rule('s1', 'chrome')];
  const base = { id: 's1', sceneName: 'A', activityName: 'V', details: 'd', state: 's', unknownField: { keep: 1 } };
  const custom = c.m.sceneToUi({ ...base, largeImage: 'builtin:hinata-poster', largeImageSource: 'custom', largeImageUrl: 'https://link.test/x' });
  assert.equal(custom.artSource, 'custom');
  const raw = c.m.sceneToRaw(custom);
  assert.equal(raw.largeImageSource, 'custom'); assert.equal(raw.largeImage, 'builtin:hinata-poster'); assert.equal(raw.largeImageUrl, 'https://link.test/x');
  assert.deepEqual(raw.unknownField, { keep: 1 }, 'unknown fields round-trip');
  for (const largeImageSource of [undefined, '', 'app-icon']) {
    const legacy = c.m.sceneToUi({ ...base, largeImage: 'https://cdn.discordapp.com/avatars/legacy.png', largeImageSource });
    assert.equal(c.m.mainIcon(legacy).custom, false, `source ${JSON.stringify(largeImageSource)} is the default`);
    assert.equal(c.m.published(legacy).art, 'https://files.test/chrome.png', 'stored legacy avatar is not resurrected');
    assert.equal(c.m.sceneToRaw(legacy).largeImage, 'https://cdn.discordapp.com/avatars/legacy.png', 'stored value is preserved on disk');
    assert.notEqual(c.m.sceneToRaw(legacy).largeImageSource, 'custom');
  }
  const noArt = c.m.sceneToUi({ ...base, largeImage: '', largeImageSource: 'custom' });
  assert.equal(c.m.mainIcon(noArt).custom, false, 'a custom marker without art is the default');
  assert.notEqual(c.m.sceneToRaw(noArt).largeImageSource, 'custom');
});

test('custom preview uses the saved/draft art and link and never the live app logo; painting does not mutate', () => {
  const c = fixture(); c.S.rules = [rule('s1', 'chrome')];
  const sc = scene({ art: 'builtin:hinata-poster', artSource: 'custom', artUrl: 'https://link.test/x' }); const before = JSON.stringify(sc);
  c.ST.rt = { active: true, currentSceneId: 's1', selectedApplicationExecutable: APPS_BY_ID.chrome.exe, applicationImage: 'https://live.test/ack.png' };
  const out = c.m.published(sc);
  assert.equal(out.art, 'builtin:hinata-poster'); assert.equal(out.artUrl, 'https://link.test/x');
  assert.equal(JSON.stringify(sc), before);
});

test('default draft switched from a saved custom Scene previews the app now, not the stale live custom image', () => {
  const c = fixture(); c.S.rules = [rule('s1', 'chrome')];
  c.ST.rt = { active: true, currentSceneId: 's1', selectedApplicationExecutable: APPS_BY_ID.chrome.exe, applicationImage: 'https://live.test/custom-projection.png' };
  const saved = c.m.sceneToUi({ id: 's1', sceneName: 'A', largeImage: 'https://old.test/a.gif', largeImageSource: 'custom' });
  assert.equal(c.m.published(saved).art, 'https://old.test/a.gif');
  draftOf(c, saved); c.S.ov = { kind: 'img', p: 'lg', tab: 'builtin' };
  c.m.pickImg('appsrc:');
  assert.equal(c.m.published(saved).art, 'https://files.test/chrome.png', 'draft default ignores the live custom projection');
  const savedAuto = c.m.sceneToUi({ id: 's1', sceneName: 'A', largeImage: '' });
  assert.equal(c.m.published(savedAuto).art, 'https://live.test/custom-projection.png', 'a saved default Scene still uses its live acknowledgement');
});

for (const lang of ['en', 'th']) {
  test(`${lang}: Large image well shows the truthful source and only a custom image has Remove and a click link`, () => {
    const c = fixture(lang); const sc = draftOf(c, scene({ art: 'builtin:hinata-poster', artUrl: 'https://link.test/x' }));
    let well = c.m.wellHtml('lg', sc, 'Image', 'large');
    assert.match(well, lang === 'en' ? /Vibe Studio icon/ : /ไอคอน Vibe Studio/); assert.ok(!/imgclear/.test(well));
    assert.ok(!well.includes('hinata-poster'), 'stored but unselected art is not shown');
    c.S.rules = [rule('s1', 'chrome')];
    assert.match(c.m.wellHtml('lg', sc, 'Image', 'large'), lang === 'en' ? /Follows Chrome/ : /ตามแอป Chrome/);
    const sec = () => c.m.imageSection('lg', sc, 'Large image', 'hint', 'large', 'largeText', 'largeUrl', 'art', 'artText', 'artUrl', 'large');
    assert.match(sec(), /data-f="artText"/); assert.ok(!/data-f="artUrl"/.test(sec()), 'default: no click link');
    sc.artSource = 'custom';
    well = c.m.wellHtml('lg', sc, 'Image', 'large');
    assert.match(well, lang === 'en' ? /Built-in art/ : /ภาพในตัว/); assert.ok(well.includes('hinata-poster'));
    assert.match(well, /data-act="openimg" data-arg="lg"/); assert.match(well, /data-act="imgclear" data-arg="lg"/);
    assert.match(sec(), /data-f="artUrl"/, 'custom: click link');
  });
}

test('Change opens the selection home for both images; every tab has Back; the large App tab keeps Upload/Retry and Use app icon', () => {
  const c = fixture(); draftOf(c, scene({ art: 'builtin:hinata-poster' })); c.S.rules = [rule('s1', 'chrome'), rule('s1', 'code')];
  for (const p of ['lg', 'sm']) {
    c.m.openImg(p, null);
    assert.equal(c.S.ov.tab, 'builtin', p + ' opens on the type home');
    assert.ok(!/ovback/.test(c.m.imgInner()));
    const home = c.m.imgTab();
    for (const t of ['link', 'gif', 'app']) assert.match(home, new RegExp(`data-act="ovtab" data-arg="${t}"`), `${p} home offers ${t}`);
    assert.match(home, /data-arg="art:hinata-poster"/); assert.match(home, /data-arg="avatar:"/); assert.match(home, /data-arg="recent:0"/);
    assert.equal(/data-arg="none:"/.test(home), p === 'sm');
    for (const tab of ['app', 'gif', 'link']) { c.S.ov.tab = tab; assert.match(c.m.imgInner(), /data-act="ovback"/, `${p}/${tab} has Back`); c.m.imgTab(); }
  }
  c.S.ov = { kind: 'img', p: 'lg', tab: 'app' };
  const tab = c.m.imgTab();
  assert.match(tab, /data-act="uploadicon" data-arg="code"/); assert.match(tab, /data-arg="appsrc:"/);
  assert.match(tab, /Keep app icon/);
});

test('choosing built-in/GIF/link/avatar/recent only edits the draft as custom; App icon returns to the default and keeps stored art', () => {
  const c = fixture(); c.S.rules = [rule('s1', 'chrome')];
  const sc = draftOf(c, scene({ art: 'https://legacy.test/old.png', artUrl: 'https://link.test/x' }));
  const pick = (a, extra = {}) => { c.S.ov = { kind: 'img', p: 'lg', tab: 'builtin', gifRes: [], ...extra }; c.m.pickImg(a); };
  pick('art:hinata-poster'); assert.equal(sc.art, 'builtin:hinata-poster'); assert.equal(sc.artSource, 'custom');
  assert.equal(c.m.published(sc).art, 'builtin:hinata-poster');
  pick('lgif:g1', { gifRes: [{ id: 'g1', originalUrl: 'https://media.giphy.com/g.gif' }] }); assert.equal(sc.art, 'https://media.giphy.com/g.gif'); assert.equal(sc.artSource, 'custom');
  pick('avatar:'); assert.equal(sc.art, 'https://cdn.test/av.png'); assert.equal(sc.artSource, 'custom');
  pick('recent:0'); assert.equal(sc.art, 'https://r.test/1.png');
  c.S.ov = { kind: 'img', p: 'lg', tab: 'link', link: 'https://link.test/pic.png' }; c.m.applyImage('lg', 'https://link.test/pic.png', 'link');
  const raw = c.m.sceneToRaw(sc);
  assert.equal(raw.largeImageSource, 'custom'); assert.equal(raw.largeImage, 'https://link.test/pic.png'); assert.equal(raw.largeImageUrl, 'https://link.test/x');
  const closedBefore = c.closed || 0;
  pick('appsrc:');
  assert.equal(c.closed, closedBefore + 1, 'closes only the chooser'); assert.ok(c.S.drawer, 'drawer stays open');
  assert.equal(sc.artSource, 'app-icon'); assert.equal(sc.artUrl, '', 'ignored click link cleared');
  assert.equal(sc.art, 'https://link.test/pic.png', 'stored art preserved until Done');
  assert.equal(c.m.published(sc).art, 'https://files.test/chrome.png');
  assert.equal(c.m.sceneToRaw(sc).largeImageSource, 'app-icon');
  c.S.rules = []; assert.equal(c.m.published(sc).art, STUDIO, 'no app: Vibe fallback');
});

test('Remove on a custom Large image goes back to the app default without wiping the stored art; small image unchanged', () => {
  const c = fixture(); c.S.rules = [rule('s1', 'chrome')];
  const sc = draftOf(c, scene({ art: 'builtin:hinata-poster', artSource: 'custom', artUrl: 'https://link.test/x', small: 'https://s.test/s.png' }));
  c.m.applyImage('lg', '', 'app-icon');
  assert.equal(sc.artSource, 'app-icon'); assert.equal(sc.art, 'builtin:hinata-poster'); assert.equal(sc.artUrl, '');
  assert.equal(c.m.published(sc).art, 'https://files.test/chrome.png');
  c.m.applyImage('sm', '');
  assert.equal(sc.small, ''); assert.equal(sc.art, 'builtin:hinata-poster');
});
