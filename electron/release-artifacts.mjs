import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { assertReleaseVersion } from './release-version.mjs';

const hash = (bytes, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const require = createRequire(import.meta.url);

// Narrow electron-builder Windows YAML contract; unsupported shapes fail closed.
export function verifyUpdaterFeed(feed, version, installer, bytes) {
  // Prepare runs before npm ci; resolve the updater's parser only during verification.
  const { load } = createRequire(require.resolve('electron-updater/package.json'))('js-yaml');
  let info;
  try {
    info = load(feed);
  } catch (cause) {
    throw new Error('latest.yml YAML mismatch: invalid document', { cause });
  }
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(info)) throw new Error('latest.yml root mismatch');
  const digest = hash(bytes, 'sha512', 'base64');
  for (const [key, value] of Object.entries({ version, path: installer, sha512: digest })) {
    if (info[key] !== value) throw new Error(`latest.yml ${key} mismatch`);
  }
  if (!Array.isArray(info.files) || info.files.length !== 1 || !record(info.files[0])) throw new Error('latest.yml files mismatch');
  for (const [key, value] of Object.entries({ url: installer, sha512: digest, size: bytes.length })) {
    if (info.files[0][key] !== value) throw new Error(`latest.yml file ${key} mismatch`);
  }
}

export function writeReleaseArtifacts({ directory, pkg, lock, sourceCommit, triggerCommit, repository, runId, runAttempt, workflowRef, codeSigning = 'unverified', nodeVersion = process.version, platform = process.platform, createdAt = new Date().toISOString() }) {
  const tag = `v${pkg.version}`;
  assertReleaseVersion(tag, pkg, lock);
  if (!/^[a-f0-9]{40}$/.test(sourceCommit) || !/^[a-f0-9]{40}$/.test(triggerCommit)) throw new Error('Provenance requires full commit SHAs');
  if (!repository || !runId || !runAttempt || !workflowRef) throw new Error('Missing build identity');
  if (!['unverified', 'valid'].includes(codeSigning)) throw new Error('Unknown code signing state');
  const installer = `Vibe-Studio-Setup-${pkg.version}.exe`;
  const names = [installer, `${installer}.blockmap`, 'latest.yml'];
  const packaged = readdirSync(directory).filter((name) => /\.exe(?:\.blockmap)?$/.test(name)).sort();
  if (JSON.stringify(packaged) !== JSON.stringify([installer, `${installer}.blockmap`].sort())) throw new Error('Unexpected or stale Windows artifacts');
  const bytes = readFileSync(join(directory, installer));
  if (bytes.length < 2 || bytes.subarray(0, 2).toString() !== 'MZ') throw new Error('Installer is not a Windows executable');
  verifyUpdaterFeed(readFileSync(join(directory, 'latest.yml'), 'utf8'), pkg.version, installer, bytes);
  const artifacts = names.map((name) => {
    const path = join(directory, name);
    if (statSync(path).size === 0) throw new Error(`Empty artifact: ${name}`);
    return { name, size: statSync(path).size, sha256: hash(readFileSync(path)) };
  });
  const provenance = {
    schemaVersion: 1, version: pkg.version, tag, repository, sourceCommit, triggerCommit, createdAt,
    build: { runId: String(runId), runAttempt: String(runAttempt), workflowRef, nodeVersion, platform, url: `https://github.com/${repository}/actions/runs/${runId}/attempts/${runAttempt}` },
    package: { version: pkg.version, lockVersion: lock.version, lockRootVersion: lock.packages[''].version },
    verification: { npmTest: 'passed', windowsBuild: 'passed', updaterFeed: 'verified', codeSigning, nativeUpgrade: 'unverified' },
    artifacts,
  };
  writeFileSync(join(directory, 'release-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  const checksums = [...names, 'release-provenance.json'].map((name) => `${hash(readFileSync(join(directory, name)))}  ${name}\n`).join('');
  writeFileSync(join(directory, 'SHA256SUMS.txt'), checksums);
  return provenance;
}

export function verifyUploadedAssets(directory, version, assets) {
  const expected = [`Vibe-Studio-Setup-${version}.exe`, `Vibe-Studio-Setup-${version}.exe.blockmap`, 'latest.yml', 'release-provenance.json', 'SHA256SUMS.txt'].sort();
  if (JSON.stringify(assets.map((asset) => asset.name).sort()) !== JSON.stringify(expected)) throw new Error('Draft asset set mismatch');
  const sums = readFileSync(join(directory, 'SHA256SUMS.txt'), 'utf8');
  for (const asset of assets) {
    if (asset.state !== 'uploaded') throw new Error('Draft upload incomplete');
    const bytes = readFileSync(join(directory, asset.name));
    const digest = hash(bytes);
    if (asset.size !== bytes.length || asset.digest !== `sha256:${digest}`) throw new Error(`Uploaded digest/size mismatch: ${asset.name}`);
    if (asset.name !== 'SHA256SUMS.txt' && !sums.includes(`${digest}  ${asset.name}\n`)) throw new Error('Checksum manifest mismatch');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const state = JSON.parse(readFileSync('.release-state.json', 'utf8'));
  writeReleaseArtifacts({ directory: 'dist', pkg: JSON.parse(readFileSync('package.json', 'utf8')), lock: JSON.parse(readFileSync('package-lock.json', 'utf8')),
    sourceCommit: state.sourceSha, triggerCommit: state.triggerSha, repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, workflowRef: process.env.GITHUB_WORKFLOW_REF,
    // Set only by the release step that verified a Valid Authenticode signature.
    codeSigning: process.env.VIBE_CODE_SIGNING === 'Valid' ? 'valid' : 'unverified' });
}
