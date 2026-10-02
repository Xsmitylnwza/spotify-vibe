import RPC from 'discord-rpc';
import { DEFAULT_DISCORD_APPLICATION_ID } from '../../../../../scripts/discord-application.mjs';
import { createDiscordActivity } from '../../../../../scripts/presence-config.mjs';
import { defaultArtBaseUrl, resolveDiscordArt } from '../../../../../scripts/character-art.mjs';

export function resolvePublishedScene(scene) {
  const resolved = { ...scene, timerMode: scene.timerMode || 'none' };
  for (const [field, source, published, fallback] of [
    ['largeImage', 'largeImageSource', 'publishedImage', 'imageFallback'],
    ['smallImage', 'smallImageSource', 'publishedSmallImage', 'smallImageFallback'],
  ]) {
    const appIcon = scene[field] === '@app' || scene[source] === 'app-icon';
    let reference = scene[field] || '';
    resolved[fallback] = null;
    if (appIcon) {
      reference = Object.hasOwn(scene, 'appPublicIcon') ? scene.appPublicIcon : (scene[field] !== '@app' ? scene[field] : '') || '';
      let publicUrl = false;
      try {
        const url = new URL(reference);
        publicUrl = url.protocol === 'https:' && !url.username && !url.password &&
          !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      } catch {}
      if (!publicUrl) {
        reference = field === 'largeImage' ? 'builtin:hinata-poster' : '';
        resolved[fallback] = 'app_icon_no_public_url';
      }
    }
    resolved[field] = resolveDiscordArt(reference, defaultArtBaseUrl);
    resolved[published] = resolved[field];
  }
  return resolved;
}

function deadline(promise, ms) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Discord did not respond in time')), ms); })]).finally(() => clearTimeout(timer));
}
export function createLiveController(createClient = () => new RPC.Client({ transport: 'ipc' })) {
  let client = null, queue = Promise.resolve();
  let state = { connected: false, active: false, scene: null, lastSuccessAt: null, error: null };
  const snapshot = () => ({ ...state });
  async function disconnect() {
    const old = client; client = null;
    if (old) await old.destroy().catch(() => {});
    state = { ...state, connected: false, active: false, scene: null };
  }
  async function connect() {
    if (client) return client;
    const next = createClient(); client = next;
    next.on('error', () => {});
    next.on('disconnected', () => {
      if (client === next) { client = null; state = { ...state, connected: false, active: false, scene: null, error: 'Discord disconnected; send again after reconnecting.' }; }
    });
    await deadline(next.login({ clientId: DEFAULT_DISCORD_APPLICATION_ID }), 5000);
    if (client !== next) throw new Error('Discord disconnected during login');
    state.connected = true;
    return next;
  }
  async function command(action, scene) {
    const operation = queue.then(async () => {
      // Validate before touching IPC; invalid edits leave the last applied activity intact.
      const publishedScene = action === 'send' ? resolvePublishedScene(scene) : null;
      const activity = action === 'send' ? createDiscordActivity({ ...publishedScene, details: scene.details?.trim() || '__', state: scene.state?.trim() || '__' }, new Date(), { artBaseUrl: defaultArtBaseUrl }) : null;
      if (activity) { activity.details = scene.details?.trim() || undefined; activity.state = scene.state?.trim() || undefined; }
      // Validation placeholders must never become visible hover text either.
      if (activity?.assets) {
        if (!scene.largeImageText?.trim() && !scene.details?.trim()) activity.assets.large_text = undefined;
        if (!scene.smallImageText?.trim() && !scene.state?.trim()) activity.assets.small_text = undefined;
      }
      if (activity && !activity.timestamps) delete activity.timestamps;
      if (!['connect', 'send', 'hide', 'end'].includes(action)) throw new Error('Unknown live action');
      try {
        if (action === 'connect') {
          await connect(); state.error = null;
          return { ...snapshot(), acknowledged: true };
        }
        if (action === 'send') {
          const target = await connect();
          const ack = await deadline(target.request('SET_ACTIVITY', { pid: process.pid, activity }), 10000);
          if (client !== target) throw new Error('Discord disconnected before acknowledgement');
          state = { connected: true, active: true, scene: { ...publishedScene, timestamps: activity.timestamps || null, largeImage: activity.assets?.large_image || '', smallImage: activity.assets?.small_image || '' }, lastSuccessAt: new Date().toISOString(), error: null };
          return { ...snapshot(), acknowledged: true, activity: ack?.activity || activity };
        }
        if (client) await deadline(client.clearActivity(), 5000);
        state = { ...state, active: false, scene: null, error: null, lastSuccessAt: new Date().toISOString() };
        if (action === 'end') await disconnect();
        return { ...snapshot(), acknowledged: true };
      } catch (error) {
        await disconnect();
        state.error = error.message;
        throw error;
      }
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return { command, snapshot, getUser: () => client?.user || null };
}
