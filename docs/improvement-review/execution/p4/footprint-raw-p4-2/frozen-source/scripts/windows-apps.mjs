import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

// observedAt and array order are liveness/transport details, not transitions.
export function windowsSnapshotKey(snapshot) {
  return JSON.stringify({ error:snapshot.error || null, supported:snapshot.supported,
    foreground:snapshot.foregroundExecutable ?? snapshot.apps?.find(app => app.foreground)?.executable ?? '',
    running:[...(snapshot.running || [])].sort(),
    apps:(snapshot.apps || []).map(app => [app.executable, app.name, app.icon, app.processId]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
}

export function watchWindowsApps(onSnapshot, {
  disabled = false, platform = process.platform, spawnHelper = spawn,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout,
  staleMs = 15_000, restartMs = 1_000,
} = {}) {
  if (platform !== 'win32' || disabled) {
    onSnapshot({ apps:[], supported:false, error:'ตรวจจับแอปไม่ได้ในเซสชันนี้' });
    return () => {};
  }
  let stopped = false;
  let child, lines, watchdog, retry, lastKey;
  function start() {
    if (stopped) return;
    let failed = false, lastSeen = now();
    const fail = () => {
      if (stopped || failed) return;
      failed = true;
      clearTimer(watchdog); lines?.close(); child?.kill();
      lastKey = undefined;
      onSnapshot({ apps:[], running:[], supported:true, error:'หยุดตรวจจับแอปแล้ว กำลังลองใหม่' });
      retry = setTimer(start, restartMs);
    };
    const checkStale = () => {
      if (stopped || failed) return;
      if (now() - lastSeen >= staleMs) return fail();
      watchdog = setTimer(checkStale, staleMs - (now() - lastSeen));
    };
    try {
      child = spawnHelper('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./windows-apps.ps1', import.meta.url))], { windowsHide:true, stdio:['ignore','pipe','pipe'] });
      lines = createInterface({ input:child.stdout });
      lines.on('line', line => {
        if (stopped || failed) return;
        try {
          const snapshot = JSON.parse(line);
          if (snapshot.heartbeat === true && typeof snapshot.observedAt === 'string') { lastSeen = now(); return; }
          if (!Array.isArray(snapshot.apps) || (snapshot.running !== undefined && !Array.isArray(snapshot.running))) throw new Error('Invalid detector snapshot');
          lastSeen = now();
          const next = { ...snapshot, supported:true };
          const key = windowsSnapshotKey(next);
          if (key !== lastKey) { lastKey = key; onSnapshot(next); }
        } catch { fail(); }
      });
      child.stderr.resume(); child.once('error', fail); child.once('exit', fail);
      watchdog = setTimer(checkStale, staleMs);
    } catch { fail(); }
  }
  start();
  return () => { stopped=true; clearTimer(watchdog); clearTimer(retry); lines?.close(); child?.kill(); };
}
