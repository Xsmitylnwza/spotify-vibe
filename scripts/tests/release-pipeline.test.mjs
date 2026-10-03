import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { assertReleaseVersion, compareVersions, nextPatch, releaseDecision, withVersion } from '../../electron/release-version.mjs';
import { assertMainUnchanged, publish } from '../../electron/release-pipeline.mjs';
import { verifyUpdaterFeed, writeReleaseArtifacts, verifyUploadedAssets } from '../../electron/release-artifacts.mjs';

const base = { event: 'main', version: '1.0.7', latestVersion: '1.0.7', sourceSha: 'new', mainSha: 'new', publishedSha: 'old' };
const pkg = { name: 'test', version: '1.0.7', dependencies: { foo: '1' } };
const lock = { version: '1.0.7', lockfileVersion: 3, packages: { '': { version: '1.0.7', name: 'test' }, 'node_modules/foo': { version: '1' } } };

test('clean checkout imports artifacts and prepare pipeline before dependencies are installed', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'vibe-release-clean-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of ['release-artifacts.mjs', 'release-version.mjs', 'release-pipeline.mjs']) {
    copyFileSync(new URL(`../../electron/${name}`, import.meta.url), join(directory, name));
  }
  const artifactUrl = pathToFileURL(join(directory, 'release-artifacts.mjs')).href;
  const pipelineUrl = pathToFileURL(join(directory, 'release-pipeline.mjs')).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const artifacts = await import(${JSON.stringify(artifactUrl)});
    const pipeline = await import(${JSON.stringify(pipelineUrl)});
    assert.equal(typeof artifacts.writeReleaseArtifacts, 'function');
    pipeline.assertMainUnchanged('same', 'same');
    assert.throws(() => artifacts.verifyUpdaterFeed('', '1.0.7', 'installer.exe', Buffer.from('MZ')),
      (error) => error.code === 'MODULE_NOT_FOUND' && error.message.includes('electron-updater/package.json'));
    console.log('clean checkout imports passed; parser dependency required only at verification');
  `], { cwd: directory, encoding: 'utf8', env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /clean checkout imports passed/);
});

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

function publicationFixture(t, { afterCreate, beforeCreate = [], refresh, moveTag = false } = {}) {
  const { directory, options } = fixture(t);
  const provenance = writeReleaseArtifacts(options);
  const state = { release: true, event: 'tag', tag: 'v1.0.7', version: '1.0.7', sourceSha: options.sourceCommit, triggerSha: options.triggerCommit, latest: true };
  const draft = { id: 402560957, tag_name: state.tag, draft: true, target_commitish: state.sourceSha,
    body: `Built source: ${state.sourceSha}\nWorkflow: ${provenance.build.url}`,
    assets: readdirSync(directory).map((name) => {
      const bytes = readFileSync(join(directory, name));
      return { name, size: bytes.length, state: 'uploaded', digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` };
    }) };
  const calls = [], commands = [];
  let created = false;
  const request = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (path.startsWith('releases?')) {
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
      const all = created ? (afterCreate ? afterCreate(draft) : [draft]) : beforeCreate;
      return all.slice((page - 1) * 100, page * 100);
    }
    // Model the real failure: draft lookup by tag cannot see this release.
    if (path.startsWith('releases/tags/')) throw new Error('GitHub draft tag lookup: 404');
    if (path === `git/ref/tags/${state.tag}`) return { object: { type: 'commit', sha: moveTag && created ? 'c'.repeat(40) : state.sourceSha } };
    if (path === `releases/${draft.id}`) {
      if (options.method === 'PATCH') return { ...draft, ...options.body };
      return refresh ? refresh(draft) : draft;
    }
    throw new Error(`Unexpected API call: ${path}`);
  };
  const gitCommand = (...args) => {
    if (args[0] === 'rev-parse') return state.sourceSha;
    if (args[0] === 'status') return '';
    throw new Error(`Unexpected git command: ${args.join(' ')}`);
  };
  const runCommand = (command, args) => {
    commands.push({ command, args });
    assert.equal(command, 'gh');
    assert.deepEqual(args.slice(0, 3), ['release', 'create', state.tag]);
    assert.equal(args[args.indexOf('--target') + 1], state.sourceSha);
    assert.ok(args.includes('--draft'));
    assert.ok(args.includes('--verify-tag'));
    assert.equal(created, false, 'must create only once');
    created = true;
  };
  return { run: () => publish({ state, pkg, lock, directory, provenance, request, gitCommand, runCommand }), calls, commands, draft, state };
}

test('draft publication finds authenticated list entry despite tag endpoint 404 and verifies by id', async (t) => {
  const f = publicationFixture(t);
  await f.run();
  assert.equal(f.commands.length, 1);
  assert.deepEqual(f.calls.filter((c) => c.method === 'PATCH'), [{ path: `releases/${f.draft.id}`, method: 'PATCH', body: { draft: false, make_latest: 'true' } }]);
  assert.equal(f.calls.some((c) => c.path.startsWith('releases/tags/')), false);
  assert.equal(f.calls.filter((c) => c.path === `releases/${f.draft.id}`).length, 2);
});

test('draft publication searches all authenticated list pages', async (t) => {
  const f = publicationFixture(t, { afterCreate: (draft) => [...Array.from({ length: 100 }, (_, i) => ({ id: i + 1, tag_name: `v0.0.${i}`, draft: false })), draft] });
  await f.run();
  assert.ok(f.calls.some((c) => c.path === 'releases?per_page=100&page=2'));
  assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 1);
});

test('missing uploaded draft fails without publishing or creating a second draft', async (t) => {
  const f = publicationFixture(t, { afterCreate: () => [] });
  await assert.rejects(f.run(), /Missing draft/);
  assert.equal(f.commands.length, 1);
  assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 0);
});

test('two drafts for one tag fail without publication', async (t) => {
  const f = publicationFixture(t, { afterCreate: (draft) => [draft, { ...draft, id: draft.id + 1 }] });
  await assert.rejects(f.run(), /Multiple releases/);
  assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 0);
});

test('published release discovered after creation fails without publication', async (t) => {
  const f = publicationFixture(t, { afterCreate: (draft) => [{ ...draft, draft: false }] });
  await assert.rejects(f.run(), /already published/);
  assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 0);
});

test('existing draft or published release on any list page blocks all mutations and duplicate creation', async (t) => {
  for (const draft of [true, false]) {
    const f = publicationFixture(t, { beforeCreate: [...Array.from({ length: 100 }, (_, i) => ({ tag_name: `v0.0.${i}` })), { tag_name: 'v1.0.7', draft }] });
    await assert.rejects(f.run(), /Release already exists/);
    assert.equal(f.commands.length, 0);
    assert.equal(f.calls.some((c) => c.method), false);
  }
});

test('draft asset names, digests, sizes and upload states must match before publishing', async (t) => {
  for (const corrupt of [
    (assets) => assets.slice(1),
    (assets) => [...assets, assets[0]],
    ...[{ name: 'unexpected.exe' }, { digest: undefined }, { digest: 'sha256:wrong' }, { size: 0 }, { state: 'new' }].map((patch) => (assets) => assets.map((a, i) => i === 0 ? { ...a, ...patch } : a)),
  ]) {
    const f = publicationFixture(t, { refresh: (draft) => ({ ...draft, assets: corrupt(draft.assets) }) });
    await assert.rejects(f.run(), /asset set|digest\/size|upload incomplete/);
    assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 0);
  }
});

test('unexpected tag, id, draft state or source reservation fails on refreshed release', async (t) => {
  for (const patch of [{ tag_name: 'v1.0.8' }, { id: 123 }, { draft: false }, { target_commitish: 'main' }, { body: 'Built source: wrong' }]) {
    const f = publicationFixture(t, { refresh: (draft) => ({ ...draft, ...patch }) });
    await assert.rejects(f.run(), /Unexpected draft|already published|reservation mismatch/);
    assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 0);
  }
});

test('unexpected listed source reservation and tag movement fail without publication', async (t) => {
  const mismatched = publicationFixture(t, { afterCreate: (draft) => [{ ...draft, target_commitish: 'main' }] });
  await assert.rejects(mismatched.run(), /reservation mismatch/);
  assert.equal(mismatched.calls.filter((c) => c.method === 'PATCH').length, 0);
  const moved = publicationFixture(t, { moveTag: true });
  await assert.rejects(moved.run(), /Tag moved during upload/);
  assert.equal(moved.calls.filter((c) => c.method === 'PATCH').length, 0);
});
