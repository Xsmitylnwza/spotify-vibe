import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

export function watchWindowsApps(onSnapshot, { disabled = false } = {}) {
  if (process.platform !== 'win32' || disabled) {
    onSnapshot({ apps:[], supported:false, error:'ตรวจจับแอปไม่ได้ในเซสชันนี้' });
    return () => {};
  }
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./windows-apps.ps1', import.meta.url))], { windowsHide:true, stdio:['ignore','pipe','pipe'] });
  const lines = createInterface({ input: child.stdout });
  let stopped = false;
  const fail = () => { if (!stopped) onSnapshot({ apps:[], supported:true, error:'หยุดตรวจจับแอปแล้ว รีสตาร์ท companion เพื่อลองใหม่' }); };
  lines.on('line', line => { try { onSnapshot({ ...JSON.parse(line), supported:true }); } catch { fail(); } });
  child.stderr.resume();
  child.on('error', fail);
  child.on('exit', fail);
  return () => { stopped=true; lines.close(); child.kill(); };
}
