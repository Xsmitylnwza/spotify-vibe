import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get } from 'node:http';
import { createLiveServer } from './live-server.mjs';
import { createRealAppServer } from './real-app-server.mjs';

async function listen(server, t) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
const controller = { getUser: () => null, snapshot: () => ({ active: false }) };
const fakeKey = 'fakeTestKey_1234567890123456';
const fixture = { data: [{ id: 'gif-1', images: { original: { url: 'https://media.giphy.com/one.gif', width: '320', height: '240', size: '1000' }, fixed_width_small: { webp: 'https://media.giphy.com/one.webp' } } }], pagination: { offset: 12, count: 1, total_count: 14 } };

test('GIF route reads existing secret path, reuses provider validation/cache, and returns safe shape', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-gifs-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const secretsPath = join(directory, 'app-secrets.json');
  await writeFile(secretsPath, JSON.stringify({ version: 1, giphyApiKey: fakeKey }));
  let calls = 0;
  const { server } = createLiveServer(controller, { env: { PRESENCE_CONFIG_PATH: join(directory, 'presence-config.json') }, fetchImpl: async url => {
    calls++;
    assert.equal(url.origin, 'https://api.giphy.com');
    assert.equal(url.searchParams.get('api_key'), fakeKey);
    assert.equal(url.searchParams.get('q'), 'coding');
    assert.equal(url.searchParams.get('offset'), '12');
    return { ok: true, json: async () => fixture };
  } });
  const base = await listen(server, t);
  const expected = { results: [{ id: 'gif-1', url: 'https://media.giphy.com/one.gif', previewUrl: 'https://media.giphy.com/one.webp', width: 320, height: 240 }], next: 13 };
  for (let i = 0; i < 2; i++) {
    const response = await fetch(base + '/api/gifs?q=coding&offset=12');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
  }
  assert.equal(calls, 1);
  const invalid = await fetch(base + '/api/gifs?q=' + 'a'.repeat(81));
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: 'GIPHY_QUERY_INVALID' });
  assert.equal(calls, 1);
  await writeFile(secretsPath, JSON.stringify({ version: 1, giphyApiKey: '' }));
  const missing = await fetch(base + '/api/gifs?q=coding&offset=12');
  assert.equal(missing.status, 409);
  assert.deepEqual(await missing.json(), { error: 'no_key' });
});

test('GIF route guards origin/method before credentials or provider fetch; missing key is 409', async t => {
  let reads = 0;
  const { server } = createLiveServer(controller, { env: { PRESENCE_SECRETS_PATH: join(tmpdir(), 'fake-only-secrets.json') }, loadSecrets: async () => { reads++; return { giphyApiKey: '' }; }, fetchImpl: async () => { throw new Error('must not fetch'); } });
  const base = await listen(server, t);
  assert.equal((await fetch(base + '/api/gifs', { headers: { Origin: 'https://example.com' } })).status, 403);
  const wrongHostStatus = await new Promise((resolve, reject) => get(base + '/api/gifs', { headers: { Host: 'localhost:' + server.address().port } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject));
  assert.equal(wrongHostStatus, 403);
  assert.equal((await fetch(base + '/api/gifs', { method: 'POST' })).status, 405);
  assert.equal(reads, 0);
  const missing = await fetch(base + '/api/gifs');
  assert.equal(missing.status, 409);
  assert.deepEqual(await missing.json(), { error: 'no_key' });
});

test('GIF trending normalizes offset, terminal pagination, provider failures, and never leaks key', async t => {
  let fail = false;
  const { server } = createLiveServer(controller, { env: {}, loadSecrets: async () => ({ giphyApiKey: fakeKey }), fetchImpl: async url => {
    if (fail) throw new Error('private URL with key=' + fakeKey);
    assert.equal(url.pathname, '/v1/gifs/trending');
    assert.equal(url.searchParams.get('offset'), '0');
    return { ok: true, json: async () => ({ data: [], pagination: { count: 0, total_count: 0 } }) };
  } });
  const base = await listen(server, t);
  assert.deepEqual(await (await fetch(base + '/api/gifs?offset=-4')).json(), { results: [], next: null });
  fail = true;
  const response = await fetch(base + '/api/gifs?q=uncached');
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.equal(body.includes(fakeKey), false);
  assert.deepEqual(JSON.parse(body), { error: 'GIPHY_SEARCH_FAILED' });
});

test('real-device server proxies GIF search and no-key responses with same-origin guard', async t => {
  let calls = 0, key = fakeKey;
  const { server } = createLiveServer(controller, { env: {}, loadSecrets: async () => ({ giphyApiKey: key }), fetchImpl: async url => {
    calls++;
    assert.equal(url.searchParams.get('q'), 'coding');
    assert.equal(url.searchParams.get('offset'), '12');
    return { ok: true, json: async () => fixture };
  } });
  const liveBase = await listen(server, t);
  const real = createRealAppServer({ liveBase, catalog: async () => ({ apps: [] }), dataDirectory: join(tmpdir(), 'unused-vibe-gif-workspace') });
  const base = await listen(real, t);
  assert.equal((await fetch(base + '/api/gifs?q=coding&offset=12', { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal((await fetch(base + '/api/gifs', { method: 'POST' })).status, 405);
  assert.equal(calls, 0);
  const response = await fetch(base + '/api/gifs?q=coding&offset=12');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).next, 13);
  assert.equal(calls, 1);
  key = '';
  const missing = await fetch(base + '/api/gifs?q=coding&offset=12');
  assert.equal(missing.status, 409);
  assert.deepEqual(await missing.json(), { error: 'no_key' });
});
