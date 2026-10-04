import { packedAppIcon } from './app-icon-pack.mjs';
import { isIP } from 'node:net';
import { characterArt } from './character-art.mjs';

export const STUDIO_ICON_URL = 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/6f686f78f80ba7a3a54ce55bd985cf2bfc7fb09d/electron/assets/src/ghost-09-256.png';

export function applicationBadge(executable, name = '', options = {}) {
  return packedAppIcon({ executable, name, publisher: options.publisher }, options) || null;
}

function usablePublicIcon(value) {
  if (typeof value !== 'string' || value.length > 512 || value !== value.trim()) return false;
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && host.includes('.') && !isIP(host) && !host.startsWith('[')
      && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host);
  } catch { return false; }
}

export function hasCustomMainImage(scene) {
  const value = scene?.largeImage;
  if (scene?.largeImageSource !== 'custom' || typeof value !== 'string' || !value.trim() || value.trim() === '@app' || value.length > 512) return false;
  if (value.startsWith('builtin:')) return Boolean(characterArt[value]);
  if (value.includes('://')) {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }
  return true;
}

export function withApplicationBadge(scene, mapping, { publicIcon } = {}) {
  if (!scene) return scene;
  // An explicit empty/invalid hosting result is authoritative: do not revive a pack icon.
  const candidate = publicIcon === undefined ? applicationBadge(mapping?.executable, mapping?.name) : publicIcon;
  const badge = usablePublicIcon(candidate) ? candidate : STUDIO_ICON_URL;
  const result = { ...scene };
  if (!hasCustomMainImage(scene)) {
    result.largeImage = badge;
    result.largeImageUrl = '';
    if (result.largeImageSource === 'app-icon') result.largeImageSource = '';
  }
  if (!scene.smallImage || scene.smallImage === '@app' || scene.smallImageSource === 'app-icon') {
    result.smallImage = badge;
    result.smallImageUrl = '';
    if (result.smallImageSource === 'app-icon') result.smallImageSource = '';
  }
  return result;
}
