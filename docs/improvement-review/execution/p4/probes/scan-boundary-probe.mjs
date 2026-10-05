// Coordinator-approved isolated PS probes; excluded from the npm unit suite.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:net';
import { startStudioServer } from '../../../../../scripts/studio-server.mjs';
import { createDefaultConfig } from '../../../../../scripts/presence-config.mjs';

async function probe(mode) {
  const source = await readFile(new URL('../../../../../scripts/windows-apps.ps1', import.meta.url), 'utf8');
  // Execute the production loop verbatim, replacing only its native host and clock.
  const loop = source.slice(source.indexOf('$scanClock ='))
    .replace('[System.Diagnostics.Stopwatch]::StartNew()', '[ProbeClock]::new()');
  const directory = await mkdtemp(join(tmpdir(), 'vibe-scan-boundary-'));
  try {
    const script = join(directory, 'probe.ps1');
    await writeFile(script, `$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
public class ProbeClock {
  public static int Tick;
  public long ElapsedMilliseconds { get { return ${['error', 'cache', 'empty'].includes(mode) ? 'Tick * 1000' : 'Tick == 0 ? 0 : Tick == 1 ? 9900 : 10100'}; } }
}
public static class VibeForeground {
  public class App { public int Id; public string Path; public string ProcessName; public bool Visible; }
  public static bool Pending { get; private set; }
  public static void BeginScan() { Pending = true; }
  public static App[] PollScan() {
    ${mode === 'error' ? `if (ProbeClock.Tick == 1) { Pending = false; throw new Exception("injected scan fault"); }
    if (ProbeClock.Tick > 1) return null;` : mode === 'cache' ? '' : `if (ProbeClock.Tick < 2 || ${mode === 'overdue' ? 'true' : 'false'}) return null;`}
    Pending = false;
    ${mode === 'empty' ? 'return new App[0];' : `return new[] { new App { Id=1, Path="C:\\\\fresh.exe", ProcessName="fresh", Visible=false } ${mode === 'restart' ? ', new App { Id=2, Path="C:\\\\orca.exe", ProcessName="orca", Visible=false }' : ''} };`}
  }
  public static IntPtr GetForegroundWindow() { return IntPtr.Zero; }
  public static uint GetWindowThreadProcessId(IntPtr h, out uint id) { id=0; return 0; }
  public static string ForegroundPath(uint id) { return ""; }
}
'@
$iconCache = @{}
$nameCache = @{}
${mode === 'cache' ? "$iconCache['C:\\closed.exe'] = 'old icon'; $nameCache['C:\\closed.exe'] = 'Closed'; $iconCache['C:\\fresh.exe'] = 'live icon'; $nameCache['C:\\fresh.exe'] = 'Fresh'" : ''}
function Start-Sleep { param($Milliseconds) [ProbeClock]::Tick++; if ([ProbeClock]::Tick -gt 2) { ${mode === 'cache' ? "@{ probeCacheKeys=@($iconCache.Keys); probeNameKeys=@($nameCache.Keys) } | ConvertTo-Json -Compress;" : ''} exit 0 } }
${loop}`);
    const result = await new Promise(resolve => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { timeout:20_000 }, (error, stdout, stderr) => resolve({ code:error?.code ?? 0, stdout, stderr })));
    assert.equal(result.stderr, '');
    return { code:result.code, snapshots:result.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) };
  } finally { await rm(directory, { recursive:true, force:true }); }
}

test('F1: scan fault exits without publishing old catalog during pending retry', async () => {
  const result = await probe('error');
  assert.equal(result.snapshots[0].running.length, 1);
  assert.ok(result.snapshots[1].error);
  assert.equal(result.code, 1);
  assert.equal(result.snapshots.length, 2);
});

test('F2: completed result is collected at 10100ms before timeout evaluation', async () => {
  const result = await probe('completed');
  assert.equal(result.code, 0);
  assert.ok(result.snapshots.some(snapshot => snapshot.running?.includes('C:\\fresh.exe')));
  assert.ok(result.snapshots.every(snapshot => !snapshot.error));
});

test('genuinely unfinished scan still exits with empty timeout error at 10100ms', async () => {
  const result = await probe('overdue');
  assert.equal(result.code, 1);
  assert.match(result.snapshots.at(-1).error, /timed out/);
  assert.deepEqual(result.snapshots.at(-1).running, []);
});

test('helper startup/restart publishes no healthy empty catalog before its first completed scan', async () => {
  const result = await probe('completed');
  assert.equal(result.code, 0);
  const catalogs = result.snapshots.filter(snapshot => Array.isArray(snapshot.running));
  assert.equal(catalogs.length, 1, 'an interim empty catalog would erase still-running app timers after a helper restart');
  assert.deepEqual(catalogs[0].running, ['C:\\fresh.exe']);
});

test('a completed empty scan remains authoritative evidence that all apps closed', async () => {
  const result = await probe('empty');
  assert.equal(result.code, 0);
  const catalogs = result.snapshots.filter(snapshot => Array.isArray(snapshot.running));
  assert.equal(catalogs.length, 1);
  assert.deepEqual(catalogs[0].running, []);
});

test('helper evicts closed executable metadata but retains caches for running processes', async () => {
  const result = await probe('cache');
  assert.equal(result.code, 0);
  assert.deepEqual(result.snapshots.at(-1).probeCacheKeys, ['C:\\fresh.exe']);
  assert.deepEqual(result.snapshots.at(-1).probeNameKeys, ['C:\\fresh.exe']);
});

test('real server preserves Claude and Orca elapsed starts through native helper recovery and focus switches', async t => {
  const recovery = await probe('restart');
  assert.equal(recovery.code, 0);
  const directory = await mkdtemp(join(tmpdir(), 'vibe-timer-recovery-'));
  let server;
  t.after(async () => { await server?.stop(); await rm(directory,{recursive:true,force:true}); });
  const portProbe = createServer();
  await new Promise(resolve => portProbe.listen(0,'127.0.0.1',resolve));
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const config = createDefaultConfig();
  const executables = ['C:\\fresh.exe', 'C:\\orca.exe'];
  config.settings.autostartEnabled = false;
  config.appMappings = executables.map((executable, i) => ({ executable, name:i ? 'Orca' : 'Claude', sceneId:config.scenes[i].id, enabled:true }));
  await writeFile(join(directory, 'presence-config.json'), JSON.stringify(config));
  let time = Date.parse('2026-10-05T00:00:00Z'), emit, sequence = 0;
  const timers = new Map(), activities = [];
  const rpc = new EventEmitter();
  rpc.login = async () => {}; rpc.destroy = async () => {}; rpc.clearActivity = async () => {};
  rpc.request = async (_, args) => { activities.push(args.activity); };
  server = await startStudioServer({ argv:[], port, requireOwnership:true, dataDirectory:directory, exitProcess:false, openBrowser:false,
    environment:{ PRESENCE_DISABLE_DEFAULT_APPLICATION:'1', PRESENCE_AUTOSTART_DISABLE:'1', PRESENCE_APP_DETECTION_DISABLE:'1', DISCORD_CLIENT_ID:'1526867893508116620' },
    clock:{ now:() => time, setTimeout:(fn, ms) => { timers.set(++sequence,{fn,ms}); return sequence; }, clearTimeout:id => timers.delete(id) },
    createDiscordClient:() => rpc, getInstalledApps:() => [], watchApps:callback => { emit=callback; return () => {}; } });
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
  const focus = async executable => {
    emit({apps:[],running:executables,foregroundExecutable:executable,supported:true});
    const timer = [...timers].find(([,entry]) => entry.ms === 200);
    assert.ok(timer); timers.delete(timer[0]); time += 200; timer[1].fn(); await flush();
  };
  await flush();
  const originalStart = time;
  await focus(executables[0]);
  assert.equal(activities.at(-1).timestamps.start, originalStart);
  time += 10 * 60_000;
  emit({apps:[],running:[],supported:true,error:'helper restarted'}); await flush();
  // Heartbeats are transport liveness, suppressed by watchWindowsApps.
  for (const snapshot of recovery.snapshots.filter(snapshot => !snapshot.heartbeat)) { emit({...snapshot,supported:true}); await flush(); }
  await focus(executables[1]);
  assert.equal(activities.at(-1).name, config.scenes[1].activityName);
  assert.equal(activities.at(-1).timestamps.start, originalStart, 'Orca retained time while Claude was selected');
  time += 2 * 60_000;
  await focus(executables[0]);
  assert.equal(activities.at(-1).name, config.scenes[0].activityName);
  assert.equal(activities.at(-1).timestamps.start, originalStart, 'returning to Claude after helper recovery cannot reset its timer');
  await server.stop();
  assert.equal(timers.size, 0);
});
