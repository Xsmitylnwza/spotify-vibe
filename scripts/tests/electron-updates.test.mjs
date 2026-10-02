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
  assert.equal((await updates.download()).ok, false);
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
