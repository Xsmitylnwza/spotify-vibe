import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createUpdates } from '../../electron/updates.mjs';
import { assertReleaseVersion } from '../../electron/release-version.mjs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('preload download/restart actions and old aliases invoke the same guarded IPC channels', async () => {
  let bridge;
  const invoked = [];
  const ipcRenderer = { invoke: channel => { invoked.push(channel); return Promise.resolve(); } };
  vm.runInNewContext(await readFile(new URL('../../electron/preload.cjs', import.meta.url), 'utf8'), {
    require: () => ({ contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } }, ipcRenderer }),
  });
  await bridge.download(); await bridge.downloadUpdate();
  await bridge.restartToUpdate(); await bridge.quitAndInstall(); await bridge.getUpdateState();
  assert.deepEqual(invoked, ['vibe:download-update', 'vibe:download-update', 'vibe:quit-and-install', 'vibe:quit-and-install', 'vibe:get-update-state']);
});

test('release guard rejects malformed/mismatched tags and stale root lock versions', () => {
  const pkg = { version: '1.0.7' }, lock = { version: '1.0.7', packages: { '': { version: '1.0.7' } } };
  assertReleaseVersion('v1.0.7', pkg, lock);
  for (const tag of ['v1.0.1', '1.0.7', 'v1.0.7-beta', 'vfoo', undefined]) assert.throws(() => assertReleaseVersion(tag, pkg, lock));
  assert.throws(() => assertReleaseVersion('v1.0.7', pkg, { ...lock, version: '1.0.1' }));
  assert.throws(() => assertReleaseVersion('v1.0.7', pkg, { ...lock, packages: { '': { version: '1.0.1' } } }));
});

test('updater errors settle, download can retry, concurrent checks cannot disturb downloads', async () => {
  const updater = new EventEmitter(), states = [];
  updater.checkForUpdates = async () => { throw new Error('offline'); };
  const updates = createUpdates({ updater, currentVersion: '1.0.7', enabled: true, publish: state => states.push(state) });
  assert.equal((await updates.check()).ok, false);
  assert.equal(updates.snapshot().state, 'error');
  assert.equal(updates.snapshot().checking, false);
  updater.checkForUpdates = async () => { updater.emit('update-available', { version: '1.0.8' }); };
  await updates.check();
  let release;
  updater.downloadUpdate = () => new Promise(resolve => { release = resolve; });
  const download = updates.download();
  await Promise.resolve();
  assert.equal((await updates.check()).ok, false);
  let starts = 0; const original = updater.downloadUpdate; updater.downloadUpdate = () => { starts++; return original(); };
  assert.equal(updates.download(), download, 'a second request joins the in-flight download');
  assert.equal(starts, 0);
  assert.equal(updates.snapshot().state, 'downloading');
  updater.emit('update-downloaded', { version: '1.0.8' }); release(); await download;
  assert.equal(updates.snapshot().state, 'downloaded');
  assert.equal(updates.snapshot().error, null);
});

test('download failure publishes error and permits an explicit retry', async () => {
  const updater = new EventEmitter();
  const updates = createUpdates({ updater, currentVersion: '1.0.7', enabled: true, publish: () => {} });
  updater.emit('update-available', { version: '1.0.8' });
  updater.downloadUpdate = async () => { throw new Error('network lost'); };
  assert.equal((await updates.download()).ok, false);
  assert.equal(updates.snapshot().state, 'error');
  updater.downloadUpdate = async () => updater.emit('update-downloaded', { version: '1.0.8' });
  assert.equal((await updates.download()).ok, true);
  assert.equal(updates.snapshot().state, 'downloaded');
});

test('check deadline settles an updater promise that never resolves', async () => {
  const updater = new EventEmitter(); updater.checkForUpdates = () => new Promise(() => {});
  const updates = createUpdates({ updater, currentVersion: '1.0.7', enabled: true, publish: () => {}, checkTimeoutMs: 10 });
  assert.equal((await updates.check()).ok, false);
  assert.equal(updates.snapshot().state, 'error');
  assert.match(updates.snapshot().error, /timed out/);
});

test('autoDownload: a scheduled check that finds an update downloads it once and arms install-on-quit', async () => {
  const updater = new EventEmitter(); let downloads = 0;
  updater.checkForUpdates = async () => { updater.emit('update-available', { version: '1.0.9' }); };
  updater.downloadUpdate = async () => { downloads++; updater.emit('download-progress', { percent: 50 }); updater.emit('update-downloaded', { version: '1.0.9' }); };
  const states = [];
  const updates = createUpdates({ updater, currentVersion: '1.0.8', enabled: true, autoDownload: true, publish: state => states.push(state.state) });
  assert.equal(updater.autoDownload, false, 'downloads stay under createUpdates control');
  assert.equal(updater.autoInstallOnAppQuit, true);
  assert.equal((await updates.check()).ok, true);
  assert.equal(downloads, 1);
  assert.equal(updates.snapshot().state, 'downloaded');
  assert.deepEqual(states.filter((s, i) => s !== states[i - 1]), ['checking', 'available', 'downloading', 'downloaded']);
  assert.equal((await updates.check()).ok, false, 'later checks never re-download a ready installer');
  assert.equal(downloads, 1);
});

test('autoDownload off keeps the explicit download flow and no install-on-quit', async () => {
  const updater = new EventEmitter(); let downloads = 0;
  updater.checkForUpdates = async () => { updater.emit('update-available', { version: '1.0.9' }); };
  updater.downloadUpdate = async () => { downloads++; };
  const updates = createUpdates({ updater, currentVersion: '1.0.8', enabled: true, publish: () => {} });
  assert.equal(updater.autoInstallOnAppQuit, false);
  await updates.check();
  assert.equal(downloads, 0);
  assert.equal(updates.snapshot().state, 'available');
});

test('autoDownload: no update or a failed check does not start a download', async () => {
  const updater = new EventEmitter(); let downloads = 0;
  updater.downloadUpdate = async () => { downloads++; };
  const updates = createUpdates({ updater, currentVersion: '1.0.8', enabled: true, autoDownload: true, publish: () => {} });
  updater.checkForUpdates = async () => { updater.emit('update-not-available', {}); };
  await updates.check();
  updater.checkForUpdates = async () => { throw new Error('offline'); };
  assert.equal((await updates.check()).ok, false);
  assert.equal(downloads, 0);
});

test('seamless restart only runs for a downloaded update while the window is hidden in the tray or gone', async () => {
  const { autoRestartAllowed } = await import('../../electron/updates.mjs');
  const win = (visible, minimized = false) => ({ isDestroyed: () => false, isVisible: () => visible, isMinimized: () => minimized });
  assert.equal(autoRestartAllowed({ state: 'downloaded' }, null), true);
  assert.equal(autoRestartAllowed({ state: 'downloaded' }, win(false)), true);
  assert.equal(autoRestartAllowed({ state: 'downloaded' }, win(true, true)), false, 'a minimized window is still in use');
  assert.equal(autoRestartAllowed({ state: 'downloaded' }, win(true)), false, 'never restart under an owner who is using Studio');
  for (const state of ['idle', 'available', 'downloading', 'error']) assert.equal(autoRestartAllowed({ state }, null), false);
});
