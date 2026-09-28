import assert from 'node:assert/strict';
import test from 'node:test';
import { withDefaultApplication } from '../discord-application.mjs';

test('new installs and settings without a custom ID use the bundled public application', () => {
  const settings = withDefaultApplication({ discordClientId:'', giphyApiKey:'retained' });
  assert.equal(settings.discordClientId,'1526867893508116620');
  assert.equal(settings.discordSource,'bundled');
  assert.equal(settings.giphyApiKey,'retained');
});
test('custom IDs retain their value and provenance', () => {
  const settings={ discordClientId:'123456789012345678',discordSource:'environment' };
  assert.equal(withDefaultApplication(settings),settings);
});
