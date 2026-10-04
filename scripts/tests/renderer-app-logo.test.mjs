import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// The main Discord image always follows the selected paired app's logo, else the Vibe Studio ghost.
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
    S: { rules: [], drawer: null, scenes: [], ov: null, lang }, ST: { rt: null, ready: true, icon: { ok: true, consent: true }, iconBusy: false }, DCID: { name: 'Mint' }, APPS: [],
    T: (en, th) => (lang === 'th' ? th : en), esc: s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    appBy: id => APPS_BY_ID[id] || { id, name: id }, isHttps: v => /^https:\/\//i.test(v || ''), appKey: p => String(p || '').trim().replaceAll('/', BS).toLowerCase(),
    artSrc: v => v, helpBtn: () => '', icoOf: () => '', iconDot: () => '', I: { up: '', x: '', plus: '' }, ARTMAP: {}, hostOf: v => v, layer2: () => null, $: () => null,
    sceneBy: id => ctx.S.scenes.find(s => s.id === id), mkScene: o => ({ btns: [], ...o }),
    known: () => Object.values(APPS_BY_ID), sceneApps: id => ctx.S.rules.filter(r => r.scene === id).map(r => APPS_BY_ID[r.app]),
    closeOverlay() {}, secHead: (h, hint) => `<h3>${h}</h3>${hint || ''}`, fld: (id, label, key, field) => `<input id="${id}" data-f="${field}">`,
  };
  vm.createContext(ctx);
  vm.runInContext([
    slice('const RR = ', 'const appBy'), slice('function sceneApp(sc)', 'const loading = '), slice('function sceneToUi(', 'function sceneProblem('),
    slice('/* ---------- app icon hosting', 'function applyApps('), 'const FIELD = { lg: "art", sm: "small" }; const SRC = { lg: "artSource", sm: "smallSource" };',
    slice('function srcLabel(', 'function applyImage('), slice('function imageSection(', 'function chipHtml('),
    slice('function imgTab()', '\nfunction renderOv'), slice('function imgInner()', 'const recentImgs'),
    slice('function pickImg(', '\n}') + '\n}',
    'this.m = { published, mainIcon, sceneApp, sceneToUi, sceneToRaw, wellHtml, imageSection, imgTab, imgInner, pickImg };',
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

test('a saved custom large image is ignored for the preview and never mutated', () => {
  const c = fixture(); c.S.rules = [rule('s1', 'chrome')];
  const sc = scene({ art: 'builtin:hinata-poster', artSource: 'app-icon', artUrl: 'https://link.test/x' });
  c.S.scenes = [sc]; const before = JSON.stringify(sc);
  const out = c.m.published(sc);
  assert.equal(out.art, 'https://files.test/chrome.png');
  assert.equal(out.artUrl, '', 'the ignored click link is not previewed');
  assert.equal(JSON.stringify(sc), before, 'painting does not touch the Scene');
  const raw = c.m.sceneToRaw(sc);
  assert.equal(raw.largeImage, 'builtin:hinata-poster', 'stored art is preserved for saving');
  assert.equal(raw.largeImageSource, 'app-icon');
  const withRaw = c.m.sceneToUi({ id: 's1', sceneName: 'A', activityName: 'V', details: 'd', state: 's', largeImage: 'https://old.test/a.gif' });
  const rawBefore = JSON.stringify(withRaw._raw);
  c.m.published(withRaw);
  assert.equal(JSON.stringify(withRaw._raw), rawBefore, '_raw is untouched');
  assert.equal(withRaw.art, 'https://old.test/a.gif', 'stored art is untouched');
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

for (const lang of ['en', 'th']) {
  test(`${lang}: the Large image editor is honest: app-following identity, no chooser, no ignored link`, () => {
    const c = fixture(lang); const sc = scene({ art: 'builtin:hinata-poster', artUrl: 'https://link.test/x' });
    c.S.drawer = { id: 's1', sc, get rules() { return c.S.rules; } };
    let well = c.m.wellHtml('lg', sc, 'Image', 'large');
    assert.match(well, lang === 'en' ? /Vibe Studio icon/ : /ไอคอน Vibe Studio/, 'no app: names the Vibe Studio fallback');
    assert.ok(well.includes(STUDIO), 'shows the fallback logo');
    assert.ok(!well.includes('hinata-poster'), 'stored art is not shown');
    assert.ok(!/imgclear|vs-icon-btn-danger/.test(well), 'no remove button for the main image');
    c.S.rules = [rule('s1', 'chrome')];
    well = c.m.wellHtml('lg', sc, 'Image', 'large');
    assert.match(well, lang === 'en' ? /Follows Chrome/ : /ตามแอป Chrome/);
    assert.match(well, lang === 'en' ? /Apps first, Vibe fallback/ : /แอปก่อน Vibe สำรอง/);
    assert.ok(well.includes('https://files.test/chrome.png'));
    assert.match(well, /data-act="openimg" data-arg="lg"/, 'Change opens the App icon chooser');
    c.S.rules = [rule('s1', 'code')];
    assert.match(c.m.wellHtml('lg', sc, 'Image', 'large'), lang === 'en' ? /No public icon yet/ : /ยังไม่มีไอคอนสาธารณะ/);
    const section = c.m.imageSection('lg', sc, 'Large image', 'hint', 'large', 'largeText', 'largeUrl', 'art', 'artText', 'artUrl', 'large');
    assert.match(section, /data-f="artText"/, 'hover text stays');
    assert.ok(!/data-f="artUrl"/.test(section), 'no click-link input for the main image');
    const small = c.m.imageSection('sm', scene(), 'Small', 'hint', 'small', 'smallText', 'smallUrl', 'small', 'smallText', 'smallUrl', 'small');
    assert.match(small, /data-f="smallUrl"/, 'small image keeps its click link');
    assert.ok(c.m.wellHtml('sm', scene(), 'Image', 'small').includes('data-act="openimg" data-arg="sm"'), 'small image keeps its custom chooser');
  });
}

test('the Large image chooser is app-only: Upload/Retry stay, no Use / built-in / GIF / link choices, nothing is applied', () => {
  const c = fixture(); const sc = scene({ art: 'builtin:hinata-poster' });
  c.S.drawer = { id: 's1', sc, get rules() { return c.S.rules; } }; c.S.rules = [rule('s1', 'chrome'), rule('s1', 'code')];
  c.S.ov = { kind: 'img', p: 'lg', tab: 'app' };
  const tab = c.m.imgTab();
  assert.match(tab, /data-act="uploadicon" data-arg="code"/, 'Retry upload stays reachable for the failed app');
  assert.ok(!/data-act="pickimg"/.test(tab), 'no pick actions');
  assert.ok(!/ovtab|appsrc/.test(tab), 'no other source tabs, no source switch');
  assert.ok(!/ovback/.test(c.m.imgInner()), 'the app chooser is the home of the Large image picker');
  c.m.pickImg('art:poster');
  assert.equal(sc.art, 'builtin:hinata-poster'); assert.equal(sc.artSource, '');
  c.S.ov = { kind: 'img', p: 'sm', tab: 'app' };
  assert.match(c.m.imgTab(), /data-arg="appsrc:"/, 'the small image still offers its app-icon choice');
});
