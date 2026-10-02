import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('./mockup.js', import.meta.url), 'utf8');
function renderer() {
  const ctx = vm.createContext({ document: { addEventListener() {}, querySelector() { return null; } }, addEventListener() {}, URL, console, setTimeout, clearInterval, setInterval });
  vm.runInContext(source.slice(0, source.indexOf('(function boot()')), ctx);
  return code => vm.runInContext(code, ctx);
}
test('update button follows state and shows version label', () => {
  const run = renderer();
  assert.equal(run('updBtn()'), '');
  run("Object.assign(UPD_SIM,{state:'available',availableVersion:'1.0.8'})");
  assert.match(run('updBtn()'), /Update · v1\.0\.8/);
  run("Object.assign(UPD_SIM,{state:'downloading',percent:40})"); assert.match(run('updBtn()'), /40%/);
  run("UPD_SIM.state='downloaded'"); assert.match(run('updBtn()'), /Restart to update/);
  run("UPD_SIM.state='error'"); assert.match(run('updBtn()'), /retry/);
});
test('icon status chips: uploading, failed, needs-consent, ready', () => {
  const run = renderer();
  assert.match(run("iconStatusHtml({iconStatus:'uploading'})"), /is-up/);
  assert.match(run("iconStatusHtml({iconStatus:'failed'})"), /is-fail/);
  assert.match(run("iconStatusHtml({iconStatus:'needs-consent'})"), /is-consent/);
  assert.equal(run("iconStatusHtml({iconStatus:'ready'})"), '');
});
test('consent copy is bilingual and consent defaults to unknown', () => {
  assert.match(source, /Show app icons on Discord\?/); assert.match(source, /แสดงไอคอนแอปบน Discord/);
  assert.match(source, /Upload app icons automatically/);
  assert.equal(renderer()('ICONHOST.consent'), null);
});
