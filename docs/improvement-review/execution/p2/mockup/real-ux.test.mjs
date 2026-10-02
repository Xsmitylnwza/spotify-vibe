import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { publicAppIcon } from './device-apps.mjs';
const source = await readFile(new URL('./mockup.js', import.meta.url), 'utf8');
function renderer() {
  const ctx = vm.createContext({ document: { addEventListener() {}, querySelector() { return null; } }, addEventListener() {}, URL, console });
  vm.runInContext(source.slice(0, source.indexOf('(function boot()')), ctx);
  const run = code => vm.runInContext(code, ctx);
  run("REAL.enabled=true; LIVE.enabled=true; REAL.selectedSceneId='coding'; REAL.selectedAppId='device-code'; APPS.splice(0,APPS.length,{id:'device-code',name:'Visual Studio Code',exe:'C:\\\\Code.exe',publicIcon:'https://example.com/code.png',icon:''}); INSTALLED.length=0; S.rules=[{id:'r-code',kind:'app',app:'device-code',scene:'coding'}];");
  return run;
}
test('app macro resolves in activity name and both lines, without changing saved template', () => {
  const run = renderer();
  run("Object.assign(sceneBy('coding'),{actName:'{app}',l1:'Using {app}',l2:'',art:'@app',vars:true})");
  const payload = run("liveScenePayload(sceneBy('coding'))");
  assert.equal(payload.activityName, 'Visual Studio Code'); assert.equal(payload.details, 'Using Visual Studio Code'); assert.equal(payload.state, '');
  assert.equal(payload.largeImage, 'https://example.com/code.png'); assert.equal(run("sceneBy('coding').actName"), '{app}');
  const preview = run("dcCard(sceneBy('coding'))"); assert.ok(!preview.includes('{app}')); assert.ok(preview.includes('Visual Studio Code'));
});
test('unpaired app macro uses Scene name and missing public icon does not block presence', () => {
  const run = renderer(); run("S.rules=[]; Object.assign(sceneBy('coding'),{actName:'{app}',art:'@app'})");
  const payload = run("liveScenePayload(sceneBy('coding'))"); assert.equal(payload.activityName, 'Coding'); assert.equal(payload.largeImage, '');
});
test('real master switch remains enabled while disconnected, busy, and catalog loading; top test panel is gone', () => {
  const run = renderer(); run('REAL.ready=false; LIVE.checked=false; LIVE.connected=false; LIVE.busy=true; REAL.presenceEnabled=true');
  const html = run('nowView()');
  const toggle = html.match(/<input[^>]+data-bind="presence"[^>]*>/)[0];
  assert.ok(!toggle.includes('disabled')); assert.ok(toggle.includes('checked')); assert.ok(!html.includes('mk-live-panel')); assert.ok(!html.includes('data-bind="realscene"')); assert.ok(!html.includes('<select class="vs-select" data-bind="realscene"')); assert.ok(html.includes('class="mk-now-switch"'));
});
test('app icon can be selected directly from image gallery and editor has no redundant Send', () => {
  const run = renderer(); run("S.drawer={id:'coding',dirty:false}; S.ov={kind:'img',p:'lg',tab:'builtin'}");
  assert.ok(run('imgTab()').includes('data-arg="app:"'));
  run("S.ov.tab='app'"); const tab = run('imgTab()'); assert.ok(tab.includes('data-arg="app:"')); assert.ok(!tab.includes('data-act="iconup"'));
});
test('known app icons resolve to public image sources; unknown apps have an explicit fallback', () => {
  assert.match(publicAppIcon('C:\\Chrome.exe', 'Google Chrome'), /google-chrome\.png$/);
  assert.match(publicAppIcon('C:\\Code.exe', 'Code'), /domain=code.visualstudio.com/);
  assert.equal(publicAppIcon('C:\\Private.exe', 'Private'), '');
});

test('LIVE Now (#39): switch + reason line + preview only; app icon resolves in both preview tabs; picker shows generic app tile', () => {
  const run = renderer(); run("REAL.ready=true; LIVE.checked=true; LIVE.active=true; LIVE.scene={id:'coding',sceneName:'Coding',largeImage:'https://example.com/code.png',publishedImage:'https://example.com/code.png',smallImage:''}; REAL.presenceEnabled=true; Object.assign(sceneBy('coding'),{art:'@app',small:'',vars:false}); REAL.selectedAppId='device-code'");
  for (const view of ['popout', 'list']) { run("S.pvView='" + view + "'"); const html = run('nowView()');
    assert.ok(!html.includes('<select')); assert.ok(!html.includes('Choose a Scene')); assert.ok(!html.includes('vs-pill')); assert.ok(!html.includes('mk-scthumb'));
    assert.ok(!html.includes('scenepick')); assert.ok(!html.includes('mk-paired')); assert.ok(!html.includes('data-act="pinpair"')); assert.ok(!html.includes('refreshapps')); assert.ok(!html.includes('pairadd'));
    assert.ok(html.includes('class="mk-now-switch"')); assert.ok(html.includes('data-bind="presence"')); assert.match(html, /Following[\s\S]*Visual Studio Code[\s\S]*Auto/);
    assert.ok(html.includes('https://example.com/code.png')); assert.ok(!html.includes('data-act="pvview"')); assert.ok(html.includes('mk-pv-popout')); assert.ok(html.includes('mk-pv-list')); }
  run("REAL.selectedAppId=''"); let html = run('nowView()'); assert.match(html, /Pinned: <b>Coding<\/b>/); assert.ok(html.includes('data-act="backauto"'));
  run('REAL.presenceEnabled=false; LIVE.active=false'); html = run('nowView()'); assert.ok(html.includes('Hidden')); assert.ok(!html.includes('data-act="backauto"'));
  run('LIVE.error="boom"; LIVE.connected=false'); html = run('nowView()'); assert.ok(html.includes('boom')); assert.ok(html.includes('data-act="livecheck"'));
  run("S.drawer={id:'coding',dirty:false}; S.ov={kind:'img',p:'lg',tab:'builtin'}");
  const tab = run('imgTab()'); assert.ok(tab.includes('mk-pk3-app')); assert.ok(!tab.includes('https://example.com/code.png')); assert.match(tab, /follows the paired app/i);
});
test('Pause is gone from the product; demo Now shows only switch + reason + preview', () => {
  assert.ok(!/paused|Pause/.test(source.replace(/pause: sv\(.*\n/, '')));
  const run = renderer(); run('REAL.enabled=false; LIVE.enabled=false; S.mode="pinned"; S.pinned="coding"');
  const html = run('nowView()'); assert.ok(html.includes('Pinned: <b>')); assert.ok(html.includes('data-act="backauto"')); assert.ok(!html.includes('vs-pill'));
});

test('#43 Scene enabled toggle replaces Show now; #44 picker home has Upload/App icon tiles and no tab bar', () => {
  const run = renderer(); run("REAL.ready=true; S.scenes.forEach(s => s.enabled=false)");
  const html = run('scenesView()'); assert.ok(!html.includes('sumshow')); assert.ok(html.includes('data-bind="sceneon"')); assert.ok(html.includes('is-disabled'));
  run("S.drawer={id:'coding',dirty:false}; S.ov={kind:'img',p:'lg',tab:'builtin',chooser:true}");
  const inner = run('imgInner()'); assert.ok(inner.includes('mk-pk3')); assert.ok(!inner.includes('role="tablist"')); assert.ok(inner.includes('data-arg="gif"')); assert.ok(inner.includes('data-arg="upload"')); assert.ok(inner.includes('data-arg="link"'));
});

test('#42 Now preview renders the PUBLISHED image and warns when the app icon fell back', () => {
  const run = renderer(); run("REAL.ready=true; LIVE.checked=true; LIVE.active=true; REAL.presenceEnabled=true; LIVE.scene={id:'coding',sceneName:'Coding',activityType:'competing',activityName:'Orca',largeImage:'https://cdn.example/poster.png',publishedImage:'https://cdn.example/poster.png',imageFallback:'app_icon_no_public_url',smallImage:''}; Object.assign(sceneBy('coding'),{art:'@app'})");
  const html = run('nowView()');
  assert.ok(html.includes('https://cdn.example/poster.png')); assert.ok(html.includes('mk-stage-note'));
});
