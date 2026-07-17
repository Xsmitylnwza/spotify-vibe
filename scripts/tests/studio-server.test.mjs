import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const clientId = '1526867893508116620';
const studioScript = resolve('scripts/discord-presence-studio.mjs');

async function freePort() {
  const probe = createServer();
  await new Promise((resolveListen, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolveListen);
  });
  const address = probe.address();
  await new Promise((resolveClose) => probe.close(resolveClose));
  return address.port;
}

function startStudio({
  port,
  configPath,
  secretsPath,
  giphyApiKey = '',
  discordClientId = '',
  passClientIdArg = false,
}) {
  const args = [
    studioScript,
    '--no-open',
    '--port=' + port,
  ];
  if (passClientIdArg && discordClientId) args.splice(1, 0, discordClientId);

  const child = spawn(process.execPath, args, {
    cwd: resolve('.'),
    env: {
      ...process.env,
      PRESENCE_CONFIG_PATH: configPath,
      PRESENCE_SECRETS_PATH: secretsPath,
      PRESENCE_AUTOSTART_DISABLE: '1',
      GIPHY_API_KEY: giphyApiKey,
      DISCORD_CLIENT_ID: passClientIdArg ? '' : discordClientId,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  return { child, output: () => output };
}

async function waitForJson(url, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error('HTTP ' + response.status);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw lastError || new Error('Studio did not start.');
}

async function stopStudio(instance) {
  if (instance.child.exitCode !== null) return;
  instance.child.kill();
  await Promise.race([
    new Promise((resolveExit) => instance.child.once('exit', resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 3_000)),
  ]);
  if (instance.child.exitCode !== null) return;
  instance.child.kill('SIGKILL');
}

test('studio starts without Discord ID and accepts API keys through settings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-server-'));
  const configPath = join(directory, 'config.json');
  const secretsPath = join(directory, 'app-secrets.json');
  const port = await freePort();
  const baseUrl = 'http://127.0.0.1:' + port;
  let studio = startStudio({ port, configPath, secretsPath });

  try {
    const initial = await waitForJson(baseUrl + '/api/config');
    assert.equal(initial.scenes.length, 4);
    assert.equal(initial.settings.scheduleEnabled, true);
    assert.equal(Object.hasOwn(initial.settings, 'giphyApiKey'), false);

    const state = await waitForJson(baseUrl + '/api/state');
    assert.equal(state.setup.needsDiscordApplicationId, true);
    assert.equal(state.setup.needsGiphyApiKey, true);
    assert.equal(state.clientId, null);

    const missingKeyResponse = await fetch(baseUrl + '/api/gifs/search?q=morning');
    const missingKey = await missingKeyResponse.json();
    assert.equal(missingKeyResponse.status, 503);
    assert.equal(missingKey.code, 'GIPHY_API_KEY_REQUIRED');

    const settingsResponse = await fetch(baseUrl + '/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordClientId: clientId,
        giphyApiKey: 'serverTestKey_1234567890123456',
      }),
    });
    const settings = await settingsResponse.json();
    assert.equal(settingsResponse.status, 200, settings.error || studio.output());
    assert.equal(settings.setup.needsDiscordApplicationId, false);
    assert.equal(settings.setup.needsGiphyApiKey, false);
    assert.equal(settings.runtime.clientId, clientId);
    assert.equal(settings.runtime.gifSearch.configured, true);
    assert.equal(settings.runtime.gifSearch.source, 'app-secret');

    const secretsFile = JSON.parse(await (await import('node:fs/promises')).readFile(secretsPath, 'utf8'));
    assert.equal(secretsFile.discordClientId, clientId);
    assert.equal(secretsFile.giphyApiKey, 'serverTestKey_1234567890123456');

    initial.scenes[0].details = 'Persisted morning message';
    const saveResponse = await fetch(baseUrl + '/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenes: initial.scenes, slots: initial.slots }),
    });
    assert.equal(saveResponse.status, 200);

    await stopStudio(studio);
    studio = startStudio({ port, configPath, secretsPath });
    const restored = await waitForJson(baseUrl + '/api/config');
    assert.equal(restored.scenes[0].details, 'Persisted morning message');

    const restoredState = await waitForJson(baseUrl + '/api/state');
    assert.equal(restoredState.clientId, clientId);
    assert.equal(restoredState.gifSearch.configured, true);
    assert.equal(restoredState.setup.needsDiscordApplicationId, false);

    const clearGiphy = await fetch(baseUrl + '/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giphyApiKey: '' }),
    });
    const cleared = await clearGiphy.json();
    assert.equal(clearGiphy.status, 200, cleared.error || studio.output());
    assert.equal(cleared.setup.needsGiphyApiKey, true);
    assert.equal(cleared.runtime.gifSearch.configured, false);

    // Legacy owner-write endpoint remains unavailable; use /api/settings instead.
    const userWriteAttempt = await fetch(baseUrl + '/api/gifs/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'user-controlled-key' }),
    });
    assert.equal(userWriteAttempt.status, 404);
  } catch (error) {
    throw new Error(String(error?.message || error) + '\nStudio output:\n' + studio.output());
  } finally {
    await stopStudio(studio);
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI Discord Application ID argument still works for automation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-cli-'));
  const configPath = join(directory, 'config.json');
  const secretsPath = join(directory, 'app-secrets.json');
  const port = await freePort();
  const baseUrl = 'http://127.0.0.1:' + port;
  const studio = startStudio({
    port,
    configPath,
    secretsPath,
    discordClientId: clientId,
    passClientIdArg: true,
  });

  try {
    const state = await waitForJson(baseUrl + '/api/state');
    assert.equal(state.clientId, clientId);
    assert.equal(state.setup.needsDiscordApplicationId, false);
  } catch (error) {
    throw new Error(String(error?.message || error) + '\nStudio output:\n' + studio.output());
  } finally {
    await stopStudio(studio);
    await rm(directory, { recursive: true, force: true });
  }
});
