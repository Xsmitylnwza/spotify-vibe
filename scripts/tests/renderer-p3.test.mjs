import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Runs slices of the renderer (text variables, app-icon consent, first-paint head script) against fakes.
const html = readFileSync(new URL('../discord-presence-studio.html', import.meta.url), 'utf8');
const slice = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); assert.ok(a > 0 && b > a, 'block present: ' + from); return html.slice(a, b); };
const tick = () => new Promise(resolve => setImmediate(resolve));

function variablesFixture(lang = 'en') {
  const ctx = {
    S: { rules: [], lang }, ST: { rt: null }, DCID: { name: '' }, T: (en, th) => (lang === 'th' ? th : en), pinnedSceneId: () => '',
    appBy: id => ({ id, name: { chrome: 'Google Chrome', code: 'VS Code' }[id] || id }),
  };
  vm.createContext(ctx);
  vm.runInContext(slice('/* ---------- text variables', '/* ---------- end text variables') + '\nthis.m = { varValues, resolveVars, hasVars };', ctx);
  return ctx;
}

test('variables: {app} is the first paired app, else the Scene name; {user} is the Discord name; never a raw token', () => {
  const c = variablesFixture();
  const sc = { id: 's1', name: 'Deep work' };
  assert.equal(c.m.resolveVars('{app} · {scene} · {user}', c.m.varValues(sc)), 'Deep work · Deep work ·', 'no app, no Discord name yet: {user} is empty like on the server');
  c.S.rules = [{ scene: 's2', app: 'code' }, { scene: 's1', app: 'chrome' }, { scene: 's1', app: 'code' }];
  c.DCID.name = 'Mint';
  assert.equal(c.m.resolveVars('Using {app} as {user} on {scene}', c.m.varValues(sc)), 'Using Google Chrome as Mint on Deep work');
  assert.equal(c.m.resolveVars('{app} {app}', c.m.varValues(sc)), 'Google Chrome Google Chrome', 'every occurrence');
});

test('variables: a live Scene uses the runtime values; unknown tokens stay literal', () => {
  const c = variablesFixture('th');
  c.S.rules = [{ scene: 's1', app: 'chrome' }];
  c.ST.rt = { currentSceneId: 's1', variables: { app: 'Claude', scene: 'Coding', user: 'Mint' } };
  const sc = { id: 's1', name: 'Draft name' };
  assert.equal(c.m.resolveVars('{app}/{scene}/{user}/{foo}/{App}', c.m.varValues(sc)), 'Claude/Coding/Mint/{foo}/{App}');
  c.ST.rt = { currentSceneId: 'other', variables: { app: 'Other' } };
  assert.equal(c.m.resolveVars('{app}', c.m.varValues(sc)), 'Google Chrome', 'another live Scene does not leak in');
  assert.equal(c.m.resolveVars('{scene}', c.m.varValues({ id: 's9', name: '' })), 'Scene ไม่มีชื่อ');
  assert.equal(c.m.hasVars('x {user}'), true);
  assert.equal(c.m.hasVars('x {foo}'), false);
});

function iconFixture(lang = 'en') {
  const calls = { api: [], toasts: [], loadApps: 0, renders: 0 };
  const ctx = {
    T: (en, th) => (lang === 'th' ? th : en), I: { up: '' }, S: { ov: null }, ST: { icon: { consent: null, ok: true }, iconBusy: false }, known: () => [], $: () => null, layer2: () => null,
    render() { calls.renders++; }, toast: m => calls.toasts.push(m), errText: e => String(e.message || e), renderOv() {}, isHttps: v => /^https:/.test(v || ''),
    loadApps: async () => { calls.loadApps++; }, api: async (path, opt) => { calls.api.push([path, opt && opt.method, opt && opt.body]); if (ctx.fail) throw new Error('nope'); return { consent: opt && opt.body ? opt.body.consent : null }; },
  };
  vm.createContext(ctx);
  vm.runInContext(slice('/* ---------- app icon hosting', 'function applyApps(') + '\nthis.m = { iconState, iconLabel, iconConsentNeeded, consentCard, iconHostRow, setIconConsent, loadIconHosting, iconFields };', ctx);
  return { ctx, calls };
}

for (const lang of ['en', 'th']) {
  test(`${lang}: each icon status has its own label and an absent status degrades to publicIcon`, () => {
    const { ctx } = iconFixture(lang);
    const want = { ready: lang === 'en' ? /Shows on Discord/ : /แสดงบน Discord ได้/, uploading: lang === 'en' ? /Uploading/ : /กำลังอัปโหลด/, 'needs-consent': lang === 'en' ? /permission/ : /ต้องอนุญาต/, failed: lang === 'en' ? /failed/ : /อัปโหลดไม่สำเร็จ/ };
    for (const [st, re] of Object.entries(want)) assert.match(ctx.m.iconLabel(ctx.m.iconState({ iconStatus: st })), re);
    assert.equal(ctx.m.iconState({ publicIcon: 'https://x/y.png' }), 'ready');
    assert.equal(ctx.m.iconState({ publicIcon: '' }), '');
    assert.equal(ctx.m.iconState({ iconStatus: 'bogus', publicIcon: '' }), '');
    assert.equal(ctx.m.iconFields({ iconStatus: 'bogus', iconSource: 'pack' }).iconStatus, '', 'unknown status is dropped');
  });

  test(`${lang}: the consent card names catbox.moe and appears only while a paired app needs consent`, () => {
    const { ctx } = iconFixture(lang);
    const need = [{ iconStatus: 'needs-consent' }], ok = [{ iconStatus: 'ready' }];
    assert.equal(ctx.m.iconConsentNeeded(need), true);
    assert.equal(ctx.m.iconConsentNeeded(ok), false);
    ctx.ST.icon.consent = true;
    assert.equal(ctx.m.iconConsentNeeded(need), false, 'already allowed');
    ctx.ST.icon = { consent: null, ok: false };
    assert.equal(ctx.m.iconConsentNeeded(need), false, 'server without the endpoint: nothing to ask');
    assert.equal(ctx.m.iconHostRow(), '');
    const card = ctx.m.consentCard();
    assert.match(card, /catbox\.moe/);
    assert.match(card, /data-arg="yes"/);
    assert.match(card, /data-arg="no"/);
    if (lang === 'th') assert.match(card, /อัปโหลดเฉพาะไอคอนของแอปที่จับคู่ ไม่มีข้อมูลอื่น/);
  });
}

test('consent: Allow PUTs {consent:true, provider:catbox}, then re-reads the app list', async () => {
  const { ctx, calls } = iconFixture();
  await ctx.m.setIconConsent(true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.api[0])), ['/api/icon-hosting', 'PUT', { consent: true, provider: 'catbox' }]);
  assert.equal(ctx.ST.icon.consent, true);
  assert.equal(calls.loadApps, 1, 'status flips to uploading/ready after the refresh');
  assert.match(ctx.m.iconHostRow(), /id="iconhost"[^>]*checked/);
  await ctx.m.setIconConsent(false);
  assert.equal(ctx.ST.icon.consent, false);
  assert.doesNotMatch(ctx.m.iconHostRow(), /id="iconhost"[^>]*checked/);
});

test('consent: a failed PUT is reported and does not claim consent', async () => {
  const { ctx, calls } = iconFixture();
  ctx.fail = true;
  await ctx.m.setIconConsent(true);
  assert.equal(ctx.ST.icon.consent, null);
  assert.equal(calls.toasts.length, 1);
  assert.equal(ctx.ST.iconBusy, false, 'controls are usable again');
});

test('consent: loadIconHosting reads GET state and hides the controls when the server lacks it', async () => {
  const { ctx } = iconFixture();
  ctx.api = async () => ({ consent: false });
  await ctx.m.loadIconHosting();
  assert.deepEqual({ ...ctx.ST.icon }, { ok: true, consent: false });
  ctx.api = async () => { throw new Error('404'); };
  await ctx.m.loadIconHosting();
  assert.equal(ctx.ST.icon.ok, false);
});

test('first paint: the head script applies the saved theme (or OS preference) before any CSS or body', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  const script = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  assert.ok(script.includes('vibe.theme'), 'uses the Settings storage key');
  assert.ok(head.indexOf('<script>') < head.indexOf('studio-ci.css'), 'runs before the stylesheet');
  const run = (stored, osDark, lang) => {
    const root = { dataset: {}, lang: 'th' };
    const ctx = { document: { documentElement: root }, localStorage: { getItem: k => (k === 'vibe.theme' ? stored : k === 'vibe.lang' ? lang : null) }, window: { matchMedia: () => ({ matches: osDark }) } };
    vm.createContext(ctx); vm.runInContext(script, ctx); return root;
  };
  assert.equal(run('dark', false).dataset.theme, 'dark');
  assert.equal(run('light', true).dataset.theme, 'light');
  assert.equal(run(null, true).dataset.theme, 'dark');
  assert.equal(run('junk', false).dataset.theme, 'light');
  assert.equal(run('dark', false, 'en').lang, 'en');
  const throwing = { document: { documentElement: { dataset: {} } }, localStorage: { getItem() { throw new Error('blocked'); } }, window: {} };
  vm.createContext(throwing); assert.doesNotThrow(() => vm.runInContext(script, throwing));
  assert.match(head, /html\{background:#FAF8F5/, 'html background is painted before the stylesheet arrives');
  assert.match(head, /html\[data-theme="dark"\]\{background:#1e1f22/);
});

test('first paint: static skeleton markup exists in #root and is replaced when the app renders', () => {
  const root = html.slice(html.indexOf('<div id="root">'), html.indexOf('<div id="layer">'));
  assert.match(root, /class="vs-boot"/);
  assert.match(root, /vs-sidebar/);
  assert.match(root, /mk-sk/);
  const mount = slice('function mount(root, html)', '\n}') + '\n}';
  const fakeRoot = { innerHTML: '<div class="vs-boot"></div>', querySelector: sel => (sel === '.vs-app' || sel === '.vs-boot' ? {} : null) };
  const ctx = { morph() { throw new Error('must not morph the boot skeleton'); }, document: { createElement() { throw new Error('no template'); } } };
  vm.createContext(ctx); vm.runInContext(mount + '\nthis.mount = mount;', ctx);
  ctx.mount(fakeRoot, '<div class="vs-app">real</div>');
  assert.equal(fakeRoot.innerHTML, '<div class="vs-app">real</div>');
});

test('theme: syncShellTheme pushes the theme to the desktop shell and is a no-op without the API', () => {
  const code = slice('const syncShellTheme', '\nconst T = ');
  const run = window => { const ctx = { S: { theme: 'dark' }, window }; vm.createContext(ctx); vm.runInContext(code + '\nsyncShellTheme();', ctx); };
  const seen = [];
  run({ vibeStudio: { setTheme: t => seen.push(t) } });
  assert.deepEqual(seen, ['dark']);
  assert.doesNotThrow(() => run({}));
  assert.doesNotThrow(() => run({ vibeStudio: {} }));
  assert.doesNotThrow(() => run({ vibeStudio: { setTheme() { throw new Error('ipc'); } } }));
  assert.match(html, /theme: a => \{.*syncShellTheme\(\); \}/, 'wired to the Settings/theme toggle');
  assert.match(html, /initDesktop\(\); syncShellTheme\(\)/, 'called on load');
});

function sourceFixture() {
  const ctx = {
    S: { rules: [{ id: 'm1', scene: 's1', app: 'claude' }], pinApp: '', drawer: { id: 's1', dirty: false }, scenes: [], save: '' }, ST: { rt: null, ready: true }, DCID: { name: 'Mint' },
    T: (en) => en, APPS: [], appBy: id => ({ id, name: 'Claude', publicIcon: 'https://files.catbox.moe/claude.png' }), pinnedSceneId: () => '', buildDrawer() {}, scheduleSave() {},
    sceneBy: id => ctx.S.scenes.find(s => s.id === id), mkScene: o => ({ btns: [], ...o }),
  };
  ctx.FIELD = { lg: 'art', sm: 'small' };
  vm.createContext(ctx);
  vm.runInContext([slice('function sceneApp(sc)', 'const loading = '), 'const SRC = { lg: \'artSource\', sm: \'smallSource\' };', slice('function applyImage(', '\n}') + '\n}', slice('function sceneToUi(', 'function sceneProblem(')].join('\n') +
    '\nthis.m = { published, applyImage, sceneToUi, sceneToRaw };', ctx);
  return ctx;
}

test('app-icon source: saved as smallImageSource, round-trips, and the preview shows the paired app icon', () => {
  const c = sourceFixture();
  const sc = c.m.sceneToUi({ id: 's1', sceneName: 'A', activityName: 'Vibe', details: 'dd', state: 'ss', smallImageSource: 'app-icon' });
  assert.equal(sc.smallSource, 'app-icon');
  assert.equal(c.m.sceneToRaw(sc).smallImageSource, 'app-icon');
  assert.equal(JSON.stringify(c.m.sceneToRaw(sc)).includes('largeImageSource'), false, 'nothing is sent for an unset source');
  assert.equal(c.m.published(sc).small, 'https://files.catbox.moe/claude.png', 'preview uses the paired app icon');
  c.ST.rt = { currentSceneId: 's1', selectionSource: 'app', applicationBadge: 'https://files.catbox.moe/live.png' };
  assert.equal(c.m.published(sc).small, 'https://files.catbox.moe/live.png', 'live scene uses what the server delivers');
  c.ST.rt = { currentSceneId: 's1', selectionSource: 'override' };
  assert.equal(c.m.published(sc).small, '', 'a manual pin has no app, so the server sends no app icon');
});

test('app-icon source: picking another image clears it; explicit images are kept', () => {
  const c = sourceFixture();
  const sc = c.m.sceneToUi({ id: 's1', sceneName: 'A', activityName: 'Vibe', details: 'dd', state: 'ss', smallImage: 'https://x.test/a.png' });
  c.S.scenes = [sc];
  assert.equal(c.m.sceneToRaw(sc).smallImageSource, undefined);
  c.m.applyImage('sm', '', 'app-icon');
  assert.equal(sc.smallSource, 'app-icon');
  assert.equal(sc.small, '');
  assert.equal(c.m.sceneToRaw(sc).smallImageSource, 'app-icon');
  c.m.applyImage('sm', 'https://x.test/b.gif');
  assert.equal(sc.smallSource, '', 'a different image replaces the app-icon choice');
  assert.equal(c.m.sceneToRaw(sc).smallImage, 'https://x.test/b.gif');
  assert.equal(c.m.sceneToRaw(sc).smallImageSource, undefined);
  c.m.applyImage('lg', '', 'app-icon');
  assert.equal(c.m.sceneToRaw(sc).largeImageSource, 'app-icon');
  assert.equal(c.m.sceneToRaw(sc).smallImage, 'https://x.test/b.gif', 'the other slot is untouched');
});

test('app-icon source: the "keep app icon" action saves the source, not an empty image', () => {
  assert.match(html, /data-arg="appsrc:" data-k="useapp"/);
  assert.match(html, /kind === 'appsrc'\) applyImage\(p, '', 'app-icon'\)/);
});

test('preview parity with the server: the activity name keeps the template, empty required lines fall back, empty small image shows the app icon', () => {
  const c = sourceFixture();
  const sc = c.m.sceneToUi({ id: 's1', sceneName: 'Coding', activityName: 'Morning Vibe', details: '{user}', state: 'ss', smallImage: '' });
  c.DCID.name = '';
  const out = c.m.published(sc);
  assert.equal(out.actName, 'Morning Vibe', 'no silent rename to the app name');
  assert.equal(out.l1, 'Coding', 'a required line that resolves empty falls back to the Scene name');
  assert.equal(out.small, 'https://files.catbox.moe/claude.png', 'empty small image = the app icon default');
  const explicit = c.m.sceneToUi({ id: 's1', sceneName: 'Coding', activityName: '{app}', details: 'd', state: 's', smallImage: 'https://x.test/s.png' });
  assert.equal(c.m.published(explicit).small, 'https://x.test/s.png');
  assert.equal(c.m.published(explicit).actName, 'Claude');
});
