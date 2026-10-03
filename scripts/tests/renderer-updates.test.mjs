import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../discord-presence-studio.html', import.meta.url), 'utf8');
const start = html.indexOf('function initElectronShell()');
const source = html.slice(start, html.indexOf('// First-run onboarding', start));
const dictStart = html.indexOf('/* Electron shell — update banner');
const dictionary = vm.runInNewContext('({' + html.slice(dictStart, html.indexOf('\n};', dictStart)) + '})');

async function fixture(lang = 'en') {
  const elements = new Map();
  for (const match of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const [, tag, attrs, id] = match;
    const content = html.slice(match.index + match[0].length, html.indexOf('</' + tag + '>', match.index));
    elements.set('#' + id, {
      tagName: tag.toUpperCase(), type: /type="([^"]+)"/.exec(attrs)?.[1],
      hidden: /\bhidden\b/.test(attrs), disabled: false, textContent: '', handlers: {},
      icon: /<svg\b[^>]*aria-hidden="true"/.test(content),
      addEventListener(event, fn) { this.handlers[event] = fn; },
      setAttribute(name, value) { this[name] = value; },
    });
  }
  let state = { currentVersion: '1.0.7', available: null, state: 'idle' };
  let push;
  const calls = { check: 0, download: 0, restart: 0 };
  const bridge = {
    isElectron: true, onUpdateState(fn) { push = fn; }, getUpdateState: async () => state,
    getVersion: async () => '1.0.7', getOpenAtLogin: async () => false, setOpenAtLogin: async x => x,
    checkForUpdates: async () => { calls.check++; return { ok: true }; },
    downloadUpdate: async () => { calls.download++; return { ok: true }; },
    quitAndInstall: async () => { calls.restart++; return { ok: true }; },
  };
  const window = { vibeStudio: bridge };
  const t = (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replace('{' + k + '}', v), lang === 'en' ? dictionary[key] || key : key);
  vm.runInNewContext(source + '\ninitElectronShell();', { window, document: { querySelector: id => elements.get(id) }, t, showMessage() {}, Date });
  await new Promise(resolve => setImmediate(resolve));
  return {
    el: id => elements.get('#' + id), bridge, calls,
    click: id => elements.get('#' + id).handlers.click(),
    push(value) { state = { currentVersion: '1.0.7', ...value }; push(state); },
    relocalize(value) { lang = value; window.__vibeElectronRelocalize(); },
  };
}

for (const lang of ['th', 'en']) {
  test(`${lang}: dismiss then manual recheck restores download and versions`, async () => {
    const f = await fixture(lang);
    f.push({ available: '1.0.8' });
    await f.click('updateDismissButton');
    assert.equal(f.el('updateBanner').hidden, true);
    await f.click('checkUpdatesButton');
    assert.equal(f.el('updateBanner').hidden, false);
    assert.equal(f.el('updateActionButton').hidden, false);
    assert.equal(f.el('updateActionButton').disabled, false);
    assert.match(f.el('updateBannerVersion').textContent, /1\.0\.7.*1\.0\.8/);
    await f.click('updateActionButton');
    assert.equal(f.calls.download, 1);
  });

  test(`${lang}: pushed errors override available/downloaded copy with recovery`, async () => {
    const f = await fixture(lang);
    for (const prior of [{ available: '1.0.8' }, { available: '1.0.8', downloaded: true }]) {
      f.push(prior);
      await f.click('updateDismissButton');
      f.push({ ...prior, error: 'network failed', state: 'error' });
      assert.equal(f.el('updateBanner').hidden, false);
      assert.match(f.el('updateBannerCopy').textContent, lang === 'en' ? /failed/i : /ไม่สำเร็จ/);
      assert.match(f.el('updateCheckStatus').textContent, lang === 'en' ? /failed/i : /ไม่สำเร็จ/);
      assert.equal(f.el('updateActionButton').hidden, false);
      assert.equal(f.el('updateActionButton').disabled, false);
    }
    f.push({ state: 'error', error: 'feed failed' });
    await f.click('updateActionButton');
    assert.equal(f.calls.check, 1);
  });

  test(`${lang}: restart rejection is caught and stays actionable`, async () => {
    const f = await fixture(lang);
    f.push({ available: '1.0.8', downloaded: true });
    f.bridge.quitAndInstall = async () => { throw new Error('rejected'); };
    await f.click('updateActionButton');
    assert.match(f.el('updateCheckStatus').textContent, lang === 'en' ? /restart.*failed/i : /รีสตาร์ท.*ไม่สำเร็จ/);
    assert.equal(f.el('updateActionButton').disabled, false);
    assert.equal(f.el('updateActionButton').hidden, false);
    f.bridge.quitAndInstall = async () => ({ ok: false });
    await f.click('updateActionButton');
    assert.match(f.el('updateBannerCopy').textContent, lang === 'en' ? /restart.*failed/i : /รีสตาร์ท.*ไม่สำเร็จ/);
  });

  test(`${lang}: Settings icon action reflects progress and explicit restart`, async () => {
    const f = await fixture(lang);
    const action = f.el('settingsUpdateActionButton');
    assert.equal(action.tagName, 'BUTTON');
    assert.equal(action.type, 'button');
    assert.equal(action.icon, true);
    f.push({ available: '1.0.8' });
    assert.equal(action.hidden, false);
    await f.click('settingsUpdateActionButton');
    assert.equal(f.calls.download, 1);
    assert.equal(f.calls.restart, 0);
    f.push({ available: '1.0.8', downloading: true, progress: 47 });
    assert.match(f.el('updateCheckStatus').textContent, /47%/);
    assert.equal(action.disabled, true);
    f.push({ available: '1.0.8', downloaded: true });
    assert.match(f.el('settingsUpdateActionLabel').textContent, lang === 'en' ? /Restart/ : /รีสตาร์ท/);
    await f.click('settingsUpdateActionButton');
    assert.equal(f.calls.restart, 1);
  });

  test(`${lang}: idle/checking/check failure states are truthful and recoverable`, async () => {
    const f = await fixture(lang);
    assert.match(f.el('updateCheckStatus').textContent, /1\.0\.7/);
    assert.equal(f.el('settingsUpdateActionButton').hidden, true);
    let finish;
    f.bridge.checkForUpdates = () => new Promise(resolve => { finish = resolve; });
    const pending = f.click('checkUpdatesButton');
    assert.match(f.el('updateCheckStatus').textContent, lang === 'en' ? /Checking/ : /กำลังตรวจ/);
    assert.equal(f.el('checkUpdatesButton').disabled, true);
    finish({ ok: true });
    await pending;
    assert.match(f.el('updateCheckStatus').textContent, lang === 'en' ? /latest version/ : /เวอร์ชันล่าสุด/);
    f.bridge.checkForUpdates = async () => { throw new Error('offline'); };
    await f.click('checkUpdatesButton');
    assert.match(f.el('updateCheckStatus').textContent, lang === 'en' ? /Couldn't check/ : /ตรวจหาอัปเดตไม่สำเร็จ/);
    assert.equal(f.el('updateBanner').hidden, false);
    f.bridge.checkForUpdates = async () => ({ ok: false });
    await f.click('updateActionButton');
    assert.match(f.el('updateCheckStatus').textContent, lang === 'en' ? /unavailable/ : /ไม่พร้อมใช้งาน/);
  });
}

test('live relocalization updates status and controls; false download result is visible', async () => {
  const f = await fixture('th');
  f.push({ available: '1.0.8' });
  f.bridge.downloadUpdate = async () => ({ ok: false });
  await f.click('settingsUpdateActionButton');
  f.relocalize('en');
  assert.match(f.el('updateCheckStatus').textContent, /download failed/i);
  assert.match(f.el('updateBannerCopy').textContent, /download failed/i);
  assert.equal(f.el('settingsUpdateActionButton').disabled, false);
  assert.equal(f.el('updateActionButton').icon, true);
});

test('banner dismissal leaves Settings actionable; both controls serialize requests', async () => {
  const f = await fixture();
  f.push({ available: '1.0.8' });
  await f.click('updateDismissButton');
  assert.equal(f.el('settingsUpdateActionButton').hidden, false);
  let finish;
  f.bridge.downloadUpdate = () => { f.calls.download++; return new Promise(resolve => { finish = resolve; }); };
  const pending = f.click('settingsUpdateActionButton');
  await f.click('updateActionButton');
  await f.click('checkUpdatesButton');
  assert.equal(f.calls.download, 1);
  assert.equal(f.calls.check, 0);
  assert.equal(f.el('settingsUpdateActionButton').disabled, true);
  finish({ ok: true });
  await pending;
});

test('a late state snapshot cannot overwrite a newer pushed error', async () => {
  const f = await fixture();
  let finish;
  f.bridge.getUpdateState = () => new Promise(resolve => { finish = resolve; });
  const pending = f.click('checkUpdatesButton');
  await new Promise(resolve => setImmediate(resolve));
  f.push({ state: 'error', error: 'feed failed' });
  finish({ currentVersion: '1.0.7', state: 'idle' });
  await pending;
  assert.match(f.el('updateCheckStatus').textContent, /Update failed/);
  assert.equal(f.el('updateBanner').hidden, false);
});
