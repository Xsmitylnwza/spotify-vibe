import { packedAppIcon } from './app-icon-pack.mjs';

export function applicationBadge(executable, name = '', options = {}) {
  return packedAppIcon({ executable, name, publisher: options.publisher }, options) || null;
}

export function withApplicationBadge(scene, mapping) {
  const badge = applicationBadge(mapping?.executable, mapping?.name);
  const named = mapping?.name ? { ...scene, activityName:mapping.name } : scene;
  return badge ? { ...named, smallImage:badge, smallImageText:mapping.name, smallImageUrl:'' } : named;
}

