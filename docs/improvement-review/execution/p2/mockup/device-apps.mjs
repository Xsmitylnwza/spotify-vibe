import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { watchWindowsApps } from '../../../../../scripts/windows-apps.mjs';
import { refreshInstalledApps } from '../../../../../scripts/installed-apps.mjs';
import { appKey } from '../../../../../scripts/app-presence.mjs';
import { applicationBadge } from '../../../../../scripts/application-badges.mjs';

export function publicIconUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname); } catch { return false; }
}
export function iconPng(icon) {
  if (!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(icon || '')) throw new Error('PNG icon required');
  const bytes = Buffer.from(icon.split(',')[1], 'base64');
  if (bytes.length < 33 || bytes.length > 262144 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG icon');
  const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
  if (!w || !h || w > 256 || h > 256) throw new Error('Icon must be at most 256 pixels');
  return bytes;
}
// Provider adapters receive only PNG bytes: no executable paths or app names leave the PC.
export function createIconUploader({ provider = 'catbox', apiKey = '', fetchImpl = globalThis.fetch } = {}) {
  return async bytes => {
    const form = new FormData();
    let endpoint;
    if (provider === 'catbox') {
      endpoint = 'https://catbox.moe/user/api.php'; form.set('reqtype', 'fileupload'); form.set('fileToUpload', new Blob([bytes], { type: 'image/png' }), 'icon.png');
    } else if (provider === 'imgbb' && apiKey) {
      endpoint = 'https://api.imgbb.com/1/upload'; form.set('key', apiKey); form.set('image', bytes.toString('base64'));
    } else throw new Error('Icon provider unavailable');
    const response = await fetchImpl(endpoint, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Icon upload failed');
    const url = provider === 'catbox' ? (await response.text()).trim() : (await response.json()).data?.url;
    if (!publicIconUrl(url)) throw new Error('Host did not return a public HTTPS URL');
    return url;
  };
}
export function createIconHosting(dataDirectory, { provider = 'catbox', uploader = createIconUploader({ provider }) } = {}) {
  const file = join(dataDirectory, 'icon-hosting.json');
  let state = { consent: null, provider, icons: {} }, saving = Promise.resolve();
  const pending = new Map(), failed = new Map();
  const loaded = readFile(file, 'utf8').then(text => {
    const saved = JSON.parse(text); state = { consent: typeof saved.consent === 'boolean' ? saved.consent : null, provider, icons: saved.icons || {} };
  }).catch(error => { if (error.code !== 'ENOENT') throw error; });
  const persist = () => {
    const operation = saving.then(async () => { await mkdir(dataDirectory, { recursive: true }); await writeFile(file + '.tmp', JSON.stringify(state), 'utf8'); await rename(file + '.tmp', file); });
    saving = operation.catch(() => {}); return operation;
  };
  const hash = app => createHash('sha256').update(iconPng(app.icon)).digest('hex');
  async function decorate(app) {
    await loaded;
    const approved = publicAppIcon(app.exe, app.name, app.publisher);
    if (approved) return { ...app, publicIcon: approved, iconStatus: 'ready', iconSource: 'pack' };
    let sha256; try { sha256 = hash(app); } catch {}
    const cached = state.icons[app.id];
    if (sha256 && cached?.sha256 === sha256 && publicIconUrl(cached.url)) return { ...app, publicIcon: cached.url, iconStatus: 'ready', iconSource: 'upload' };
    return { ...app, publicIcon: '', iconSource: 'default', iconStatus: pending.has(app.id) ? 'uploading' : state.consent !== true ? 'needs-consent' : 'failed' };
  }
  async function pair(apps) {
    await loaded;
    if (state.consent !== true) return;
    for (const app of apps) {
      if (publicAppIcon(app.exe, app.name, app.publisher) || pending.has(app.id)) continue;
      let sha256; try { sha256 = hash(app); } catch { continue; }
      if ((state.icons[app.id]?.sha256 === sha256 && publicIconUrl(state.icons[app.id]?.url)) || failed.get(app.id) === sha256) continue;
      const operation = Promise.resolve().then(() => {
        if (state.consent !== true) throw new Error('Icon upload disabled');
        return uploader(iconPng(app.icon));
      }).then(async url => {
        if (!publicIconUrl(url)) throw new Error('Invalid public icon URL');
        state.icons[app.id] = { url, sha256 }; await persist(); failed.delete(app.id);
      }).catch(() => { failed.set(app.id, sha256); }).finally(() => pending.delete(app.id));
      pending.set(app.id, operation);
    }
  }
  return { decorate, pair, async settings() { await loaded; return { consent: state.consent, provider }; },
    async setConsent(consent) { await loaded; if (typeof consent !== 'boolean') throw new Error('Consent must be boolean'); state.consent = consent; await persist(); return { consent, provider }; },
    async drain() { await loaded; await Promise.all([...pending.values()]); await saving; } };
}

export function publicAppIcon(executable, name, publisher = '') {
  return applicationBadge(executable, name, { publisher }) || '';
}

const HELPER_EXES = new Set(['textinputhost.exe', 'applicationframehost.exe', 'runtimebroker.exe', 'shellexperiencehost.exe', 'searchhost.exe', 'searchapp.exe', 'startmenuexperiencehost.exe', 'systemsettings.exe', 'lockapp.exe', 'taskhostw.exe', 'sihost.exe', 'ctfmon.exe', 'dllhost.exe', 'conhost.exe', 'backgroundtaskhost.exe']);
/* Junk = uninstallers, Windows helper/system processes, bare Electron hosts and dock helpers. Flagged (not dropped) so the UI can offer "N hidden — show". */
export function isJunkApp(executable, name = '') {
  const file = executable.replaceAll('/', '\\').split('\\').at(-1).toLowerCase(), label = String(name).trim();
  if (/^unins/.test(file) || /uninstall/i.test(file) || /uninstall|ถอนการติดตั้ง/i.test(label)) return true;
  if (HELPER_EXES.has(file)) return true;
  if (file === 'electron.exe' && (!label || /^electron(\.exe)?$/i.test(label))) return true;
  if (/^dock_?\d*\.exe$/.test(file) || /^dock_?helper/.test(file)) return true;
  return false;
}
export function appIdentity(executable) { return 'device-' + createHash('sha256').update(appKey(executable)).digest('hex').slice(0, 24); }
export function normalizeDeviceApps(apps) {
  const seen = new Set();
  return apps.filter(a => a && typeof a.executable === 'string' && /^[a-z]:\\.*\.exe$/i.test(a.executable)).flatMap(a => {
    const id = appIdentity(a.executable); if (seen.has(id)) return []; seen.add(id);
    const name = String(a.name || a.executable.split('\\').at(-1));
    const publisher = String(a.publisher || '');
    const publicIcon = publicAppIcon(a.executable, name, publisher);
    return [{ id, name, exe: a.executable, publisher, publicIcon, iconSource: publicIcon ? 'pack' : 'default', icon: /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(a.icon || '') ? a.icon : '', foreground: !!a.foreground, hidden: isJunkApp(a.executable, name) }];
  }).sort((a, b) => Number(b.foreground) - Number(a.foreground) || a.name.localeCompare(b.name));
}
export function readRunningApps(watch = watchWindowsApps) {
  return new Promise((resolve, reject) => {
    let stop, completed = false;
    const timer = setTimeout(() => { stop?.(); reject(new Error('Could not read running Windows apps in time')); }, 30000);
    stop = watch(snapshot => {
      // The helper emits foreground information before its first process catalog.
      if (snapshot.supported && !snapshot.error && !snapshot.apps?.length && !snapshot.running?.length) return;
      if (completed) return; completed = true; clearTimeout(timer);
      // Some injected/unsupported watchers call synchronously before returning stop.
      queueMicrotask(() => stop?.());
      if (!snapshot.supported || snapshot.error) reject(new Error(snapshot.error || 'Windows app discovery unavailable'));
      else resolve(normalizeDeviceApps(snapshot.apps));
    });
  });
}
export function createDeviceCatalog(dataDirectory, { running = readRunningApps, installed = () => refreshInstalledApps(dataDirectory) } = {}) {
  let installedApps, pendingInstalled, pending;
  return async function read({ refresh = false } = {}) {
    if (pending) return pending;
    pending = (async () => {
      if (!installedApps || refresh) {
        pendingInstalled ||= installed().then(apps => { installedApps = normalizeDeviceApps(apps); }).finally(() => { pendingInstalled = null; });
      }
      const [open] = await Promise.all([running(), pendingInstalled]);
      const names = new Map((installedApps || []).map(a => [a.id, a.name]));
      return { source: 'windows', observedAt: new Date().toISOString(), running: open.map(a => ({ ...a, name: names.get(a.id) || a.name })), installed: installedApps || [] };
    })();
    try { return await pending; } finally { pending = null; }
  };
}
