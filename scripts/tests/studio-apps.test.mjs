import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { startStudioServer } from '../studio-server.mjs';
import { createDefaultConfig } from '../presence-config.mjs';

test('real server reconciles only selected-app transitions; preserves running fallback, debounce, expiry and RPC', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-app-transitions-'));
  const config = createDefaultConfig();
  config.settings.autostartEnabled = false;
  config.appMappings = [
    { executable:'C:\\a.exe', name:'App A', sceneId:config.scenes[0].id, enabled:true },
    { executable:'C:\\b.exe', name:'App B', sceneId:config.scenes[1].id, enabled:true },
    { executable:'C:\\disabled.exe', name:'Off', sceneId:config.scenes[2].id, enabled:false },
  ];
  await writeFile(join(directory, 'presence-config.json'), JSON.stringify(config));
  const probe = createServer(); await new Promise(resolve => probe.listen(0,'127.0.0.1',resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  let emit, watcherStopped=false, time=Date.now(), sequence=0, sends=0, clears=0;
  const timers = new Map();
  const clock = { now:() => time,
    setTimeout:(fn, ms) => { const id=++sequence; timers.set(id,{fn,ms}); return id; },
    clearTimeout:id => timers.delete(id) };
  const rpc = new EventEmitter();
  rpc.login = async () => {}; rpc.destroy = async () => {};
  rpc.request = async () => { sends++; }; rpc.clearActivity = async () => { clears++; };
  const server = await startStudioServer({ argv:[], port, dataDirectory:directory, exitProcess:false, openBrowser:false,
    environment:{ PRESENCE_DISABLE_DEFAULT_APPLICATION:'1', PRESENCE_AUTOSTART_DISABLE:'1', PRESENCE_APP_DETECTION_DISABLE:'1', DISCORD_CLIENT_ID:'1526867893508116620' },
    clock, createDiscordClient:() => rpc, watchApps:callback => { emit=callback; return () => { watcherStopped=true; }; } });
  t.after(async () => { await server.stop(); await rm(directory,{recursive:true,force:true}); });
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
  const state = () => fetch(server.url+'/api/state').then(r=>r.json());
  const apps = () => fetch(server.url+'/api/apps').then(r=>r.json());
  const snapshot = (foreground, running=['C:\\a.exe','C:\\b.exe']) => ({apps:running.map((executable,i)=>({executable,processId:i+1,foreground:executable===foreground})), running, foregroundExecutable:foreground, supported:true});
  const settle = async () => {
    const timer=[...timers].find(([,entry])=>entry.ms===200);
    assert.ok(timer, 'bounded foreground settle timer'); timers.delete(timer[0]); time+=200; timer[1].fn(); await flush();
  };
  await flush();
  emit(snapshot('C:\\b.exe')); await flush(); await settle();
  assert.equal((await state()).desiredSceneId, config.scenes[1].id);
  assert.ok(sends>0, JSON.stringify(await state()));
  const timerIds = [...timers.keys()], sent = sends, timerCount=sequence;
  for(let i=0;i<20;i++) emit({...snapshot('C:\\b.exe'),observedAt:String(i)});
  emit(snapshot('C:\\b.exe',['C:\\a.exe','C:\\b.exe','C:\\irrelevant.exe'])); await flush();
  assert.deepEqual([...timers.keys()], timerIds); assert.equal(sequence,timerCount); assert.equal(sends,sent);
  // An unmapped foreground cannot clear the most recently focused mapped app.
  emit(snapshot('C:\\unmapped.exe')); await settle();
  assert.equal((await state()).desiredSceneId, config.scenes[1].id); assert.equal(sends,sent);
  emit(snapshot('C:\\disabled.exe',['C:\\a.exe','C:\\b.exe','C:\\disabled.exe'])); await settle();
  assert.equal((await state()).desiredSceneId,config.scenes[1].id);
  // Brief A then B focus cancels the pending A selection.
  emit(snapshot('C:\\a.exe')); emit(snapshot('C:\\b.exe')); await settle();
  assert.equal((await state()).desiredSceneId,config.scenes[1].id);
  emit(snapshot('C:\\a.exe')); await settle();
  assert.equal((await state()).desiredSceneId,config.scenes[0].id);
  assert.equal((await apps()).foreground,'c:\\a.exe');
  // Exiting A falls back to B immediately, with no new foreground required.
  emit(snapshot('C:\\unmapped.exe',['C:\\b.exe'])); await flush();
  assert.equal((await state()).desiredSceneId,config.scenes[1].id); await settle();
  emit(snapshot('',[])); await flush();
  assert.equal((await state()).desiredSceneId,null); assert.ok(clears>0);
  // Stable detector data must not defer the independent scheduler heartbeat.
  const heartbeat=[...timers].find(([,entry])=>entry.ms>200);
  assert.ok(heartbeat); const id=heartbeat[0];
  for(let i=0;i<10;i++) emit(snapshot('',[])); await flush();
  assert.ok(timers.has(id));
  const overrideResponse = await fetch(server.url+'/api/override', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sceneId:config.scenes[2].id})});
  assert.equal(overrideResponse.status,200);
  const overrideState = await state();
  assert.equal(overrideState.desiredSceneId,config.scenes[2].id);
  const expiryTimer=[...timers].find(([,entry])=>entry.ms>200);
  for(let i=0;i<10;i++) emit(snapshot('',[])); await flush();
  assert.ok(timers.has(expiryTimer[0]), 'no-op snapshots preserve override expiry timer');
  time=Date.parse(overrideState.manualOverride.expiresAt)+1;
  timers.delete(expiryTimer[0]); await expiryTimer[1].fn(); await flush();
  assert.equal((await state()).manualOverride,null); assert.equal((await state()).desiredSceneId,null);
  // Host injection preserves the legacy loader path of an aliased/junction exe.
  // A canonical physical path would miss this existing mapping's identity.
  const legacyAlias='C:\\Apps\\latest\\tool.exe';
  const aliases=await fetch(server.url+'/api/app-mappings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({selectionMode:'apps',mappings:[{executable:legacyAlias,name:'Legacy alias',enabled:true,sceneId:config.scenes[0].id}]})});
  assert.equal(aliases.status,200);
  emit(snapshot(legacyAlias,[legacyAlias])); await flush(); await settle();
  assert.equal((await state()).desiredSceneId,config.scenes[0].id);
  assert.equal((await state()).selectedApplication,'Legacy alias');
  assert.equal((await apps()).foreground,legacyAlias.toLowerCase());
  assert.equal((await apps()).mappings[0].executable,legacyAlias,'existing mapping is not canonicalized or migrated');
  await server.stop(); assert.equal(watcherStopped,true); assert.equal(timers.size,0);
});
