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
  assert.ok(!toggle.includes('disabled')); assert.ok(toggle.includes('checked')); assert.ok(!html.includes('mk-live-panel')); assert.ok(html.includes('data-bind="realscene"'));
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
