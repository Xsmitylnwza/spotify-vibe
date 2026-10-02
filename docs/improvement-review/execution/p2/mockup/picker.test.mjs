import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('./mockup.js', import.meta.url), 'utf8');
function renderer() {
  const elements = new Map();
  const querySelector = key => {
    if (!elements.has(key)) elements.set(key, { querySelector, innerHTML: '', textContent: '', disabled: false });
    return elements.get(key);
  };
  const ctx = vm.createContext({ document: { querySelector, addEventListener() {} }, addEventListener() {}, console });
  vm.runInContext(source.slice(0, source.indexOf('(function boot()')), ctx);
  vm.runInContext('morphInto = (element, html) => { element.innerHTML = html; };', ctx);
  return { run: code => vm.runInContext(code, ctx), elements };
}
test('opening app picker with no selected app does not crash and disables Add', () => {
  const { run, elements } = renderer();
  run("S._pHost='l2'; S.picker={tab:'app',q:'',app:null,mode:'pair',scene:'design',showSys:false}");
  assert.doesNotThrow(() => run('updatePicker()'));
  assert.equal(elements.get('#padd').disabled, true);
  const count = run('S.rules.length');
  run('ACT.paddgo()');
  assert.equal(run('S.rules.length'), count);
});
test('already paired app cannot add a duplicate even if action is invoked', () => {
  const { run, elements } = renderer();
  run("S.picker={tab:'app',q:'',app:'figma',mode:'pair',scene:'design',showSys:false}");
  run('updatePicker()');
  assert.equal(elements.get('#padd').disabled, true);
  const count = run('S.rules.length');
  run('ACT.paddgo()');
  assert.equal(run('S.rules.length'), count);
});
test('blank browser title disables Add and cannot create a rule', () => {
  const { run, elements } = renderer();
  run("S.picker={tab:'web',contains:'   ',mode:'pair',scene:'design'}");
  run('updatePicker()');
  assert.equal(elements.get('#padd').disabled, true);
  const count = run('S.rules.length');
  run('ACT.paddgo()');
  assert.equal(run('S.rules.length'), count);
});

test('multi-select: toggling builds a count, Add N apps, one confirm lists every move, add + move apply together', () => {
  const { run, elements } = renderer();
  run("S.drawer=null; S.picker={tab:'app',q:'',app:null,mode:'pair',scene:'focus',showSys:false}; closePicker = () => {}; toast = () => {}; setTimeout = () => 0");
  const other = run("S.rules.find(r => r.kind === 'app' && r.scene !== 'focus')"); assert.ok(other);
  const free = run("APPS.concat(INSTALLED).find(a => !S.rules.some(r => r.kind === 'app' && r.app === a.id)).id");
  run('updatePicker()'); assert.equal(elements.get('#padd').disabled, true);
  run("ACT.ppick('" + free + "')"); run("ACT.ppick('" + other.app + "')");
  assert.deepEqual(JSON.parse(JSON.stringify(run('S.picker.sel'))), [free, other.app]); assert.equal(elements.get('#padd').textContent, 'Add 2 apps');
  assert.match(elements.get('#pthen').innerHTML, /Move 1 app to this Scene\?/); assert.match(elements.get('#pchips').innerHTML, /mk-pchip/);
  run("ACT.ppick('" + free + "')"); assert.equal(elements.get('#padd').textContent, 'Add 1 app'); run("ACT.ppick('" + free + "')");
  const before = run('S.rules.length'); run('ACT.paddgo()');
  assert.equal(run('S.rules.length'), before + 1);
  assert.equal(run("S.rules.find(r => r.kind === 'app' && r.app === '" + other.app + "').scene"), 'focus');
  assert.ok(run("S.rules.some(r => r.kind === 'app' && r.app === '" + free + "' && r.scene === 'focus')"));
});
