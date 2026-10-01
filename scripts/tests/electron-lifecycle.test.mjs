import assert from 'node:assert/strict';
import test from 'node:test';
import { broadcastUpdateState, startOwnedStudio, ensureDefaultLoginItem, createShutdown, runUpdateOperation } from '../../electron/lifecycle.mjs';

test('update broadcast accepts void send, skips destroyed hosts, and tolerates destruction during send', () => {
  const received = [];
  const window = (destroyed, contentsDestroyed, send) => ({
    isDestroyed: () => destroyed,
    webContents: { isDestroyed: () => contentsDestroyed, send },
  });
  broadcastUpdateState([
    window(true, false, () => assert.fail('destroyed window')),
    window(false, true, () => assert.fail('destroyed contents')),
    window(false, false, () => { throw new Error('destroyed during send'); }),
    window(false, false, (channel, state) => { received.push({ channel, state }); }),
  ], { checking: true });
  assert.deepEqual(received, [{ channel: 'vibe:update-state', state: { checking: true } }]);
});

test('desktop startup refuses an occupied listener and requires server ownership', async () => {
  let options;
  const onQuit = () => {};
  await assert.rejects(startOwnedStudio(async (input) => {
    options = input;
    return { alreadyRunning: true, url: 'http://127.0.0.1:47394' };
  }, { port: 47394, onQuit }), { code: 'STUDIO_PORT_IN_USE' });
  assert.equal(options.requireOwnership, true);
  assert.equal(options.onQuit, onQuit);
  const handle = { alreadyRunning: false, stop() {} };
  assert.equal(await startOwnedStudio(async () => handle, {}), handle);
  await assert.rejects(startOwnedStudio(async () => { throw Object.assign(new Error('busy'), { code: 'STUDIO_PORT_IN_USE' }); }, {}), { code: 'STUDIO_PORT_IN_USE' });
});

test('Quit routes share one promise and await companion cleanup before app quit', async () => {
  const events = [];
  let release;
  const stopped = new Promise(resolve => { release = resolve; });
  const shutdown = createShutdown({
    stop: async () => { events.push('stop'); await stopped; events.push('helpers/RPC stopped'); },
    quit: () => { events.push('app.quit'); assert.equal(shutdown(), first); },
  });
  const first = shutdown();
  assert.equal(shutdown(), first);
  await Promise.resolve();
  assert.deepEqual(events, ['stop']);
  release();
  await first;
  assert.equal(shutdown(), first);
  assert.deepEqual(events, ['stop', 'helpers/RPC stopped', 'app.quit']);
});

test('updater restart waits for cleanup; install failure is visible and falls back to quit', async () => {
  const events = [];
  const shutdown = createShutdown({
    stop: async () => { events.push('stop'); },
    install: () => { events.push('install'); throw new Error('install unavailable'); },
    onError: error => events.push(error.message),
    quit: () => events.push('quit'),
  });
  await shutdown({ restart: true });
  await shutdown({ restart: true });
  assert.deepEqual(events, ['stop', 'install', 'install unavailable', 'quit']);
});

test('cleanup failure is reported and app quit still settles once', async () => {
  const events = [];
  const shutdown = createShutdown({
    stop: async () => { throw new Error('cleanup failed'); },
    onError: error => events.push(error.message),
    quit: () => events.push('quit'),
  });
  await shutdown();
  await shutdown();
  assert.deepEqual(events, ['cleanup failed', 'quit']);
});

test('login defaults never register in dev or disabled runs and preserve existing opt-out', () => {
  for (const [packaged, disabled, sentinelExists, expected] of [
    [false, false, false, false], [false, true, false, false],
    [true, true, false, false], [true, false, true, false], [true, false, false, true],
  ]) {
    const calls = [];
    const result = ensureDefaultLoginItem({
      app: { isPackaged: packaged, setLoginItemSettings: value => calls.push(value) },
      fs: { existsSync: () => sentinelExists, writeFileSync: (path, value) => calls.push([path, JSON.parse(value)]) },
      sentinel: 'sentinel.json', env: { PRESENCE_AUTOSTART_DISABLE: disabled ? '1' : '0' },
    });
    assert.equal(result, expected);
    assert.deepEqual(calls, expected ? [
      { openAtLogin: true, openAsHidden: true }, ['sentinel.json', { loginItemDefaultApplied: true }],
    ] : []);
  }
});

test('update check/download rejected promises and synchronous failures publish an error and settle state', async () => {
  for (const stage of ['checking', 'downloading']) {
    for (const operation of [() => { throw new Error('offline'); }, () => Promise.reject(new Error('offline'))]) {
      const state = {};
      const published = [];
      const result = await runUpdateOperation(state, () => published.push({ ...state }), operation, stage);
      assert.deepEqual(result, { ok: false, error: 'offline' });
      assert.equal(published[0][stage], true);
      assert.equal(published.at(-1)[stage], false);
      assert.equal(published.at(-1).error, 'offline');
    }
  }
});
