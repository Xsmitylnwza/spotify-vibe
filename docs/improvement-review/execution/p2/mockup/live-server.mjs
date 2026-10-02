// Explicit manual live test. No config, secrets, autostart, detectors, or storage.
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProfileServer, readProfile } from './profile-server.mjs';
import { createLiveController } from './live-controller.mjs';

export function createLiveServer(controller = createLiveController()) {
  const staticServer = createProfileServer(async () => {
    const user = controller.getUser();
    if (!user) return readProfile();
    const { id, username, avatar } = user;
    return { connected: true, discordUser: { id, username, displayName: user.global_name || username,
      avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=128` : `https://cdn.discordapp.com/embed/avatars/${(BigInt(id) >> 22n) % 6n}.png` } };
  });
  const server = createServer(async (req, res) => {
    if (req.url?.split('?')[0] !== '/api/mock-live') { staticServer.emit('request', req, res); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    const reply = (status, data) => res.writeHead(status).end(JSON.stringify(data));
    if (req.headers.host !== `127.0.0.1:${server.address().port}` || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) { reply(403, { error: 'Use the local live mockup URL' }); return; }
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
