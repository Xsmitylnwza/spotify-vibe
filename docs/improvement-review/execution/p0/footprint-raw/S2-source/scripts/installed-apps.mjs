// Installed-apps enumeration (Windows Start Menu shortcuts).
// Scans once in the background at startup, caches to disk, and serves the
// cached list instantly. Refresh is best-effort and never blocks requests.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // refresh weekly
const SCAN_TIMEOUT_MS = 120000;

let cached = null; // { scannedAt, apps }
let scanPromise = null;

function scriptPath() {
  return fileURLToPath(new URL('./installed-apps.ps1', import.meta.url));
}

async function readCache(cachePath) {
  try {
    const raw = await readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.apps)) return parsed;
  } catch { /* no cache yet */ }
  return null;
}

function runScan({ signal, spawnProcess = spawn, platform = process.platform } = {}) {
  if (platform !== 'win32' || signal?.aborted) return Promise.resolve([]);
  return new Promise((resolve) => {
    const child = spawnProcess('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath(),
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let done = false;
    let timer;
    const finish = (apps) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve(apps);
    };
    const abort = () => { try { child.kill(); } catch {} finish([]); };
    timer = setTimeout(abort, SCAN_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.on('data', chunk => { if (!done) out += chunk; });
    child.stderr?.resume();
    child.on('error', () => finish([]));
    child.on('close', () => {
      try {
        const parsed = JSON.parse(out.trim() || '[]');
        finish(Array.isArray(parsed) ? parsed : []);
      } catch { finish([]); }
    });
  });
}

async function refreshCache(cachePath, options = {}) {
  if (options.signal?.aborted) return cached;
  if (scanPromise) return scanPromise;
  const operation = (async () => {
    const apps = await runScan(options);
    if (apps.length && !options.signal?.aborted) {
      cached = { scannedAt: new Date().toISOString(), apps };
      try {
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, JSON.stringify(cached), 'utf8');
      } catch { /* cache is best-effort */ }
    }
    return cached;
  })();
  scanPromise = operation;
  try { return await operation; }
  finally { if (scanPromise === operation) scanPromise = null; }
}

// Call once at server startup. Serves disk cache instantly; refreshes in
// the background when the cache is missing or stale.
export async function initInstalledApps(dataDirectory, options = {}) {
  const cachePath = join(dataDirectory, 'installed-apps.json');
  if (options.signal?.aborted) return;
  if ((options.platform ?? process.platform) !== 'win32') {
    cached = { scannedAt: new Date().toISOString(), apps: [] };
    return;
  }
  const disk = await readCache(cachePath);
  if (options.signal?.aborted) return;
  if (disk) {
    cached = disk;
    const age = Date.now() - new Date(disk.scannedAt).getTime();
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) void refreshCache(cachePath, options).catch(() => undefined);
  } else {
    cached = { scannedAt: new Date().toISOString(), apps: [] };
    void refreshCache(cachePath, options).catch(() => undefined);
  }
}

export function getInstalledApps() {
  return cached?.apps || [];
}

// Force a fresh scan (e.g. after the user installs something).
export async function refreshInstalledApps(dataDirectory, options = {}) {
  const cachePath = join(dataDirectory, 'installed-apps.json');
  await refreshCache(cachePath, options);
  return getInstalledApps();
}
