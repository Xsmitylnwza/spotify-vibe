import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isIP } from 'node:net';
import { inflateSync } from 'node:zlib';
import { appKey } from './app-presence.mjs';
import { packedAppIcon } from './app-icon-pack.mjs';
import { atomicWriteJson } from './local-config-store.mjs';

export const ICON_PROVIDER = Object.freeze({ provider: 'imgge', providerName: 'IMG.GE', providerUrl: 'https://img.ge/' });

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
  let offset = 8, ended = false; const data = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), end = offset + length + 12;
    if (end > bytes.length) throw new Error('Invalid PNG chunk');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(offset + 4, end - 4)) {
      crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    if (((crc ^ 0xffffffff) >>> 0) !== bytes.readUInt32BE(end - 4)) throw new Error('Invalid PNG checksum');
    if (type === 'IDAT') data.push(bytes.subarray(offset + 8, end - 4));
    if (type === 'IEND') { if (length || end !== bytes.length) throw new Error('Invalid PNG end'); ended = true; }
    offset = end;
  }
  if (!ended || !data.length || offset !== bytes.length) throw new Error('Incomplete PNG icon');
  try { inflateSync(Buffer.concat(data), { maxOutputLength: 1048576 }); } catch { throw new Error('Invalid PNG pixels'); }
  return bytes;
}

// Only PNG bytes leave the PC; no executable paths, names, or credentials.
export function createIconUploader({ fetchImpl = globalThis.fetch } = {}) {
  return async (bytes, { signal } = {}) => {
    iconPng('data:image/png;base64,' + bytes.toString('base64'));
    const timeout = AbortSignal.timeout(20000);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const session = await fetchImpl('https://img.ge/en', { signal: requestSignal, redirect: 'error' });
    if (!session.ok) throw new Error('Icon host session failed');
    const csrf = (await session.text()).match(/name="csrf-token"\s+content="([A-Za-z0-9]+)"/)?.[1];
    const cookie = (session.headers.getSetCookie?.() ?? []).map(value => value.split(';')[0]).join('; ');
    if (!csrf || !cookie) throw new Error('Icon host session unavailable');
    const form = new FormData();
    form.set('file', new Blob([bytes], { type: 'image/png' }), 'icon.png');
    form.set('name', 'icon.png'); form.set('type', 'image/png'); form.set('size', String(bytes.length));
    form.set('upload_auto_delete', '0');
    const response = await fetchImpl('https://img.ge/en/upload', {
      method: 'POST', body: form, signal: requestSignal, redirect: 'error',
      headers: { Cookie: cookie, 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) throw new Error('Icon upload failed');
    const result = await response.json(), url = result.direct_link;
    if (result.type !== 'success' || !publicIconUrl(url) || !/^https:\/\/img\.ge\/i\/[A-Za-z0-9_-]+\.png$/.test(url)) throw new Error('Host did not return a public HTTPS PNG URL');
    const image = await fetchImpl(url, { signal: requestSignal, redirect: 'error' });
    if (!image.ok || image.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'image/png') throw new Error('Public icon is not reachable PNG');
    // Bound the response rather than buffering arbitrary host content.
    const reader = image.body.getReader(); let size = 0; const chunks = [];
    try {
      for (;;) { const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > bytes.length) throw new Error('Public icon bytes changed'); chunks.push(value); }
    } finally { await reader.cancel(); }
    if (!Buffer.concat(chunks).equals(bytes)) throw new Error('Public icon bytes changed');
    return url;
  };
}

export function appIconIdentity(app) {
  const executable = app?.executable || app?.exe;
  return executable ? 'device-' + createHash('sha256').update(appKey(executable)).digest('hex').slice(0, 24) : String(app?.id || '');
}

// null explicitly disables uploads; injected adapters keep tests network-free.
export function createIconHosting(dataDirectory, { uploader = createIconUploader(), onChange = () => {}, writeJson = atomicWriteJson } = {}) {
  const uploadsEnabled = typeof uploader === 'function';
  const file = join(dataDirectory, 'icon-hosting.json'), { provider } = ICON_PROVIDER;
  let state = { consent: null, provider, icons: {} }, saving = Promise.resolve(), closed = false;
  const pending = new Map(), failed = new Map();
  const loaded = readFile(file, 'utf8').then(text => {
    const saved = JSON.parse(text);
    state = { ...saved, consent: saved.provider === provider && typeof saved.consent === 'boolean' ? saved.consent : null, provider,
      icons: saved.icons && typeof saved.icons === 'object' && !Array.isArray(saved.icons) ? saved.icons : {} };
    state.icons = Object.fromEntries(Object.entries(state.icons).map(([id, entry]) => [id,
      entry && typeof entry === 'object' && !Array.isArray(entry) ? { ...entry, provider: entry.provider ?? saved.provider ?? 'catbox' } : entry]));
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
    if (state.consent === true && cached?.provider === provider && publicIconUrl(cached.url) && /^[a-f0-9]{64}$/.test(cached.sha256)
      && (sha256 === cached.sha256 || !app.icon)) {
      return { ...app, publicIcon: cached.url, iconSource: 'upload', iconStatus: 'ready' };
    }
    return { ...app, publicIcon: '', iconSource: 'default', iconStatus: pending.has(id) ? 'uploading' : !sha256 ? '' : state.consent !== true ? 'needs-consent' : 'failed' };
  }
  async function pair(apps, { force = false } = {}) {
    await loaded;
    if (closed || !uploadsEnabled || state.consent !== true) return;
    for (const app of apps) {
      const id = appIconIdentity(app);
      if (!id || packedAppIcon(app) || pending.has(id)) continue;
      let sha256, bytes;
      try { bytes = iconPng(app.icon); sha256 = createHash('sha256').update(bytes).digest('hex'); } catch { continue; }
      if (state.icons[id]?.provider === provider && state.icons[id]?.sha256 === sha256 && publicIconUrl(state.icons[id]?.url)) continue;
      if (force) failed.get(id)?.delete(sha256);
      if (failed.get(id)?.has(sha256)) continue;
      const abort = new AbortController();
      const operation = Promise.resolve().then(() => {
        if (closed || state.consent !== true) throw new Error('Icon upload disabled');
        return uploader(bytes, { signal: abort.signal });
      }).then(async url => {
        if (!publicIconUrl(url)) throw new Error('Invalid public icon URL');
        if (closed || state.consent !== true || abort.signal.aborted) return;
        await commit(current => closed || current.consent !== true || abort.signal.aborted ? current
          : ({ ...current, icons: { ...current.icons, [id]: { ...current.icons[id], url, sha256, provider } } }));
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
    async settings() { await loaded; return { consent: state.consent, ...ICON_PROVIDER }; },
    async upload(app) {
      await loaded;
      if (!uploadsEnabled) throw new Error('Icon uploads are unavailable');
      if (state.consent !== true) throw new Error('Icon upload consent required');
      iconPng(app.icon);
      await pair([app], { force: true });
    },
    async setConsent(consent, observedProvider = provider) {
      await loaded;
      if (typeof consent !== 'boolean') throw new Error('Consent must be boolean');
      if (observedProvider !== provider) throw new Error('Icon provider changed; review consent again');
      await commit(current => ({ ...current, consent }));
      if (!consent) for (const item of pending.values()) item.abort.abort();
      return { consent: state.consent, ...ICON_PROVIDER };
    },
    async drain() { await loaded; await Promise.all([...pending.values()].map(item => item.operation)); await saving; },
    close() { closed = true; for (const item of pending.values()) item.abort.abort(); },
  };
}
