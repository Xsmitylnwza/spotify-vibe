import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { startStudioServer } from '../studio-server.mjs';
import { createDefaultConfig } from '../presence-config.mjs';
import { selectAppPreset, selectRunningPreset } from '../app-presence.mjs';
import { DEFAULT_APP_ICON_REF, packedAppIcon } from '../app-icon-pack.mjs';

async function fixture(t, { login = async () => {}, config = createDefaultConfig(), installed = [] } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-p2-endpoints-'));
  config.settings.autostartEnabled = false;
  config.settings.selectionMode = 'apps';
  await writeFile(join(directory, 'presence-config.json'), JSON.stringify(config));
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  let emit;
  const clients = [];
  const server = await startStudioServer({ argv:[], port, dataDirectory:directory, openBrowser:false, exitProcess:false,
    environment:{ PRESENCE_AUTOSTART_DISABLE:'1', PRESENCE_APP_DETECTION_DISABLE:'1' },
    getInstalledApps:() => installed,
    refreshInstalledApps:async () => {},
    watchApps:callback => { emit = callback; return () => {}; },
    createDiscordClient:() => {
      const rpc = new EventEmitter();
      clients.push(rpc);
      rpc.login = () => login(clients.length);
      rpc.destroy = async () => {};
      rpc.request = async () => {};
      rpc.clearActivity = async () => {};
      return rpc;
    },
  });
  t.after(async () => { await server.stop(); await rm(directory, { recursive:true, force:true }); });
  const request = async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(server.url + path, { method, headers:{ 'Content-Type':'application/json', ...headers }, ...(body === undefined ? {} : { body:JSON.stringify(body) }) });
    return { status:response.status, body:await response.json() };
  };
  await request('/api/state');
  return { request, emit, clients, directory, config, url:server.url };
}

test('HTTP reconnect forces a fresh attempt from connected and returns runtime shape', async t => {
  const f = await fixture(t);
  assert.equal(f.clients.length, 1);
  const result = await f.request('/api/reconnect', 'POST');
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.runtime.connected, true);
  assert.deepEqual(Object.keys(result.body.runtime).sort(), Object.keys((await f.request('/api/settings')).body.runtime).sort());
  assert.equal(f.clients.length, 2);
});

test('HTTP reconnect cancels pending backoff, settles failure as 200 and then recovers', async t => {
  let fail = true;
  const f = await fixture(t, { login:async () => { if (fail) throw new Error('fake RPC unavailable'); } });
  assert.equal(f.clients.length, 1);
  const failed = await f.request('/api/reconnect', 'POST');
  assert.equal(failed.status, 200);
  assert.equal(failed.body.ok, false);
  assert.equal(failed.body.runtime.connectionState, 'disconnected');
  assert.match(failed.body.runtime.lastError, /fake RPC unavailable/);
  assert.ok(failed.body.runtime.nextReconnectAt);
  assert.equal(f.clients.length, 2, 'immediate attempt precedes backoff');
  fail = false;
  const recovered = await f.request('/api/reconnect', 'POST');
  assert.equal(recovered.body.ok, true);
  assert.equal(recovered.body.runtime.nextReconnectAt, null);
  await delay(2100);
  assert.equal(f.clients.length, 3, 'cancelled backoff cannot start another attempt');
});

for (const fails of [false, true]) test('concurrent HTTP reconnect calls join one pending login: ' + (fails ? 'failure' : 'success'), async t => {
  let release, entered;
  const barrier = new Promise(resolve => { release = resolve; });
  const pending = new Promise(resolve => { entered = resolve; });
  const f = await fixture(t, { login:async index => { if (index === 2) { entered(); await barrier; if (fails) throw new Error('joined failure'); } } });
  let settled = 0;
  const first = f.request('/api/reconnect', 'POST').then(result => { settled++; return result; });
  await pending;
  const second = f.request('/api/reconnect', 'POST').then(result => { settled++; return result; });
  await delay(50);
  assert.equal(settled, 0);
  assert.equal(f.clients.length, 2);
  release();
  for (const result of await Promise.all([first, second])) {
    assert.equal(result.status, 200); assert.equal(result.body.ok, !fails);
    assert.equal(result.body.runtime.connectionState, fails ? 'disconnected' : 'connected');
    if (fails) assert.match(result.body.runtime.lastError, /joined failure/);
  }
  assert.equal(f.clients.length, 2);
});

test('HTTP reconnect joins the startup login instead of starting another attempt', async t => {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const f = await fixture(t, { login:() => barrier });
  assert.equal((await f.request('/api/state')).body.connectionState, 'connecting');
  let settled = false;
  const pending = f.request('/api/reconnect', 'POST').then(result => { settled = true; return result; });
  await delay(50);
  assert.equal(settled, false);
  assert.equal(f.clients.length, 1);
  release();
  const result = await pending;
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(f.clients.length, 1);
});

test('HTTP reconnect rejects foreign Origin and Host before touching RPC', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/reconnect', 'POST', undefined, { Origin:'https://foreign.example' })).status, 403);
  for (const path of ['/api/reconnect', f.url + '/api/reconnect']) {
  const status = await new Promise((resolve, reject) => {
    const req = httpRequest(f.url, { path, method:'POST', headers:{ Host:'foreign.example' } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    }); req.on('error', reject); req.end();
  });
  assert.equal(status, 403);
  }
  assert.equal(f.clients.length, 1);
});

test('HTTP app catalogs add publicIcon without changing any existing fields', async t => {
  assert.equal(DEFAULT_APP_ICON_REF, 'main');
  const entries = [{ executable:'C:\\Apps\\Discord.exe', name:'Discord', processId:42, icon:'local-icon' },
    { executable:'C:\\Apps\\custom-tool.exe', name:'Uncatalogued Tool', extra:{ keep:true } }];
  const f = await fixture(t, { installed:entries });
  f.emit({ apps:entries, running:entries.map(app => app.executable), supported:true, error:null });
  for (const path of ['/api/apps', '/api/installed-apps', '/api/installed-apps?refresh=1']) {
    const result = await f.request(path);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.apps, entries.map(app => ({ ...app, publicIcon:packedAppIcon(app),
      iconSource:packedAppIcon(app) ? 'pack' : 'default', iconStatus:packedAppIcon(app) ? 'ready' : '' })));
    assert.match(result.body.apps[0].publicIcon, /^https:\/\//);
    assert.equal(result.body.apps[1].publicIcon, '');
  }
  assert.equal(Object.hasOwn(entries[0], 'publicIcon'), false);
});

test('HTTP config defaults enabled, persists true/false, and rejects invalid values atomically', async t => {
  const f = await fixture(t);
  const config = (await f.request('/api/config')).body;
  assert.ok(config.scenes.every(scene => scene.enabled === true));
  const scenes = config.scenes.map((scene, index) => ({ ...scene, enabled:index !== 0 }));
  const saved = await f.request('/api/config', 'PUT', { scenes });
  assert.equal(saved.status, 200);
  assert.deepEqual((await f.request('/api/config')).body.scenes, saved.body.config.scenes);
  const path = join(f.directory, 'presence-config.json');
  const bytes = await readFile(path, 'utf8');
  assert.deepEqual(JSON.parse(bytes).scenes.map(scene => scene.enabled), scenes.map(scene => scene.enabled));
  for (const enabled of [null, 'false', 0, {}, []]) {
    const invalid = await f.request('/api/config', 'PUT', { scenes:[{ ...scenes[0], enabled }] });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /enabled must be a boolean/);
    assert.equal(await readFile(path, 'utf8'), bytes);
  }
  const { enabled, ...legacy } = scenes[0];
  const defaulted = await f.request('/api/config', 'PUT', { scenes:[legacy, ...scenes.slice(1)] });
  assert.equal(defaulted.status, 200);
  assert.equal(defaulted.body.config.scenes[0].enabled, true);
});

test('disabled Scene falls through to the next running app; explicit HTTP pin still wins', async t => {
  const config = createDefaultConfig();
  config.scenes[0].enabled = false;
  config.appMappings = [{ executable:'C:\\a.exe', name:'A', sceneId:config.scenes[0].id, enabled:true },
    { executable:'C:\\b.exe', name:'B', sceneId:config.scenes[1].id, enabled:true }];
  const f = await fixture(t, { config });
  f.emit({ apps:config.appMappings, running:['C:\\a.exe', 'C:\\b.exe'], foregroundExecutable:'C:\\a.exe', supported:true });
  await delay(220);
  const state = (await f.request('/api/state')).body;
  assert.equal(state.selectedApplication, 'B');
  assert.equal(state.desiredSceneId, config.scenes[1].id);
  assert.equal(selectRunningPreset(config.appMappings, ['C:\\a.exe', 'C:\\b.exe'], ['C:\\a.exe'], config.scenes).sceneId, config.scenes[1].id);
  assert.equal(selectAppPreset(config.appMappings, 'C:\\a.exe', config.scenes), null);
  const pinned = await f.request('/api/override', 'POST', { sceneId:config.scenes[0].id });
  assert.equal(pinned.status, 200);
  assert.equal(pinned.body.runtime.selectionSource, 'override');
  assert.equal(pinned.body.runtime.desiredSceneId, config.scenes[0].id);
  assert.equal(pinned.body.runtime.currentSceneId, config.scenes[0].id);
});

test('bundled IBM Plex fonts referenced by studio-ci.css are served as woff2; traversal is refused', async t => {
  const { url: base } = await fixture(t);
  const css = await (await fetch(base + '/studio-ci.css')).text();
  const fonts = [...new Set([...css.matchAll(/url\((assets\/fonts\/[^)]+\.woff2)\)/g)].map(match => match[1]))];
  assert.ok(fonts.length >= 3, 'stylesheet bundles IBM Plex');
  for (const path of fonts) {
    const response = await fetch(new URL(path, base + '/studio-ci.css'));
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('content-type'), 'font/woff2');
    assert.ok((await response.arrayBuffer()).byteLength > 1000);
  }
  assert.equal((await fetch(base + '/assets/fonts/..%2Fpresence-config.json')).status, 404);
  assert.equal((await fetch(base + '/assets/fonts/OFL-IBM-Plex.txt')).status, 404);
});
