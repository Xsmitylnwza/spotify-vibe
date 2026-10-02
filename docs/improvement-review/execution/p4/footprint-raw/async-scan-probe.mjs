// Live fault injection, separate from hermetic unit tests. Only the copied
// helper's second scan is delayed; production source is never altered here.
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { watchWindowsApps } from '../../../../../scripts/windows-apps.mjs';
const execute = promisify(execFile), wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const root = join(tmpdir(),'vibe-p4-async-probe');
await mkdir(join(root,'scripts'),{recursive:true});
const original = fileURLToPath(new URL('../../../../../scripts/windows-apps.ps1',import.meta.url));
const source = await readFile(original,'utf8');
const injected = source.replace('  public static App[] Scan() {', '  static int injectedScanCount;\n  public static App[] Scan() {\n    if(++injectedScanCount == 2) System.Threading.Thread.Sleep(11000);');
if(injected === source) throw new Error('Fault-injection point unavailable');
const helper = join(root,'scripts','windows-apps.ps1'); await writeFile(helper,injected);
const controller = join(root,'focus.ps1');
await writeFile(controller, `param([int]$Target)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Focus {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int command);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint id);
 public static uint Pid() {uint id;GetWindowThreadProcessId(GetForegroundWindow(),out id);return id;}
}
'@
$process=Get-Process -Id $Target
for($i=0;$i -lt 100 -and $process.MainWindowHandle -eq [IntPtr]::Zero;$i++){Start-Sleep -Milliseconds 100;$process.Refresh()}
if($process.MainWindowHandle -eq [IntPtr]::Zero){throw 'Owned probe window not ready'}
[void][Focus]::ShowWindow($process.MainWindowHandle,9)
$shell=New-Object -ComObject WScript.Shell;$shell.SendKeys('%');Start-Sleep -Milliseconds 100
$at=[DateTime]::UtcNow.ToString('o');[void]$shell.AppActivate($Target);Start-Sleep -Milliseconds 100
[void][Focus]::SetForegroundWindow((Get-Process -Id $Target).MainWindowHandle)
[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell)
@{at=$at;foregroundPid=[Focus]::Pid()}|ConvertTo-Json -Compress
`);
const binaries=[join(root,'AsyncProbeA.exe'),join(root,'AsyncProbeB.exe')];
for(const binary of binaries) await copyFile(join(tmpdir(),'vibe-p4-smoke','P4LaunchProbe.exe'),binary);
const apps=binaries.map(binary => spawn(binary,[],{stdio:'ignore',windowsHide:false}));
const helpers=[], events=[]; let stop=()=>{};
const receipt={sourceSha256:createHash('sha256').update(source).digest('hex'),injection:'11 s sleep in second bulk scan only',nodePid:process.pid,events};
const focus = async pid => {
  for(let i=0;i<3;i++) {
    const result=JSON.parse((await execute('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',controller,'-Target',String(pid)],{windowsHide:true})).stdout);
    if(result.foregroundPid===pid) return result;
    await wait(200);
  }
  throw new Error('Could not obtain owned probe foreground');
};
async function until(predicate,ms=25_000) { const end=Date.now()+ms; while(!predicate()) {if(Date.now()>end) throw new Error('Live probe deadline');await wait(25);} }
try {
  await wait(1500); receipt.initialFocus=await focus(apps[0].pid);
  stop=watchWindowsApps(snapshot => events.push({at:Date.now(),foreground:snapshot.foregroundExecutable||'',running:snapshot.running||[],error:snapshot.error||null}),{
    spawnHelper:(command,args,options) => {
      const argv=[...args]; if(helpers.length===0) argv[argv.length-1]=helper;
      const child=spawn(command,argv,options);helpers.push(child);return child;
    },
  });
  await until(()=>events.some(e=>e.foreground.toLowerCase()===binaries[0].toLowerCase() && binaries.every(binary=>e.running.includes(binary))));
  await wait(1800);receipt.changedFocus=await focus(apps[1].pid);
  await until(()=>events.some(e=>e.foreground.toLowerCase()===binaries[1].toLowerCase() && e.at>=Date.parse(receipt.changedFocus.at)));
  const changed=events.find(e=>e.foreground.toLowerCase()===binaries[1].toLowerCase() && e.at>=Date.parse(receipt.changedFocus.at));
  receipt.foregroundDuringBlockedScanMs=changed.at-Date.parse(receipt.changedFocus.at);
  await until(()=>helpers.length>=2 && events.some(e=>e.error==='Windows process scan timed out.'));
  await until(()=>helpers[0].exitCode!==null && events.at(-1).error===null && binaries.every(binary=>events.at(-1).running.includes(binary)));
  receipt.timeoutExitCode=helpers[0].exitCode;receipt.recovered=true;
  const timeout=events.find(e=>e.error==='Windows process scan timed out.');
  receipt.focusDeliveredBeforeTimeout=changed.at<timeout.at;
  receipt.deliveryToTimeoutMs=timeout.at-changed.at;
  if(!receipt.focusDeliveredBeforeTimeout) throw new Error('Focus probe did not occur during the blocked scan');
} catch(error) {receipt.error=error.message;process.exitCode=1;}
finally {
  stop();for(const app of apps) if(app.exitCode===null) app.kill();
  await wait(1000);
  receipt.cleanup=[...apps,...helpers].map(child=>({pid:child.pid,exitCode:child.exitCode,signalCode:child.signalCode,killed:child.killed}));
  await writeFile(new URL('./async-scan-probe.json',import.meta.url),JSON.stringify(receipt,null,2));
}
