import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { EventEmitter } from 'node:events';
import { createIconHosting, createIconUploader, iconPng, appIdentity } from './device-apps.mjs';
import { createRealAppServer } from './real-app-server.mjs';
import { createLiveController } from './live-controller.mjs';

// Real generated 1x1 RGBA PNG with CRCs; no user artwork.
export function tinyPng(value = 0) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
    for (const byte of body) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); body.copy(out, 4); out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4); return out;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0,value,0,0,255]))), chunk('IEND', Buffer.alloc(0))]);
}
const exe = 'C:\\Apps\\Unique.exe';
const app = (value = 0) => ({ id: appIdentity(exe), exe, name: 'Unique', icon: 'data:image/png;base64,' + tinyPng(value).toString('base64') });
async function directory(t) { const dir = await mkdtemp(join(tmpdir(), 'vibe-icons-test-')); t.after(() => rm(dir, { recursive: true })); return dir; }

test('consent null/false never uploads; consent true coalesces and persists hash cache across restart', async t => {
  const dir = await directory(t); let calls = 0;
  const uploader = async () => { calls++; return 'https://files.catbox.moe/icon.png'; };
  const hosting = createIconHosting(dir, { uploader });
  await hosting.pair([app()]); assert.equal(calls, 0);
  assert.equal((await hosting.decorate(app())).iconStatus, 'needs-consent');
  await hosting.setConsent(false); await hosting.pair([app()]); assert.equal(calls, 0);
  await hosting.setConsent(true); await Promise.all([hosting.pair([app()]), hosting.pair([app()])]); await hosting.drain();
  assert.equal(calls, 1); assert.equal((await hosting.decorate(app())).iconStatus, 'ready');
  const restarted = createIconHosting(dir, { uploader }); await restarted.pair([app()]); await restarted.drain(); assert.equal(calls, 1);
  await restarted.pair([app(1)]); await restarted.drain(); assert.equal(calls, 2);
});
test('popular icons skip upload; failures are truthful and do not repeatedly upload on reads', async t => {
  let calls = 0; const hosting = createIconHosting(await directory(t), { uploader: async () => { calls++; throw new Error('offline'); } });
  await hosting.setConsent(true);
  const popular = { ...app(), exe: 'C:\\Chrome\\chrome.exe', name: 'Google Chrome' };
  await hosting.pair([popular]); assert.equal(calls, 0); assert.equal((await hosting.decorate(popular)).iconStatus, 'ready');
  await hosting.pair([app()]); await hosting.drain(); await hosting.pair([app()]);
  assert.equal(calls, 1); assert.equal((await hosting.decorate(app())).iconStatus, 'failed'); assert.equal((await hosting.decorate(app())).publicIcon, '');
});
test('PNG limits and provider response validation; Catbox and ImgBB adapters use fake fetch', async () => {
  assert.throws(() => iconPng('data:image/png;base64,AAAA'));
  const big = tinyPng(); big.writeUInt32BE(257, 16); assert.throws(() => iconPng('data:image/png;base64,' + big.toString('base64')), /256/);
  for (const provider of ['catbox', 'imgbb']) {
    const upload = createIconUploader({ provider, apiKey: 'fake', fetchImpl: async (url, opts) => {
      assert.equal(opts.method, 'POST'); assert.ok(opts.body instanceof FormData);
      assert.match(url, provider === 'catbox' ? /catbox/ : /imgbb/);
      return new Response(provider === 'catbox' ? 'https://files.catbox.moe/t.png\n' : JSON.stringify({ data: { url: 'https://i.ibb.co/t.png' } }));
    } });
    assert.match(await upload(tinyPng()), /^https:/);
  }
  await assert.rejects(createIconUploader({ fetchImpl: async () => new Response('https://localhost/icon.png') })(tinyPng()));
  await assert.rejects(createIconUploader({ fetchImpl: async () => new Response('no', { status: 500 }) })(tinyPng()));
});

for (const fail of [false, true]) test(`HTTP pairing background upload and publish cached URL; failure=${fail}`, async t => {
  const dir = await directory(t); let release, uploads = 0;
  const hosting = createIconHosting(dir, { uploader: () => { uploads++; return new Promise((resolve, reject) => { release = () => fail ? reject(new Error('failed')) : resolve('https://files.catbox.moe/unique.png'); }); } });
  const client = new EventEmitter(); let payload;
  client.login = async () => {}; client.request = async (_, args) => { payload = args.activity; return {}; }; client.destroy = client.clearActivity = async () => {};
  const controller = createLiveController(() => client);
  const server = createRealAppServer({ dataDirectory: dir, iconHosting: hosting, catalog: async () => ({ running: [app()], installed: [] }),
    fetchImpl: async (_, opts) => { const input = JSON.parse(opts.body); return Response.json(await controller.command(input.action, input.scene)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await controller.command('end'); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`, headers = { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' };
  const request = (path, method, body, extra = {}) => fetch(base + path, { method, headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  assert.deepEqual(await (await fetch(base + '/api/icon-hosting')).json(), { consent: null, provider: 'catbox' });
  assert.equal((await request('/api/icon-hosting', 'POST', { consent: true }, { Origin: 'http://evil.test' })).status, 403);
  assert.equal((await request('/api/icon-hosting', 'POST', { consent: 'yes' })).status, 400);
  assert.equal((await request('/api/icon-hosting', 'POST', { consent: true })).status, 200);
  const workspace = { scenes: [{ id: 's1' }], rules: [{ kind: 'app', app: app().id, scene: 's1' }], apps: [app()], selectedSceneId: 's1', selectedAppId: app().id };
  assert.equal((await request('/api/device-workspace', 'PUT', workspace)).status, 200);
  let found = await (await fetch(base + '/api/device-apps')).json(); assert.equal(found.running[0].iconStatus, 'uploading'); assert.equal(uploads, 1);
  release(); await hosting.drain(); found = await (await fetch(base + '/api/device-apps')).json();
  assert.equal(found.running[0].iconStatus, fail ? 'failed' : 'ready');
  const result = await (await request('/api/mock-live', 'POST', { action: 'send', scene: { id: 's1', activityType: 'playing', activityName: 'Unique App', details: 'Working', largeImage: '@app', smallImage: '@app', appPublicIcon: 'https://stale.test/old.png' } })).json();
  assert.equal(result.scene.imageFallback, fail ? 'app_icon_no_public_url' : null);
  if (!fail) { assert.equal(payload.assets.large_image, 'https://files.catbox.moe/unique.png'); assert.equal(payload.assets.small_image, payload.assets.large_image); }
  else assert.match(payload.assets.large_image, /hinata/);
});
