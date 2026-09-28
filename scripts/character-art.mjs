export const defaultCharacterArt = 'builtin:hinata-idle';
export const defaultArtBaseUrl = 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/7202b72685d7957148db782f176005a62ec76c94/';

export const characterArt = Object.freeze({
  'builtin:hinata-gaming': { path: '/art/hinata/gaming.gif', type: 'image/gif' },
  'builtin:hinata-gaming-poster': { path: '/art/hinata/gaming-poster.png', type: 'image/png' },
  'builtin:hinata-chill': { path: '/art/hinata/chill.gif', type: 'image/gif' },
  'builtin:hinata-chill-poster': { path: '/art/hinata/chill-poster.png', type: 'image/png' },
  'builtin:hinata-idle': { path: '/art/hinata/idle.gif', type: 'image/gif' },
  'builtin:hinata-poster': { path: '/art/hinata/poster.png', type: 'image/png' },
});

export function resolveDiscordArt(reference, baseUrl = '') {
  if (!reference?.startsWith('builtin:')) return reference;
  const art = characterArt[reference];
  if (!art) throw new Error('Unknown bundled character artwork.');
  if (!baseUrl) throw new Error('Hinata is ready in Studio. To show it on Discord, configure PRESENCE_ART_BASE_URL with the public HTTPS asset directory, or choose a public image URL.');
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('Character artwork base must be a public HTTPS directory URL.');
  }
  if (['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Character artwork must be publicly reachable.');
  return new URL(art.path.slice('/art/'.length), base).href;
}
