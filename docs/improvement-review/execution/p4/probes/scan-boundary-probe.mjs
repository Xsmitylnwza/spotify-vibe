// Coordinator-approved isolated PS probes; excluded from the npm unit suite.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';

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
  public long ElapsedMilliseconds { get { return ${mode === 'error' ? 'Tick * 1000' : 'Tick == 0 ? 0 : Tick == 1 ? 9900 : 10100'}; } }
}
public static class VibeForeground {
  public class App { public int Id; public string Path; public string ProcessName; public bool Visible; }
  public static bool Pending { get; private set; }
  public static void BeginScan() { Pending = true; }
  public static App[] PollScan() {
    ${mode === 'error' ? `if (ProbeClock.Tick == 1) { Pending = false; throw new Exception("injected scan fault"); }
    if (ProbeClock.Tick > 1) return null;` : `if (ProbeClock.Tick < 2 || ${mode === 'overdue' ? 'true' : 'false'}) return null;`}
    Pending = false;
    return new[] { new App { Id=1, Path="C:\\\\fresh.exe", ProcessName="fresh", Visible=false } };
  }
  public static IntPtr GetForegroundWindow() { return IntPtr.Zero; }
  public static uint GetWindowThreadProcessId(IntPtr h, out uint id) { id=0; return 0; }
  public static string ForegroundPath(uint id) { return ""; }
}
'@
$iconCache = @{}
$nameCache = @{}
function Start-Sleep { param($Milliseconds) [ProbeClock]::Tick++; if ([ProbeClock]::Tick -gt 2) { exit 0 } }
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
