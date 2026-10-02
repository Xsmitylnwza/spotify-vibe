import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { startStudioServer } from '../studio-server.mjs';

async function startFakeStudio(t, users) {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-discord-user-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const clients = [];
  const server = await startStudioServer({
    argv: [], port, dataDirectory: directory, openBrowser: false, exitProcess: false,
    environment: { PRESENCE_AUTOSTART_DISABLE: '1', PRESENCE_APP_DETECTION_DISABLE: '1' },
    createDiscordClient: () => {
      const rpc = new EventEmitter();
      const user = users[clients.length];
      rpc.login = async () => { rpc.user = typeof user === 'function' ? await user() : user; };
      rpc.request = async () => {};
      rpc.clearActivity = async () => {};
      rpc.destroy = async () => { rpc.destroyed = true; };
      clients.push(rpc);
      return rpc;
    },
  });
  t.after(() => server.stop());
  const state = async (path = '/api/state') => {
    const response = await fetch(server.url + path);
    assert.equal(response.status, 200);
    return response.json();
  };
  return { server, clients, state, directory };
}

for (const [name, user, avatarUrl, displayName] of [
  ['static avatar and global name', { id: '175928847299117063', username: 'first', global_name: 'First User', avatar: 'abc123', token: 'never-expose' }, 'https://cdn.discordapp.com/avatars/175928847299117063/abc123.png?size=128', 'First User'],
  ['animated avatar and username fallback', { id: '175928847299117063', username: 'animated', avatar: 'a_abc123' }, 'https://cdn.discordapp.com/avatars/175928847299117063/a_abc123.gif?size=128', 'animated'],
  ['null avatar uses snowflake default index', { id: '175928847299117063', username: 'default', global_name: null, avatar: null }, 'https://cdn.discordapp.com/embed/avatars/2.png', 'default'],
  ['another default avatar index', { id: '1526867893508116620', username: 'other', avatar: null }, 'https://cdn.discordapp.com/embed/avatars/0.png', 'other'],
]) {
  test('state exposes minimal Discord identity: ' + name, async t => {
    const { state, directory } = await startFakeStudio(t, [user]);
    const expected = { id: user.id, username: user.username, displayName, avatarUrl };
    const snapshot = await state();
    assert.equal(snapshot.connected, true);
    assert.deepEqual(snapshot.discordUser, expected);
    assert.deepEqual((await state('/api/presence')).discordUser, expected);
    assert.deepEqual((await state('/api/settings')).runtime.discordUser, expected);
    const config = JSON.parse(await readFile(join(directory, 'presence-config.json'), 'utf8'));
    assert.equal(Object.hasOwn(config, 'discordUser'), false);
    await assert.rejects(readFile(join(directory, 'app-secrets.json')), { code: 'ENOENT' });
  });
}

test('disconnect clears identity and automatic reconnect replaces it with the new account', async t => {
  const first = { id: '175928847299117063', username: 'first', avatar: 'abc123' };
  const second = { id: '1526867893508116620', username: 'second', global_name: 'Second User', avatar: null };
  const { clients, state } = await startFakeStudio(t, [first, second]);
  assert.equal((await state()).discordUser.id, first.id);
  clients[0].emit('disconnected');
  const disconnected = await state();
  assert.equal(disconnected.connected, false);
  assert.equal(disconnected.discordUser, null);
  const deadline = Date.now() + 5_000;
  let reconnected;
  do {
    reconnected = await state();
    if (reconnected.connected) break;
    await new Promise(resolve => setTimeout(resolve, 25));
  } while (Date.now() < deadline);
  assert.equal(reconnected.connected, true);
  assert.deepEqual(reconnected.discordUser, {
    id: second.id, username: second.username, displayName: 'Second User',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
  });
  assert.equal(clients.length, 2);
  clients[0].emit('disconnected');
  assert.equal((await state()).discordUser.id, second.id, 'stale client cannot clear current identity');
});

test('explicit RPC teardown clears identity while a replacement login is pending', async t => {
  const user = { id: '175928847299117063', username: 'first', avatar: null };
  const { server, clients, state } = await startFakeStudio(t, [user, () => new Promise(() => {})]);
  assert.equal((await state()).discordUser.id, user.id);
  const response = await fetch(server.url + '/api/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discordClientId: '175928847299117063' }),
  });
  assert.equal(response.status, 200);
  assert.equal(clients[0].destroyed, true);
  const pending = (await response.json()).runtime;
  assert.equal(pending.connectionState, 'connecting');
  assert.equal(pending.discordUser, null);
});

test('successful RPC login without READY user retains a null identity', async t => {
  const { state } = await startFakeStudio(t, [undefined]);
  const snapshot = await state();
  assert.equal(snapshot.connected, true);
  assert.equal(snapshot.discordUser, null);
});

test('stale login rejection preserves the connected replacement identity and runtime', async t => {
  let rejectOldLogin;
  const oldLogin = new Promise((resolve, reject) => { rejectOldLogin = reject; });
  const replacement = { id: '1526867893508116620', username: 'replacement', avatar: null };
  const { server, clients, state } = await startFakeStudio(t, [() => oldLogin, replacement]);
  assert.equal((await state()).connectionState, 'connecting');
  const response = await fetch(server.url + '/api/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discordClientId: '175928847299117063' }),
  });
  assert.equal(response.status, 200);
  const before = await state();
  assert.equal(before.connected, true);
  assert.equal(before.discordUser.id, replacement.id);
  assert.equal(before.nextReconnectAt, null);

  rejectOldLogin(new Error('old login failed'));
  const after = await state();
  assert.equal(after.connected, true);
  assert.equal(after.connectionState, 'connected');
  assert.deepEqual(after.discordUser, before.discordUser);
  assert.equal(after.nextReconnectAt, null, 'stale failure must not schedule a retry');
  assert.equal(after.lastError, before.lastError);
  assert.equal(after.active, before.active);
  assert.equal(clients.length, 2);
  assert.equal(clients[0].destroyed, true);
  assert.equal(clients[1].destroyed, undefined);
});

test('current replacement login rejection clears identity and schedules reconnect', async t => {
  let rejectReplacementLogin;
  const replacementLogin = new Promise((resolve, reject) => { rejectReplacementLogin = reject; });
  const user = { id: '175928847299117063', username: 'first', avatar: null };
  const { server, clients, state } = await startFakeStudio(t, [user, () => replacementLogin]);
  assert.equal((await state()).discordUser.id, user.id);
  const response = await fetch(server.url + '/api/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discordClientId: '175928847299117063' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await state()).connectionState, 'connecting');

  rejectReplacementLogin(new Error('replacement login failed'));
  const failed = await state();
  assert.equal(failed.connected, false);
  assert.equal(failed.connectionState, 'disconnected');
  assert.equal(failed.discordUser, null);
  assert.ok(failed.nextReconnectAt);
  assert.match(failed.lastError, /replacement login failed/);
  assert.equal(clients[1].destroyed, true);
});
