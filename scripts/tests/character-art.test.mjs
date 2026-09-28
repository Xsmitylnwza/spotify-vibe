import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDiscordArt } from '../character-art.mjs';
import { createDefaultConfig, createDiscordActivity, validateConfig } from '../presence-config.mjs';

test('bundled art is default for new configs without replacing existing artwork', () => {
  const config = createDefaultConfig();
  assert.ok(config.scenes.every(scene => scene.largeImage === 'builtin:hinata-idle'));
  config.scenes[0].largeImage = 'https://example.com/owner.gif';
  assert.equal(validateConfig(config).scenes[0].largeImage, config.scenes[0].largeImage);
});

test('Discord never receives a local bundled asset reference', () => {
  const scene = createDefaultConfig().scenes[0];
  assert.throws(() => createDiscordActivity(scene), /public HTTPS/);
  const activity = createDiscordActivity(scene, new Date(), { artBaseUrl:'https://cdn.example.com/art' });
  assert.equal(activity.assets.large_image, 'https://cdn.example.com/art/hinata/idle.gif');
  assert.equal(resolveDiscordArt('builtin:hinata-poster', 'https://cdn.example.com/art/'), 'https://cdn.example.com/art/hinata/poster.png');
  assert.equal(resolveDiscordArt('owner_uploaded_asset'), 'owner_uploaded_asset');
});

test('invalid and unknown artwork configuration fails explicitly', () => {
  for (const base of ['http://example.com/', 'https://localhost/', 'https://example.com/?token=secret']) {
    assert.throws(() => resolveDiscordArt('builtin:hinata-idle', base));
  }
  assert.throws(() => resolveDiscordArt('builtin:missing'), /Unknown/);
  const config = createDefaultConfig();
  config.scenes[0].largeImage = 'builtin:missing';
  assert.throws(() => validateConfig(config), /Unknown/);
});
