import { STUDIO_ICON_URL } from '../../../../../scripts/application-badges.mjs';
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
  assert.equal(calls[1].args.activity.assets.large_text, undefined);
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

test('app icon without public URL publishes explicit fallback and no timestamp fields', async () => {
  const { controller, calls } = fake();
  const result = await controller.command('send', { ...scene, largeImage: '@app' });
  assert.equal(result.scene.imageFallback, 'app_icon_no_public_url');
  assert.equal(result.scene.publishedImage, calls[1].args.activity.assets.large_image);
  assert.equal(Object.hasOwn(calls[1].args.activity, 'timestamps'), false);
  await controller.command('end');
});

for (const [label, input, image, reason, historicalPreviewImage = image] of [
  ['public app icon', { largeImage: '@app', appPublicIcon: 'https://example.com/orca.png' }, 'https://example.com/orca.png', null],
  ['local app icon', { largeImage: '@app', appPublicIcon: 'data:image/png;base64,AAAA' }, 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/7202b72685d7957148db782f176005a62ec76c94/hinata/poster.png', 'app_icon_no_public_url'],
  ['pre-resolved app icon', { largeImage: '', largeImageSource: 'app-icon' }, STUDIO_ICON_URL, 'app_icon_no_public_url', 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/7202b72685d7957148db782f176005a62ec76c94/hinata/poster.png'],
  ['failed cached icon overrides stale renderer URL', { largeImage: 'https://stale.test/icon.png', largeImageSource: 'app-icon', appPublicIcon: '' }, STUDIO_ICON_URL, 'app_icon_no_public_url', 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/7202b72685d7957148db782f176005a62ec76c94/hinata/poster.png'],
  ['built-in', { largeImage: 'builtin:hinata-poster' }, 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/7202b72685d7957148db782f176005a62ec76c94/hinata/poster.png', null],
  ['link', { largeImage: 'https://example.com/art.gif' }, 'https://example.com/art.gif', null],
]) test(`exact SET_ACTIVITY payload: ${label}`, async () => {
  const { controller, calls } = fake();
  const result = await controller.command('send', { ...scene, ...input });
  assert.deepEqual(calls[1], { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: {
    type: 2, name: 'Vibe', details: 'Live test', details_url: undefined,
    state: 'Manual control', state_url: undefined,
    assets: { large_image: image, large_text: 'Live test', large_url: undefined, small_image: undefined, small_text: undefined, small_url: undefined },
    buttons: [{ label: 'Portfolio', url: 'https://example.com' }], instance: false,
  } } });
  // Historical mockup metadata predates the current pure delivery fallback.
  assert.equal(result.scene.publishedImage, historicalPreviewImage);
  assert.equal(result.scene.imageFallback, reason);
  assert.equal(result.scene.timestamps, null);
  await controller.command('end');
});

test('timestamps only appear for explicit elapsed/remaining Scene timers', async () => {
  const { controller, calls } = fake();
  for (const timerMode of ['none', 'elapsed', 'remaining']) {
    const before = Date.now();
    const result = await controller.command('send', { ...scene, timerMode, timerMinutes: 5 });
    const payload = calls.at(-1).args.activity;
    if (timerMode === 'none') assert.equal(Object.hasOwn(payload, 'timestamps'), false);
    else {
      const key = timerMode === 'elapsed' ? 'start' : 'end';
      const delta = key === 'end' ? 300000 : 0;
      assert.deepEqual(Object.keys(payload.timestamps), [key]);
      assert.ok(payload.timestamps[key] >= before + delta && payload.timestamps[key] <= Date.now() + delta);
      assert.deepEqual(result.scene.timestamps, payload.timestamps);
    }
  }
  await controller.command('end');
});

test('small app icon fallback omits badge; public small icon publishes the same URL', async () => {
  const { controller, calls } = fake();
  let result = await controller.command('send', { ...scene, smallImage: '@app' });
  assert.equal(result.scene.publishedSmallImage, '');
  assert.equal(result.scene.smallImageFallback, 'app_icon_no_public_url');
  assert.equal(calls.at(-1).args.activity.assets.small_image, undefined);
  result = await controller.command('send', { ...scene, smallImage: '@app', appPublicIcon: 'https://example.com/icon.png' });
  assert.equal(result.scene.smallImageFallback, null);
  assert.equal(result.scene.publishedSmallImage, 'https://example.com/icon.png');
  assert.equal(calls.at(-1).args.activity.assets.small_image, result.scene.publishedSmallImage);
  await controller.command('end');
});
