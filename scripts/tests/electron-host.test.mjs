import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';

const scenario = process.argv[2];
if (!scenario) {
  for (const name of ['ipc', 'updates', 'navigation', 'installer', 'installer-hung', 'startup-hung', 'startup-late', 'startup-deadline', 'startup-late-cleanup', 'startup-late-cleanup-timeout']) {
    test(`actual Electron main host boundary: ${name}`, () => {
      const result = spawnSync(process.execPath, ['--experimental-vm-modules', import.meta.filename, name], { encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    });
  }
} else {
  const handlers = new Map();
  const windows = [];
  const timers = new Map();
  const intervals = [];
  let quit = 0, stops = 0, loads = 0, trayDestroyed = 0, stopComplete = false, releaseStop, startOptions, resolveStart;
  const updater = new EventEmitter();
  updater.quitAndInstall = () => { if (scenario === 'installer') updater.emit('error', new Error('installer refused')); };
  const app = Object.assign(new EventEmitter(), {
    isPackaged: true, getPath: () => '/fixture', getVersion: () => '1', requestSingleInstanceLock: () => true,
    getLoginItemSettings: () => ({}), whenReady: () => Promise.resolve(),
    quit: () => { const event = { preventDefault() { this.prevented = true; } }; app.emit('before-quit', event); if (!event.prevented) quit++; },
  });
  class Window extends EventEmitter {
    constructor() {
      super(); windows.push(this);
      this.webContents = Object.assign(new EventEmitter(), { mainFrame: { url: 'http://127.0.0.1:47394/', parent: null }, isDestroyed: () => false,
        send: () => {}, getURL: () => '', setWindowOpenHandler: fn => { this.open = fn; } });
    }
    isDestroyed() { return false; }
    loadURL() { loads++; return Promise.resolve(); }
    isMinimized() { return false; }
    show() {} focus() {}
    static getAllWindows() { return windows; }
  }
  class Tray extends EventEmitter { setToolTip() {} setContextMenu() {} destroy() { trayDestroyed++; } }
  const external = [];
  const handle = { alreadyRunning: false, url: 'http://127.0.0.1:47394/', stop: async () => {
    stops++;
    if (scenario.startsWith('startup-late-cleanup')) await new Promise(resolve => { releaseStop = resolve; });
    stopComplete = true;
  } };
  const context = vm.createContext({ console, URL, process: { env: { PRESENCE_STUDIO_PORT: '47394', PRESENCE_AUTOSTART_DISABLE: '1' }, argv: [], platform: 'win32' },
    setTimeout: (fn, delay) => { const key = {}; timers.set(key, { fn, delay }); return key; }, clearTimeout: key => timers.delete(key),
    setInterval: (fn, delay) => { intervals.push({ fn, delay }); return {}; }, clearInterval: () => {} });
  const modules = new Map();
  const host = {
    electron: { app, BrowserWindow: Window, Tray, Menu: { setApplicationMenu() {}, buildFromTemplate: x => x }, ipcMain: { handle: (name, fn) => handlers.set(name, fn) },
      nativeImage: { createFromPath: () => ({ resize() { return this; } }) }, dialog: { showMessageBox: async () => ({ response: 1 }) }, shell: { openExternal: async url => external.push(url) } },
    'electron-updater': { default: { autoUpdater: updater } },
    '../scripts/studio-server.mjs': { startStudioServer: async options => { startOptions = options; return scenario.startsWith('startup-') ? await new Promise(resolve => { resolveStart = resolve; }) : handle; } },
  };
  const link = async (specifier) => {
    if (modules.has(specifier)) return modules.get(specifier);
    let module;
    if (specifier.startsWith('./')) {
      module = new vm.SourceTextModule(await readFile(new URL(`../../electron/${specifier.slice(2)}`, import.meta.url), 'utf8'), { context });
      modules.set(specifier, module); await module.link(link); return module;
    }
    const exports = host[specifier] || await import(specifier);
    module = new vm.SyntheticModule(Object.keys(exports), function() { for (const key of Object.keys(exports)) this.setExport(key, exports[key]); }, { context });
    modules.set(specifier, module); return module;
  };
  const main = new vm.SourceTextModule(await readFile(new URL('../../electron/main.js', import.meta.url), 'utf8'), { context, initializeImportMeta: meta => { meta.url = new URL('../../electron/main.js', import.meta.url).href; } });
  await main.link(link); await main.evaluate();
  const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
  const fire = async delay => { for (const [key, timer] of [...timers]) if (timer.delay === delay) { timers.delete(key); timer.fn(); } await flush(); };
  await flush();
  const win = windows[0];
  const event = win && { sender: win.webContents, senderFrame: win.webContents.mainFrame };
  if (scenario === 'ipc') {
    for (const fn of handlers.values()) {
      for (const invalid of [{ sender: {}, senderFrame: event.senderFrame }, { ...event, senderFrame: { url: handle.url, parent: {} } }, { ...event, senderFrame: { url: handle.url, parent: null } }]) {
        assert.throws(() => fn(invalid), /Unauthorized/);
      }
    }
    event.senderFrame.url = 'https://foreign.example/';
    for (const fn of handlers.values()) assert.throws(() => fn(event), /Unauthorized/);
    assert.equal(stops, 0); assert.equal(quit, 0);
    event.senderFrame.url = handle.url;
    assert.equal(handlers.get('vibe:get-version')(event), '1');
    await handlers.get('vibe:quit')(event); assert.equal(quit, 1);
  } else if (scenario === 'updates') {
    assert.equal(updater.autoDownload, false);
    assert.equal(updater.autoInstallOnAppQuit, false);
    assert.equal(intervals[0].delay, 6 * 60 * 60 * 1000);
    let checks = 0, downloads = 0, installs = 0;
    updater.checkForUpdates = async () => { checks++; updater.emit('update-available', { version: '2' }); };
    updater.downloadUpdate = async () => { downloads++; updater.emit('download-progress', { percent: 50 }); updater.emit('update-downloaded', { version: '2' }); };
    updater.quitAndInstall = (silent, force) => { installs++; assert.equal(silent, false); assert.equal(force, true); app.quit(); };
    const state = () => handlers.get('vibe:get-update-state')(event);
    assert.equal(state().currentVersion, '1');
    assert.equal(state().state, 'idle');
    await handlers.get('vibe:quit-and-install')(event); assert.equal(installs, 0);
    await fire(20_000);
    assert.equal(checks, 1); assert.equal(downloads, 0);
    assert.equal(state().state, 'available'); assert.equal(state().availableVersion, '2');
    await intervals[0].fn(); await flush(); assert.equal(checks, 2);
    await handlers.get('vibe:download-update')(event);
    assert.equal(downloads, 1); assert.equal(state().state, 'downloaded'); assert.equal(state().percent, 100);
    await intervals[0].fn(); await flush(); assert.equal(checks, 2);
    await handlers.get('vibe:quit-and-install')(event); await flush();
    assert.equal(stops, 1); assert.equal(installs, 1); assert.equal(quit, 1);
  } else if (scenario === 'navigation') {
    for (const name of ['will-navigate', 'will-redirect']) {
      for (const url of ['https://foreign.example/', 'javascript:alert(1)', 'file:///tmp/a', 'data:text/html,test']) {
        let blocked = false; win.webContents.emit(name, { preventDefault: () => { blocked = true; } }, url); assert.equal(blocked, true);
      }
      let blocked = false; win.webContents.emit(name, { preventDefault: () => { blocked = true; } }, handle.url); assert.equal(blocked, false);
    }
    for (const url of ['javascript:alert(1)', 'file:///tmp/a', 'data:text/html,test', 'http://foreign.example/', 'https://user:password@foreign.example/']) assert.equal(win.open({ url }).action, 'deny');
    assert.equal(external.length, 0);
    assert.equal(win.open({ url: 'https://example.com/docs' }).action, 'deny'); await flush(); assert.deepEqual(external, ['https://example.com/docs']);
  } else if (scenario.startsWith('installer')) {
    updater.emit('update-downloaded', { version: '2' });
    await handlers.get('vibe:quit-and-install')(event); await flush();
    if (scenario === 'installer-hung') await fire(5000);
    assert.equal(stops, 1); assert.equal(quit, 1);
    assert.match(handlers.get('vibe:get-update-state')(event).error, /installer refused|timed out/);
    await handlers.get('vibe:quit')(event); assert.equal(quit, 1);
  } else if (scenario.startsWith('startup-late-cleanup')) {
    // The handle is already available before shutdown's startup wait expires,
    // but its cleanup is still in progress at that deadline (review R3b).
    app.quit(); await flush();
    resolveStart(handle); await flush();
    assert.equal(stops, 1); assert.equal(stopComplete, false);
    assert.equal(quit, 0);
    await fire(1000);
    assert.equal(quit, 0, 'native quit must await cleanup of the known late handle');
    assert.equal(trayDestroyed, 0); assert.equal(windows.length, 0); assert.equal(loads, 0);
    if (scenario.endsWith('timeout')) {
      assert.equal([...timers.values()].filter(timer => timer.delay === 4000).length, 1);
      await fire(4000);
      assert.equal(quit, 1, 'outer cleanup deadline must permit native quit');
      assert.equal(stopComplete, false);
    }
    releaseStop(); await flush();
    assert.equal(stopComplete, true); assert.equal(stops, 1); assert.equal(quit, 1);
    await startOptions.onQuit(); await flush();
    assert.equal(stops, 1); assert.equal(quit, 1); assert.equal(windows.length, 0);
  } else {
    assert.equal(startOptions.requireOwnership, true);
    if (scenario === 'startup-deadline') await fire(15000);
    else { app.quit(); await flush(); await fire(1000); }
    assert.equal(quit, 1); assert.equal(loads, 0); assert.equal(windows.length, 0);
    if (scenario !== 'startup-hung') { resolveStart(handle); await flush(); assert.equal(stops, 1); assert.equal(windows.length, 0); }
  }
}
