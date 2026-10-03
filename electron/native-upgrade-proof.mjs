// Acceptance harness only. Installation is gated to disposable GitHub-hosted Windows.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { basename, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = 'Xsmitylnwza/spotify-vibe';
const stamp = () => new Date().toISOString();
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const digest = (bytes, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const normalized = (path) => resolve(path).toLowerCase();
const array = (value) => value === null ? [] : Array.isArray(value) ? value : [value];
export function within(root, path) {
  const rel = relative(normalized(root), normalized(path));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}
export function stableVersion(tag) {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) throw new Error('Expected stable vX.Y.Z tag');
  return tag.slice(1);
}
export function newer(candidate, baseline) {
  const a = stableVersion(candidate).split('.').map(BigInt), b = stableVersion(baseline).split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export function feedContract(text, tag) {
  const version = stableVersion(tag), installer = `Vibe-Studio-Setup-${version}.exe`;
  // Use electron-updater's existing YAML dependency; validate parsed semantics,
  // including nesting, duplicate-key errors and numeric installer size.
  const require = createRequire(import.meta.url);
  const updaterRequire = createRequire(require.resolve('electron-updater'));
  const parsed = updaterRequire('js-yaml').load(text);
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
  assert.equal(parsed.version, version); assert.equal(parsed.path, installer);
  assert.ok(Array.isArray(parsed.files)); assert.equal(parsed.files.length, 1);
  const file = parsed.files[0]; assert.ok(file && typeof file === 'object');
  assert.equal(file.url, installer); assert.equal(typeof parsed.sha512, 'string');
  assert.equal(file.sha512, parsed.sha512);
  const decoded = Buffer.from(parsed.sha512, 'base64');
  assert.equal(decoded.length, 64); assert.equal(decoded.toString('base64'), parsed.sha512);
  assert.ok(Number.isSafeInteger(file.size) && file.size > 0);
  return { version, installer, sha512: parsed.sha512, size: file.size };
}
export function updateStage(state) {
  if (state.error || state.state === 'error') throw new Error(`Updater error: ${state.error || state.state}`);
  return state.state || (state.downloaded ? 'downloaded' : state.downloading ? 'downloading' : state.checking ? 'checking' : state.available ? 'available' : 'idle');
}
export function automaticProcess(process, baselinePid, installedExe, candidate, requestedAt) {
  return process.pid !== baselinePid && normalized(process.path || '.') === normalized(installedExe)
    && typeof process.commandLine === 'string' && !/--type=/.test(process.commandLine) && /--updated(?:\s|$)/.test(process.commandLine)
    && Date.parse(process.createdAt) >= Date.parse(requestedAt)
    && process.productVersion === stableVersion(candidate);
}
export function chromiumUserData(commandLine = '') {
  const match = commandLine.match(/"--user-data-dir=([^"]+)"|--user-data-dir="([^"]+)"|--user-data-dir=(\S+)/);
  return match ? match[1] || match[2] || match[3] : null;
}
export function assertDisposable(env = process.env, platform = process.platform) {
  assert.equal(platform, 'win32', 'Installation is Windows CI only');
  for (const [key, expected] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows' })) assert.equal(env[key], expected, `Refusing installation without ${key}=${expected}`);
  assert.ok(env.RUNNER_TEMP && env.APPDATA && env.LOCALAPPDATA && env.USERPROFILE);
  assert.ok(within(env.USERPROFILE, env.APPDATA) && within(env.USERPROFILE, env.LOCALAPPDATA), 'Profile must belong to disposable CI account');
}
export function executionIdentity() {
  const checkout = resolve(fileURLToPath(new URL('..', import.meta.url)));
  return {
    checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8', windowsHide: true }).trim(),
    harnessSha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    workflowSha256: digest(readFileSync(join(checkout, '.github/workflows/native-upgrade.yml'))),
  };
}
export function assertRetainableProof(proof, runId, runAttempt, executed = executionIdentity()) {
  if (proof.status === 'skipped') { assert.equal(proof.nativeUpgradeProven, false); return false; }
  assert.equal(proof.status, 'passed'); assert.equal(proof.nativeUpgradeProven, true);
  assert.equal(proof.repository, repository); assert.equal(proof.workflowRunId, runId); assert.equal(proof.workflowRunAttempt, runAttempt);
  assert.match(runId, /^\d+$/); assert.match(runAttempt, /^\d+$/);
  assert.ok(proof.finishedAt && proof.candidate?.automaticProcess && !proof.cleanupError && !proof.environmentCleanupError);
  assert.match(proof.execution?.checkoutSha || '', /^[a-f0-9]{40}$/);
  for (const key of ['harnessSha256', 'workflowSha256']) assert.match(proof.execution?.[key] || '', /^[a-f0-9]{64}$/);
  assert.deepEqual(proof.execution, executed, 'Executed checkout/harness/workflow changed before retention');
  return true;
}

function validIdentity(item) {
  return item && Number.isSafeInteger(item.pid) && item.pid > 0
    && typeof item.path === 'string' && item.path.length > 0 && Number.isFinite(Date.parse(item.createdAt));
}
export function sameProcess(a, b) {
  return Boolean(validIdentity(a) && validIdentity(b) && a.pid === b.pid
    && normalized(a.path) === normalized(b.path) && a.createdAt === b.createdAt);
}
export function scopeOwnedProcesses(snapshot, owned, isRoot) {
  const current = new Map(snapshot.filter((item) => item && Number.isSafeInteger(item.pid)).map((item) => [item.pid, item]));
  // An inaccessible identity at a previously owned PID cannot establish clean exit.
  for (const [pid] of owned) if (current.has(pid) && !validIdentity(current.get(pid))) {
    throw new Error(`Cannot revalidate owned process identity at PID ${pid}`);
  }
  let admitted;
  do {
    admitted = false;
    for (const item of current.values()) {
      const parent = current.get(item.parentPid);
      if (!validIdentity(item)) {
        if (sameProcess(parent, owned.get(item.parentPid))) throw new Error(`Cannot validate child identity at PID ${item.pid}`);
        continue;
      }
      if (sameProcess(item, owned.get(item.pid))) continue;
      const descendant = sameProcess(parent, owned.get(item.parentPid))
        && Date.parse(item.createdAt) >= Date.parse(parent.createdAt);
      if (isRoot(item) || descendant) { owned.set(item.pid, { ...item }); admitted = true; }
    }
  } while (admitted);
  // Previously verified descendants remain owned even after their parent exits.
  return [...current.values()].filter((item) => sameProcess(item, owned.get(item.pid)));
}

async function waitFor(label, probe, timeout = 90_000, interval = 1000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await probe(); if (value) return value; await delay(interval); }
  throw new Error(`Timeout: ${label} (${timeout} ms)`);
}
async function response(url, authenticated = false, timeout = 180_000) {
  const result = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: authenticated && process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' } : {} });
  if (!result.ok) throw new Error(`HTTP ${result.status}: ${url}`);
  return result;
}
const api = async (path) => (await response(`https://api.github.com/repos/${repository}/${path}`, true, 30_000)).json();
async function tagCommit(tag) {
  let object = (await api(`git/ref/tags/${tag}`)).object;
  while (object.type === 'tag') object = (await api(`git/tags/${object.sha}`)).object;
  assert.equal(object.type, 'commit'); return object.sha;
}
async function previousRelease(candidateTag) {
  const releases = [];
  for (let page = 1; ; page++) {
    const batch = await api(`releases?per_page=100&page=${page}`);
    releases.push(...batch); if (batch.length < 100) break;
  }
  const eligible = releases.filter((release) => {
    if (release.draft || release.prerelease) return false;
    try { return newer(candidateTag, release.tag_name); } catch { return false; }
  });
  eligible.sort((a, b) => a.tag_name === b.tag_name ? 0 : newer(a.tag_name, b.tag_name) ? -1 : 1);
  assert.ok(eligible.length, 'No retained stable baseline below candidate');
  return eligible[0].tag_name;
}
const publicBytes = async (url) => Buffer.from(await (await response(url)).arrayBuffer());
export function ps(code, env = {}, { execute = execFileSync, parentEnv = process.env } = {}) {
  const childEnv = { ...parentEnv, ...env };
  const systemRoot = Object.entries(childEnv).find(([key]) => key.toLowerCase() === 'systemroot')?.[1];
  assert.ok(systemRoot && win32.isAbsolute(systemRoot), 'Windows PowerShell requires an absolute SystemRoot');
  const hostDirectory = win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0');
  // A pwsh parent exposes PS7 modules that Windows PowerShell 5.1 cannot load.
  // Replace, rather than filter, inherited/user module paths (Windows keys ignore case).
  for (const key of Object.keys(childEnv)) if (key.toLowerCase() === 'psmodulepath') delete childEnv[key];
  childEnv.PSModulePath = win32.join(hostDirectory, 'Modules');
  return execute(win32.join(hostDirectory, 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference='Stop'; ${code}`], { encoding: 'utf8', timeout: 30_000, windowsHide: true, env: childEnv }).trim();
}
function processSnapshot() {
  // Full census, identities only: unrelated command lines never leave PowerShell.
  const json = ps(`@(Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{pid=[int]$_.ProcessId;parentPid=[int]$_.ParentProcessId;path=$_.ExecutablePath;createdAt=if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{$null}} }) | ConvertTo-Json -Compress`);
  return array(JSON.parse(json || '[]'));
}
function ownedDetails(item) {
  const json = ps(`$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$env:VIBE_PROOF_PID); if($p -and $p.ExecutablePath -eq $env:VIBE_PROOF_FILE -and $p.CreationDate -and $p.CreationDate.ToUniversalTime().ToString('o') -eq $env:VIBE_PROOF_CREATED) { $v=$null; try { $v=(Get-Item -LiteralPath $p.ExecutablePath -ErrorAction Stop).VersionInfo.ProductVersion } catch {}; [pscustomobject]@{commandLine=$p.CommandLine;productVersion=$v} | ConvertTo-Json -Compress }`, { VIBE_PROOF_PID: String(item.pid), VIBE_PROOF_FILE: item.path, VIBE_PROOF_CREATED: item.createdAt });
  return { ...item, ...(json ? JSON.parse(json) : {}) };
}
// Windows stores ProductVersion as four parts (1.0.8.0); compare only the
// semantic version and reject anything other than a zero fourth part.
export function normalizeProductVersion(value) {
  const parts = String(value).trim().split('.');
  if (parts.length === 4 && parts[3] === '0') return parts.slice(0, 3).join('.');
  return parts.join('.');
}
function fileVersion(path) {
  return ps(`(Get-Item -LiteralPath $env:VIBE_PROOF_FILE).VersionInfo.ProductVersion`, { VIBE_PROOF_FILE: path });
}
export function signature(path, options = {}) {
  return JSON.parse(ps(`$s=Get-AuthenticodeSignature -LiteralPath $env:VIBE_PROOF_FILE; [pscustomobject]@{status=[string]$s.Status;subject=if($s.SignerCertificate){$s.SignerCertificate.Subject}else{$null}} | ConvertTo-Json -Compress`, { VIBE_PROOF_FILE: path }, options));
}
function ownedStop(process) {
  // Recheck PID, path and creation time immediately before killing to prevent PID reuse.
  assert.ok(validIdentity(process), 'Refusing to stop an inaccessible process identity');
  return ps(`$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$env:VIBE_PROOF_PID); if($p -and $p.ExecutablePath -eq $env:VIBE_PROOF_FILE -and $p.CreationDate -and $p.CreationDate.ToUniversalTime().ToString('o') -eq $env:VIBE_PROOF_CREATED) { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop }`, { VIBE_PROOF_PID: String(process.pid), VIBE_PROOF_FILE: process.path, VIBE_PROOF_CREATED: process.createdAt });
}
function noLoginItem() {
  const result = ps(`$r=Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue; @($r.PSObject.Properties | Where-Object { $_.Name -match '^(Vibe Studio|spotify-vibe)$' }) | ForEach-Object { $_.Name }`);
  assert.equal(result, '', 'Autostart must remain disabled in CI');
}

// Click only Next/Install/Finish controls inside windows owned by the verified NSIS tree.
// No UAC, signature, SmartScreen or other security dialogs are automated.
const installerUi = String.raw`
Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class NativeProofWindows {
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc c,IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h,EnumProc c,IntPtr p);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint msg,IntPtr a,IntPtr b);
 public static string Text(IntPtr h){var s=new StringBuilder(512);GetWindowText(h,s,512);return s.ToString();}
 public static string[] Advance(int[] pids){var logs=new List<string>();EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);if(Array.IndexOf(pids,(int)pid)<0||!IsWindowVisible(h))return true;EnumChildWindows(h,(b,q)=>{string text=Text(b).Replace("&","");if(GetDlgCtrlID(b)==1&&IsWindowEnabled(b)&&IsWindowVisible(b)&&(text.StartsWith("Next")||text=="Install"||text=="Finish"||text=="Close")){logs.Add(pid+"|"+Text(h)+"|"+text);SendMessage(b,0x00F5,IntPtr.Zero,IntPtr.Zero);}return true;},IntPtr.Zero);return true;},IntPtr.Zero);return logs.ToArray();}
}
'@
$ids=@($env:VIBE_PROOF_INSTALLER_PIDS.Split(',') | ForEach-Object {[int]$_}); @([NativeProofWindows]::Advance($ids)) | ConvertTo-Json -Compress
`;

class CDP {
  constructor(ws) {
    this.ws = ws; this.next = 0; this.pending = new Map();
    ws.on('message', (raw) => { const result = JSON.parse(raw); const item = this.pending.get(result.id); if (!item) return; clearTimeout(item.timer); this.pending.delete(result.id); result.error ? item.reject(new Error(JSON.stringify(result.error))) : item.resolve(result.result); });
    ws.on('close', () => { for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error('CDP disconnected')); } this.pending.clear(); });
    ws.on('error', () => {});
  }
  static async connect(port, studioPort) {
    const targets = await (await response(`http://127.0.0.1:${port}/json/list`, false, 3000)).json();
    const target = targets.find((item) => item.type === 'page' && item.url.startsWith(`http://127.0.0.1:${studioPort}/`));
    if (!target) throw new Error('Studio CDP target not ready');
    const WebSocket = createRequire(import.meta.url)('ws');
    const ws = new WebSocket(target.webSocketDebuggerUrl, { handshakeTimeout: 5000 });
    await new Promise((done, reject) => { ws.once('open', done); ws.once('error', reject); });
    return new CDP(ws);
  }
  send(method, params, timeout = 90_000) {
    return new Promise((resolveResult, reject) => { const id = ++this.next; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, timeout); this.pending.set(id, { resolve: resolveResult, reject, timer }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async evaluate(expression, timeout) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  close() { this.ws.close(); }
}

async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}
function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
}

async function scenario() {
  assertDisposable(); // before ANY profile, process or installation action
  const evidence = resolve(process.env.NATIVE_PROOF_DIR || join(process.env.RUNNER_TEMP, 'native-upgrade-evidence'));
  assert.ok(within(process.env.RUNNER_TEMP, evidence), 'Evidence must remain in RUNNER_TEMP');
  mkdirSync(evidence, { recursive: true });
  const proof = { schemaVersion: 1, status: 'running', nativeUpgradeProven: false, startedAt: stamp(), repository, execution: executionIdentity(), workflowRunId: process.env.GITHUB_RUN_ID, workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT, events: [], processes: [], cleanup: [], gaps: ['CI has not completed this scenario'] };
  const save = () => writeFileSync(join(evidence, 'native-upgrade-proof.json'), JSON.stringify(proof, null, 2) + '\n');
  const log = (event, detail) => { const record = { at: stamp(), event, detail }; proof.events.push(record); appendFileSync(join(evidence, 'native-upgrade.log'), JSON.stringify(record) + '\n'); console.log(JSON.stringify(record)); save(); };
  const owned = new Map(), installerPids = new Set(), clients = [];
  let root, installedExe, cache, appEnvironment, expectedUpdaterInstaller, startingInstall = false, acceptanceComplete = false;
  const persistedEnvironment = [];
  const observe = () => {
    const snapshot = processSnapshot();
    const previous = new Map(owned);
    const scoped = scopeOwnedProcesses(snapshot, owned, (item) =>
      (installedExe && normalized(item.path) === normalized(installedExe)) || (root && within(root, item.path)));
    installerPids.clear();
    // Installer membership follows the same verified live ancestry, with retained orphan identity.
    let changed;
    do {
      changed = false;
      for (const item of scoped) {
        const record = owned.get(item.pid), parent = scoped.find((value) => value.pid === item.parentPid);
        if (!record.installer && ((expectedUpdaterInstaller && normalized(item.path) === normalized(expectedUpdaterInstaller))
          || (root && within(root, item.path) && /Vibe-Studio-Setup-|\.tmp$/i.test(basename(item.path)))
          || (sameProcess(parent, owned.get(item.parentPid)) && owned.get(item.parentPid).installer && Date.parse(item.createdAt) >= Date.parse(parent.createdAt)))) {
          record.installer = true; changed = true;
        }
        if (record.installer) installerPids.add(item.pid);
      }
    } while (changed);
    return scoped.map((item) => {
      const detail = ownedDetails(item);
      if (!sameProcess(item, previous.get(item.pid))) proof.processes.push({ ...detail, observedAt: stamp() });
      return detail;
    });
  };
  const preserved = (stage) => {
    const hashes = proof.isolation.retainedFiles.map(({ path, sha256 }) => { const current = digest(readFileSync(path)); assert.equal(current, sha256, `${stage}: retained file changed ${path}`); return { path, sha256: current }; });
    log('config-preserved', { stage, hashes });
  };
  const startApp = () => {
    const child = spawn(installedExe, [`--remote-debugging-port=${proof.isolation.cdpPort}`, '--remote-debugging-address=127.0.0.1'], { env: appEnvironment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', (error) => log('app-spawn-error', error.message));
    child.stdout.on('data', (bytes) => appendFileSync(join(evidence, `app-${child.pid}.log`), bytes));
    child.stderr.on('data', (bytes) => appendFileSync(join(evidence, `app-${child.pid}.log`), bytes));
    log('harness-app-launch', { pid: child.pid, path: installedExe }); return child;
  };
  const bridge = async () => waitFor('renderer preload bridge', async () => {
    try { const client = await CDP.connect(proof.isolation.cdpPort, proof.isolation.studioPort); clients.push(client); if (await client.evaluate('Boolean(window.vibeStudio?.isElectron)')) return client; client.close(); } catch {} return null;
  });
  try {
    save();
    const latest = await api('releases/latest');
    const requested = process.env.CANDIDATE_TAG || 'latest';
    const candidateTag = requested === 'latest' ? latest.tag_name : requested;
    stableVersion(candidateTag);
    assert.equal(candidateTag, latest.tag_name, 'Candidate must be actual public latest');
    assert.ok(!latest.draft && !latest.prerelease);
    const provenanceAsset = latest.assets.find((item) => item.name === 'release-provenance.json');
    if (process.env.TRIGGER_RELEASE_RUN_ID) {
      if (!provenanceAsset) { proof.status = 'skipped'; proof.gaps = ['Latest has no retained provenance for triggering Release run']; log('skip-workflow-run', proof.gaps[0]); return; }
      const bytes = await publicBytes(provenanceAsset.browser_download_url);
      assert.equal(provenanceAsset.digest, `sha256:${digest(bytes)}`);
      const provenance = JSON.parse(bytes);
      if (String(provenance.build?.runId) !== process.env.TRIGGER_RELEASE_RUN_ID) { proof.status = 'skipped'; proof.gaps = ['Successful Release run did not publish current latest (unchanged/scheduled run or superseded release)']; log('skip-workflow-run', proof.gaps[0]); return; }
    }
    const baselineTag = process.env.BASELINE_TAG === 'previous' ? await previousRelease(candidateTag) : process.env.BASELINE_TAG || 'v1.0.7';
    stableVersion(baselineTag);
    assert.ok(newer(candidateTag, baselineTag), 'Candidate must be newer than baseline');
    const baseline = await api(`releases/tags/${baselineTag}`);
    assert.ok(!baseline.draft && !baseline.prerelease);
    proof.baseline = { tag: baselineTag, releaseId: baseline.id };
    proof.candidate = { tag: candidateTag, releaseId: latest.id };
    root = join(process.env.RUNNER_TEMP, `vibe-native-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}-${randomUUID()}`);
    mkdirSync(root); cache = join(root, 'cache'); mkdirSync(cache);
    const download = async (release, tag, candidate) => {
      const directory = join(root, tag); mkdirSync(directory);
      const names = [`Vibe-Studio-Setup-${stableVersion(tag)}.exe`, `Vibe-Studio-Setup-${stableVersion(tag)}.exe.blockmap`, 'latest.yml', ...(candidate ? ['release-provenance.json', 'SHA256SUMS.txt'] : [])];
      const records = [];
      for (const name of names) {
        const asset = release.assets.find((item) => item.name === name); assert.ok(asset && asset.state === 'uploaded', `Missing public asset ${name}`);
        const bytes = await publicBytes(asset.browser_download_url);
        assert.equal(bytes.length, asset.size); assert.equal(asset.digest, `sha256:${digest(bytes)}`, `${tag}: ${name} GitHub digest`);
        writeFileSync(join(directory, name), bytes); records.push({ name, path: join(directory, name), size: bytes.length, sha256: digest(bytes), sha512: digest(bytes, 'sha512', 'base64') });
      }
      const feed = feedContract(readFileSync(join(directory, 'latest.yml'), 'utf8'), tag);
      const installer = records.find((item) => item.name === feed.installer);
      assert.equal(installer.sha512, feed.sha512); assert.equal(installer.size, feed.size);
      if (candidate) {
        const sums = readFileSync(join(directory, 'SHA256SUMS.txt'), 'utf8');
        for (const record of records.filter((item) => item.name !== 'SHA256SUMS.txt')) assert.ok(sums.includes(`${record.sha256}  ${record.name}\n`), `Manifest mismatch ${record.name}`);
        const provenance = JSON.parse(readFileSync(join(directory, 'release-provenance.json')));
        assert.equal(provenance.tag, tag); assert.equal(provenance.version, feed.version); assert.match(provenance.sourceCommit, /^[a-f0-9]{40}$/);
        assert.equal(provenance.repository, repository);
        for (const value of [provenance.package?.version, provenance.package?.lockVersion, provenance.package?.lockRootVersion]) assert.equal(value, feed.version);
        assert.equal(await tagCommit(tag), provenance.sourceCommit);
        if (process.env.TRIGGER_RELEASE_RUN_ID) assert.equal(String(provenance.build?.runId), process.env.TRIGGER_RELEASE_RUN_ID);
        proof.candidate.provenance = provenance;
      }
      const result = { directory, records, installer, feed, authenticode: signature(installer.path) };
      assert.ok(['Valid', 'NotSigned'].includes(result.authenticode.status), 'Invalid installer Authenticode state');
      log('verified-public-release', { tag, records, authenticode: result.authenticode }); return result;
    };
    const oldRelease = await download(baseline, baselineTag, false), newRelease = await download(latest, candidateTag, true);
    assert.equal((await api('releases/latest')).tag_name, candidateTag, 'Latest changed before installation');
    const installDirectory = join(root, 'install');
    installedExe = join(installDirectory, 'Vibe Studio.exe');
    const data = join(process.env.APPDATA, 'Spotify Vibe');
    const userData = [join(process.env.APPDATA, 'Vibe Studio'), join(process.env.APPDATA, 'spotify-vibe')];
    for (const directory of [data, ...userData]) { assert.ok(within(process.env.USERPROFILE, directory)); assert.ok(!existsSync(directory), `Disposable app profile is not fresh: ${directory}`); mkdirSync(directory); }
    assert.equal(processSnapshot().filter((item) => basename(item.path || '') === 'Vibe Studio.exe').length, 0, 'Pre-existing app process');
    noLoginItem();
    const configPath = join(data, 'presence-config.json'), secretsPath = join(data, 'app-secrets.json');
    const config = { version: 2, nativeUpgradeSentinel: { id: randomUUID(), unknown: ['preserve', 'ทุกฟิลด์'] }, scenes: [{ id: 'native-proof', sceneName: 'Native Upgrade Proof', activityType: 'playing', activityName: 'Isolated CI', details: 'Retained owner data', state: 'Never connects to Discord', timerMode: 'none', buttons: [], nativeProofSceneExtension: { keep: true } }], slots: [], appMappings: [], settings: { selectionMode: 'apps', scheduleEnabled: false, autostartEnabled: false, nativeProofSettingExtension: 'retain' }, manualOverride: null };
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n'); writeFileSync(secretsPath, '{}\n');
    writeFileSync(join(data, 'installed-apps.json'), JSON.stringify({ scannedAt: stamp(), apps: [] })); // baseline lacks catalogue-disable guard: fresh cache avoids scan
    const sentinelFiles = userData.map((directory) => { const path = join(directory, 'vibe-electron.json'); writeFileSync(path, JSON.stringify({ loginItemDefaultApplied: true, nativeProofSentinel: config.nativeUpgradeSentinel.id })); return path; });
    proof.isolation = { disposableAccount: process.env.USERNAME, root, installDirectory, userDataCandidates: userData, configPath, secretsPath, cache, studioPort: await freePort(), cdpPort: await freePort(), retainedFiles: [configPath, secretsPath, ...sentinelFiles].map((path) => ({ path, sha256: digest(readFileSync(path)) })) };
    appEnvironment = { ...process.env, PRESENCE_CONFIG_PATH: configPath, PRESENCE_SECRETS_PATH: secretsPath, PRESENCE_STUDIO_PORT: String(proof.isolation.studioPort), LOCALAPPDATA: cache, XDG_CACHE_HOME: cache, PRESENCE_STARTUP_DIR: join(root, 'startup'), PRESENCE_AUTOSTART_DISABLE: '1', PRESENCE_APP_DETECTION_DISABLE: '1', PRESENCE_DISCORD_DISABLE: '1', PRESENCE_DISABLE_DEFAULT_APPLICATION: '1' };
    for (const key of ['GH_TOKEN', 'GITHUB_TOKEN', 'DISCORD_CLIENT_ID', 'GIPHY_API_KEY', 'NODE_OPTIONS', 'ELECTRON_RUN_AS_NODE']) delete appEnvironment[key];
    // NSIS may launch through Explorer rather than inherit the updater's environment.
    // Persist only isolated non-secret test variables in the disposable CI account.
    for (const key of Object.keys(appEnvironment).filter((key) => key.startsWith('PRESENCE_'))) {
      const previous = ps(`[Environment]::GetEnvironmentVariable($env:VIBE_PROOF_KEY,'User')`, { VIBE_PROOF_KEY: key });
      assert.equal(previous, '', `CI test environment is not fresh: ${key}`);
      persistedEnvironment.push(key);
      ps(`[Environment]::SetEnvironmentVariable($env:VIBE_PROOF_KEY,$env:VIBE_PROOF_VALUE,'User')`, { VIBE_PROOF_KEY: key, VIBE_PROOF_VALUE: appEnvironment[key] });
    }
    ps(`Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class EnvNotice{[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,string l,uint f,uint t,out IntPtr r);}'; $result=[IntPtr]::Zero; [void][EnvNotice]::SendMessageTimeout([IntPtr]0xffff,0x001A,[IntPtr]::Zero,'Environment',2,5000,[ref]$result)`);
    proof.isolation.persistedNonSecretEnvironmentKeys = persistedEnvironment;
    log('isolated-profile-seeded', proof.isolation);
    assert.ok(!/\s/.test(installDirectory), 'NSIS /D destination must have no whitespace to avoid Node argument quoting');
    startingInstall = true;
    const installer = spawn(oldRelease.installer.path, ['/S', '/currentuser', `/D=${installDirectory}`], { env: appEnvironment, windowsHide: true, stdio: 'ignore' });
    let installerExit, installerError;
    installer.once('error', (error) => { installerError = error; }); installer.once('exit', (code) => { installerExit = code; });
    await waitFor('baseline silent installer exit', () => { observe(); if (installerError) throw installerError; if (installerExit !== undefined && installerExit !== 0) throw new Error(`Baseline installer exit ${installerExit}`); return installerExit === 0; }, 180_000);
    observe(); assert.ok(existsSync(installedExe)); assert.equal(normalizeProductVersion(fileVersion(installedExe)), stableVersion(baselineTag));
    log('baseline-installed', { path: installedExe, productVersion: fileVersion(installedExe) });
    const child = startApp();
    const cdp = await bridge();
    assert.equal(await cdp.evaluate('window.vibeStudio.getVersion()'), stableVersion(baselineTag));
    assert.equal(await cdp.evaluate('window.vibeStudio.getOpenAtLogin()'), false);
    const baselineProcess = await waitFor('owned baseline process', () => observe().find((item) => item.pid === child.pid));
    proof.baseline.process = baselineProcess;
    const baselineUserData = await waitFor('baseline actual Chromium userData path', () => {
      for (const item of observe()) {
        if (normalized(item.path) !== normalized(installedExe)) continue;
        const path = chromiumUserData(item.commandLine || '');
        if (path) return path;
      }
      return null;
    });
    assert.ok(userData.some((path) => normalized(path) === normalized(baselineUserData)), 'Actual userData must be a fresh seeded disposable profile');
    proof.isolation.actualUserData = baselineUserData;
    const baselineState = await cdp.evaluate('fetch("/api/state").then(r=>r.json())');
    const baselineRuntime = baselineState.runtime || baselineState;
    assert.equal(normalized(baselineRuntime.configPath), normalized(configPath));
    assert.equal(normalized(baselineRuntime.secretsPath), normalized(secretsPath));
    assert.equal(baselineRuntime.connected, false); assert.equal(baselineRuntime.clientId, null);
    log('baseline-isolated-runtime', { configPath: baselineRuntime.configPath, secretsPath: baselineRuntime.secretsPath, connectionState: baselineRuntime.connectionState, clientId: baselineRuntime.clientId });
    preserved('baseline-running'); noLoginItem();
    await cdp.evaluate('window.__nativeUpgradeStates=[]; window.vibeStudio.onUpdateState(s=>window.__nativeUpgradeStates.push({at:new Date().toISOString(),state:s})); window.vibeStudio.checkForUpdates()');
    const available = await waitFor('actual public update available', async () => { const state = await cdp.evaluate('window.vibeStudio.getUpdateState()'); log('updater-state', state); return updateStage(state) === 'available' ? state : null; });
    assert.equal(available.availableVersion || available.available, stableVersion(candidateTag));
    log('explicit-download-requested', { candidateTag });
    await cdp.evaluate('window.vibeStudio.downloadUpdate()', 240_000);
    const downloaded = await waitFor('real updater download finished', async () => { const state = await cdp.evaluate('window.vibeStudio.getUpdateState()'); log('updater-state', state); return updateStage(state) === 'downloaded' ? state : null; }, 240_000);
    assert.equal(downloaded.availableVersion || downloaded.available, stableVersion(candidateTag));
    proof.updaterStates = await cdp.evaluate('window.__nativeUpgradeStates');
    const cachedInstaller = walk(cache).find((path) => path.endsWith('.exe') && digest(readFileSync(path)) === newRelease.installer.sha256);
    assert.ok(cachedInstaller, 'Actual updater cache must contain the verified candidate installer');
    assert.equal(digest(readFileSync(cachedInstaller), 'sha512', 'base64'), newRelease.feed.sha512);
    proof.candidate.updaterCachedInstaller = { path: cachedInstaller, sha256: newRelease.installer.sha256, sha512: newRelease.feed.sha512 };
    expectedUpdaterInstaller = cachedInstaller;
    assert.equal((await api('releases/latest')).tag_name, candidateTag, 'Latest changed before restart');
    preserved('downloaded-before-install');
    const requestedAt = stamp(); log('explicit-restart-install-requested', { requestedAt });
    // Dispatch the real IPC without awaiting an answer that may die with the old process.
    await cdp.evaluate('window.__nativeRestartRequested=true; window.vibeStudio.quitAndInstall().catch(()=>{}); true', 10_000).catch((error) => log('restart-cdp-disconnected', error.message));
    const automatic = await waitFor('native update and automatic new installed process', async () => {
      const processes = observe();
      for (const process of processes.filter((item) => installerPids.has(item.pid))) {
        if (normalized(process.path) === normalized(cachedInstaller)) assert.equal(digest(readFileSync(process.path)), newRelease.installer.sha256);
      }
      const ids = processes.filter((item) => installerPids.has(item.pid)).map((item) => item.pid);
      if (ids.length) { const clicks = array(JSON.parse(ps(installerUi, { VIBE_PROOF_INSTALLER_PIDS: ids.join(',') }) || '[]')); if (clicks.length) log('owned-nsis-buttons', clicks); }
      if (processes.some((item) => item.pid === baselineProcess.pid)) return null;
      return processes.find((item) => automaticProcess(item, baselineProcess.pid, installedExe, candidateTag, requestedAt));
    }, 240_000);
    proof.candidate.automaticProcess = automatic;
    log('automatic-new-process-observed-before-any-relaunch', automatic);
    assert.equal(normalizeProductVersion(fileVersion(installedExe)), stableVersion(candidateTag)); noLoginItem(); preserved('automatic-new-process-running');
    // Verify the automatically launched process serves the same retained profile.
    const runtime = await waitFor('automatic process retained runtime profile', async () => {
      const ports = array(JSON.parse(ps(`@(Get-NetTCPConnection -State Listen -OwningProcess $env:VIBE_PROOF_PID -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort -Unique) | ConvertTo-Json -Compress`, { VIBE_PROOF_PID: String(automatic.pid) }) || '[]'));
      for (const port of ports) { try { const body = await (await response(`http://127.0.0.1:${port}/api/state`, false, 3000)).json(); const state = body.runtime || body; if (normalized(state.configPath || '.') === normalized(configPath)) return state; } catch {} }
      return null;
    });
    assert.equal(runtime.connected, false); assert.equal(runtime.clientId, null); assert.equal(normalized(runtime.secretsPath), normalized(secretsPath));
    log('automatic-process-runtime-profile', { configPath: runtime.configPath, secretsPath: runtime.secretsPath, connectionState: runtime.connectionState, clientId: runtime.clientId });
    const autoUserData = await waitFor('automatic process same actual userData', () => {
      for (const item of observe()) {
        if (normalized(item.path) !== normalized(installedExe)) continue;
        const path = chromiumUserData(item.commandLine || '');
        if (path) return path;
      }
      return null;
    });
    assert.equal(normalized(autoUserData), normalized(baselineUserData));
    proof.candidate.automaticUserData = autoUserData;
    // NSIS generally restarts without original CDP switches. Do not attribute a manual relaunch to NSIS.
    for (const item of observe().filter((item) => normalized(item.path) === normalized(installedExe))) ownedStop(item);
    await waitFor('automatic process cleanup before CDP relaunch', () => !observe().some((item) => normalized(item.path) === normalized(installedExe)), 30_000);
    proof.candidate.versionProofMethod = 'automatic process + Windows ProductVersion, followed by distinct harness CDP relaunch';
    const relaunched = startApp(); const candidateCdp = await bridge();
    assert.equal(await candidateCdp.evaluate('window.vibeStudio.getVersion()'), stableVersion(candidateTag));
    proof.candidate.cdpRelaunchPid = relaunched.pid;
    assert.equal(await candidateCdp.evaluate('window.vibeStudio.getOpenAtLogin()'), false);
    preserved('candidate-cdp-version-verified'); noLoginItem();
    assert.equal((await api('releases/latest')).tag_name, candidateTag, 'Candidate ceased being latest during scenario');
    acceptanceComplete = true; proof.status = 'cleanup-pending';
    log('native-upgrade-evidence-complete-cleanup-pending', { baselineTag, candidateTag });
  } catch (error) {
    proof.status = 'failed'; proof.nativeUpgradeProven = false; proof.error = { message: error.message, stack: error.stack }; proof.gaps = ['Native upgrade acceptance failed; do not claim upgrade proof']; log('failure', proof.error); process.exitCode = 1;
  } finally {
    for (const client of clients) client.close();
    if (startingInstall) {
      try { for (const item of observe().reverse()) { ownedStop(item); proof.cleanup.push({ pid: item.pid, path: item.path, at: stamp() }); } await waitFor('owned process cleanup', () => observe().length === 0, 30_000); noLoginItem(); }
      catch (error) { proof.status = 'failed'; proof.nativeUpgradeProven = false; proof.cleanupError = error.message; process.exitCode = 1; }
    }
    for (const key of persistedEnvironment) {
      try { ps(`[Environment]::SetEnvironmentVariable($env:VIBE_PROOF_KEY,$null,'User')`, { VIBE_PROOF_KEY: key }); }
      catch (error) { proof.status = 'failed'; proof.nativeUpgradeProven = false; proof.environmentCleanupError = error.message; process.exitCode = 1; }
    }
    if (acceptanceComplete && proof.status !== 'failed') {
      proof.status = 'passed'; proof.nativeUpgradeProven = true;
      proof.gaps = ['Windows code signing is recorded separately; this acceptance does not create a certificate or signed attestation'];
    }
    proof.finishedAt = stamp(); save();
  }
}

async function retainProof() {
  assertDisposable();
  const evidence = resolve(process.env.NATIVE_PROOF_DIR || join(process.env.RUNNER_TEMP, 'native-upgrade-evidence'));
  assert.ok(within(process.env.RUNNER_TEMP, evidence));
  const proof = JSON.parse(readFileSync(join(evidence, 'native-upgrade-proof.json'), 'utf8'));
  if (!assertRetainableProof(proof, process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT)) { console.log('Skipped scenario: no success proof uploaded'); return; }
  const tag = proof.candidate.tag; stableVersion(tag);
  const release = await api(`releases/tags/${tag}`); assert.ok(!release.draft && !release.prerelease); assert.equal(release.id, proof.candidate.releaseId);
  const asset = release.assets.find((item) => item.name === 'release-provenance.json'); assert.ok(asset);
  const bytes = await publicBytes(asset.browser_download_url); assert.equal(asset.digest, `sha256:${digest(bytes)}`);
  const provenance = JSON.parse(bytes); assert.deepEqual(provenance, proof.candidate.provenance);
  assert.equal(provenance.repository, repository); assert.equal(provenance.tag, tag); assert.equal(provenance.version, stableVersion(tag));
  for (const value of [provenance.package?.version, provenance.package?.lockVersion, provenance.package?.lockRootVersion]) assert.equal(value, stableVersion(tag));
  if (process.env.TRIGGER_RELEASE_RUN_ID) assert.equal(String(provenance.build?.runId), process.env.TRIGGER_RELEASE_RUN_ID);
  const sourceCommit = await tagCommit(tag); assert.equal(sourceCommit, provenance.sourceCommit);
  const name = `native-upgrade-proof-${proof.workflowRunId}-${proof.workflowRunAttempt}.json`;
  assert.ok(!release.assets.some((item) => item.name === name), 'Never overwrite an existing proof asset');
  const proofBytes = readFileSync(join(evidence, 'native-upgrade-proof.json'));
  assert.deepEqual(JSON.parse(proofBytes), proof, 'Proof changed during retention validation');
  assertRetainableProof(proof, process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT);
  const upload = await fetch(`https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: proofBytes, signal: AbortSignal.timeout(60_000),
  });
  if (!upload.ok) throw new Error(`Proof upload failed: ${upload.status}`);
  const uploaded = await upload.json(); assert.equal(uploaded.name, name); assert.equal(uploaded.state, 'uploaded'); assert.equal(uploaded.size, proofBytes.length); assert.equal(uploaded.digest, `sha256:${digest(proofBytes)}`);
  writeFileSync(join(evidence, 'release-proof-retention.json'), JSON.stringify({ at: stamp(), tag, releaseId: release.id, name, sourceCommit, execution: proof.execution, releaseBuildRunId: provenance.build.runId, proofRunId: proof.workflowRunId, proofRunAttempt: proof.workflowRunAttempt, sha256: digest(proofBytes), url: uploaded.browser_download_url, retained: true }, null, 2) + '\n');
  console.log(JSON.stringify({ retainedProof: name, tag, sourceCommit, sha256: digest(proofBytes) }));
}

function validateContract() {
  let checks = 0;
  const check = (fn) => { fn(); checks++; };
  check(() => assert.equal(stableVersion('v1.0.7'), '1.0.7'));
  check(() => assert.throws(() => stableVersion('v1.0.7-beta')));
  check(() => assert.throws(() => stableVersion('v01.0.7')));
  check(() => assert.ok(newer('v1.0.10', 'v1.0.7')));
  check(() => assert.equal(newer('v1.0.7', 'v1.0.7'), false));
  check(() => assert.equal(newer('v1.0.6', 'v1.0.7'), false));
  check(() => assert.equal(updateStage({ downloaded: true, available: '1.0.8' }), 'downloaded'));
  check(() => assert.equal(updateStage({ state: 'available', availableVersion: '1.0.8' }), 'available'));
  check(() => assert.throws(() => updateStage({ error: 'unreachable' })));
  check(() => assert.throws(() => assertDisposable({}, 'win32')));
  check(() => assert.throws(() => assertDisposable({}, 'linux')));
  check(() => assert.ok(within('C:/ci/profile', 'C:/ci/profile/app')));
  check(() => assert.equal(within('C:/ci/profile', 'C:/ci/profile-other/app'), false));
  check(() => assert.equal(within('C:/ci/profile', 'C:/ci/profile/../owner'), false));
  check(() => assert.deepEqual(array({ pid: 1 }), [{ pid: 1 }]));
  check(() => assert.deepEqual(array(null), []));
  const process = { pid: 2, path: 'C:/ci/install/Vibe Studio.exe', commandLine: '"C:/ci/install/Vibe Studio.exe" --updated', createdAt: '2026-10-03T01:00:01Z', productVersion: '1.0.8' };
  const accepted = (value) => automaticProcess(value, 1, 'C:/ci/install/Vibe Studio.exe', 'v1.0.8', '2026-10-03T01:00:00Z');
  check(() => assert.ok(accepted(process)));
  check(() => assert.equal(accepted({ ...process, pid: 1 }), false));
  check(() => assert.equal(accepted({ ...process, path: 'C:/owner/Vibe Studio.exe' }), false));
  check(() => assert.equal(accepted({ ...process, commandLine: 'app --updated --type=renderer' }), false));
  check(() => assert.equal(accepted({ ...process, commandLine: 'app' }), false));
  check(() => assert.equal(accepted({ ...process, productVersion: '1.0.7' }), false));
  check(() => assert.equal(accepted({ ...process, createdAt: '2026-10-03T00:59:59Z' }), false));
  // Feed text is the real inspected public baseline metadata; no fake installer bytes.
  const sha512 = 'YI5HzqzZI0MbKaPoOMbfGXvx6W0nrufv4TGQAVPrlSNdvbI0mIKRRTYQomsY7O0dH0Ct2ehQ445jy5sefTk9qw==';
  const feed = `version: 1.0.7\nfiles:\n  - url: Vibe-Studio-Setup-1.0.7.exe\n    sha512: ${sha512}\n    size: 133719558\npath: Vibe-Studio-Setup-1.0.7.exe\nsha512: ${sha512}\n`;
  check(() => assert.equal(feedContract(feed, 'v1.0.7').size, 133719558));
  check(() => assert.throws(() => feedContract(feed.replace('files:', 'files: []\nnotFiles:'), 'v1.0.7')));
  check(() => assert.throws(() => feedContract(feed + 'files: []\n', 'v1.0.7')));
  check(() => assert.throws(() => feedContract(feed.replace('size: 133719558', 'size: "133719558"'), 'v1.0.7')));
  check(() => assert.throws(() => feedContract(feed.replace('url: Vibe-Studio-Setup-1.0.7.exe', 'url: wrong.exe'), 'v1.0.7')));
  check(() => assert.throws(() => feedContract(feed.replace('version: 1.0.7', 'version: 1.0.8'), 'v1.0.7')));
  check(() => assert.throws(() => feedContract(feed.replace('path: Vibe-Studio-Setup-1.0.7.exe', 'path: wrong.exe'), 'v1.0.7')));
  const proof = { status: 'passed', nativeUpgradeProven: true, repository, execution: executionIdentity(), workflowRunId: '42', workflowRunAttempt: '1', finishedAt: stamp(), candidate: { automaticProcess: process } };
  check(() => assert.equal(assertRetainableProof(proof, '42', '1'), true));
  check(() => assert.equal(assertRetainableProof({ status: 'skipped', nativeUpgradeProven: false }, '42', '1'), false));
  check(() => assert.throws(() => assertRetainableProof({ ...proof, status: 'failed' }, '42', '1')));
  check(() => assert.throws(() => assertRetainableProof({ ...proof, nativeUpgradeProven: false }, '42', '1')));
  check(() => assert.throws(() => assertRetainableProof(proof, '43', '1')));
  check(() => assert.throws(() => assertRetainableProof({ ...proof, cleanupError: 'failed' }, '42', '1')));
  check(() => assert.throws(() => assertRetainableProof({ ...proof, candidate: {} }, '42', '1')));
  check(() => assert.equal(chromiumUserData('app "--user-data-dir=C:/ci/Vibe Studio" --type=renderer'), 'C:/ci/Vibe Studio'));
  check(() => assert.equal(chromiumUserData('app --user-data-dir="C:/ci/Vibe Studio" --type=renderer'), 'C:/ci/Vibe Studio'));
  check(() => assert.equal(chromiumUserData('app --user-data-dir=C:/ci/spotify-vibe --type=renderer'), 'C:/ci/spotify-vibe'));
  check(() => assert.equal(chromiumUserData('app --type=renderer'), null));
  console.log(JSON.stringify({ contractChecks: checks, passed: checks, installations: 0, launches: 0, nativeUpgradeProven: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--validate-contract')) validateContract();
  else if (process.argv.includes('--retain-proof')) await retainProof();
  else await scenario();
}
