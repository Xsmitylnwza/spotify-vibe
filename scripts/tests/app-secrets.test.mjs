import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  loadAppSecrets,
  publicSecretsStatus,
  saveAppSecrets,
  validateDiscordClientId,
  validateGiphyApiKey,
} from '../app-secrets.mjs';

const fileKey = 'appSecretKey_1234567890123456';
const environmentKey = 'environmentKey_12345678901234';
const discordId = '1526867893508116620';

test('validates app-owned GIPHY keys without accepting arbitrary clipboard text', () => {
  assert.equal(validateGiphyApiKey('  ' + fileKey + '  '), fileKey);
  assert.equal(validateGiphyApiKey(''), '');
  assert.throws(() => validateGiphyApiKey('https://developers.giphy.com/dashboard/'), /20–200 letters/);
  assert.throws(() => validateGiphyApiKey('short-key'), /20–200 letters/);
});

test('validates Discord Application IDs', () => {
  assert.equal(validateDiscordClientId('  ' + discordId + '  '), discordId);
  assert.equal(validateDiscordClientId(''), '');
  assert.throws(() => validateDiscordClientId('not-a-number'), /17–20 digit/);
  assert.throws(() => validateDiscordClientId('123'), /17–20 digit/);
});

test('saves and loads private Discord and GIPHY secrets outside Presence configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-secrets-'));
  const filePath = join(directory, 'app-secrets.json');
  try {
    const missing = await loadAppSecrets({ filePath });
    assert.equal(missing.giphyApiKey, '');
    assert.equal(missing.discordClientId, '');
    assert.equal(missing.source, null);

    await saveAppSecrets({ filePath, giphyApiKey: fileKey, discordClientId: discordId });
    const loaded = await loadAppSecrets({ filePath });
    assert.equal(loaded.giphyApiKey, fileKey);
    assert.equal(loaded.discordClientId, discordId);
    assert.equal(loaded.giphySource, 'app-secret');
    assert.equal(loaded.discordSource, 'app-secret');
    assert.equal(loaded.warning, null);

    const status = publicSecretsStatus(loaded);
    assert.equal(status.discord.configured, true);
    assert.equal(status.giphy.configured, true);
    assert.equal(status.discord.clientId, discordId);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('environment keys take precedence and invalid secret files remain non-fatal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-secrets-'));
  const filePath = join(directory, 'app-secrets.json');
  try {
    await writeFile(filePath, '{invalid json', 'utf8');
    const invalid = await loadAppSecrets({ filePath });
    assert.equal(invalid.giphyApiKey, '');
    assert.match(invalid.warning, /could not be loaded/);

    const environment = await loadAppSecrets({
      filePath,
      environmentApiKey: environmentKey,
      environmentDiscordClientId: discordId,
    });
    assert.equal(environment.giphyApiKey, environmentKey);
    assert.equal(environment.discordClientId, discordId);
    assert.equal(environment.giphySource, 'environment');
    assert.equal(environment.discordSource, 'environment');
    assert.equal(environment.warning, null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('partial updates preserve the other secret and support clearing GIPHY', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-secrets-'));
  const filePath = join(directory, 'app-secrets.json');
  try {
    await saveAppSecrets({ filePath, giphyApiKey: fileKey, discordClientId: discordId });
    await saveAppSecrets({ filePath, clearGiphyApiKey: true });
    const loaded = await loadAppSecrets({ filePath });
    assert.equal(loaded.giphyApiKey, '');
    assert.equal(loaded.discordClientId, discordId);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
