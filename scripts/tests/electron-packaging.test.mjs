import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve('scripts', '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

test('package.json wires the Electron entry and builder config', () => {
  assert.equal(pkg.main, 'electron/main.js');
  assert.ok(pkg.scripts.dev.includes('electron'), 'npm run dev starts Electron');
  assert.ok(pkg.scripts.dist.includes('electron-builder'), 'npm run dist builds installers');
  assert.equal(pkg.scripts.start, 'node scripts/discord-presence-studio.mjs', 'browser/CLI path unchanged');
  const build = pkg.build;
  assert.equal(build.appId, 'com.vibestudio.app');
  assert.equal(build.productName, 'Vibe Studio');
  assert.ok(build.win.target.includes('nsis'), 'Windows NSIS installer target');
  assert.ok(build.mac.target.includes('dmg'), 'macOS DMG target');
  assert.equal(build.publish.provider, 'github');
  assert.equal(build.publish.owner, 'Xsmitylnwza');
  assert.equal(build.publish.repo, 'spotify-vibe');
  assert.ok(build.files.some((f) => f.includes('scripts')), 'server scripts packaged');
  assert.ok(build.files.some((f) => f.includes('electron')), 'electron shell packaged');
});

test('Electron shell files and icons exist', () => {
  for (const file of [
    'electron/main.js',
    'electron/preload.cjs',
    'electron/build-icons.mjs',
    'electron/assets/icon.png',
    'electron/assets/icon.ico',
    'electron/assets/icon.icns',
    'electron/assets/tray.png',
  ]) {
    const size = statSync(resolve(root, file)).size;
    assert.ok(size > 100, file + ' should be non-empty, got ' + size);
  }
});

test('main.js and preload.cjs parse cleanly', () => {
  for (const file of ['electron/main.js', 'electron/preload.cjs']) {
    const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, file + ' failed --check: ' + result.stderr);
  }
});

test('studio-server module exposes a side-effect-free startStudioServer', async () => {
  const mod = await import('../studio-server.mjs');
  assert.equal(typeof mod.startStudioServer, 'function');
  // Importing must not bind a port or exit — if it did, this test would hang/die.
});

test('preload bridge exposes the update/startup API surface', () => {
  const src = readFileSync(resolve(root, 'electron/preload.cjs'), 'utf8');
  for (const key of [
    'getVersion',
    'getUpdateState',
    'getOpenAtLogin',
    'setOpenAtLogin',
    'checkForUpdates',
    'downloadUpdate',
    'quitAndInstall',
    'onUpdateState',
  ]) {
    assert.ok(src.includes(key), 'preload should expose ' + key);
  }
  assert.ok(src.includes('contextBridge'), 'preload uses contextBridge');
});

test('main process implements background-first behavior', () => {
  const src = readFileSync(resolve(root, 'electron/main.js'), 'utf8');
  for (const needle of [
    'requestSingleInstanceLock',
    'setLoginItemSettings',
    'openAtLogin',
    'Tray',
    'setContextMenu',
    'window-all-closed',
    'autoUpdater',
    'checkForUpdates',
    'quitAndInstall',
    'startStudioServer',
    '--smoke-test',
  ]) {
    assert.ok(src.includes(needle), 'main.js should contain ' + needle);
  }
});

test('Studio UI has the update banner and desktop shell wiring', () => {
  const html = readFileSync(resolve(root, 'scripts/discord-presence-studio.html'), 'utf8');
  for (const needle of [
    'id="updateBanner"',
    'id="updateActionButton"',
    'function initDesktop',
    'setOpenAtLogin',
    'A new version of Vibe Studio is available.',
  ]) {
    assert.ok(html.includes(needle), 'studio HTML should contain ' + needle);
  }
  const css = readFileSync(resolve(root, 'scripts/studio-ci.css'), 'utf8');
  assert.ok(css.includes('.vs-update-banner'), 'banner styles present');
});
