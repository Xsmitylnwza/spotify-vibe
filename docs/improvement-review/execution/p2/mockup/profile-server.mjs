// Local mockup server. Reads Discord's IPC handshake identity only;
// never sets/clears activity, reads configuration, or persists profile data.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import RPC from 'discord-rpc';
import { DEFAULT_DISCORD_APPLICATION_ID } from '../../../../../scripts/discord-application.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.VIBE_MOCK_PROFILE_PORT || 17347);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
let pending;
export async function readProfile(createClient = () => new RPC.Client({ transport: 'ipc' })) {
  const client = createClient();
  client.on('error', () => {});
  let timer;
  try {
    await Promise.race([
      client.login({ clientId: DEFAULT_DISCORD_APPLICATION_ID }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Discord identity timeout')), 5000); }),
    ]);
    const user = client.user;
    if (!user || !/^\d+$/.test(user.id) || !user.username) throw new Error('Discord identity unavailable');
    const { id, username, avatar } = user;
    if (avatar && !/^[a-zA-Z0-9_]+$/.test(avatar)) throw new Error('Invalid avatar');
    return { connected: true, checkedAt: new Date().toISOString(), discordUser: {
      id, username, displayName: user.global_name || username,
      avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=128` : `https://cdn.discordapp.com/embed/avatars/${(BigInt(id) >> 22n) % 6n}.png`,
    } };
  } catch {
    return { connected: false, checkedAt: new Date().toISOString(), discordUser: null };
  } finally {
    clearTimeout(timer);
    await client.destroy().catch(() => {});
  }
}

export function createProfileServer(readIdentity = readProfile) {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const origin = req.headers.origin;
    if (origin) {
      let local = origin === 'null';
      try { const url = new URL(origin); local ||= url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); } catch {}
      if (!local) { res.writeHead(403).end(); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname === '/api/discord-profile') {
        pending ||= readIdentity().finally(() => { pending = null; });
        const profile = await pending;
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(profile));
        return;
      }
      const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!path.startsWith(root + sep) || !types[extname(path)]) { res.writeHead(404).end(); return; }
      const bytes = await readFile(path);
      res.writeHead(200, { 'Content-Type': types[extname(path)] }).end(bytes);
    } catch { res.writeHead(404).end(); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createProfileServer().listen(port, '127.0.0.1', () => console.log(`Mockup: http://127.0.0.1:${port}/?screen=settings&dev=0`));
}
