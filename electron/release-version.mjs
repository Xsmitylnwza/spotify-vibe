import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function assertReleaseVersion(tag, pkg, lock) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '') || tag !== `v${pkg.version}`) {
    throw new Error(`Release tag ${tag} must equal v${pkg.version}`);
  }
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
    throw new Error('package-lock.json version must match package.json');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assertReleaseVersion(process.env.GITHUB_REF_NAME,
    JSON.parse(readFileSync('package.json', 'utf8')),
    JSON.parse(readFileSync('package-lock.json', 'utf8')));
}
