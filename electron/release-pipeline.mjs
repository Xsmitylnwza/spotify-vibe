import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { assertReleaseVersion, compareVersions, releaseDecision, withVersion } from './release-version.mjs';
import { verifyUploadedAssets } from './release-artifacts.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const stateFile = '.release-state.json';

async function api(path, { method = 'GET', body, optional = false } = {}) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (optional && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status}`);
  return response.json();
}

async function releases() {
  const result = [];
  for (let page = 1; ; page++) {
    const batch = await api(`releases?per_page=100&page=${page}`);
    result.push(...batch);
    if (batch.length < 100) return result;
  }
}

async function tagSha(tag) {
  let ref = await api(`git/ref/tags/${tag}`, { optional: true });
  if (!ref) return null;
  let object = ref.object;
  while (object.type === 'tag') object = (await api(`git/tags/${object.sha}`)).object;
  if (object.type !== 'commit') throw new Error('Release tag must resolve to a commit');
  return object.sha;
}

export function assertMainUnchanged(expectedSha, actualSha) {
  if (expectedSha !== actualSha) throw new Error('Main advanced during build; no push or release (next main event will retry)');
}

async function prepare() {
  const sourceSha = git('rev-parse', 'HEAD');
  const pkg = json('package.json'), lock = json('package-lock.json');
  assertReleaseVersion(`v${pkg.version}`, pkg, lock);
  const event = (process.env.RELEASE_REF || process.env.GITHUB_REF) === 'refs/heads/main' ? 'main' : 'tag';
  if (event === 'tag') assertReleaseVersion(process.env.GITHUB_REF_NAME, pkg, lock);
  const all = await releases();
  const stable = all.filter((r) => !r.draft && !r.prerelease && /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(r.tag_name));
  stable.sort((a, b) => compareVersions(b.tag_name.slice(1), a.tag_name.slice(1)));
  const latest = stable[0];
  const mainSha = event === 'main' ? git('ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0] : null;
  const current = all.find((r) => r.tag_name === `v${pkg.version}`);
  const decision = releaseDecision({ event, version: pkg.version, latestVersion: latest?.tag_name.slice(1), sourceSha, mainSha,
    publishedSha: latest ? await tagSha(latest.tag_name) : null,
    existingTagSha: await tagSha(`v${pkg.version}`), released: current && !current.draft, draft: current?.draft });
  if (decision.release) {
    const target = all.find((r) => r.tag_name === `v${decision.version}`);
    if (target?.draft) throw new Error('Target draft requires operator recovery');
    const reserved = await tagSha(`v${decision.version}`);
    if (reserved && (decision.bump || reserved !== sourceSha)) throw new Error('Target version tag already reserved');
    if (decision.bump) {
      const updated = withVersion(pkg, lock, decision.version);
      writeFileSync('package.json', JSON.stringify(updated.pkg, null, 2) + '\n');
      writeFileSync('package-lock.json', JSON.stringify(updated.lock, null, 2) + '\n');
      git('config', 'user.name', 'github-actions[bot]');
      git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
      git('add', '--', 'package.json', 'package-lock.json');
      git('commit', '-m', `chore: release v${decision.version}`);
    }
  }
  const state = { ...decision, event, triggerSha: sourceSha, sourceSha: git('rev-parse', 'HEAD'), tag: `v${decision.version || pkg.version}` };
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
  appendFileSync(process.env.GITHUB_OUTPUT, `release=${decision.release}\ntag=${state.tag}\nsource_sha=${state.sourceSha}\n`);
  console.log(JSON.stringify(state));
}

async function publish() {
  const state = json(stateFile);
  if (!state.release) throw new Error('No release was prepared');
  if (git('rev-parse', 'HEAD') !== state.sourceSha) throw new Error('Build source changed');
  assertReleaseVersion(state.tag, json('package.json'), json('package-lock.json'));
  // npm/build must not silently change tracked source after provenance was made.
  if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Tracked source changed during build');
  const provenance = json('dist/release-provenance.json');
  if (provenance.sourceCommit !== state.sourceSha || provenance.tag !== state.tag) throw new Error('Provenance/source mismatch');
  if (state.event === 'main') {
    assertMainUnchanged(state.triggerSha, git('ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0]);
    if (state.bump) git('push', 'origin', 'HEAD:refs/heads/main'); // non-force: newer pushes win
  }
  const existing = await tagSha(state.tag);
  if (existing && existing !== state.sourceSha) throw new Error('Tag moved or belongs to another source');
  if (!existing) await api('git/refs', { method: 'POST', body: { ref: `refs/tags/${state.tag}`, sha: state.sourceSha } });
  if (await api(`releases/tags/${state.tag}`, { optional: true })) throw new Error('Release already exists; operator recovery required');
  const files = [`dist/Vibe-Studio-Setup-${state.version}.exe`, `dist/Vibe-Studio-Setup-${state.version}.exe.blockmap`, 'dist/latest.yml', 'dist/release-provenance.json', 'dist/SHA256SUMS.txt'];
  execFileSync('gh', ['release', 'create', state.tag, ...files, '--repo', process.env.GITHUB_REPOSITORY,
    '--verify-tag', '--draft', '--title', state.tag, '--notes', `Built source: ${state.sourceSha}\nWorkflow: ${provenance.build.url}\nSHA256SUMS.txt covers installer, updater feed, blockmap and provenance.\nCode signing and native upgrade are unverified.`], { stdio: 'inherit' });
  const release = await api(`releases/tags/${state.tag}`);
  // GitHub computes digests on upload; absent or mismatched digests fail closed.
  verifyUploadedAssets('dist', state.version, release.assets);
  if (await tagSha(state.tag) !== state.sourceSha) throw new Error('Tag moved during upload');
  // Only expose complete uploads, and never downgrade GitHub's latest release.
  await api(`releases/${release.id}`, { method: 'PATCH', body: { draft: false, make_latest: state.latest ? 'true' : 'false' } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === 'prepare') await prepare();
  else if (command === 'publish') await publish();
  else throw new Error('Usage: node electron/release-pipeline.mjs prepare|publish');
}
