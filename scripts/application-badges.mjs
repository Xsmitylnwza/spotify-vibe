import { packedAppIcon } from './app-icon-pack.mjs';
import { defaultCharacterArt } from './character-art.mjs';

export function applicationBadge(executable, name = '', options = {}) {
  return packedAppIcon({ executable, name, publisher: options.publisher }, options) || null;
}

export function withApplicationBadge(scene, mapping, { publicIcon } = {}) {
  if (!scene) return scene;
  const badge = publicIcon ?? applicationBadge(mapping?.executable, mapping?.name);
  let result = scene;
  for (const field of ['largeImage', 'smallImage']) {
    // An empty small image keeps the long-standing default: the app's icon. Explicit images always win.
    const automatic = scene[field] === '@app' || scene[field + 'Source'] === 'app-icon' || (field === 'smallImage' && !scene.smallImage);
    if (!automatic) continue;
    result = { ...result, [field]: badge || (field === 'largeImage' ? defaultCharacterArt : ''),
      [field + 'Url']: '' };
  }
  return result;
}

