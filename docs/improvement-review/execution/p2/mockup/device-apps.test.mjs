import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appIdentity, normalizeDeviceApps, readRunningApps, createDeviceCatalog } from './device-apps.mjs';
import { createRealAppServer } from './real-app-server.mjs';
const app = { name: 'Example App', executable: 'C:\\Apps\\Example.exe', icon: 'data:image/png;base64,AAAA' };
test('device identity preserves installations and normalizes case/slashes', () => {
  assert.equal(appIdentity('C:/Apps/Example.exe'), appIdentity(app.executable));
  assert.notEqual(appIdentity(app.executable), appIdentity('D:\\Apps\\Example.exe'));
});
test('catalog removes duplicate processes, invalid targets and unsafe icons', () => {
  const out = normalizeDeviceApps([app, { ...app }, { name: 'invalid', executable: 'bad' }, { name: 'Other', executable: 'C:\\Other.exe', icon: 'https://example.com/tracker', foreground: true }]);
  assert.equal(out.length, 2); assert.equal(out[0].foreground, true); assert.equal(out[0].icon, '');
});
test('running reader waits for process catalog after early foreground event, then stops helper', async () => {
  let stopped = false;
  const apps = await readRunningApps(callback => {
    callback({ supported: true, apps: [], running: [], foregroundExecutable: app.executable });
    queueMicrotask(() => callback({ supported: true, apps: [app], running: [app.executable] }));
    return () => { stopped = true; };
  });
  assert.equal(apps.length, 1); assert.equal(stopped, true);
});
test('unsupported discovery fails instead of returning fixtures', async () => {
  await assert.rejects(readRunningApps(callback => { callback({ supported: false }); return () => {}; }), /unavailable/);
});
test('catalog coalesces concurrent scans and refreshes installed apps explicitly', async () => {
  let reads = 0, scans = 0;
  const read = createDeviceCatalog('unused', { running: async () => { reads++; return normalizeDeviceApps([app]); }, installed: async () => { scans++; return [app]; } });
  await Promise.all([read(), read()]); assert.equal(reads, 1); assert.equal(scans, 1);
  await read(); assert.equal(scans, 1);
  await read({ refresh: true }); assert.equal(scans, 2);
});
test('real workspace saves and reloads independently, rejects invalid pairings and foreign origins', async t => {
  const prefix = join(tmpdir(), 'vibe-device-test-'), dir = await mkdtemp(prefix);
  const server = createRealAppServer({ dataDirectory: dir, catalog: async () => ({ source: 'windows', running: normalizeDeviceApps([app]), installed: [] }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); assert.ok(dir.startsWith(prefix)); await rm(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await (await fetch(base + '/api/device-apps')).json()).running[0].name, app.name);
  assert.equal(await (await fetch(base + '/api/device-workspace')).json(), null);
  const input = { scenes: [{ id: 'design', name: 'Design' }], rules: [{ id: 'r1', kind: 'app', app: appIdentity(app.executable), scene: 'design' }], apps: [{ id: appIdentity(app.executable), name: app.name, exe: app.executable }] };
  const opts = { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' }, body: JSON.stringify(input) };
  assert.equal((await fetch(base + '/api/device-workspace', opts)).status, 200);
  const saved = await (await fetch(base + '/api/device-workspace')).json(); assert.equal(saved.rules[0].app, input.rules[0].app);
  assert.equal(JSON.parse(await readFile(join(dir, 'workspace.json'), 'utf8')).scenes[0].id, 'design');
  assert.equal((await fetch(base + '/api/device-workspace', { ...opts, headers: { ...opts.headers, Origin: 'http://127.0.0.1:99' } })).status, 403);
  assert.equal((await fetch(base + '/api/device-workspace', { ...opts, body: JSON.stringify({ ...input, rules: [{ ...input.rules[0], scene: 'missing' }] }) })).status, 400);
  assert.equal((await (await fetch(base + '/api/device-workspace')).json()).rules[0].scene, 'design');
});
