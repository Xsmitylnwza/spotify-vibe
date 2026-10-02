import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createUpdates } from '../../electron/updates.mjs';
import { createShutdown } from '../../electron/lifecycle.mjs';

const require = createRequire(import.meta.url);
const { NsisUpdater } = require('electron-updater');
const { NodeHttpExecutor } = require('builder-util/out/nodeHttpExecutor');
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');

test('real generic feed: vA -> vB, explicit download, SHA512 verification, explicit restart', { timeout: 15000 }, async () => {
  const temp = await mkdtemp(join(tmpdir(), 'vibe-update-feed-'));
  const versions = ['1.0.7', '1.0.8'];
  const artifacts = new Map(versions.map(version => [`Vibe-Studio-Setup-${version}.exe`, Buffer.alloc(2 * 1024 * 1024, version)]));
  let latest = versions[0];
  const requests = [];
  const server = createServer(async (req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1);
    requests.push(name);
    if (name === 'latest.yml') {
      const file = `Vibe-Studio-Setup-${latest}.exe`;
      const data = artifacts.get(file);
      const sha512 = createHash('sha512').update(data).digest('base64');
      res.end(`version: ${latest}\nfiles:\n  - url: ${file}\n    sha512: ${sha512}\n    size: ${data.length}\npath: ${file}\nsha512: ${sha512}\nreleaseDate: '2026-10-03T00:00:00.000Z'\n`);
    } else if (artifacts.has(name)) {
      const data = artifacts.get(name);
      res.writeHead(200, { 'content-length': data.length });
      for (let offset = 0; offset < data.length; offset += 65536) {
        if (res.destroyed) break;
        res.write(data.subarray(offset, offset + 65536));
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      res.end();
    } else { res.writeHead(404); res.end(); }
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const config = join(temp, 'app-update.yml');
    await writeFile(config, 'updaterCacheDirName: feed-test-cache\n');
    const app = { version: versions[0], name: 'feed-test', isPackaged: true,
      userDataPath: temp, baseCachePath: temp, appUpdateConfigPath: config,
      whenReady: async () => {}, onQuit: () => assert.fail('silent install handler'),
    };
    const updater = new NsisUpdater(null, app);
    // Real updater/provider/download/hash pipeline, with Node HTTP as the host
    // adapter so npm test does not launch Electron or touch the owner's profile.
    const executor = new NodeHttpExecutor();
    executor.download = ElectronHttpExecutor.prototype.download;
    updater.httpExecutor = executor;
    updater.disableDifferentialDownload = true;
    updater.setFeedURL({ provider: 'generic', url: `http://127.0.0.1:${server.address().port}/` });
    const states = [], calls = [];
    const shutdown = createShutdown({
      stop: async () => calls.push('cleanup'), quit: () => calls.push('quit'),
      install: () => updater.quitAndInstall(false, true),
    });
    // Never execute the fake artifact: the native installer boundary is a spy.
    updater.quitAndInstall = (...args) => { calls.push(['quitAndInstall', ...args]); shutdown.exitObserved(); };
    const updates = createUpdates({ updater, currentVersion: app.version, enabled: true,
      publish: state => states.push(state), restart: () => shutdown({ restart: true }),
      installFailed: error => shutdown.installFailed(error),
    });
    assert.equal(updater.autoDownload, false);
    assert.equal(updater.autoInstallOnAppQuit, false);
    assert.deepEqual(updates.restartToUpdate(), { ok: false });
    assert.equal((await updates.check()).ok, true);
    assert.equal(updates.snapshot().state, 'idle');
    latest = versions[1];
    assert.equal((await updates.check()).ok, true);
    assert.equal(updates.snapshot().state, 'available');
    assert.equal(updates.snapshot().currentVersion, versions[0]);
    assert.equal(updates.snapshot().availableVersion, versions[1]);
    assert.equal(requests.filter(name => name.endsWith('.exe')).length, 0, 'check never downloads');
    assert.equal((await updates.download()).ok, true);
    assert.equal(updates.snapshot().state, 'downloaded');
    assert.equal(updates.snapshot().percent, 100);
    assert.ok(states.some(state => state.state === 'downloading' && state.percent > 0));
    assert.deepEqual(await readFile(updater.installerPath), artifacts.get(`Vibe-Studio-Setup-${latest}.exe`));
    assert.deepEqual([...new Set(states.map(state => state.state))], ['checking', 'idle', 'available', 'downloading', 'downloaded']);
    const before = requests.length;
    await updates.check();
    assert.equal(requests.length, before, 'scheduled check preserves downloaded installer');
    await updates.restartToUpdate();
    assert.deepEqual(calls, ['cleanup', ['quitAndInstall', false, true]]);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(temp, { recursive: true, force: true });
  }
});
