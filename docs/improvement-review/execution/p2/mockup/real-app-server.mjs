// Real device catalog and isolated test workspace. Reuses the existing live RPC server.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createProfileServer } from './profile-server.mjs';
import { createDeviceCatalog, appIdentity, createIconHosting } from './device-apps.mjs';

const directory = join(tmpdir(), 'vibe-real-app-demo');
export function createRealAppServer({ dataDirectory = directory, catalog = createDeviceCatalog(dataDirectory), liveBase = 'http://127.0.0.1:17348', iconHosting = createIconHosting(dataDirectory), fetchImpl = globalThis.fetch } = {}) {
  const file = join(dataDirectory, 'workspace.json');
  let saving = Promise.resolve();
  let knownApps = new Map();
  async function workspace() {
    await saving;
    try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function pairedIcons(saved) {
    if (!saved) return;
    if (!knownApps.size) {
      const found = await catalog(); knownApps = new Map([...found.installed, ...found.running].map(a => [a.id, a]));
    }
    await iconHosting.pair(saved.rules.map(r => knownApps.get(r.app)).filter(Boolean));
  }
  const staticServer = createProfileServer(async () => (await fetch(liveBase + '/api/discord-profile')).json());
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!['/api/device-apps', '/api/device-workspace', '/api/mock-live', '/api/gifs', '/api/icon-hosting'].includes(url.pathname)) { staticServer.emit('request', req, res); return; }
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    const reply = (status, data) => res.writeHead(status).end(JSON.stringify(data));
    if (req.headers.host !== `127.0.0.1:${server.address().port}` || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) { reply(403, { error: 'Use the local app URL' }); return; }
    try {
      if (url.pathname === '/api/gifs') {
        if (req.method !== 'GET') { reply(405, { error: 'Method not allowed' }); return; }
        const upstream = await fetch(liveBase + url.pathname + url.search, { signal: AbortSignal.timeout(20000) });
        reply(upstream.status, await upstream.json()); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/icon-hosting') { reply(200, await iconHosting.settings()); return; }
      if (req.method === 'GET' && url.pathname === '/api/device-apps') {
        const found = await catalog({ refresh: url.searchParams.get('refresh') === '1' });
        knownApps = new Map([...found.installed, ...found.running].map(a => [a.id, a]));
        await pairedIcons(await workspace());
        reply(200, { ...found, running: await Promise.all(found.running.map(iconHosting.decorate)), installed: await Promise.all(found.installed.map(iconHosting.decorate)) }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/device-workspace') {
        await saving;
        try { reply(200, JSON.parse(await readFile(file, 'utf8'))); } catch (error) { if (error.code === 'ENOENT') reply(200, null); else throw error; }
        return;
      }
      if (req.method !== 'GET' && (req.headers['x-vibe-mock-live'] !== '1' || req.headers['content-type'] !== 'application/json')) { reply(403, { error: 'App request required' }); return; }
      let body;
      if (req.method !== 'GET') {
        const chunks = []; let size = 0; req.setTimeout(8000, () => req.destroy());
        for await (const chunk of req) { size += chunk.length; if (size > 1048576) { reply(413, { error: 'Workspace too large' }); return; } chunks.push(chunk); }
        req.setTimeout(0); body = Buffer.concat(chunks).toString('utf8');
      }
      if (url.pathname === '/api/mock-live' && ['GET', 'POST'].includes(req.method)) {
        if (req.method === 'POST') {
          const input = JSON.parse(body);
          if (input.action === 'send' && input.scene) {
            const saved = await workspace();
            const id = input.scene.appId || saved?.selectedAppId;
            const paired = saved?.rules.some(r => r.app === id && r.scene === input.scene.id);
            // Only a trusted, paired catalog identity may supply an app icon;
            // discard renderer-provided URLs even when the pairing is missing.
            input.scene.appPublicIcon = '';
            input.scene.appIconSource = 'default';
            if (paired) {
              await pairedIcons(saved);
              const app = knownApps.get(id);
              const decorated = app ? await iconHosting.decorate(app) : null;
              input.scene.appPublicIcon = decorated?.publicIcon || '';
              input.scene.appIconSource = decorated?.iconSource || 'default';
            }
          }
          body = JSON.stringify(input);
        }
        const upstream = await fetchImpl(liveBase + '/api/mock-live', { method: req.method, headers: req.method === 'POST' ? { 'Content-Type': 'application/json', 'X-Vibe-Mock-Live': '1' } : {}, body, signal: AbortSignal.timeout(20000) });
        reply(upstream.status, await upstream.json()); return;
      }
      if (url.pathname === '/api/icon-hosting' && req.method === 'POST') {
        const result = await iconHosting.setConsent(JSON.parse(body).consent);
        await pairedIcons(await workspace()); reply(200, result); return;
      }
      if (url.pathname === '/api/device-workspace' && req.method === 'PUT') {
        const input = JSON.parse(body);
        if (!Array.isArray(input.scenes) || !Array.isArray(input.rules) || !Array.isArray(input.apps) || input.scenes.length > 200 || input.rules.length > 500) throw new Error('Invalid workspace');
        const sceneIds = new Set(input.scenes.map(s => s.id));
        const appIds = new Set(input.apps.map(a => a.id));
        if (input.apps.some(a => typeof a.exe !== 'string' || !/^[a-z]:\\.*\.exe$/i.test(a.exe) || a.id !== appIdentity(a.exe))) throw new Error('Invalid app identity');
        if (sceneIds.size !== input.scenes.length || input.scenes.some(s => !/^[a-zA-Z0-9_-]{1,64}$/.test(s.id)) || input.rules.some(r => r.kind !== 'app' || !/^device-[a-f0-9]{24}$/.test(r.app) || !appIds.has(r.app) || !sceneIds.has(r.scene))) throw new Error('Invalid pairing');
        const selectedSceneId = sceneIds.has(input.selectedSceneId) ? input.selectedSceneId : input.scenes[0]?.id || '';
        const snapshot = { version: 1, scenes: input.scenes, rules: input.rules, apps: input.apps, presenceEnabled: input.presenceEnabled === true, selectedSceneId, selectedAppId: appIds.has(input.selectedAppId) ? input.selectedAppId : '', savedAt: new Date().toISOString() };
        const operation = saving.then(async () => { await mkdir(dataDirectory, { recursive: true }); await writeFile(file + '.tmp', JSON.stringify(snapshot), 'utf8'); await rename(file + '.tmp', file); });
        saving = operation.catch(() => {}); await operation;
        // Detached discovery/upload never turns a successful workspace save into a failure.
        void pairedIcons(snapshot).catch(() => {});
        reply(200, { savedAt: snapshot.savedAt }); return;
      }
      reply(405, { error: 'Method not allowed' });
    } catch (error) { reply(400, { error: error.message }); }
  });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createRealAppServer();
  server.listen(17349, '127.0.0.1', () => console.log('Real app: http://127.0.0.1:17349/?screen=now&real=1&live=1&dev=0'));
}
