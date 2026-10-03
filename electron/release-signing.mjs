import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

// Signing rewrites installer bytes, so the updater feed and blockmap built by
// electron-builder must be regenerated from the signed file before verification.
export async function applySignedInstaller({ directory, signedDirectory, version, buildBlockMap }) {
  const installer = `Vibe-Studio-Setup-${version}.exe`;
  const signed = readdirSync(signedDirectory).filter((name) => name.endsWith('.exe'));
  if (JSON.stringify(signed) !== JSON.stringify([installer])) throw new Error(`Signed artifact must contain exactly ${installer}`);
  const before = readFileSync(join(directory, installer));
  const bytes = readFileSync(join(signedDirectory, installer));
  if (bytes.subarray(0, 2).toString() !== 'MZ') throw new Error('Signed installer is not a Windows executable');
  if (bytes.equals(before)) throw new Error('Signed installer is identical to the unsigned build');
  copyFileSync(join(signedDirectory, installer), join(directory, installer));

  const target = join(directory, installer);
  const blockmap = await buildBlockMap(target, 'gzip', `${target}.blockmap`);
  const sha512 = createHash('sha512').update(bytes).digest('base64');
  if (blockmap.sha512 !== sha512 || blockmap.size !== bytes.length) throw new Error('Blockmap does not describe the signed installer');

  const { load, dump } = createRequire(require.resolve('electron-updater/package.json'))('js-yaml');
  const feed = load(readFileSync(join(directory, 'latest.yml'), 'utf8'));
  if (feed?.path !== installer || !Array.isArray(feed.files) || feed.files.length !== 1 || feed.files[0].url !== installer) throw new Error('latest.yml does not describe the installer');
  feed.sha512 = sha512;
  feed.files[0].sha512 = sha512;
  feed.files[0].size = bytes.length;
  writeFileSync(join(directory, 'latest.yml'), dump(feed, { lineWidth: -1 }));
  return { installer, size: bytes.length, sha512 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [directory = 'dist', signedDirectory = 'dist-signed'] = process.argv.slice(2);
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap');
  const result = await applySignedInstaller({ directory, signedDirectory, version, buildBlockMap });
  console.log(`Applied signed ${result.installer} (${result.size} bytes)`);
}
