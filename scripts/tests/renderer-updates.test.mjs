import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Runs the renderer's desktop-shell block (update model, sidebar card, Settings controls, launch toggle)
// against a fake preload bridge. Everything is observed through behaviour, not source strings.
const html = readFileSync(new URL('../discord-presence-studio.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ---------- desktop shell');
const source = html.slice(start, html.indexOf('function labelChrome()', start));
assert.ok(start > 0 && source.includes('function initDesktop()'), 'desktop shell block present');
const tick = () => new Promise(resolve => setImmediate(resolve));

async function fixture(lang = 'en') {
  const elements = new Map();
  const make = id => {
    const el = { id, hidden: false, disabled: false, textContent: '', handlers: {}, attrs: {}, innerHTML: '',
      addEventListener(event, fn) { this.handlers[event] = fn; }, setAttribute(name, value) { this.attrs[name] = value; },
      querySelector: () => null };
    elements.set('#' + id, el); return el;
  };
  ['windowTitlebar', 'winMinimize', 'winMaximize', 'winClose', 'windowDragRegion'].forEach(make);
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
  vm.runInContext(source + '\nthis.m = { initDesktop, updCard, settingsUpdateHtml, launchRowHtml, setLaunchAtLogin, updateAction, checkUpdates, UPD };', context);
  context.m.initDesktop();
  await tick(); await tick();
  return {
    el: id => elements.get('#' + id), calls, bridge, m: context.m,
    sidebar: () => context.m.updCard(), settings: () => context.m.settingsUpdateHtml(),
    push(value) { state = { currentVersion: '1.0.7', ...value }; push(state); },
    setLang(value) { context.lang = value; },
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
    assert.match(f.sidebar(), /data-st="error"/);
    assert.match(f.settings(), re(lang, /failed/i, /ไม่สำเร็จ/));
  });

  test(`${lang}: pushed errors override available/downloaded copy and offer recovery`, async () => {
    const f = await fixture(lang);
    for (const [prior, kind] of [[{ state: 'available', availableVersion: '1.0.8' }, 'updgo'], [{ state: 'downloaded', downloaded: true, availableVersion: '1.0.8' }, 'updrestart']]) {
      f.push(prior);
      f.push({ ...prior, state: 'error', error: 'network failed' });
      assert.match(f.settings(), re(lang, /failed/i, /ไม่สำเร็จ/));
      assert.doesNotMatch(f.settings(), re(lang, /is available|restart to install\./i, /มีเวอร์ชันใหม่|ดาวน์โหลดเสร็จแล้ว/));
      assert.match(f.settings(), new RegExp('data-act="' + kind + '"[^>]*>'), 'Settings keeps the recovery action');
      assert.doesNotMatch(f.settings(), new RegExp('data-act="' + kind + '"[^>]*disabled'));
      assert.match(f.sidebar(), new RegExp('data-st="error"[\\s\\S]*data-act="' + kind + '"'));
    }
  });

  test(`${lang}: sidebar and Settings serialize requests`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'available', availableVersion: '1.0.8' });
    let finish;
    f.bridge.downloadUpdate = () => { f.calls.download++; return new Promise(resolve => { finish = resolve; }); };
    const pending = f.m.updateAction();
    await f.m.updateAction();
    await f.m.checkUpdates();
    assert.equal(f.calls.download, 1);
    assert.equal(f.calls.check, 0);
    assert.match(f.settings(), /disabled/);
    assert.match(f.sidebar(), /data-st="downloading"/);
    finish({ ok: true });
    await pending;
    f.push({ state: 'downloaded', availableVersion: '1.0.8' });
    let done;
    f.bridge.quitAndInstall = () => { f.calls.restart++; return new Promise(resolve => { done = resolve; }); };
    const restarting = f.m.updateAction();
    await f.m.updateAction();
    assert.equal(f.calls.restart, 1);
    assert.match(f.sidebar(), /data-st="restarting"/);
    done({ ok: true });
    await restarting;
  });

  test(`${lang}: download resolving false is a visible failure and stays recoverable`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'available', availableVersion: '1.0.8' });
    f.bridge.downloadUpdate = async () => ({ ok: false });
    await f.m.updateAction();
    assert.match(f.settings(), re(lang, /download failed/i, /ดาวน์โหลดอัปเดตไม่สำเร็จ/));
    assert.match(f.sidebar(), /data-st="error"/);
    f.bridge.downloadUpdate = async () => { f.calls.download++; return { ok: true }; };
    await f.m.updateAction();
    assert.equal(f.calls.download, 1, 'a second attempt is possible');
  });

  test(`${lang}: restart rejection is shown and stays actionable`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'downloaded', availableVersion: '1.0.8' });
    f.bridge.quitAndInstall = async () => { throw new Error('rejected'); };
    await f.m.updateAction();
    assert.match(f.settings(), re(lang, /restart.*failed/i, /รีสตาร์ต.*ไม่สำเร็จ/));
    assert.match(f.sidebar(), /data-act="updrestart"/);
    assert.doesNotMatch(f.sidebar(), /disabled/);
  });

  test(`${lang}: idle, checking and check failure are truthful and recoverable`, async () => {
    const f = await fixture(lang);
    assert.match(f.settings(), /1\.0\.7/);
    assert.doesNotMatch(f.settings(), re(lang, /latest version/, /เวอร์ชันล่าสุด/), 'not claimed before any check');
    assert.match(f.sidebar(), /data-st="idle"/);
    assert.match(f.sidebar(), re(lang, /v1\.0\.7 · Up to date/, /v1\.0\.7 · ล่าสุด/));
    let finish;
    f.bridge.checkForUpdates = () => new Promise(resolve => { finish = resolve; });
    const pending = f.m.checkUpdates();
    assert.match(f.settings(), re(lang, /Checking/, /กำลังตรวจ/));
    assert.match(f.settings(), /disabled/);
    assert.match(f.sidebar(), /data-st="checking"/);
    finish({ ok: true });
    await pending;
    assert.match(f.settings(), re(lang, /latest version/, /เวอร์ชันล่าสุด/));
    assert.match(f.sidebar(), re(lang, /Checks hourly · last checked \d\d:\d\d/, /ตรวจอัตโนมัติทุกชั่วโมง · ล่าสุด \d\d:\d\d/), 'hover tip shows the last check time');
    f.bridge.checkForUpdates = async () => { throw new Error('offline'); };
    await f.m.checkUpdates();
    assert.match(f.settings(), re(lang, /check for updates/i, /ตรวจหาอัปเดตไม่สำเร็จ/));
    assert.match(f.sidebar(), /data-st="error"[\s\S]*data-act="checkupd"/);
    f.bridge.checkForUpdates = async () => ({ ok: false });
    await f.m.updateAction();
    assert.match(f.settings(), re(lang, /aren’t available/, /ไม่พร้อมใช้งาน/));
    f.bridge.checkForUpdates = async () => ({ ok: true });
    await f.m.checkUpdates();
    assert.match(f.settings(), re(lang, /latest version/, /เวอร์ชันล่าสุด/), 'recovers after a good check');
    assert.match(f.sidebar(), /data-st="idle"/);
  });

  test(`${lang}: background download shows progress, then a one-click restart card`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'downloading', availableVersion: '1.0.8', percent: 42 });
    assert.match(f.sidebar(), /data-st="downloading"/);
    assert.match(f.sidebar(), /role="progressbar"[^>]*aria-valuenow="42"/);
    assert.match(f.sidebar(), /42%/);
    assert.match(f.settings(), /aria-valuenow="42"/);
    assert.doesNotMatch(f.sidebar(), /data-act=/, 'nothing to click while it downloads');
    f.push({ state: 'downloaded', downloaded: true, availableVersion: '1.0.8' });
    assert.match(f.sidebar(), /data-st="downloaded"/);
    assert.match(f.sidebar(), re(lang, /v1\.0\.8 ready/, /v1\.0\.8 พร้อมแล้ว/));
    assert.match(f.sidebar(), re(lang, /Restart now/, /รีสตาร์ตตอนนี้/));
    assert.match(f.sidebar(), re(lang, /Updates itself when you close the window/, /จะอัปเดตให้เองเมื่อปิดหน้าต่าง/));
    await f.m.updateAction();
    assert.equal(f.calls.restart, 1, 'one call restarts and installs');
    assert.equal(f.calls.download, 0);
  });

  test(`${lang}: Settings states the hourly auto-update and keeps a secondary check button`, async () => {
    const f = await fixture(lang);
    assert.match(f.settings(), re(lang, /automatically every hour/, /ตรวจและดาวน์โหลดอัตโนมัติทุกชั่วโมง/));
    assert.match(f.settings(), re(lang, /Check now/, /ตรวจตอนนี้/));
    assert.match(f.settings(), /data-act="checkupd"/);
    assert.doesNotMatch(f.settings(), /vs-btn-primary/, 'no primary action while idle');
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
  assert.match(f.settings(), /download failed/i);
  assert.match(f.settings(), /Check now/);
  f.setLang('th');
  assert.match(f.settings(), /ดาวน์โหลดอัปเดตไม่สำเร็จ/);
  assert.match(f.settings(), /ตรวจตอนนี้/);
  assert.match(f.sidebar(), /ลองอีกครั้ง/);
  f.setLang('en');
  assert.match(f.settings(), /download failed/i);
});

for (const lang of ['en', 'th']) {
  test(`${lang}: a download is automatic — no Download button unless something failed`, async () => {
    const f = await fixture(lang);
    f.push({ state: 'available', availableVersion: '1.0.8' });
    assert.doesNotMatch(f.sidebar(), /data-act=/, 'sidebar offers nothing to click while it prepares');
    assert.doesNotMatch(f.settings(), /vs-btn-primary|data-act="updgo"/);
    f.push({ state: 'error', availableVersion: '1.0.8', error: 'x' });
    assert.match(f.sidebar(), /data-act="updgo"/, 'recovery after an error');
    assert.match(f.settings(), /data-act="updgo"/);
  });
}

test('the top update banner is gone', () => {
  assert.doesNotMatch(html, /id="updateBanner"|updateDismissButton/);
});
