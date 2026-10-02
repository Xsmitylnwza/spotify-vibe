import { createHash } from 'node:crypto';
import { watchWindowsApps } from '../../../../../scripts/windows-apps.mjs';
import { refreshInstalledApps } from '../../../../../scripts/installed-apps.mjs';
import { appKey } from '../../../../../scripts/app-presence.mjs';
import { applicationBadge } from '../../../../../scripts/application-badges.mjs';

export function publicAppIcon(executable, name) {
  const approved = applicationBadge(executable, name);
  if (approved) return approved;
  const file = executable.replaceAll('/', '\\').split('\\').at(-1).toLowerCase();
  const sites = { 'code.exe': 'code.visualstudio.com', 'figma.exe': 'figma.com', 'spotify.exe': 'spotify.com', 'obs64.exe': 'obsproject.com', 'blender.exe': 'blender.org', 'firefox.exe': 'mozilla.org', 'msedge.exe': 'microsoft.com', 'notion.exe': 'notion.so', 'slack.exe': 'slack.com' };
  return sites[file] ? `https://www.google.com/s2/favicons?domain=${sites[file]}&sz=128` : '';
}

export function appIdentity(executable) { return 'device-' + createHash('sha256').update(appKey(executable)).digest('hex').slice(0, 24); }
export function normalizeDeviceApps(apps) {
  const seen = new Set();
  return apps.filter(a => a && typeof a.executable === 'string' && /^[a-z]:\\.*\.exe$/i.test(a.executable)).flatMap(a => {
    const id = appIdentity(a.executable); if (seen.has(id)) return []; seen.add(id);
    const name = String(a.name || a.executable.split('\\').at(-1));
    return [{ id, name, exe: a.executable, publicIcon: publicAppIcon(a.executable, name), icon: /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(a.icon || '') ? a.icon : '', foreground: !!a.foreground }];
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
