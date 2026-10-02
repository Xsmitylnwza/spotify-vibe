import test from 'node:test';
import assert from 'node:assert/strict';
import { readProfile, createProfileServer } from './profile-server.mjs';

const user = { id: '123456789012345678', username: 'test-user', global_name: 'Test Name', avatar: 'a_test' };
test('identity handshake returns name, ID, and animated avatar; closes IPC without activity calls', async () => {
  const calls = [];
  const profile = await readProfile(() => ({ user, on() {}, async login(options) { calls.push(['login', options]); }, async destroy() { calls.push(['destroy']); } }));
  assert.equal(profile.connected, true);
  assert.equal(profile.discordUser.displayName, 'Test Name');
  assert.equal(profile.discordUser.id, user.id);
  assert.match(profile.discordUser.avatarUrl, /a_test\.gif/);
  assert.deepEqual(calls.map(c => c[0]), ['login', 'destroy']);
  assert.deepEqual(Object.keys(calls[0][1]), ['clientId']);
});
test('missing avatar and display name use Discord defaults', async () => {
  const profile = await readProfile(() => ({ user: { id: user.id, username: user.username }, on() {}, async login() {}, async destroy() {} }));
  assert.equal(profile.discordUser.displayName, user.username);
  assert.match(profile.discordUser.avatarUrl, /embed\/avatars\/\d\.png/);
});
test('failed connection drops identity and destroys IPC', async () => {
  let destroyed = false;
  const profile = await readProfile(() => ({ on() {}, async login() { throw new Error('closed'); }, async destroy() { destroyed = true; } }));
  assert.equal(profile.connected, false);
  assert.equal(profile.discordUser, null);
  assert.equal(destroyed, true);
});
test('invalid identity fails closed', async () => {
  const profile = await readProfile(() => ({ user: { ...user, id: 'bad-id' }, on() {}, async login() {}, async destroy() {} }));
  assert.equal(profile.discordUser, null);
});
test('HTTP serves mockup and identity only to local origins; no mutation routes', async t => {
  const server = createProfileServer(async () => ({ connected: true, discordUser: user }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = await fetch(base + '/api/discord-profile', { headers: { Origin: 'http://127.0.0.1:1234' } });
  assert.equal(profile.headers.get('cache-control'), 'no-store');
  assert.equal(profile.headers.get('access-control-allow-origin'), 'http://127.0.0.1:1234');
  assert.equal((await profile.json()).discordUser.id, user.id);
  assert.equal((await fetch(base + '/api/discord-profile', { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal((await fetch(base + '/api/discord-profile', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/profile-server.mjs')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%2fREADME.md')).status, 404);
  assert.match(await (await fetch(base + '/?screen=settings')).text(), /<title>Vibe Studio/);
});
