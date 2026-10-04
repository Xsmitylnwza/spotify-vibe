import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Runs the renderer's real Scene-editor draft code (open / edit / Done / discard / conflict) inside a VM against a
// recording fake API. Nothing here asserts on source text: every check observes behaviour or the request that left.
const html = readFileSync(new URL('../discord-presence-studio.html', import.meta.url), 'utf8');
const slice = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + from.length); assert.ok(a > 0 && b > a, 'block present: ' + from); return html.slice(a, b); };
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = v => JSON.parse(JSON.stringify(v));

const RAW_SCENE = { id: 's1', sceneName: 'Work', activityType: 'playing', activityName: 'Vibe', details: 'Coding', state: 'Hard at it', largeImage: 'builtin:hinata-poster', buttons: [{ label: 'Docs', url: 'https://a.test/x' }], timerMode: 'none', timerMinutes: 30, ownerNote: 'keep-me' };
const RAW_OTHER = { id: 's2', sceneName: 'Chill', activityType: 'listening', activityName: 'Lo-fi', details: 'Resting', state: 'Slowly', buttons: [], timerMode: 'none', timerMinutes: 30, futureField: { a: 1 } };
const MAP_CODE = { executable: 'C:\\Apps\\code.exe', name: 'Code', sceneId: 's1', enabled: true, mapNote: 'owner' };
const MAP_HIDDEN = { executable: 'C:\\Apps\\old.exe', name: 'Old', sceneId: 's2', enabled: false, hiddenNote: 'hidden-kept' };
const baseConfig = () => ({ scenes: [clone(RAW_SCENE), clone(RAW_OTHER)], appMappings: [clone(MAP_CODE), clone(MAP_HIDDEN)], settings: { selectionMode: 'apps' } });

function fixture({ lang = 'en', config = baseConfig(), route } = {}) {
  const calls = [], handlers = {}, toasts = [], summaries = [], renders = { n: 0 }, builds = { n: 0 };
  const els = {};
  const el = (id, extra = {}) => (els[id] = Object.assign({ focus() {}, textContent: '', dataset: {}, hidden: false, className: '', classList: { remove() {}, add() {} }, setAttribute() {}, offsetWidth: 0 }, extra));
  ['.mk-drawer', '#dpreview', '#dprevnote', '#dpill', '#savebar', '#savetext', '#dretry', '#dreload'].forEach(id => el(id));
  const root = { inert: false };
  const ctx = {
    calls, toasts, summaries, renders, builds, els, root, handlers, scrollY: 0, scrollTo() {}, URL, setTimeout: fn => { queueMicrotask(fn); return 0; }, clearTimeout() {},
    T: (en, th) => (lang === 'th' ? th : en), esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    S: { lang, scenes: [], rules: [], hidden: [], drawer: null, ov: null, picker: null, screen: 'scenes', varOpen: '', fresh: null, lastFocus: null },
    ST: { ready: true, config: null, rt: null }, DCID: { name: '', handle: '', id: '', avatarUrl: '' }, SAVE: { running: false, dirtyScenes: false, dirtyRules: false, again: false },
    $: sel => (sel === '#root' ? root : els[sel] || null), layer: () => ({ querySelectorAll: () => [] }), reduced: () => true, hideTip() {}, highlight() {}, morphInto() {}, leaveLayer() {}, restoreFocus() {},
    document: { body: {inert:false}, querySelector: () => null, addEventListener(type, fn) { (handlers[type] ||= []).push(fn); } }, window: {},
    idOn: () => false, idAv: () => '', artSrc: v => v, isHttps: v => /^https:\/\//i.test(v || ''), appKey: p => String(p || '').trim().replaceAll('/', '\\').toLowerCase(), expectedOnly: null,
    render() { renders.n++; }, toast(m) { toasts.push(m); }, buildDrawer() { builds.n++; }, openSummary(id) { summaries.push(id); }, closePicker() { ctx.S.picker = null; }, keep() {},
    showOv(kind) { ctx.shown = kind; }, closeOverlay() { ctx.S.ov = null; }, ovFocus() {}, openPicker() {}, rememberFocus() {}, flushSave() {}, scheduleSave() {}, loadApps() {}, settleSave:async()=>{}, renderDel(){},
    api: async (path, opt = {}) => { calls.push({ path, method: opt.method || 'GET', body: opt.body === undefined ? undefined : clone(opt.body) }); return route(path, opt, calls); },
    errText: e => String((e && e.message) || e),
  };
  ctx.route = route;
  route = route || ((path, opt) => { if (path === '/api/config' && opt.method === 'PUT') return { config: { ...clone(opt.body), settings: { selectionMode: 'apps' } }, ...(opt.body.retainUndo ? {undoToken:'fixture-undo'} : {}) }; if (path === '/api/config') return clone(config); return {}; });
  vm.createContext(ctx);
  vm.runInContext([
    slice('const APPS = ', '/* ---------- identity and server state'), slice('const mkScene = ', 'const S = '),
    slice('const known = ', 'const enabledOn'), slice('const btnHref', '/* Discord Desktop replicas'), slice('function dcCard(', '/* ---------- Now'),
    slice('function sceneApp(sc)', 'const loading = '), slice('function sceneToUi(', 'function acceptRuntime('),
    slice('function updateDrawer() {', '/* ---------- Add-app picker'), slice('const pSel = ', 'const pitem'),
    slice('const FIELD = ', 'const hostOf'), slice('const SRC = ', 'function srcLabel'),
    slice('function applyImage(','\n}') + '\n}',
    slice('async function doDelete()', '\nfunction stackItems'),
    slice('let removed', 'function openDrawer('), slice('function openDrawer(', 'const keep ='), slice('const ACT = {', 'const FADE'),
    slice('const FADE', "document.addEventListener('focusin', e => { if (e.target.matches"), slice("document.addEventListener('input'", "document.addEventListener('change'"),
    'this.m = { APPS, ACT, openDrawer, closeDrawer, commitDraft, draftBody, draftState, updateDrawer, dcCard, sceneProblem, applyConfig, published, btnHref, applyImage, touch, newDraft, prepareQuit, notifyEditor, doDelete, undo:()=>undoFn && undoFn() };',
  ].join('\n'), ctx);
  ctx.ST.config = clone(config); ctx.m.applyConfig(ctx.ST.config);
  ctx.click = (act, arg) => { const e = { target: { closest: () => ({ tagName: 'BUTTON', dataset: { act, arg } }) }, preventDefault() {} }; handlers.click.forEach(h => h(e)); };
  ctx.type = (field, value) => handlers.input.forEach(h => h({ target: { dataset: { bind: 'sc', f: field }, value } }));
  ctx.typeBtn = (i, field, value) => handlers.input.forEach(h => h({ target: { dataset: { bind: 'btn', i: String(i), f: field }, value } }));
  return ctx;
}
const puts = c => c.calls.filter(x => x.method === 'PUT');
const savedSnapshot = c => JSON.stringify([c.S.scenes.map(s => s._raw), c.S.rules.map(r => r._raw), c.S.hidden, c.ST.config]);
const pairChrome = c => {
  c.m.APPS.push({ id: 'c:\\apps\\chrome.exe', name: 'Chrome', exe: 'C:\\Apps\\chrome.exe' });
  c.S.picker = { mode: 'pair', scene: 's1', sel: ['c:\\apps\\chrome.exe'], app: 'c:\\apps\\chrome.exe' };
  c.m.ACT.paddgo();
};

for (const lang of ['en', 'th']) {
  test(`${lang}: every kind of edit is a draft — no request, saved library and baseline untouched`, () => {
    const c = fixture({ lang });
    const before = savedSnapshot(c);
    assert.equal(c.m.openDrawer('s1'), true);
    c.type('name', 'Work 2'); c.type('l1', 'Reading'); c.typeBtn(0, 'label', 'Home'); c.typeBtn(0, 'url', 'https://home.test');
    c.click('stype', 'watching');
    c.m.applyImage('lg', 'https://img.test/a.png', 'link'); c.m.applyImage('sm', '', 'app-icon');
    pairChrome(c);
    c.m.ACT.pairrm('m-c:\\apps\\code.exe');
    c.m.ACT.undo();
    assert.equal(c.calls.length, 0, 'not one request while editing');
    assert.equal(savedSnapshot(c), before, 'library, pairings and baseline are exactly as saved');
    assert.equal(c.S.drawer.dirty, true);
    assert.equal(c.S.drawer.sc.type, 'watching');
    assert.equal(c.S.scenes.find(s => s.id === 's1').name, 'Work', 'the library row still shows the saved name');
    assert.equal(c.S.drawer.rules.length, 2, 'draft pairings: code (undo restored) + chrome');
    assert.equal(c.S.rules.length, 1, 'saved pairings unchanged');
  });

  test(`${lang}: a new Scene lives only in the draft until Done`, async () => {
    const c = fixture({ lang });
    c.m.openDrawer('new');
    assert.equal(c.S.drawer.isNew, true);
    c.type('name', 'Fresh'); c.type('actName', 'Vibe'); c.type('l1', 'Hello'); c.type('l2', 'World');
    assert.equal(c.S.scenes.length, 2, 'not added to the library');
    assert.equal(c.calls.length, 0);
    await c.m.commitDraft();
    assert.equal(c.calls.length, 1);
    const body = c.calls[0].body;
    assert.equal(body.scenes.length, 3);
    assert.equal(body.scenes[2].sceneName, 'Fresh');
    assert.deepEqual(body.expectedScenes, baseConfig().scenes, 'baseline = the two saved Scenes');
    assert.equal('appMappings' in body, false, 'pairings untouched: not sent');
    assert.equal(c.S.scenes.length, 3, 'library gains it only after success');
    assert.equal(c.summaries.length, 1);
  });

  test(`${lang}: Done sends ONE atomic request with baseline expectations, keeps unknown fields and hidden mappings, and does not touch presence`, async () => {
    const c = fixture({ lang });
    c.m.openDrawer('s1');
    c.type('l1', 'Reading'); c.click('stype', 'competing'); pairChrome(c);
    c.m.ACT.pairrm('m-c:\\apps\\code.exe');
    await c.m.commitDraft();
    assert.deepEqual(c.calls.map(x => x.method + ' ' + x.path), ['PUT /api/config'], 'exactly one request, no override/presence/app-mappings call');
    const { scenes, appMappings, expectedScenes, expectedAppMappings } = c.calls[0].body;
    assert.deepEqual(expectedScenes, baseConfig().scenes, 'expectations are the raw snapshot taken when the editor opened');
    assert.deepEqual(expectedAppMappings, baseConfig().appMappings);
    assert.equal(scenes[0].details, 'Reading'); assert.equal(scenes[0].activityType, 'competing');
    assert.equal(scenes[0].ownerNote, 'keep-me', 'owner unknown scene field preserved');
    assert.deepEqual(scenes[1], RAW_OTHER, 'other Scenes sent byte-for-byte');
    assert.deepEqual(appMappings.map(m => m.name), ['Chrome', 'Old'], 'code removed, chrome added, hidden mapping kept');
    assert.equal(appMappings[1].hiddenNote, 'hidden-kept');
    assert.equal(appMappings[1].enabled, false);
    assert.equal(c.S.drawer, null, 'editor closed after success');
    assert.deepEqual(c.summaries, ['s1'], 'summary only after success');
    assert.equal(c.S.scenes[0].l1, 'Reading', 'library updated from the response');
  });

  test(`${lang}: pairing edits keep the owner's mapping fields; an unchanged pairing list is not sent`, async () => {
    const c = fixture({ lang });
    c.m.openDrawer('s1'); c.type('l2', 'Another line');
    await c.m.commitDraft();
    assert.equal('appMappings' in c.calls[0].body, false);
    const d = fixture({ lang });
    d.m.openDrawer('s1'); d.m.ACT.pairrm('m-c:\\apps\\code.exe'); d.m.ACT.undo();
    await d.m.commitDraft();
    assert.equal(d.calls[0].body.appMappings[0].mapNote, 'owner', 'undo restored the original mapping with its fields');
  });

  test(`${lang}: a failed Done keeps the editor and draft, shows the error, never retries by itself`, async () => {
    let fail = true;
    const c = fixture({ lang, route: (path, opt) => { if (opt.method === 'PUT') { if (fail) { const e = new Error('Disk full'); e.status = 500; throw e; } return { config: { ...clone(opt.body), settings: {} } }; } return {}; } });
    c.m.openDrawer('s1'); c.type('l1', 'Reading');
    await c.m.commitDraft(); await tick(); await tick();
    assert.equal(c.calls.length, 1, 'no automatic retry');
    assert.ok(c.S.drawer, 'editor still open');
    assert.equal(c.S.drawer.sc.l1, 'Reading', 'draft intact');
    assert.equal(c.S.drawer.busy, false);
    assert.equal(c.S.drawer.err, 'Disk full');
    assert.equal(c.m.draftState(c.S.drawer), 'failed');
    assert.equal(c.summaries.length, 0);
    assert.equal(c.S.scenes[0].l1, 'Coding', 'library not changed');
    fail = false; c.click('retry');
    await tick(); await tick();
    assert.equal(c.calls.length, 2, 'only the explicit Retry writes again');
    assert.equal(c.S.drawer, null);
  });

  test(`${lang}: an invalid or partial draft blocks Done with no request and stays editable`, async () => {
    const cases = [
      ['l1', '', 'Details'], ['l1url', 'http://nope.test', 'https'],
    ];
    for (const [field, value] of cases) {
      const c = fixture({ lang });
      c.m.openDrawer('s1'); c.type(field, value);
      await c.m.commitDraft();
      assert.equal(c.calls.length, 0, `${field}: no request`);
      assert.ok(c.S.drawer && c.S.drawer.doneErr, 'editor open and error shown');
      assert.equal(c.m.draftState(c.S.drawer), 'invalid');
    }
    for (const [label, url] of [['Only label', ''], ['', 'https://only.test'], ['Bad', 'https://'], ['Bad', 'http://x.test'], ['Bad', 'javascript:alert(1)']]) {
      const c = fixture({ lang });
      c.m.openDrawer('s1'); c.typeBtn(0, 'label', label); c.typeBtn(0, 'url', url);
      assert.notEqual(c.m.sceneProblem(c.S.drawer.sc), '', `${label}|${url} is a problem`);
      await c.m.commitDraft();
      assert.equal(c.calls.length, 0);
      assert.ok(c.S.drawer);
    }
  });

  test(`${lang}: Done twice and mid-flight edits/discard are ignored while saving`, async () => {
    let release;
    const c = fixture({ lang, route: (path, opt) => (opt.method === 'PUT' ? new Promise(r => { release = () => r({ config: { ...clone(opt.body), settings: {} } }); }) : {}) });
    c.m.openDrawer('s1'); c.type('l1', 'Reading');
    const first = c.m.commitDraft(); const second = c.m.commitDraft();
    c.click('donedrawer');
    assert.equal(c.calls.length, 1, 'one request for three Done presses');
    assert.equal(c.S.drawer.busy, true);
    c.type('l1', 'Changed mid-flight'); c.typeBtn(0, 'label', 'X'); c.click('stype', 'watching'); c.click('pairrm', 'm-c:\\apps\\code.exe');
    assert.equal(c.S.drawer.sc.l1, 'Reading'); assert.equal(c.S.drawer.rules.length, 1);
    assert.equal(c.m.closeDrawer(), false); c.click('closedrawer'); c.click('screen', 'settings');
    assert.ok(c.S.drawer, 'cannot close or navigate mid-flight'); assert.equal(c.S.ov, null, 'and no discard prompt either'); assert.equal(c.S.screen, 'scenes');
    assert.equal(c.m.draftState(c.S.drawer), 'saving');
    release(); await first; await second;
    assert.equal(c.calls.length, 1); assert.equal(c.S.drawer, null); assert.equal(c.summaries.length, 1);
  });

  test(`${lang}: a stale baseline (409) keeps the draft, blocks Done, and only an explicit discard reloads`, async () => {
    const c = fixture({ lang, route: (path, opt) => { if (opt.method === 'PUT') { const e = new Error('Scenes changed'); e.status = 409; e.code = 'CONFLICT'; throw e; } return { ...baseConfig(), scenes: [{ ...RAW_SCENE, details: 'Edited elsewhere' }, RAW_OTHER] }; } });
    c.m.openDrawer('s1'); c.type('l1', 'Reading');
    await c.m.commitDraft();
    assert.equal(c.S.drawer.conflict, true);
    assert.equal(c.m.draftState(c.S.drawer), 'conflict');
    assert.equal(c.S.drawer.sc.l1, 'Reading', 'draft kept');
    assert.equal(c.S.scenes[0].l1, 'Coding', 'saved library not silently overwritten');
    await c.m.commitDraft(); c.click('donedrawer'); c.click('retry');
    assert.equal(puts(c).length, 1, 'no further write on the stale baseline');
    c.m.updateDrawer();
    assert.equal(c.els['#dreload'].hidden, false, 'reload pathway offered'); assert.equal(c.els['#dretry'].hidden, true);
    c.click('conflictreload');
    assert.equal(c.S.ov.kind, 'discard'); assert.equal(c.S.ov.reload, true); assert.ok(c.S.drawer, 'nothing discarded until confirmed');
    c.click('discardgo'); await tick(); await tick();
    assert.equal(c.S.drawer, null);
    assert.equal(c.S.scenes[0].l1, 'Edited elsewhere', 'reloaded the latest after the explicit discard');
    assert.equal(puts(c).length, 1);
  });

  test(`${lang}: cancel / Escape / backdrop / navigation ask before discarding a dirty draft; a clean close is silent; reopen starts from the saved copy`, () => {
    const c = fixture({ lang });
    c.m.openDrawer('s1');
    c.click('closedrawer');
    assert.equal(c.S.drawer, null); assert.equal(c.S.ov, null, 'clean close: no prompt');
    c.m.openDrawer('s1'); c.type('l1', 'Reading');
    c.click('closedrawer');
    assert.ok(c.S.drawer); assert.equal(c.S.ov.kind, 'discard', 'dirty close asks first');
    c.m.ACT.closeov(); assert.ok(c.S.drawer && c.S.drawer.sc.l1 === 'Reading', 'Keep editing keeps the draft');
    c.click('screen', 'settings');
    assert.equal(c.S.screen, 'scenes', 'navigation waits for the confirmation'); assert.equal(c.S.ov.kind, 'discard');
    c.click('discardgo');
    assert.equal(c.S.drawer, null); assert.equal(c.S.screen, 'settings', 'the navigation continues after discard');
    assert.equal(c.calls.length, 0, 'discarding writes nothing');
    c.m.openDrawer('s1');
    assert.equal(c.S.drawer.sc.l1, 'Coding', 'reopen shows the saved Scene, not the discarded edit');
    assert.equal(c.S.drawer.dirty, false);
  });

  test(`${lang}: a config reload or poll-time applyConfig never overwrites the open draft`, () => {
    const c = fixture({ lang });
    c.m.openDrawer('s1'); c.type('l1', 'Reading'); pairChrome(c);
    const draft = c.S.drawer, sc = draft.sc;
    c.m.applyConfig({ ...baseConfig(), scenes: [{ ...RAW_SCENE, details: 'Server copy' }, RAW_OTHER], appMappings: [] });
    assert.equal(c.S.drawer, draft); assert.equal(c.S.drawer.sc, sc);
    assert.equal(sc.l1, 'Reading'); assert.equal(draft.rules.length, 2);
    assert.equal(c.S.scenes[0].l1, 'Server copy', 'the library itself follows the server');
  });

  test(`${lang}: the editor says unsaved / preview only until Done, and the pill never claims On Discord now for a draft`, () => {
    const c = fixture({ lang });
    c.ST.rt = { active: true, currentSceneId: 's1' };
    c.m.openDrawer('s1'); c.m.updateDrawer();
    const clean = c.els['#savetext'].textContent;
    assert.equal(c.m.draftState(c.S.drawer), 'saved');
    assert.match(c.els['#dpill'].textContent, lang === 'en' ? /On Discord now/ : /กำลังแสดงบน Discord/, 'a clean live Scene is live');
    c.type('l1', 'Reading'); c.m.updateDrawer();
    const dirty = c.els['#savetext'].textContent;
    assert.notEqual(dirty, clean);
    assert.match(dirty, lang === 'en' ? /Unsaved.*not on Discord now/ : /ยังไม่ได้บันทึก.*ไม่ได้แสดงบน Discord/);
    assert.match(c.els['#dpill'].textContent, lang === 'en' ? /Unsaved draft/ : /ฉบับร่าง/);
    assert.doesNotMatch(c.els['#dpill'].textContent, lang === 'en' ? /^On Discord now$/ : /^กำลังแสดงบน Discord$/);
    assert.equal(c.els['#savebar'].dataset.state, 'dirty');
    c.type('l1', ''); c.m.updateDrawer();
    assert.equal(c.els['#savebar'].dataset.state, 'warning');
    assert.match(c.els['#savetext'].textContent, lang === 'en' ? /preview only/ : /ตัวอย่างเท่านั้น/);
  });
}

test('preview buttons: a complete https link is a safe new-tab anchor; partial, invalid or labelless stay inert spans', () => {
  const c = fixture();
  const sc = (url, label = 'Open') => ({ id: 'x', type: 'playing', actName: 'A', l1: 'l1', l2: 'l2', art: '', small: '', btns: [{ label, url }, { label: '', url: '' }] });
  const ok = c.m.dcCard(sc('https://example.test/path?q=1'));
  assert.match(ok, /<a class="dcp-btn is-link" data-pv="btn0" href="https:\/\/example\.test\/path\?q=1" target="_blank" rel="noopener noreferrer">Open<\/a>/);
  assert.match(ok, /role="group"/, 'a card holding a link is not role=img (its link stays reachable)');
  for (const bad of ['', 'https://', 'http://example.test', 'javascript:alert(1)', 'https://a b.test', 'ftp://x.test', 'https://' + 'a'.repeat(520)]) {
    const out = c.m.dcCard(sc(bad));
    assert.doesNotMatch(out, /<a /, `"${bad.slice(0, 20)}" is inert`);
    assert.match(out, /<span class="dcp-btn" data-pv="btn0">Open<\/span>/);
    assert.match(out, /role="img"/);
  }
  assert.equal(c.m.btnHref(' https://ok.test '), 'https://ok.test');
  assert.doesNotMatch(c.m.dcCard(sc('https://ok.test', '')), /dcp-btn/, 'no label, no button');
  const html = c.m.dcCard(sc('https://x.test/"onmouseover="alert(1)'));
  assert.doesNotMatch(html, /href="https:\/\/x\.test\/"onmouseover/, 'attribute breakout is escaped');
});

test('pin UI and actions are gone from the renderer', () => {
  const c = fixture();
  for (const k of ['pinpair', 'unpin', 'sumshow']) assert.equal(k in c.m.ACT, false, k);
  assert.equal(typeof c.pinScene, 'undefined');
  assert.equal(typeof c.unpin, 'undefined');
  assert.equal(typeof c.pinnedSceneId, 'undefined');
});

test('openDrawer refuses while a library save is still in flight (the baseline would be stale)', () => {
  const c = fixture();
  c.SAVE.running = true;
  assert.equal(c.m.openDrawer('s1'), false);
  assert.equal(c.S.drawer, null);
  assert.equal(c.toasts.length, 1);
});

test('desktop preparation refuses dirty drafts and saving/commands, then freezes editing only after explicit discard', async () => {
  const c = fixture();
  const states=[];
  c.window.vibeStudio={setEditorState:st=>{states.push(clone(st));return Promise.resolve({ok:true});}};
  c.m.openDrawer('s1'); c.type('l1','Unsaved');
  assert.deepEqual(states.at(-1),{open:true,dirty:true,saving:false});
  assert.equal(c.m.prepareQuit().ok,false); assert.ok(c.S.drawer);
  for (const key of ['running','dirtyScenes','dirtyRules']) {
    c.SAVE[key]=true; assert.equal(c.m.prepareQuit({discard:true}).ok,false); c.SAVE[key]=false;
  }
  for (const key of ['busy','iconBusy']) {
    c.ST[key]=true; assert.equal(c.m.prepareQuit({discard:true}).ok,false); c.ST[key]=false;
  }
  c.S.drawer.busy=true; assert.equal(c.m.prepareQuit({discard:true}).ok,false); c.S.drawer.busy=false;
  assert.equal(c.m.prepareQuit({discard:true}).ok,true);
  assert.equal(c.S.shuttingDown,true); assert.equal(c.document.body.inert,true); assert.equal(c.S.drawer,null);
  assert.deepEqual(states.at(-1),{open:false,dirty:false,saving:false});
  c.click('newscene'); c.type('l1','Late'); await c.m.commitDraft();
  assert.equal(c.m.openDrawer('s1'),false); assert.equal(c.S.drawer,null); assert.equal(c.calls.length,0);
});

test('the real API refuses every late request after renderer quiescence', async () => {
  let fetches=0;
  const ctx={S:{shuttingDown:true},T:en=>en,fetch:()=>{fetches++;},AbortSignal,acceptRuntime(){}};
  vm.createContext(ctx); vm.runInContext(slice('async function api(', 'function errText(')+'\nthis.api=api;',ctx);
  await assert.rejects(ctx.api('/api/config',{method:'PUT',body:{scenes:[]}}),/closing/);
  await assert.rejects(ctx.api('/api/state'),/closing/);
  assert.equal(fetches,0);
});

for (const mode of ['remove','reassign']) test(`atomic delete ${mode} includes disabled pairings, and Undo restores unknown fields`,async()=>{
  const cfg=baseConfig(); cfg.appMappings.push({...clone(MAP_HIDDEN),executable:'C:\\Apps\\hidden.exe',sceneId:'s1'});
  const c=fixture({config:cfg}); c.m.openDrawer('s1'); c.S.ov={kind:'del',id:'s1',mode,to:'s2',busy:false};
  await c.m.doDelete();
  assert.equal(c.calls.length,1); const body=c.calls[0].body;
  assert.equal(c.calls[0].path,'/api/config'); assert.equal(body.scenes.length,1);
  assert.deepEqual(body.expectedScenes,cfg.scenes); assert.deepEqual(body.expectedAppMappings,cfg.appMappings);
  assert.equal(body.appMappings.length,mode==='remove'?1:3);
  assert.ok(body.appMappings.every(m=>m.sceneId==='s2'));
  if(mode==='reassign') assert.equal(body.appMappings.find(m=>m.executable==='C:\\Apps\\hidden.exe').hiddenNote,'hidden-kept');
  assert.equal(c.S.drawer,null); assert.equal(c.ST.busy,false);
  await c.m.undo();
  assert.equal(c.calls.length,2); assert.deepEqual(c.calls[1].body.scenes,cfg.scenes); assert.deepEqual(c.calls[1].body.appMappings,cfg.appMappings);
  assert.deepEqual(c.calls[1].body.expectedScenes,body.scenes); assert.deepEqual(c.calls[1].body.expectedAppMappings,body.appMappings);
  assert.equal(c.S.scenes.length,2); assert.equal(c.S.hidden.length,2);
});

test('failed atomic delete keeps saved library, mappings, and open draft unchanged',async()=>{
  const c=fixture({route:()=>{throw new Error('Disk full');}}); const before=savedSnapshot(c);
  c.m.openDrawer('s1'); c.type('l1','Draft'); const drawer=c.S.drawer;
  c.S.ov={kind:'del',id:'s1',mode:'remove',to:'s2',busy:false};
  await c.m.doDelete();
  assert.equal(c.calls.length,1); assert.equal(savedSnapshot(c),before); assert.equal(c.S.drawer,drawer); assert.equal(drawer.sc.l1,'Draft');
  assert.equal(c.S.ov.err,'Disk full'); assert.equal(c.S.ov.busy,false); assert.equal(c.ST.busy,false);
});
