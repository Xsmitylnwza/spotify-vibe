import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultConfig,
  createDiscordActivity,
  validateConfig,
  validateScene,
} from '../presence-config.mjs';
import { STUDIO_ICON_URL, withApplicationBadge } from '../application-badges.mjs';

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

test('legacy slots pointing at a deleted Scene are kept but disabled, never blocking saves', () => {
  const config = createDefaultConfig();
  const legacy = {
    ...config,
    slots: [{ id: 'broken', startTime: '08:00', sceneId: 'missing', enabled: true }],
  };
  const normalized = validateConfig(legacy);
  assert.deepEqual(normalized.slots, [{ id: 'broken', startTime: '08:00', sceneId: 'missing', enabled: false }]);
  const remaining = config.scenes.slice(1);
  const afterDelete = validateConfig({ ...config, scenes: remaining });
  assert.equal(afterDelete.scenes.length, remaining.length);
  assert.ok(afterDelete.slots.filter((slot) => slot.sceneId === config.scenes[0].id).every((slot) => slot.enabled === false));
});

test('legacy manualOverride is ignored even when malformed or its Scene was deleted', () => {
  const config = createDefaultConfig();
  assert.equal(Object.hasOwn(config, 'manualOverride'), false);
  for (const manualOverride of [{ sceneId: 'missing', expiresAt: 'invalid', owner: ['keep'] }, 'legacy']) {
    assert.equal(Object.hasOwn(validateConfig({ ...config, manualOverride }), 'manualOverride'), false);
  }
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
  scene.largeImage = 'https://example.com/custom.gif';
  scene.largeImageSource = 'custom';
  const activity = createDiscordActivity(scene, now);
  assert.equal(activity.name, scene.activityName);
  assert.equal(activity.type, 2);
  assert.equal(activity.timestamps.start, now.getTime());
  assert.equal(activity.assets.large_image, scene.largeImage);
});

test('custom main requires a valid selected image and automatic ignores legacy art without mutating it', () => {
  const scene = { ...createDefaultConfig().scenes[0], largeImageSource: 'custom', largeImageUrl: 'https://example.com/click' };
  for (const largeImage of ['', '  ', '@app', 'builtin:missing', 'http://example.com/x.gif']) {
    assert.throws(() => validateScene({ ...scene, largeImage }));
    assert.throws(() => createDiscordActivity({ ...scene, largeImage }));
    assert.equal(withApplicationBadge({ ...scene, largeImage }, null).largeImage, STUDIO_ICON_URL);
  }
  for (const largeImage of ['https://example.com/x.gif', 'https://cdn.discordapp.com/embed/avatars/0.png', 'builtin:hinata-idle', 'registered_asset']) {
    const selected = { ...scene, largeImage }, before = structuredClone(selected);
    assert.equal(validateScene(selected).largeImageSource, 'custom');
    const delivery = withApplicationBadge(selected, { executable: 'Orca.exe' });
    assert.equal(delivery.largeImage, largeImage); assert.equal(delivery.largeImageUrl, scene.largeImageUrl);
    const activity = createDiscordActivity(delivery, new Date(0), { artBaseUrl: 'https://example.com/art/' });
    assert.equal(activity.assets.large_image, largeImage === 'builtin:hinata-idle' ? 'https://example.com/art/hinata/idle.gif' : largeImage);
    assert.equal(activity.assets.large_url, scene.largeImageUrl); assert.deepEqual(selected, before);
    for (const largeImageSource of ['', undefined, 'app-icon']) {
      const automatic = { ...selected, largeImageSource }, original = structuredClone(automatic);
      assert.equal(createDiscordActivity(automatic).assets.large_image, STUDIO_ICON_URL);
      assert.equal(createDiscordActivity(automatic).assets.large_url, undefined); assert.deepEqual(automatic, original);
    }
  }
});
