import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { startStudioServer } from '../studio-server.mjs';
import { createDefaultConfig, validateConfig } from '../presence-config.mjs';

async function freePort() {
  const server = createNetServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function fixture(t, extra = {}) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'vibe-http-'));
  const configPath = join(directory, 'presence-config.json');
  const initial = validateConfig(createDefaultConfig());
  initial.settings.selectionMode = 'apps';
  initial.settings.autostartEnabled = false;
  await fs.writeFile(configPath, JSON.stringify(extra.config ?? initial));
  const server = await startStudioServer({ argv: [], port: await freePort(), dataDirectory: directory, environment: { PRESENCE_DISABLE_DEFAULT_APPLICATION: '1' }, openBrowser: false, exitProcess: false, disableHostEffects: true, ...extra });
  t.after(async () => { await server.stop(); await fs.rm(directory, { recursive: true, force: true }); });
  return { ...server, directory, configPath, initial, config: () => fetch(server.url + '/api/config').then(r => r.json()) };
}
function streamRequest(f, { path = '/api/config', method = 'PUT', chunks = [], host, finish = true, between = 0 } = {}) {
  let request;
  const response = new Promise((resolve, reject) => {
    request = httpRequest(f.url + path, { method, headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked', ...(host ? { Host: host } : {}) } }, res => {
      const buffers = [];
      res.on('data', b => buffers.push(b));
      res.on('end', () => { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(buffers).toString()) }); if (!finish) request.destroy(); });
    });
    request.on('error', reject);
  });
  void (async () => {
    for (const chunk of chunks) { request.write(chunk); if (between) await delay(between); }
    if (finish) request.end();
  })().catch(error => request.destroy(error));
  return response;
}
const jsonChunks = value => [Buffer.from(JSON.stringify(value))];

test('real HTTP stream preserves Thai/emoji at every interior codepoint byte split', async t => {
  const f = await fixture(t);
  const text = 'ภาษาไทย 🎧😀';
  const body = { scenes: [{ ...f.initial.scenes[0], details: text }], slots: [] };
  const bytes = Buffer.from(JSON.stringify(body));
  const positions = [];
  for (let i = 1; i < bytes.length; i++) if ((bytes[i] & 0xc0) === 0x80) positions.push(i);
  for (const split of positions) {
    const result = await streamRequest(f, { chunks: [bytes.subarray(0, split), bytes.subarray(split)], between: 2 });
    assert.equal(result.status, 200);
    assert.equal(result.body.config.scenes[0].details, text, 'split byte ' + split);
  }
  assert.equal((await f.config()).scenes[0].details, text);
});

for (const [name, chunks, status, code] of [
  ['invalid UTF-8', [Buffer.concat([Buffer.from('{"scenes":"'), Buffer.from([0xc3, 0x28]), Buffer.from('"}')])], 400, 'INVALID_UTF8'],
  ['malformed JSON', [Buffer.from('{broken')], 400, 'INVALID_JSON'],
  ['null', jsonChunks(null), 400, 'INVALID_BODY'],
  ['array', jsonChunks([]), 400, 'INVALID_BODY'],
  ['scalar', jsonChunks(3), 400, 'INVALID_BODY'],
  ['over byte cap', [Buffer.alloc(1_048_577, 0x20)], 413, 'BODY_TOO_LARGE'],
]) {
  test('HTTP rejects ' + name + ' with typed error and zero state/disk effects', async t => {
    const f = await fixture(t);
    const original = await fs.readFile(f.configPath, 'utf8');
    const result = await streamRequest(f, { chunks });
    assert.equal(result.status, status);
    assert.equal(result.body.code, code);
    assert.deepEqual(await f.config(), f.initial);
    assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
  });
}

test('HTTP accepts exactly 1 MiB, deadline is total body-read time', async t => {
  const f = await fixture(t);
  const base = '{"enabled":false,"padding":"';
  const end = '"}';
  const bytes = Buffer.from(base + 'x'.repeat(1_048_576 - base.length - end.length) + end);
  assert.equal(bytes.length, 1_048_576);
  const accepted = await streamRequest(f, { path: '/api/schedule', method: 'POST', chunks: [bytes] });
  assert.equal(accepted.status, 200);
  const original = await fs.readFile(f.configPath, 'utf8');
  const started = Date.now();
  const timed = await streamRequest(f, { path: '/api/schedule', method: 'POST', chunks: [Buffer.from('{"enabled":true')], finish: false });
  assert.equal(timed.status, 408);
  assert.equal(timed.body.code, 'BODY_TIMEOUT');
  assert.ok(Date.now() - started >= 4_900);
  assert.ok(Date.now() - started < 7_000);
  assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
  assert.equal((await f.config()).settings.scheduleEnabled, false);
});

test('malformed Host and absolute URL stay inside error boundary; server survives', async t => {
  const f = await fixture(t);
  const original = await fs.readFile(f.configPath, 'utf8');
  for (const values of [{ host: '[' }, { path: 'http://[/' }]) {
    // Absolute request targets require the path option, not URL construction.
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(f.url, { method: 'POST', path: values.path ?? '/api/schedule', headers: { Host: values.host ?? new URL(f.url).host } }, res => {
        const buffers = []; res.on('data', b => buffers.push(b)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(buffers)) }));
      }); req.on('error', reject); req.end('{"enabled":false}');
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'INVALID_URL');
  }
  assert.deepEqual(await f.config(), f.initial);
  assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
});

test('failed HTTP mutation preserves memory/disk and subsequent commands recover', async t => {
  let fail = true;
  const f = await fixture(t, { configFs: { ...fs, rename: async (...args) => { if (fail) throw Object.assign(new Error('blocked'), { code: 'EPERM' }); return fs.rename(...args); } } });
  const original = await fs.readFile(f.configPath, 'utf8');
  for (const [path, method, body] of [
    ['/api/config', 'PUT', { scenes: [{ ...f.initial.scenes[0], details: 'new details' }], slots: [] }],
    ['/api/schedule', 'POST', { enabled: false }],
    ['/api/codex-session', 'PUT', { title: 'new session' }],
    ['/api/app-mappings', 'PUT', { selectionMode: 'apps', mappings: [] }],
    ['/api/presence', 'DELETE', {}],
  ]) {
    const result = await streamRequest(f, { path, method, chunks: jsonChunks(body) });
    assert.equal(result.status, 500, path);
    assert.equal(result.body.code, 'CONFIG_SAVE_FAILED');
    assert.deepEqual(await f.config(), f.initial);
    assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
  }
  fail = false;
  assert.equal((await streamRequest(f, { path: '/api/schedule', method: 'POST', chunks: jsonChunks({ enabled: false }) })).status, 200);
  assert.equal((await f.config()).settings.scheduleEnabled, false);
});

test('overlapping HTTP commands build from latest commit and preserve hidden slots', async t => {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  let saving;
  const entered = new Promise(resolve => { saving = resolve; });
  let writes = 0;
  const f = await fixture(t, { configFs: { ...fs, rename: async (...args) => { if (++writes === 1) { saving(); await barrier; } return fs.rename(...args); } } });
  const first = streamRequest(f, { path: '/api/schedule', method: 'POST', chunks: jsonChunks({ enabled: false }) });
  await entered;
  const second = streamRequest(f, { path: '/api/codex-session', chunks: jsonChunks({ title: 'concurrent title' }) });
  await delay(20);
  assert.equal((await f.config()).settings.scheduleEnabled, true, 'pending candidate is not published');
  release();
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
  const committed = await f.config();
  assert.equal(committed.settings.scheduleEnabled, false);
  assert.equal(committed.codexSession.title, 'concurrent title');
  assert.deepEqual(committed.slots, f.initial.slots);
  assert.deepEqual(JSON.parse(await fs.readFile(f.configPath, 'utf8')), committed);
});

test('legacy override expiry stays inert with no cleanup writes or retries', async t => {
  let now = Date.parse('2026-10-01T12:00:00Z');
  const jobs = new Map(); let id = 0, writes = 0;
  const clock = { now: () => now, setTimeout: (fn, ms) => { jobs.set(++id, { fn, ms }); return id; }, clearTimeout: key => jobs.delete(key) };
  const config = validateConfig(createDefaultConfig());
  config.settings.selectionMode = 'apps';
  config.manualOverride = { sceneId: config.scenes[0].id, expiresAt: new Date(now + 1000).toISOString(), unknown: ['retain'] };
  const f = await fixture(t, { config, clock, configFs: { ...fs, rename: async () => { writes++; throw new Error('must not write'); } } });
  const original = await fs.readFile(f.configPath, 'utf8');
  for (let attempt = 0; attempt < 8; attempt++) {
    assert.equal(jobs.size, 1);
    const [key, job] = jobs.entries().next().value;
    jobs.delete(key); now += job.ms;
    await job.fn();
    assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
    assert.equal(Object.hasOwn(await f.config(), 'manualOverride'), false);
    const state = await fetch(f.url + '/api/state').then(r => r.json());
    assert.equal(Object.hasOwn(state, 'manualOverride'), false);
    assert.equal(state.desiredSceneId, null);
  }
  assert.equal(writes, 0);
});

test('host quit hook receives response first and does not stop the server itself', async t => {
  let called = false;
  const f = await fixture(t, { onQuit: () => { called = true; } });
  const result = await streamRequest(f, { path: '/api/quit', method: 'POST' });
  assert.equal(result.status, 200); assert.equal(called, false);
  await delay(80); assert.equal(called, true);
  assert.ok((await f.config()).scenes.length);
});

test('requireOwnership rejects occupied port and cleans signal listeners without touching listener', async t => {
  const f = await fixture(t);
  const sigint = process.listenerCount('SIGINT'); const sigterm = process.listenerCount('SIGTERM');
  await assert.rejects(startStudioServer({ argv: [], port: f.port, dataDirectory: f.directory, environment: { PRESENCE_DISABLE_DEFAULT_APPLICATION: '1' }, disableHostEffects: true, openBrowser: false, exitProcess: false, requireOwnership: true }), { code: 'STUDIO_PORT_IN_USE' });
  assert.equal(process.listenerCount('SIGINT'), sigint); assert.equal(process.listenerCount('SIGTERM'), sigterm);
  assert.ok((await f.config()).scenes.length);
});

test('maximum 20 Scenes, 24 slots and 100 mappings round-trip through real HTTP', async t => {
  const f = await fixture(t);
  const longText = 'ไทย😀'.repeat(25) + 'ไทย'; // 128 UTF-16 units
  const longUrl = 'https://example.com/' + 'ก'.repeat(512 - 'https://example.com/'.length);
  const scenes = Array.from({ length: 20 }, (_, i) => ({ ...f.initial.scenes[0], id: 'scene-' + i, sceneName: 'ก'.repeat(38) + String(i).padStart(2, '0'), activityName: longText, details: longText, state: longText, largeImageText: longText, smallImageText: longText, detailsUrl: longUrl, stateUrl: longUrl, largeImage: longUrl, smallImage: longUrl, largeImageUrl: longUrl, smallImageUrl: longUrl, timerMode: 'remaining', timerMinutes: 1440, buttons: [{ label: 'ก'.repeat(32), url: longUrl }, { label: 'ก'.repeat(32), url: longUrl }] }));
  const slots = Array.from({ length: 24 }, (_, i) => ({ id: 'slot-' + i, sceneId: scenes[i % 20].id, startTime: String(i).padStart(2, '0') + ':00', enabled: i % 2 === 0 }));
  const result = await streamRequest(f, { chunks: jsonChunks({ scenes, slots }) });
  assert.equal(result.status, 200);
  const mappings = Array.from({ length: 100 }, (_, i) => ({ executable: 'C:\\Apps\\' + 'ก'.repeat(1010) + String(i).padStart(2, '0') + '.exe', name: 'ก'.repeat(80), sceneId: scenes[i % 20].id }));
  const mapped = await streamRequest(f, { path: '/api/app-mappings', chunks: jsonChunks({ selectionMode: 'apps', mappings }) });
  assert.equal(mapped.status, 200);
  assert.equal(mapped.body.config.appMappings.length, 100);
  assert.deepEqual(mapped.body.config.slots, slots);
  const edit = await streamRequest(f, { chunks: jsonChunks({ scenes }) });
  assert.equal(edit.status, 200);
  assert.deepEqual(edit.body.config.slots, slots, 'omitted legacy slots stay intact');
  assert.equal(edit.body.config.appMappings.length, 100);
});

test('aborted real HTTP stream leaves config/disk unchanged and server responsive', async t => {
  const f = await fixture(t);
  const original = await fs.readFile(f.configPath, 'utf8');
  await new Promise(resolve => {
    const req = httpRequest(f.url + '/api/schedule', { method: 'POST', headers: { 'Transfer-Encoding': 'chunked' } });
    req.on('error', () => resolve()); req.on('close', resolve);
    req.write('{"enabled":');
    setTimeout(() => req.destroy(), 20);
  });
  await delay(20);
  assert.deepEqual(await f.config(), f.initial);
  assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
});

test('stop aborts injected scan/helper and bounds a hung RPC destroy during pending login', async t => {
  const { EventEmitter } = await import('node:events');
  const { PassThrough } = await import('node:stream');
  let killed = false; let watcherStopped = false; let forced = false; let destroyCalled = false;
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => { killed = true; child.emit('close'); return true; };
  const rpc = new EventEmitter();
  rpc.login = () => new Promise(() => {});
  rpc.destroy = () => { destroyCalled = true; return new Promise(() => {}); };
  rpc.transport = { socket: { destroy: () => { forced = true; } }, close: async () => {} };
  const f = await fixture(t, { disableHostEffects: false,
    environment: { PRESENCE_DISABLE_DEFAULT_APPLICATION: '1', PRESENCE_AUTOSTART_DISABLE: '1', DISCORD_CLIENT_ID: '1526867893508116620' },
    createDiscordClient: () => rpc, watchApps: () => () => { watcherStopped = true; },
    installedAppsOptions: { platform: 'win32', spawnProcess: () => child } });
  await delay(30);
  const started = Date.now();
  const first = f.stop(); const second = f.stop();
  assert.equal(first, second, 'idempotent shared stop promise');
  await first;
  assert.equal(killed, true); assert.equal(watcherStopped, true); assert.equal(destroyCalled, true); assert.equal(forced, true);
  assert.ok(Date.now() - started >= 2_900 && Date.now() - started < 4_500);
  await assert.rejects(fetch(f.url + '/api/config'));
});

test('owner fields survive real HTTP pause, Scene, mappings and session commands', async t => {
  const seeded = validateConfig(createDefaultConfig());
  seeded.settings.selectionMode = 'apps';
  seeded.ownerExtension = { nested: [null, false, 'ไทย😀'], flag: 7 };
  seeded.settings.ownerExtension = { theme: 'owner', custom: ['a', 'b'] };
  seeded.scenes.forEach(scene => { scene.ownerExtension = { identity: scene.id, entries: [1, null] }; });
  seeded.slots.reverse().forEach(slot => { slot.ownerExtension = { identity: slot.id, entries: ['keep', false] }; });
  seeded.appMappings = [{ executable: 'C:\\Apps\\owner.exe', name: 'owner', sceneId: seeded.scenes[0].id, enabled: true, ownerExtension: { map: ['retain', null] } }];
  const f = await fixture(t, { config: seeded, environment: { PRESENCE_DISABLE_DEFAULT_APPLICATION: '1', DISCORD_CLIENT_ID: '1526867893508116620' } });
  const original = await fs.readFile(f.configPath, 'utf8');
  assert.equal(original, JSON.stringify(seeded), 'startup remains read-only');
  const projection = await f.config();
  assert.equal(Object.hasOwn(projection, 'ownerExtension'), false);
  assert.equal(Object.hasOwn(projection.settings, 'ownerExtension'), false);
  const scenes = [...projection.scenes].reverse().map(scene => ({ ...scene, details: 'edited text' }));
  const commands = [
    ['/api/schedule', 'POST', { enabled: false }],
    ['/api/config', 'PUT', { scenes }],
    ['/api/app-mappings', 'PUT', { selectionMode: 'apps', mappings: [{ ...projection.appMappings[0], executable: 'c:\\apps\\OWNER.exe', name: 'renamed' }] }],
    ['/api/codex-session', 'PUT', { title: 'session title' }],
  ];
  for (const [path, method, body] of commands) {
    assert.equal((await streamRequest(f, { path, method, chunks: jsonChunks(body) })).status, 200, path);
    const disk = JSON.parse(await fs.readFile(f.configPath, 'utf8'));
    assert.deepEqual(disk.ownerExtension, seeded.ownerExtension, path + ' root');
    assert.deepEqual(disk.settings.ownerExtension, seeded.settings.ownerExtension, path + ' settings');
    assert.deepEqual(disk.slots, seeded.slots, path + ' untouched raw slots/order');
    for (const scene of disk.scenes) assert.deepEqual(scene.ownerExtension, seeded.scenes.find(old => old.id === scene.id).ownerExtension, path + ' Scene identity');
    assert.deepEqual(disk.appMappings[0].ownerExtension, seeded.appMappings[0].ownerExtension, path + ' mapping identity');
    assert.equal(Object.hasOwn(await f.config(), 'ownerExtension'), false);
  }
});

test('owner fields follow stable ids during explicit slots write and intentional Scene deletion', async t => {
  const seeded = validateConfig(createDefaultConfig());
  seeded.settings.selectionMode = 'apps';
  seeded.scenes.forEach(scene => { scene.ownerExtension = { identity: scene.id }; });
  seeded.slots.forEach(slot => { slot.ownerExtension = { identity: slot.id }; });
  const f = await fixture(t, { config: seeded });
  const projection = await f.config();
  const removedId = projection.scenes.at(-1).id;
  const scenes = projection.scenes.filter(scene => scene.id !== removedId).reverse();
  const slots = projection.slots.filter(slot => slot.sceneId !== removedId).reverse();
  slots[0] = { ...slots[0], startTime: '01:23' };
  slots.push({ id: 'new-slot', startTime: '02:34', sceneId: scenes[0].id, enabled: true });
  assert.equal((await streamRequest(f, { chunks: jsonChunks({ scenes, slots }) })).status, 200);
  const disk = JSON.parse(await fs.readFile(f.configPath, 'utf8'));
  assert.equal(disk.scenes.some(scene => scene.id === removedId), false);
  for (const scene of disk.scenes) assert.deepEqual(scene.ownerExtension, { identity: scene.id });
  for (const slot of disk.slots) {
    if (slot.id === 'new-slot') assert.equal(Object.hasOwn(slot, 'ownerExtension'), false, 'new slot cannot inherit by index');
    else assert.deepEqual(slot.ownerExtension, { identity: slot.id });
  }
  assert.equal((await streamRequest(f, { path: '/api/schedule', method: 'POST', chunks: jsonChunks({ enabled: false }) })).status, 200);
  assert.equal(JSON.parse(await fs.readFile(f.configPath, 'utf8')).scenes.some(scene => scene.id === removedId), false, 'deleted Scene must not resurrect');
});

test('owner fields and legacy override survive heartbeat with fake clock and real disk', async t => {
  let now = Date.parse('2026-10-02T12:00:00Z');
  let job;
  const seeded = validateConfig(createDefaultConfig());
  seeded.ownerExtension = { expiry: ['retain'] };
  seeded.settings.ownerExtension = { expiry: 'settings' };
  seeded.scenes[0].ownerExtension = { expiry: 'Scene' };
  seeded.slots.reverse(); seeded.slots[0].ownerExtension = { expiry: 'slot' };
  seeded.manualOverride = { sceneId: seeded.scenes[0].id, expiresAt: new Date(now + 1000).toISOString() };
  const clock = { now: () => now, setTimeout: (fn, ms) => { job = { fn, ms }; return 1; }, clearTimeout: () => { job = undefined; } };
  const f = await fixture(t, { config: seeded, clock });
  now += job.ms; await job.fn();
  const disk = JSON.parse(await fs.readFile(f.configPath, 'utf8'));
  assert.deepEqual(disk.manualOverride, seeded.manualOverride);
  assert.deepEqual(disk.ownerExtension, seeded.ownerExtension);
  assert.deepEqual(disk.settings.ownerExtension, seeded.settings.ownerExtension);
  assert.deepEqual(disk.scenes[0].ownerExtension, seeded.scenes[0].ownerExtension);
  assert.deepEqual(disk.slots, seeded.slots);
});
