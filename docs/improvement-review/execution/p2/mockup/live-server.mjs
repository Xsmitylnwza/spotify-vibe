// Explicit manual live test. GIPHY credentials are read only; no profile writes.
import { createServer } from 'node:http';
import { resolve, join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createProfileServer, readProfile } from './profile-server.mjs';
import { createLiveController } from './live-controller.mjs';
import { loadAppSecrets } from '../../../../../scripts/app-secrets.mjs';
import { createCachedGiphySearch } from '../../../../../scripts/giphy-search.mjs';

export function createLiveServer(controller = createLiveController(), { env = process.env, fetchImpl = globalThis.fetch, loadSecrets = loadAppSecrets } = {}) {
  const dataDirectory = env.PRESENCE_CONFIG_PATH ? dirname(env.PRESENCE_CONFIG_PATH)
    : process.platform === 'win32' && env.APPDATA ? join(env.APPDATA, 'Spotify Vibe') : join(homedir(), '.spotify-vibe');
  let search = null, searchKey = null;
  const staticServer = createProfileServer(async () => {
    const user = controller.getUser();
    if (!user) return readProfile();
    const { id, username, avatar } = user;
    return { connected: true, discordUser: { id, username, displayName: user.global_name || username,
      avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=128` : `https://cdn.discordapp.com/embed/avatars/${(BigInt(id) >> 22n) % 6n}.png` } };
  });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!['/api/mock-live', '/api/gifs'].includes(url.pathname)) { staticServer.emit('request', req, res); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    const reply = (status, data) => res.writeHead(status).end(JSON.stringify(data));
    if (req.headers.host !== `127.0.0.1:${server.address().port}` || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) { reply(403, { error: 'Use the local live mockup URL' }); return; }
    if (url.pathname === '/api/gifs') {
      if (req.method !== 'GET') { reply(405, { error: 'Method not allowed' }); return; }
      try {
        const secrets = await loadSecrets({ filePath: env.PRESENCE_SECRETS_PATH || join(dataDirectory, 'app-secrets.json'), environmentGiphyApiKey: env.GIPHY_API_KEY || '' });
        const key = secrets.giphyApiKey;
        if (!key) { reply(409, { error: 'no_key' }); return; }
        if (!search || key !== searchKey) { search = createCachedGiphySearch({ apiKey: key, fetchImpl }); searchKey = key; }
        const result = await search({ query: url.searchParams.get('q') || '', offset: url.searchParams.get('offset') || 0 });
        reply(200, { results: result.items.map(item => ({ id: item.id, url: item.originalUrl, previewUrl: item.previewUrl, width: item.width, height: item.height })), next: result.pagination.nextOffset });
      } catch (error) { reply(error.statusCode || 502, { error: error.code || 'GIPHY_SEARCH_FAILED' }); }
      return;
    }
    if (req.method === 'GET') { reply(200, controller.snapshot()); return; }
    if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return; }
    if (req.headers['x-vibe-mock-live'] !== '1' || req.headers['content-type'] !== 'application/json') { reply(403, { error: 'Live test request required' }); return; }
    try {
      const chunks = []; let bytes = 0;
      req.setTimeout(8000, () => req.destroy());
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 65536) { reply(413, { error: 'Scene too large' }); return; } chunks.push(chunk); }
      req.setTimeout(0); // Body is complete; RPC has its own bounded deadline.
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await controller.command(input.action, input.scene);
      reply(200, result);
    } catch (error) { reply(400, { error: error.message, ...controller.snapshot() }); }
  });
  return { server, controller };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, controller } = createLiveServer();
  server.listen(Number(process.env.VIBE_MOCK_LIVE_PORT || 17348), '127.0.0.1', () => console.log(`Live mockup: http://127.0.0.1:${server.address().port}/?screen=now&apps=6&live=1&dev=0`));
  const stop = async () => { await controller.command('end').catch(() => {}); server.close(() => process.exit()); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
