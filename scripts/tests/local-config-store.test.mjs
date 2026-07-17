import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createDefaultConfig, validateConfig } from '../presence-config.mjs';
import { createConfigStore } from '../local-config-store.mjs';

test('store creates, atomically saves, and reloads local configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-store-'));
  const filePath = join(directory, 'config.json');
  const store = createConfigStore({ filePath, createDefault: createDefaultConfig, validate: validateConfig });

  try {
    const first = await store.load();
    assert.equal(first.source, 'created');
    assert.equal(first.config.scenes.length, 4);

    first.config.settings.scheduleEnabled = false;
    await store.save(first.config);
    const second = await store.load();
    assert.equal(second.source, 'disk');
    assert.equal(second.config.settings.scheduleEnabled, false);

    const disk = JSON.parse(await readFile(filePath, 'utf8'));
    assert.equal(disk.settings.scheduleEnabled, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('store recovers invalid JSON and preserves a corrupt backup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spotify-vibe-store-'));
  const filePath = join(directory, 'config.json');
  const store = createConfigStore({ filePath, createDefault: createDefaultConfig, validate: validateConfig });

  try {
    await writeFile(filePath, '{ definitely not json', 'utf8');
    const result = await store.load();
    assert.equal(result.source, 'recovered');
    assert.match(result.warning, /reset/);
    assert.equal(result.config.scenes.length, 4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
