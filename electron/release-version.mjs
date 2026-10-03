import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function assertReleaseVersion(tag, pkg, lock) {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag || '') || tag !== `v${pkg.version}`) {
    throw new Error(`Release tag ${tag} must equal v${pkg.version}`);
  }
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
    throw new Error('package-lock.json version must match package.json');
  }
}

export function compareVersions(a, b) {
  const parse = (value) => {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error(`Invalid stable version: ${value}`);
    return value.split('.').map(BigInt);
  };
  const left = parse(a), right = parse(b);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

export function nextPatch(version) {
  compareVersions(version, version);
  const parts = version.split('.');
  parts[2] = String(BigInt(parts[2]) + 1n);
  return parts.join('.');
}

export function releaseDecision({ event, version, latestVersion, sourceSha, mainSha, publishedSha, existingTagSha, released, draft }) {
  compareVersions(version, version);
  if (event === 'main' && sourceSha !== mainSha) return { release: false, reason: 'stale-main' };
  if (event === 'main' && sourceSha === publishedSha) return { release: false, reason: 'source-already-published' };
  if (draft) throw new Error('Existing draft requires operator recovery');
  if (event === 'tag') {
    if (existingTagSha !== sourceSha) throw new Error('Tag/source mismatch');
    if (released) return { release: false, reason: 'version-already-published' };
    return { release: true, version, bump: false, latest: !latestVersion || compareVersions(version, latestVersion) > 0 };
  }
  if (event !== 'main') throw new Error('Unsupported release event');
  const target = latestVersion && compareVersions(version, latestVersion) <= 0 ? nextPatch(latestVersion) : version;
  // An unpublished tag is an explicit source reservation; never move it.
  if (target === version && existingTagSha && existingTagSha !== sourceSha) throw new Error('Version tag already belongs to another source');
  return { release: true, version: target, bump: target !== version, latest: true };
}

export function withVersion(pkg, lock, version) {
  assertReleaseVersion(`v${pkg.version}`, pkg, lock);
  compareVersions(version, version);
  return {
    pkg: { ...pkg, version },
    lock: { ...lock, version, packages: { ...lock.packages, '': { ...lock.packages[''], version } } },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assertReleaseVersion(process.env.GITHUB_REF_NAME,
    JSON.parse(readFileSync('package.json', 'utf8')),
    JSON.parse(readFileSync('package-lock.json', 'utf8')));
}
