import test from 'node:test';
import assert from 'node:assert/strict';
import { requireStudioSender, isOwnedStudioURL } from '../../electron/security.mjs';

test('shared IPC guard accepts only live owned contents and its exact main frame', () => {
  const origin = 'http://127.0.0.1:47394';
  const frame = { parent: null, url: origin + '/#/status' };
  let destroyed = false, contentsDestroyed = false;
  const window = { isDestroyed: () => destroyed, webContents: { mainFrame: frame, isDestroyed: () => contentsDestroyed } };
  const event = { sender: window.webContents, senderFrame: frame };
  assert.doesNotThrow(() => requireStudioSender(event, window, origin));
  for (const url of ['http://localhost:47394/', 'http://127.0.0.1:47395/', 'https://127.0.0.1:47394/', 'javascript:alert(1)', 'file:///tmp/a', 'data:text/html,test', 'not a URL', 'http://user:pass@127.0.0.1:47394/']) {
    frame.url = url;
    assert.equal(isOwnedStudioURL(url, origin), false);
    assert.throws(() => requireStudioSender(event, window, origin), /Unauthorized/);
  }
  frame.url = origin;
  for (const value of [null, {}, { ...event, sender: {} }, { ...event, senderFrame: { ...frame } }]) assert.throws(() => requireStudioSender(value, window, origin), /Unauthorized/);
  frame.parent = {}; assert.throws(() => requireStudioSender(event, window, origin), /Unauthorized/);
  frame.parent = null;
  destroyed = true; assert.throws(() => requireStudioSender(event, window, origin), /Unauthorized/);
  destroyed = false; contentsDestroyed = true; assert.throws(() => requireStudioSender(event, window, origin), /Unauthorized/);
  assert.throws(() => requireStudioSender(event, null, origin), /Unauthorized/);
});
