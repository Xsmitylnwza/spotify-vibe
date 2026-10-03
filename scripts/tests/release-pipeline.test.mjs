import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertReleaseVersion, compareVersions, nextPatch, releaseDecision, withVersion } from '../../electron/release-version.mjs';
import { assertMainUnchanged } from '../../electron/release-pipeline.mjs';
import { verifyUpdaterFeed, writeReleaseArtifacts, verifyUploadedAssets } from '../../electron/release-artifacts.mjs';

const base = { event: 'main', version: '1.0.7', latestVersion: '1.0.7', sourceSha: 'new', mainSha: 'new', publishedSha: 'old' };
const pkg = { name: 'test', version: '1.0.7', dependencies: { foo: '1' } };
const lock = { version: '1.0.7', lockfileVersion: 3, packages: { '': { version: '1.0.7', name: 'test' }, 'node_modules/foo': { version: '1' } } };

test('main changed source automatically advances patch without republishing unchanged version', () => {
  assert.deepEqual(releaseDecision(base), { release: true, version: '1.0.8', bump: true, latest: true });
  assert.equal(releaseDecision({ ...base, version: '1.0.5' }).version, '1.0.8');
  assert.deepEqual(releaseDecision({ ...base, version: '1.1.0' }), { release: true, version: '1.1.0', bump: false, latest: true });
});

test('first main release keeps package version and unchanged source skips', () => {
  assert.equal(releaseDecision({ ...base, latestVersion: undefined }).version, '1.0.7');
  assert.deepEqual(releaseDecision({ ...base, publishedSha: 'new' }), { release: false, reason: 'source-already-published' });
});

test('stale main event never prepares a release and changed main aborts publication', () => {
  assert.deepEqual(releaseDecision({ ...base, mainSha: 'newer' }), { release: false, reason: 'stale-main' });
  assertMainUnchanged('a', 'a');
  assert.throws(() => assertMainUnchanged('a', 'b'), /Main advanced/);
});

test('explicit tags remain version checked, duplicate release skips, old tags cannot become latest', () => {
  const input = { ...base, event: 'tag', existingTagSha: 'new' };
  assert.deepEqual(releaseDecision(input), { release: true, version: '1.0.7', bump: false, latest: false });
  assert.equal(releaseDecision({ ...input, version: '1.0.8' }).latest, true);
  assert.equal(releaseDecision({ ...input, released: true }).release, false);
  assert.throws(() => releaseDecision({ ...input, existingTagSha: 'other' }), /Tag\/source mismatch/);
  assert.throws(() => assertReleaseVersion('v1.0.8', pkg, lock));
});

test('unpublished version reservations and interrupted drafts fail closed', () => {
  assert.throws(() => releaseDecision({ ...base, version: '1.1.0', existingTagSha: 'other' }), /another source/);
  assert.throws(() => releaseDecision({ ...base, draft: true }), /operator recovery/);
  assert.throws(() => releaseDecision({ ...base, event: 'other' }), /Unsupported/);
});

test('version preparation changes both lock roots while preserving dependency records and inputs', () => {
  const before = JSON.stringify({ pkg, lock });
  const updated = withVersion(pkg, lock, '1.0.8');
  assertReleaseVersion('v1.0.8', updated.pkg, updated.lock);
  assert.deepEqual(updated.pkg.dependencies, pkg.dependencies);
  assert.deepEqual(updated.lock.packages['node_modules/foo'], lock.packages['node_modules/foo']);
  assert.equal(JSON.stringify({ pkg, lock }), before);
  assert.throws(() => withVersion(pkg, { ...lock, version: '0.1.0' }, '1.0.8'));
});

test('numeric stable versions compare correctly and malformed/prerelease versions fail closed', () => {
  assert.equal(compareVersions('1.0.10', '1.0.9'), 1);
  assert.equal(nextPatch('1.9.999'), '1.9.1000');
  for (const bad of ['01.0.7', '1.0.7-beta', '1.0', 'v1.0.7']) assert.throws(() => compareVersions(bad, '1.0.7'));
});

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'vibe-release-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const installer = 'Vibe-Studio-Setup-1.0.7.exe';
  const bytes = Buffer.from('MZfake installer bytes');
  const digest = createHash('sha512').update(bytes).digest('base64');
  const feed = `version: 1.0.7\nfiles:\n  - url: ${installer}\n    sha512: ${digest}\n    size: ${bytes.length}\npath: ${installer}\nsha512: ${digest}\nreleaseDate: '2026-10-03T00:00:00.000Z'\n`;
  writeFileSync(join(directory, installer), bytes);
  writeFileSync(join(directory, `${installer}.blockmap`), 'blockmap');
  writeFileSync(join(directory, 'latest.yml'), feed);
  const options = { directory, pkg, lock, sourceCommit: 'a'.repeat(40), triggerCommit: 'b'.repeat(40), repository: 'owner/repo', runId: '42', runAttempt: '2', workflowRef: 'owner/repo/.github/workflows/release.yml@refs/heads/main' };
  return { directory, installer, bytes, feed, options };
}

test('provenance and checksum assets retain source, build and updater integrity', (t) => {
  const { directory, options } = fixture(t);
  const result = writeReleaseArtifacts(options);
  assert.equal(result.sourceCommit, options.sourceCommit);
  assert.equal(result.triggerCommit, options.triggerCommit);
  assert.equal(result.build.url, 'https://github.com/owner/repo/actions/runs/42/attempts/2');
  assert.deepEqual(result.package, { version: '1.0.7', lockVersion: '1.0.7', lockRootVersion: '1.0.7' });
  assert.equal(result.verification.nativeUpgrade, 'unverified');
  assert.equal(result.verification.codeSigning, 'unverified');
  assert.equal(readdirSync(directory).length, 5);
  const sums = readFileSync(join(directory, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
  assert.equal(sums.length, 4);
  for (const line of sums) {
    const [digest, name] = line.split('  ');
    assert.equal(createHash('sha256').update(readFileSync(join(directory, name))).digest('hex'), digest);
  }
  assert.equal(result.artifacts.length, 3);
});

test('corrupt URL, version, SHA512, size, and duplicate installer metadata are rejected', (t) => {
  const { installer, bytes, feed } = fixture(t);
  verifyUpdaterFeed(feed, '1.0.7', installer, bytes);
  for (const corrupt of [feed.replace('version: 1.0.7', 'version: 1.0.8'), feed.replace(`url: ${installer}`, 'url: wrong.exe'), feed.replace('sha512:', 'wrong:'), feed.replace(`size: ${bytes.length}`, 'size: 0'), feed + `  - url: ${installer}\n`]) {
    assert.throws(() => verifyUpdaterFeed(corrupt, '1.0.7', installer, bytes), /mismatch/);
  }
});

test('invalid YAML indentation, syntax and duplicate root keys fail parsing', (t) => {
  const { installer, bytes, feed } = fixture(t);
  for (const corrupt of ['  ' + feed, feed + 'broken: [\n', feed + 'version: 1.0.7\n']) {
    assert.throws(() => verifyUpdaterFeed(corrupt, '1.0.7', installer, bytes), /YAML mismatch/);
  }
});

test('parsed feed requires a mapping root and exactly one complete installer record', (t) => {
  const { installer, bytes, feed } = fixture(t);
  const digest = createHash('sha512').update(bytes).digest('base64');
  const file = `{url: ${installer}, sha512: '${digest}', size: ${bytes.length}}`;
  const root = `version: '1.0.7'\npath: '${installer}'\nsha512: '${digest}'\n`;
  verifyUpdaterFeed(root + `files: [${file}]\n`, '1.0.7', installer, bytes);
  for (const corrupt of ['null', '[]', '- version: 1.0.7', root + 'files: []\n', root + `files: [${file}, ${file}]\n`, root + `files: ${file}\n`, root + 'files: [null]\n', feed.replace(`size: ${bytes.length}`, `size: '${bytes.length}'`), feed.replace(`path: ${installer}`, 'path: wrong.exe'), feed.replace(`\nsha512: ${digest}`, '\nsha512: wrong')]) {
    assert.throws(() => verifyUpdaterFeed(corrupt, '1.0.7', installer, bytes), /mismatch/);
  }
});

test('stale artifacts, empty blockmap, invalid executable, source SHA and lock reject provenance', (t) => {
  const { directory, installer, options } = fixture(t);
  assert.throws(() => writeReleaseArtifacts({ ...options, sourceCommit: 'main' }), /full commit/);
  assert.throws(() => writeReleaseArtifacts({ ...options, runId: undefined }), /build identity/);
  assert.throws(() => writeReleaseArtifacts({ ...options, lock: { ...lock, version: '1.0.8' } }), /lock/);
  writeFileSync(join(directory, 'old.exe'), 'MZ');
  assert.throws(() => writeReleaseArtifacts(options), /stale/);
  rmSync(join(directory, 'old.exe'));
  writeFileSync(join(directory, `${installer}.blockmap`), '');
  assert.throws(() => writeReleaseArtifacts(options), /Empty/);
  writeFileSync(join(directory, installer), 'not an executable');
  assert.throws(() => writeReleaseArtifacts(options), /Windows executable/);
});

test('publication accepts exactly five complete assets with matching remote digests and sizes', (t) => {
  const { directory, options } = fixture(t);
  writeReleaseArtifacts(options);
  const assets = readdirSync(directory).map((name) => {
    const bytes = readFileSync(join(directory, name));
    return { name, size: bytes.length, state: 'uploaded', digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` };
  });
  verifyUploadedAssets(directory, '1.0.7', assets);
  assert.throws(() => verifyUploadedAssets(directory, '1.0.7', assets.slice(1)), /asset set/);
  assert.throws(() => verifyUploadedAssets(directory, '1.0.7', [...assets, assets[0]]), /asset set/);
  for (const patch of [{ state: 'new' }, { size: 0 }, { digest: undefined }, { digest: 'sha256:wrong' }]) {
    assert.throws(() => verifyUploadedAssets(directory, '1.0.7', assets.map((a, i) => i === 0 ? { ...a, ...patch } : a)));
  }
  writeFileSync(join(directory, 'latest.yml'), 'tampered');
  assert.throws(() => verifyUploadedAssets(directory, '1.0.7', assets), /mismatch/);
});
