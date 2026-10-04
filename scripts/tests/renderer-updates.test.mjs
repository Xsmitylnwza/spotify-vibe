import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Runs the renderer's desktop-shell block (update model, banner, sidebar button, Settings controls, launch toggle)
// against a fake preload bridge. Everything is observed through behaviour, not source strings.
const html = readFileSync(new URL('../discord-presence-studio.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ---------- desktop shell');
const source = html.slice(start, html.indexOf('function labelChrome()', start));
assert.ok(start > 0 && source.includes('function initDesktop()'), 'desktop shell block present');
const tick = () => new Promise(resolve => setImmediate(resolve));

async function fixture(lang = 'en') {
  const elements = new Map();
  const make = id => {
    const el = { id, hidden: id === 'updateBanner', disabled: false, textContent: '', handlers: {}, attrs: {}, innerHTML: '',
      addEventListener(event, fn) { this.handlers[event] = fn; }, setAttribute(name, value) { this.attrs[name] = value; },
      querySelector: sel => (sel === '#updateActionLabel' ? elements.get('#updateActionLabel') : null) };
    elements.set('#' + id, el); return el;
  };
  ['updateBanner', 'updateBannerCopy', 'updateBannerVersion', 'updateActionButton', 'updateActionLabel', 'updateDismissButton', 'windowTitlebar', 'winMinimize', 'winMaximize', 'winClose', 'windowDragRegion'].forEach(make);
  const calls = { check: 0, download: 0, restart: 0, login: [], toasts: [] };
  let state = { currentVersion: '1.0.7', state: 'idle' }, push;
  const bridge = {
    isElectron: true, onUpdateState(fn) { push = fn; }, getUpdateState: async () => state, getVersion: async () => '1.0.7', getOpenAtLogin: async () => true,
    setOpenAtLogin: async on => { calls.login.push(on); if (bridge.loginThrows) throw new Error('denied'); return on; },
    checkForUpdates: async () => { calls.check++; return { ok: true }; },
    downloadUpdate: async () => { calls.download++; return { ok: true }; },
    quitAndInstall: async () => { calls.restart++; return { ok: true }; },
    windowMinimize() {}, windowClose() {}, windowToggleMaximize: async () => false, isMaximized: async () => false, onMaximizeChanged() {},
  };
  const context = {
    lang, window: { vibeStudio: bridge }, document: { body: { classList: { add() {} } } }, $: sel => elements.get(sel),
    T: (en, th) => (context.lang === 'th' ? th : en), esc: s => String(s ?? ''), render() {}, toast(m) { calls.toasts.push(m); }, Date,
  };
  vm.createContext(context);
  vm.runInContext(source + '\nthis.m = { initDesktop, updBtn, settingsUpdateHtml, launchRowHtml, setLaunchAtLogin, updateAction, checkUpdates, renderBanner, UPD };', context);
  context.m.initDesktop();
  await tick(); await tick();
  return {
    el: id => elements.get('#' + id), calls, bridge, m: context.m,
    sidebar: () => context.m.updBtn(), settings: () => context.m.settingsUpdateHtml(),
    copy: () => elements.get('#updateBannerCopy').textContent, banner: () => elements.get('#updateBanner'), action: () => elements.get('#updateActionButton'),
    push(value) { state = { currentVersion: '1.0.7', ...value }; push(state); },
    setLang(value) { context.lang = value; context.m.renderBanner(); },
  };
}
const re = (lang, en, th) => (lang === 'en' ? en : th);

for (const lang of ['en', 'th']) {
  test(`${lang}: a late getUpdateState snapshot cannot overwrite a newer pushed error`, async () => {
    const f = await fixture(lang);
    let finish;
    f.bridge.getUpdateState = () => new Promise(resolve => { finish = resolve; });
    const pending = f.m.checkUpdates();
    await tick();
    f.push({ state: 'error', error: 'feed failed' });
    finish({ currentVersion: '1.0.7', state: 'idle' });
    await pending;
    assert.equal(f.banner().hidden, false);
    assert.match(f.copy(), re(lang, /failed/i, /ไม่สำเร็จ/));
    assert.match(f.settings(), re(lang, /failed/i, /ไม่สำเร็จ/));
  });

  test(`${lang}: pushed errors override available/downloaded copy and offer recovery`, async () => {
    const f = await fixture(lang);
    for (const [prior, label, kind] of [[{ state: 'available', availableVersion: '1.0.8' }, re(lang, /Download/, /ดาวน์โหลด/), 'updgo'], [{ state: 'downloaded', downloaded: true, availableVersion: '1.0.8' }, re(lang, /Restart/, /รีสตาร์ท/), 'updrestart']]) {
      f.push(prior);
      f.push({ ...prior, state: 'error', error: 'network failed' });
      assert.equal(f.banner().hidden, false);
      assert.match(f.copy(), re(lang, /failed/i, /ไม่สำเร็จ/));
      assert.doesNotMatch(f.copy(), re(lang, /is available|restart to install\./i, /มีเวอร์ชันใหม่|ดาวน์โหลดเสร็จแล้ว/));
      assert.equal(f.action().hidden, false);
      assert.equal(f.action().disabled, false);
      assert.match(f.el('updateActionLabel').textContent, label);
      assert.match(f.sidebar(), new RegExp('data-act="' + kind + '"'));
    }
  });

  test(`${lang}: banner, sidebar and Settings serialize requests`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'available', availableVersion: '1.0.8' });
    let finish;
    f.bridge.downloadUpdate = () => { f.calls.download++; return new Promise(resolve => { finish = resolve; }); };
    const pending = f.m.updateAction();
    await f.action().handlers.click();
    await f.m.updateAction();
    await f.m.checkUpdates();
    assert.equal(f.calls.download, 1);
    assert.equal(f.calls.check, 0);
    assert.equal(f.action().disabled, true);
    assert.match(f.settings(), /disabled/);
    assert.match(f.sidebar(), /disabled/);
    finish({ ok: true });
    await pending;
    f.push({ state: 'downloaded', availableVersion: '1.0.8' });
    let done;
    f.bridge.quitAndInstall = () => { f.calls.restart++; return new Promise(resolve => { done = resolve; }); };
    const restarting = f.m.updateAction();
    await f.m.updateAction();
    await f.action().handlers.click();
    assert.equal(f.calls.restart, 1);
    done({ ok: true });
    await restarting;
  });

  test(`${lang}: download resolving false is a visible failure and stays recoverable`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'available', availableVersion: '1.0.8' });
    f.bridge.downloadUpdate = async () => ({ ok: false });
    await f.m.updateAction();
    assert.equal(f.banner().hidden, false);
    assert.match(f.copy(), re(lang, /download failed/i, /ดาวน์โหลดอัปเดตไม่สำเร็จ/));
    assert.match(f.settings(), re(lang, /download failed/i, /ดาวน์โหลดอัปเดตไม่สำเร็จ/));
    assert.equal(f.action().disabled, false);
    f.bridge.downloadUpdate = async () => { f.calls.download++; return { ok: true }; };
    await f.m.updateAction();
    assert.equal(f.calls.download, 1, 'a second attempt is possible');
  });

  test(`${lang}: restart rejection is shown and stays actionable`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'downloaded', availableVersion: '1.0.8' });
    f.bridge.quitAndInstall = async () => { throw new Error('rejected'); };
    await f.m.updateAction();
    assert.match(f.copy(), re(lang, /restart.*failed/i, /รีสตาร์ท.*ไม่สำเร็จ/));
    assert.equal(f.action().disabled, false);
  });

  test(`${lang}: idle, checking and check failure are truthful and recoverable`, async () => {
    const f = await fixture(lang);
    assert.match(f.settings(), /1\.0\.7/);
    assert.doesNotMatch(f.settings(), re(lang, /latest version/, /เวอร์ชันล่าสุด/), 'not claimed before any check');
    assert.equal(f.banner().hidden, true);
    let finish;
    f.bridge.checkForUpdates = () => new Promise(resolve => { finish = resolve; });
    const pending = f.m.checkUpdates();
    assert.match(f.settings(), re(lang, /Checking/, /กำลังตรวจ/));
    assert.match(f.settings(), /disabled/);
    finish({ ok: true });
    await pending;
    assert.match(f.settings(), re(lang, /latest version/, /เวอร์ชันล่าสุด/));
    f.bridge.checkForUpdates = async () => { throw new Error('offline'); };
    await f.m.checkUpdates();
    assert.match(f.copy(), re(lang, /check for updates/i, /ตรวจหาอัปเดตไม่สำเร็จ/));
    assert.equal(f.banner().hidden, false);
    assert.match(f.el('updateActionLabel').textContent, re(lang, /Check/, /ตรวจ/));
    f.bridge.checkForUpdates = async () => ({ ok: false });
    await f.action().handlers.click();
    assert.match(f.copy(), re(lang, /aren’t available/, /ไม่พร้อมใช้งาน/));
    f.bridge.checkForUpdates = async () => ({ ok: true });
    await f.m.checkUpdates();
    assert.match(f.settings(), re(lang, /latest version/, /เวอร์ชันล่าสุด/), 'recovers after a good check');
    assert.equal(f.banner().hidden, true);
  });

  test(`${lang}: dismiss then a manual recheck restores the action`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'available', availableVersion: '1.0.8' });
    f.el('updateDismissButton').handlers.click();
    assert.equal(f.banner().hidden, true);
    assert.match(f.settings(), /data-act="updgo"/, 'Settings stays actionable');
    f.bridge.getUpdateState = async () => ({ currentVersion: '1.0.7', state: 'available', availableVersion: '1.0.8' });
    await f.m.checkUpdates();
    assert.equal(f.banner().hidden, false);
    assert.equal(f.action().hidden, false);
    assert.match(f.el('updateBannerVersion').textContent, /1\.0\.8/);
    await f.action().handlers.click();
    assert.equal(f.calls.download, 1);
  });

  test(`${lang}: Launch at startup toggle reflects the OS and reports failure`, async () => {
    const f = await fixture(lang);
    assert.match(f.m.launchRowHtml(), /id="autostart"[^>]*checked/, 'initial state read from the bridge');
    await f.m.setLaunchAtLogin(false);
    assert.deepEqual(f.calls.login, [false]);
    assert.doesNotMatch(f.m.launchRowHtml(), /id="autostart"[^>]*checked/);
    f.bridge.loginThrows = true;
    await f.m.setLaunchAtLogin(true);
    assert.equal(f.calls.toasts.length, 1);
    assert.doesNotMatch(f.m.launchRowHtml(), /id="autostart"[^>]*checked/, 'a failed change is not shown as applied');
  });
}

test('switching TH/EN live re-localizes update status and every control', async () => {
  const f = await fixture('en');
  f.push({ state: 'available', availableVersion: '1.0.8' });
  f.bridge.downloadUpdate = async () => ({ ok: false });
  await f.m.updateAction();
  assert.match(f.copy(), /download failed/i);
  assert.match(f.settings(), /Check for updates/);
  f.setLang('th');
  assert.match(f.copy(), /ดาวน์โหลดอัปเดตไม่สำเร็จ/);
  assert.match(f.el('updateActionLabel').textContent, /ดาวน์โหลดอัปเดต/);
  assert.match(f.settings(), /ตรวจหาอัปเดต/);
  assert.match(f.sidebar(), /ลองอีกครั้ง/);
  f.setLang('en');
  assert.match(f.copy(), /download failed/i);
});
