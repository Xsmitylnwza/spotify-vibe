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

function runScan() {
  if (process.platform !== 'win32') return Promise.resolve([]);
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath(),
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let done = false;
    const finish = (apps) => { if (!done) { done = true; resolve(apps); } };
    const timer = setTimeout(() => { try { child.kill(); } catch {} finish([]); }, SCAN_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('error', () => { clearTimeout(timer); finish([]); });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(out.trim() || '[]');
        finish(Array.isArray(parsed) ? parsed : []);
      } catch { finish([]); }
    });
  });
}

async function refreshCache(cachePath) {
  if (scanPromise) return scanPromise;
  scanPromise = (async () => {
    const apps = await runScan();
    if (apps.length) {
      cached = { scannedAt: new Date().toISOString(), apps };
      try {
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, JSON.stringify(cached), 'utf8');
      } catch { /* cache is best-effort */ }
    }
    scanPromise = null;
    return cached;
  })();
  return scanPromise;
}

// Call once at server startup. Serves disk cache instantly; refreshes in
// the background when the cache is missing or stale.
export async function initInstalledApps(dataDirectory) {
  const cachePath = join(dataDirectory, 'installed-apps.json');
  if (process.platform !== 'win32') {
    cached = { scannedAt: new Date().toISOString(), apps: [] };
    return;
  }
  const disk = await readCache(cachePath);
  if (disk) {
    cached = disk;
    const age = Date.now() - new Date(disk.scannedAt).getTime();
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) void refreshCache(cachePath);
  } else {
    cached = { scannedAt: new Date().toISOString(), apps: [] };
    void refreshCache(cachePath);
  }
}

export function getInstalledApps() {
  return cached?.apps || [];
}

// Force a fresh scan (e.g. after the user installs something).
export async function refreshInstalledApps(dataDirectory) {
  const cachePath = join(dataDirectory, 'installed-apps.json');
  await refreshCache(cachePath);
  return getInstalledApps();
}
