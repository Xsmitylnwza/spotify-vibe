import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const appIconManifest = JSON.parse(readFileSync(new URL('../public/art/apps/manifest.json', import.meta.url), 'utf8'));
export const DEFAULT_APP_ICON_REF = 'improve/flow-ux';
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}+]/gu, '');
const basename = value => String(value || '').replaceAll('\\', '/').split('/').at(-1).toLowerCase();
const executableKey = value => normalize(basename(value).replace(/\.exe$/i, ''));
const excluded = (file, names) => /(?:update|updater|squirrel|setup|installer)(?:\.exe)?$/i.test(file) ||
  /^unins/i.test(file) || /uninstall|installer/i.test(file) || names.some(name => /uninstall|uninstaller|ถอนการติดตั้ง|卸载|アンインストール/i.test(name));
const byExe = new Map(), byName = new Map();
for (const entry of appIconManifest) {
  for (const [index, keys] of [[byExe, entry.exeNames.map(executableKey)], [byName, entry.names.map(normalize)]]) {
    for (const key of keys) { if (!index.has(key)) index.set(key, new Set()); index.get(key).add(entry); }
  }
}
function choose(entries, publisher) {
  if (!entries?.size) return null;
  if (entries.size === 1) return [...entries][0].slug;
  const hint = normalize(publisher);
  const matches = [...entries].filter(entry => hint && entry.publisherHints.some(p => hint.includes(normalize(p))));
  return matches.length === 1 ? matches[0].slug : null;
}

// Exact executable aliases win over shortcut/display labels. No substring brand
// guessing, and updater/uninstaller identities never inherit the parent icon.
export function matchAppIcon(identity = {}) {
  const exe = identity.exeName || identity.executable || identity.exe || '';
  const names = [identity.productName, identity.displayName, identity.name].filter(Boolean).map(String);
  if (excluded(basename(exe), names)) return null;
  const executable = choose(byExe.get(executableKey(exe)), identity.publisher);
  if (executable) return executable;
  for (const name of names) {
    const variants = [name, name.replace(/\s+(?:\d{4}|\d+(?:\.\d+)+)(?:\s.*)?$/, '').replace(/\s*\((?:x64|x86|64[- ]bit|32[- ]bit)\)\s*$/i, '')];
    for (const alias of variants) {
      const match = choose(byName.get(normalize(alias)), identity.publisher);
      if (match) return match;
    }
  }
  return null;
}

export function appIconPackUrl(slug, { ref = process.env.PRESENCE_APP_ICON_REF || DEFAULT_APP_ICON_REF } = {}) {
  if (!appIconManifest.some(entry => entry.slug === slug)) return '';
  if (typeof ref !== 'string' || !ref || !/^[A-Za-z0-9_./-]+$/.test(ref) || ref.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Invalid app icon pack ref');
  return `https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/${ref.split('/').map(encodeURIComponent).join('/')}/public/art/apps/${slug}.png`;
}

export function packedAppIcon(identity, options) { const slug = matchAppIcon(identity); return slug ? appIconPackUrl(slug, options) : ''; }

// Run after the owner-approved push: node scripts/app-icon-pack.mjs --check-urls --ref <branch-or-commit>
// No runtime polling or network access occurs merely by importing the matcher.
export async function checkAppIconPackUrls({ ref, fetchImpl = globalThis.fetch, entries = appIconManifest } = {}) {
  const results = new Array(entries.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, async () => {
    while (next < entries.length) {
      const index = next++, slug = entries[index].slug, url = appIconPackUrl(slug, { ref });
      try {
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
        const contentType = response.headers.get('content-type') || '';
        await response.body?.cancel();
        results[index] = { slug, url, status: response.status, contentType, ok: response.status === 200 && /^image\/png(?:;|$)/i.test(contentType) };
      } catch (error) { results[index] = { slug, url, status: null, ok: false, error: error.message }; }
    }
  }));
  return results;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--check-urls')) throw new Error('Use --check-urls [--ref <branch-or-commit>]');
  const index = process.argv.indexOf('--ref');
  if (index !== -1 && !process.argv[index + 1]) throw new Error('--ref requires a value');
  const results = await checkAppIconPackUrls({ ref: index === -1 ? undefined : process.argv[index + 1] });
  for (const result of results) console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.slug} ${result.status ?? result.error} ${result.url}`);
  console.log(`${results.filter(r => r.ok).length}/${results.length} PNG URLs returned HTTP 200`);
  process.exitCode = results.every(r => r.ok) ? 0 : 1;
}
