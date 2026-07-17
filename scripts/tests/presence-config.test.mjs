import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultConfig,
  createDiscordActivity,
  validateConfig,
} from '../presence-config.mjs';

test('default configuration contains four valid daily Scenes and slots', () => {
  const config = createDefaultConfig();
  assert.equal(config.scenes.length, 4);
  assert.deepEqual(config.slots.map((slot) => slot.startTime), ['06:00', '12:00', '18:00', '23:00']);
  assert.equal(config.settings.scheduleEnabled, true);
  assert.equal(config.settings.autostartEnabled, true);
  assert.equal(Object.hasOwn(config.settings, 'giphyApiKey'), false);
});

test('configuration sorts slots and rejects duplicate start times', () => {
  const config = createDefaultConfig();
  const reversed = validateConfig({ ...config, slots: [...config.slots].reverse() });
  assert.deepEqual(reversed.slots.map((slot) => slot.startTime), ['06:00', '12:00', '18:00', '23:00']);

  const duplicate = {
    ...config,
    slots: [
      ...config.slots,
      { id: 'duplicate', startTime: '06:00', sceneId: 'morning', enabled: false },
    ],
  };
  assert.throws(() => validateConfig(duplicate), /start times must be unique/);
});

test('configuration rejects missing Scene references', () => {
  const config = createDefaultConfig();
  const invalid = {
    ...config,
    slots: [{ id: 'broken', startTime: '08:00', sceneId: 'missing', enabled: true }],
  };
  assert.throws(() => validateConfig(invalid), /references a missing Scene/);
});

test('configuration validates a persisted Manual Override', () => {
  const config = createDefaultConfig();
  const normalized = validateConfig({
    ...config,
    manualOverride: {
      sceneId: 'evening',
      expiresAt: '2026-07-16T18:00:00.000Z',
    },
  });
  assert.equal(normalized.manualOverride.sceneId, 'evening');
  assert.equal(normalized.manualOverride.expiresAt, '2026-07-16T18:00:00.000Z');
});

test('Presence configuration drops legacy GIPHY keys from its settings boundary', () => {
  const config = createDefaultConfig();
  const normalized = validateConfig({
    ...config,
    settings: { ...config.settings, giphyApiKey: 'local-giphy-key' },
  });
  assert.equal(Object.hasOwn(normalized.settings, 'giphyApiKey'), false);
});

test('Discord activity preserves supported custom fields and timestamps', () => {
  const scene = createDefaultConfig().scenes[0];
  const now = new Date('2026-07-16T00:00:00.000Z');
  const activity = createDiscordActivity(scene, now);
  assert.equal(activity.name, scene.activityName);
  assert.equal(activity.type, 2);
  assert.equal(activity.timestamps.start, now.getTime());
  assert.equal(activity.assets.large_image, scene.largeImage);
});
