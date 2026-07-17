import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createWindowsAutostart } from '../windows-autostart.mjs';

test('Windows adapter writes a hidden Startup launcher and removes it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-startup-'));
  const adapter = createWindowsAutostart({
    startupDirectory: directory,
    scriptPath: 'C:\\letmecook\\spotify-vibe\\scripts\\discord-presence-studio.mjs',
    nodePath: 'C:\\Program Files\\nodejs\\node.exe',
    clientId: '1526867893508116620',
    port: 17345,
    platform: 'win32',
  });

  try {
    assert.equal(adapter.supported, true);
    assert.equal(await adapter.isEnabled(), false);
    const enabled = await adapter.setEnabled(true);
    assert.equal(enabled.enabled, true);
    const contents = await readFile(adapter.filePath, 'utf8');
    assert.match(contents, /WScript\.Shell/);
    assert.match(contents, /--no-open/);
    assert.match(contents, /--port=17345/);
    assert.match(contents, /1526867893508116620/);
    assert.match(contents, /, 0, False/);

    const disabled = await adapter.setEnabled(false);
    assert.equal(disabled.enabled, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('autostart reports unsupported outside Windows', async () => {
  const adapter = createWindowsAutostart({
    startupDirectory: '/tmp/startup',
    scriptPath: '/app/studio.mjs',
    nodePath: '/usr/bin/node',
    clientId: '1526867893508116620',
    port: 17345,
    platform: 'linux',
  });
  assert.equal(adapter.supported, false);
  assert.deepEqual(await adapter.setEnabled(true), {
    supported: false,
    enabled: false,
    filePath: null,
  });
});
