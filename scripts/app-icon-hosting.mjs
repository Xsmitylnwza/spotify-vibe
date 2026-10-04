import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isIP } from 'node:net';
import { appKey } from './app-presence.mjs';
import { packedAppIcon } from './app-icon-pack.mjs';
import { atomicWriteJson } from './local-config-store.mjs';

export function publicIconUrl(value) {
  if (typeof value !== 'string' || value.length > 512 || value !== value.trim() || !/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    // Hosted artwork must be public DNS HTTPS, never credentials or local/IP targets.
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && host.includes('.') && !isIP(host) && !host.startsWith('[')
      && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host);
  } catch { return false; }
}

export function iconPng(icon) {
  if (!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(icon || '')) throw new Error('PNG icon required');
  const encoded = icon.split(',')[1], bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded || bytes.length < 33 || bytes.length > 262144
    || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG icon');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width > 256 || height > 256) throw new Error('Icon must be at most 256 pixels');
  return bytes;
}

// Only PNG bytes leave the PC; no executable paths, names, or credentials.
export function createIconUploader({ fetchImpl = globalThis.fetch } = {}) {
  return async (bytes, { signal } = {}) => {
    iconPng('data:image/png;base64,' + bytes.toString('base64'));
    const form = new FormData();
    form.set('reqtype', 'fileupload');
    form.set('fileToUpload', new Blob([bytes], { type: 'image/png' }), 'icon.png');
    const timeout = AbortSignal.timeout(20000);
    const response = await fetchImpl('https://catbox.moe/user/api.php', {
      method: 'POST', body: form, signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) throw new Error('Icon upload failed');
    const url = (await response.text()).trim();
    if (!publicIconUrl(url)) throw new Error('Host did not return a public HTTPS URL');
    return url;
  };
}

export function appIconIdentity(app) {
  const executable = app?.executable || app?.exe;
  return executable ? 'device-' + createHash('sha256').update(appKey(executable)).digest('hex').slice(0, 24) : String(app?.id || '');
}

// Uploads are off unless a host is passed in: Discord's image proxy cannot load
// catbox URLs (white "?" box, seen on the owner's profile 2026-10-04), so the
// app only sends public-pack icons. Inject an uploader for a host that works.
export function createIconHosting(dataDirectory, { uploader = null, onChange = () => {}, writeJson = atomicWriteJson } = {}) {
  const uploadsEnabled = typeof uploader === 'function';
  const file = join(dataDirectory, 'icon-hosting.json'), provider = 'catbox';
  let state = { consent: null, provider, icons: {} }, saving = Promise.resolve(), closed = false;
  const pending = new Map(), failed = new Map();
  const loaded = readFile(file, 'utf8').then(text => {
    const saved = JSON.parse(text);
    state = { ...saved, consent: typeof saved.consent === 'boolean' ? saved.consent : null, provider,
      icons: saved.icons && typeof saved.icons === 'object' && !Array.isArray(saved.icons) ? saved.icons : {} };
  }).catch(error => { if (error.code !== 'ENOENT') throw error; });
  function commit(build) {
    const operation = saving.then(async () => {
      const next = build(state);
      await writeJson(file, next);
      state = next;
    });
    saving = operation.catch(() => {});
    return operation;
  }
  const hash = app => createHash('sha256').update(iconPng(app.icon)).digest('hex');
  function view(app) {
    const pack = packedAppIcon(app);
    if (pack) return { ...app, publicIcon: pack, iconSource: 'pack', iconStatus: 'ready' };
    if (!uploadsEnabled) return { ...app, publicIcon: '', iconSource: 'default', iconStatus: '' };
    const id = appIconIdentity(app), cached = state.icons[id];
    let sha256;
    try { sha256 = hash(app); } catch {}
    if (cached && publicIconUrl(cached.url) && /^[a-f0-9]{64}$/.test(cached.sha256)
      && (sha256 === cached.sha256 || !app.icon)) {
      return { ...app, publicIcon: cached.url, iconSource: 'upload', iconStatus: 'ready' };
    }
    return { ...app, publicIcon: '', iconSource: 'default', iconStatus: pending.has(id) ? 'uploading' : state.consent !== true ? 'needs-consent' : 'failed' };
  }
  async function pair(apps) {
    await loaded;
    if (closed || !uploadsEnabled || state.consent !== true) return;
    for (const app of apps) {
      const id = appIconIdentity(app);
      if (!id || packedAppIcon(app) || pending.has(id)) continue;
      let sha256, bytes;
      try { bytes = iconPng(app.icon); sha256 = createHash('sha256').update(bytes).digest('hex'); } catch { continue; }
      if ((state.icons[id]?.sha256 === sha256 && publicIconUrl(state.icons[id]?.url)) || failed.get(id)?.has(sha256)) continue;
      const abort = new AbortController();
      const operation = Promise.resolve().then(() => {
        if (closed || state.consent !== true) throw new Error('Icon upload disabled');
        return uploader(bytes, { signal: abort.signal });
      }).then(async url => {
        if (!publicIconUrl(url)) throw new Error('Invalid public icon URL');
        if (closed || state.consent !== true || abort.signal.aborted) return;
        await commit(current => closed || current.consent !== true || abort.signal.aborted ? current
          : ({ ...current, icons: { ...current.icons, [id]: { url, sha256 } } }));
      }).catch(() => {
        if (!abort.signal.aborted) {
          if (!failed.has(id)) failed.set(id, new Set());
          failed.get(id).add(sha256);
        }
      }).finally(() => {
        pending.delete(id);
        if (!closed) Promise.resolve().then(() => onChange(app)).catch(() => {});
      });
      pending.set(id, { operation, abort });
    }
  }
  return {
    uploadsEnabled,
    view, pair,
    async decorate(app) { await loaded; return view(app); },
    async settings() { await loaded; return { consent: state.consent, provider }; },
    async setConsent(consent) {
      await loaded;
      if (typeof consent !== 'boolean') throw new Error('Consent must be boolean');
      await commit(current => ({ ...current, consent }));
      if (!consent) for (const item of pending.values()) item.abort.abort();
      return { consent: state.consent, provider };
    },
    async drain() { await loaded; await Promise.all([...pending.values()].map(item => item.operation)); await saving; },
    close() { closed = true; for (const item of pending.values()) item.abort.abort(); },
  };
}
