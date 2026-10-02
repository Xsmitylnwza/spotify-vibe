import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createLiveController } from './live-controller.mjs';
import { createLiveServer } from './live-server.mjs';
const scene = { id: 'test', sceneName: 'Test', activityType: 'listening', activityName: 'Vibe', details: 'Live test', state: 'Manual control', largeImage: 'builtin:hinata-poster', buttons: [{ label: 'Portfolio', url: 'https://example.com' }] };
function fake() {
  const calls = [], client = new EventEmitter();
  client.login = async () => { calls.push('login'); };
  client.request = async (cmd, args) => { calls.push({ cmd, args }); return { activity: args.activity }; };
  client.clearActivity = async () => { calls.push('clear'); };
  client.destroy = async () => { calls.push('destroy'); };
  return { client, calls, controller: createLiveController(() => client) };
}
test('connect establishes RPC without publishing or clearing activity; repeated connect reuses it', async () => {
  const { controller, calls } = fake();
  const result = await controller.command('connect');
  assert.equal(result.connected, true); assert.equal(result.active, false);
  await controller.command('connect');
  assert.deepEqual(calls, ['login']);
  await controller.command('end');
});
test('manual send uses real activity type, art, buttons; hide and end clear IPC', async () => {
  const { controller, calls } = fake();
  assert.equal(controller.snapshot().active, false);
  const result = await controller.command('send', scene);
  assert.equal(result.active, true);
  assert.equal(calls[1].cmd, 'SET_ACTIVITY');
  assert.equal(calls[1].args.activity.type, 2);
  assert.match(result.scene.largeImage, /^https:\/\//);
  assert.equal(calls[1].args.activity.buttons[0].label, 'Portfolio');
  await controller.command('hide');
  assert.equal(controller.snapshot().active, false);
  await controller.command('end');
  assert.equal(controller.snapshot().connected, false);
  assert.ok(calls.includes('clear')); assert.ok(calls.includes('destroy'));
});
test('invalid edit leaves previous acknowledged activity intact', async () => {
  const { controller, calls } = fake();
  await controller.command('send', scene);
  await assert.rejects(controller.command('send', { ...scene, activityName: 'x' }));
  assert.equal(controller.snapshot().active, true);
  assert.equal(calls.length, 2);
  await controller.command('end');
});
test('empty optional details and state send without inventing replacement text', async () => {
  const { controller, calls } = fake();
  await controller.command('send', { ...scene, details: '', state: '' });
  assert.equal(calls[1].args.activity.details, undefined);
  assert.equal(calls[1].args.activity.state, undefined);
  await controller.command('end');
});
test('failed send never claims applied and releases client', async () => {
  const { controller, client, calls } = fake();
  client.request = async () => { throw new Error('RPC rejected'); };
  await assert.rejects(controller.command('send', scene), /RPC rejected/);
  assert.equal(controller.snapshot().active, false);
  assert.ok(calls.includes('destroy'));
});
test('send state changes after acknowledgement and serialized hide follows it', async () => {
  const { controller, client, calls } = fake();
  let resolveAck;
  client.request = () => new Promise(resolve => { resolveAck = resolve; });
  const sending = controller.command('send', scene);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controller.snapshot().active, false);
  const hiding = controller.command('hide');
  assert.ok(!calls.includes('clear'));
  resolveAck({}); await sending; await hiding;
  assert.equal(controller.snapshot().active, false);
  assert.ok(calls.includes('clear'));
  await controller.command('end');
});
test('HTTP live writes require local origin and explicit JSON header', async t => {
  const { controller } = fake();
  const { server } = createLiveServer(controller);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await controller.command('end'); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' }, body: JSON.stringify({ action: 'send', scene }) };
  assert.equal((await fetch(base + '/api/mock-live', { ...opts, headers: { ...opts.headers, Origin: 'http://127.0.0.1:99' } })).status, 403);
  assert.equal((await fetch(base + '/api/mock-live', { ...opts, headers: { 'Content-Type': 'application/json' } })).status, 403);
  assert.equal((await fetch(base + '/api/mock-live', opts)).status, 200);
  assert.equal((await (await fetch(base + '/api/mock-live')).json()).active, true);
});
