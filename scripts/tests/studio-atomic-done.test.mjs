import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startStudioServer } from '../studio-server.mjs';
import { createDefaultConfig, createDiscordActivity } from '../presence-config.mjs';

const executable = 'C:\\Apps\\Editor.exe';
const mapping = sceneId => ({ executable, name:'Editor', sceneId, enabled:true });
const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)])) : value;
async function until(read, predicate) {
  for (let i=0;i<150;i++) { const result=await read(); if (predicate(result)) return result; await delay(10); }
  throw new Error('Fake RPC did not settle');
}
async function fixture(t, { paused=false, rename, codex=false, legacyButton=false } = {}) {
  const directory=await fs.mkdtemp(join(tmpdir(),'vibe-atomic-done-'));
  const filePath=join(directory,'presence-config.json');
  const raw=createDefaultConfig();
  raw.settings.scheduleEnabled=!paused; raw.settings.autostartEnabled=false;
  raw.appMappings=[mapping(raw.scenes[0].id)];
  raw.manualOverride={sceneId:'deleted',expiresAt:'not a date',opaque:{keep:['raw',null]}};
  raw.ownerRoot={keep:['Thai',null,false]}; raw.settings.ownerSetting={keep:true};
  raw.scenes.forEach(scene=>{scene.ownerScene={id:scene.id}; scene.largeImage='';scene.smallImage='';});
  raw.slots.reverse().forEach(slot=>{slot.ownerSlot={id:slot.id};});
  raw.appMappings[0].ownerMapping={keep:'stable identity'};
  if (legacyButton) raw.scenes[0].buttons=[{label:'Legacy',url:'',ownerButton:{keep:true}}];
  if (codex) {
    raw.appMappings[0].executable='C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3.4_x64__abc\\app\\ChatGPT.exe';
    raw.codexSession={title:'Owner session',startedAt:'2026-01-01T01:00:00.000Z'};
  }
  await fs.writeFile(filePath,JSON.stringify(raw));
  const probe=createServer(); await new Promise(r=>probe.listen(0,'127.0.0.1',r));
  const port=probe.address().port; await new Promise(r=>probe.close(r));
  let writes=0, clears=0;
  const activities=[], commands=[];
  const rpc=new EventEmitter(); rpc.login=async()=>{};rpc.destroy=async()=>{};
  rpc.request=async(cmd,args)=>{commands.push(cmd);activities.push(args.activity);};rpc.clearActivity=async()=>{clears++;};
  const now=Date.parse('2026-10-04T07:00:00.000Z');
  const studio=await startStudioServer({argv:[],port,dataDirectory:directory,openBrowser:false,exitProcess:false,
    environment:{PRESENCE_AUTOSTART_DISABLE:'1',PRESENCE_APP_DETECTION_DISABLE:'1',DISCORD_CLIENT_ID:'1526867893508116620',PRESENCE_DISABLE_DEFAULT_APPLICATION:'1'},
    clock:{now:()=>now},getInstalledApps:()=>[],createDiscordClient:()=>rpc,
    configFs:{...fs,rename:async(...args)=>{writes++;return rename ? rename(...args) : fs.rename(...args);}},
    watchApps:emit=>{emit({apps:[raw.appMappings[0]],running:[raw.appMappings[0].executable],supported:true,error:null});return ()=>{};},
  });
  t.after(async()=>{await studio.stop();await fs.rm(directory,{recursive:true,force:true});});
  async function request(path='/api/config',method='GET',body) {
    const response=await fetch(studio.url+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,body:await response.json()};
  }
  await until(()=>request('/api/state'),r=>r.body.connected && (paused || r.body.active));
  await delay(230); // Finish the detector's bounded foreground debounce before counting RPC effects.
  return {request,raw,filePath,activities,commands,now,writes:()=>writes,clears:()=>clears,
    disk:()=>fs.readFile(filePath,'utf8'),config:async()=>(await request()).body};
}
function assertOwner(disk,raw) {
  assert.deepEqual(disk.ownerRoot,raw.ownerRoot);
  assert.deepEqual(disk.settings.ownerSetting,raw.settings.ownerSetting);
  assert.deepEqual(disk.manualOverride,raw.manualOverride);
  assert.deepEqual(disk.slots,raw.slots);
  for (const scene of disk.scenes) assert.deepEqual(scene.ownerScene,raw.scenes.find(s=>s.id===scene.id).ownerScene);
  for (const m of disk.appMappings) assert.deepEqual(m.ownerMapping,raw.appMappings[0].ownerMapping);
}

test('atomic Done validates Scenes and pairings together, persists once and sends final SET_ACTIVITY buttons/timestamps',async t=>{
  const f=await fixture(t); const current=await f.config();
  const scenes=current.scenes.slice(1).reverse();
  scenes[0]={...scenes[0],details:'Combined Done',timerMode:'remaining',timerMinutes:42,
    buttons:[{label:'Open docs',url:'https://example.com/docs'},{label:'Repository',url:'https://example.com/repo'}]};
  const appMappings=[{...current.appMappings[0],sceneId:scenes[0].id}];
  const before=f.activities.length;
  const done=await f.request('/api/config','PUT',{scenes,appMappings,expectedScenes:reverseKeys(current.scenes),expectedAppMappings:reverseKeys(current.appMappings)});
  assert.equal(done.status,200);assert.equal(f.writes(),1);
  assert.deepEqual(done.body.config.scenes,scenes);assert.deepEqual(done.body.config.appMappings,appMappings);
  assert.equal(f.activities.length,before+1);assert.equal(f.commands.at(-1),'SET_ACTIVITY');
  const activity=f.activities.at(-1); assert.equal(activity.details,'Combined Done');
  assert.deepEqual(activity.buttons,scenes[0].buttons);
  assert.equal(activity.timestamps.end,f.now+42*60_000,'existing discord-rpc milliseconds contract');
  assertOwner(JSON.parse(await f.disk()),f.raw);
  assert.equal(Object.hasOwn(done.body.config,'manualOverride'),false);
  assert.equal(Object.hasOwn(done.body.runtime,'manualOverride'),false);
});

test('invalid combined Done arrays or references roll back both arrays, disk and RPC',async t=>{
  const f=await fixture(t); const current=await f.config(),bytes=await f.disk(),sends=f.activities.length;
  const scenes=current.scenes.map(s=>({...s,details:'Candidate edit'}));
  for (const payload of [
    {scenes:scenes.slice(1),appMappings:current.appMappings},
    {scenes:[{...scenes[0],activityType:'invalid'}],appMappings:[]},
    {scenes,appMappings:[{...current.appMappings[0],sceneId:'missing'}]},
    ...['scenes','appMappings','expectedScenes','expectedAppMappings','slots'].map(key=>({scenes,appMappings:[],[key]:null})),
  ]) {
    const result=await f.request('/api/config','PUT',payload);assert.equal(result.status,400);
    assert.deepEqual(await f.config(),current);assert.equal(await f.disk(),bytes);
    assert.equal(f.writes(),0);assert.equal(f.activities.length,sends);
  }
});

test('stale Scenes or pairings expectations return typed 409 with zero disk/RPC mutation',async t=>{
  const f=await fixture(t);const current=await f.config(),bytes=await f.disk(),sends=f.activities.length;
  const scenes=current.scenes.map(s=>({...s,details:'Candidate edit'}));
  for (const stale of [{expectedScenes:[]},{expectedAppMappings:[]},
    {expectedScenes:current.scenes.map(s=>({...s,buttons:[{label:'stale',url:'https://example.com'}]}))}]) {
    const result=await f.request('/api/config','PUT',{scenes,appMappings:[],...stale});
    assert.equal(result.status,409);assert.equal(result.body.code,'CONFLICT');
    assert.deepEqual(await f.config(),current);assert.equal(await f.disk(),bytes);
    assert.equal(f.writes(),0);assert.equal(f.activities.length,sends);
  }
});

test('failed persistence never publishes combined candidate or reconciles and queue recovers',async t=>{
  let fail=true;
  const f=await fixture(t,{rename:async(...args)=>{if(fail)throw new Error('Injected rename failure');return fs.rename(...args);}});
  const current=await f.config(),bytes=await f.disk(),sends=f.activities.length;
  const payload={scenes:current.scenes.slice(1),appMappings:[{...current.appMappings[0],sceneId:current.scenes[1].id}],expectedScenes:current.scenes,expectedAppMappings:current.appMappings};
  const rejected=await f.request('/api/config','PUT',payload);assert.equal(rejected.status,500);assert.equal(rejected.body.code,'CONFIG_SAVE_FAILED');
  assert.deepEqual(await f.config(),current);assert.equal(await f.disk(),bytes);assert.equal(f.activities.length,sends);
  fail=false;
  assert.equal((await f.request('/api/config','PUT',payload)).status,200);
  assertOwner(JSON.parse(await f.disk()),f.raw);
});

test('paused Done stays paused; omitted optional fields keep existing mappings and raw slots',async t=>{
  const f=await fixture(t,{paused:true});const current=await f.config();
  const scenes=current.scenes.map(s=>({...s,details:'Saved while paused'}));
  const result=await f.request('/api/config','PUT',{scenes,appMappings:current.appMappings,expectedScenes:current.scenes,expectedAppMappings:current.appMappings});assert.equal(result.status,200);
  assert.equal(result.body.config.settings.scheduleEnabled,false);assert.equal(result.body.runtime.selectionSource,'paused');
  assert.deepEqual(result.body.config.appMappings,current.appMappings);assert.equal(f.activities.length,0);assert.equal(f.writes(),1);
  const compatibility=await f.request('/api/config','PUT',{scenes});
  assert.equal(compatibility.status,200);assert.equal(compatibility.body.config.settings.scheduleEnabled,false);
  assert.deepEqual(compatibility.body.config.appMappings,current.appMappings);assert.equal(f.writes(),2);assert.equal(f.activities.length,0);
  assertOwner(JSON.parse(await f.disk()),f.raw);
});

test('overlapping Done requests compare latest committed arrays inside queue and preserve raw owner fields',async t=>{
  let enter, release;
  const entered=new Promise(r=>{enter=r;}),barrier=new Promise(r=>{release=r;});let calls=0;
  const f=await fixture(t,{rename:async(...args)=>{if(++calls===1){enter();await barrier;}return fs.rename(...args);}});
  const current=await f.config(),bytes=await f.disk(),sends=f.activities.length;
  const firstScenes=current.scenes.map(s=>({...s,details:'First commit'}));
  const secondScenes=current.scenes.map(s=>({...s,details:'Stale second commit'}));
  const first=f.request('/api/config','PUT',{scenes:firstScenes,appMappings:[],expectedScenes:current.scenes,expectedAppMappings:current.appMappings});
  await entered;
  const second=f.request('/api/config','PUT',{scenes:secondScenes,appMappings:current.appMappings,expectedScenes:current.scenes,expectedAppMappings:current.appMappings});
  try { await delay(30);assert.deepEqual(await f.config(),current);assert.equal(await f.disk(),bytes);assert.equal(f.activities.length,sends); }
  finally { release(); }
  assert.equal((await first).status,200);const stale=await second;assert.equal(stale.status,409);assert.equal(stale.body.code,'CONFLICT');
  assert.equal(f.writes(),1);assert.deepEqual((await f.config()).scenes,firstScenes);
  assertOwner(JSON.parse(await f.disk()),f.raw);
  // With omitted expectations, compatibility mutations merge against the latest commit.
  const results=await Promise.all([f.request('/api/config','PUT',{scenes:firstScenes}),f.request('/api/codex-session','PUT',{title:'Concurrent owner session'})]);
  assert.ok(results.every(r=>r.status===200));assert.equal((await f.config()).codexSession.title,'Concurrent owner session');
  assertOwner(JSON.parse(await f.disk()),f.raw);
});

test('invalid button URL prevents HTTP save and RPC delivery; valid buttons keep labels and URLs',async t=>{
  const f=await fixture(t);const current=await f.config(),bytes=await f.disk(),sends=f.activities.length;
  for(const buttons of [[{label:'hello',url:''}],[{label:'hello'}],[{label:'hello',url:'http://example.com'}],
    [{label:'hello',url:'invalid'}],[{label:'',url:'https://example.com'}],
    Array.from({length:3},()=>({label:'hello',url:'https://example.com'}))]) {
    const scenes=current.scenes.map(s=>({...s,buttons}));
    const result=await f.request('/api/config','PUT',{scenes});assert.equal(result.status,400);
    assert.throws(()=>createDiscordActivity(scenes[0]),/Button|buttons/);
    assert.equal(await f.disk(),bytes);assert.deepEqual(await f.config(),current);
    assert.equal(f.writes(),0);assert.equal(f.activities.length,sends);
  }
});

test('Codex session start overrides detected app elapsed start in actual SET_ACTIVITY',async t=>{
  const f=await fixture(t,{codex:true});
  assert.equal(f.activities.at(-1).name,'Codex');assert.equal(f.activities.at(-1).details,'Owner session');
  assert.equal(f.activities.at(-1).timestamps.start,Date.parse(f.raw.codexSession.startedAt));
});

test('explicit delete Undo restores raw Scene and removed mapping extensions once, preserving current root/session',async t=>{
  const f=await fixture(t,{paused:true}); const previous=await f.config();
  const deleted=await f.request('/api/config','PUT',{scenes:previous.scenes.slice(1),appMappings:[],expectedScenes:previous.scenes,expectedAppMappings:previous.appMappings,retainUndo:true});
  assert.equal(deleted.status,200); assert.equal(typeof deleted.body.undoToken,'string');
  assert.equal(JSON.parse(await f.disk()).scenes.some(s=>s.id===previous.scenes[0].id),false);
  await f.request('/api/codex-session','PUT',{title:'Session after delete'});
  const undo=await f.request('/api/config','PUT',{undoToken:deleted.body.undoToken,expectedScenes:deleted.body.config.scenes,expectedAppMappings:deleted.body.config.appMappings});
  assert.equal(undo.status,200); const disk=JSON.parse(await f.disk());
  assertOwner(disk,f.raw); assert.equal(disk.settings.scheduleEnabled,false); assert.equal(disk.codexSession.title,'Session after delete');
  assert.deepEqual(undo.body.config.scenes,previous.scenes); assert.deepEqual(undo.body.config.appMappings,previous.appMappings);
  const bytes=await f.disk(),writes=f.writes();
  assert.equal((await f.request('/api/config','PUT',{undoToken:deleted.body.undoToken})).status,409);
  assert.equal(await f.disk(),bytes); assert.equal(f.writes(),writes);
});

test('Undo cannot resurrect a deletion after intervening edits and failed restore remains retryable',async t=>{
  let fail=false;
  const f=await fixture(t,{paused:true,rename:async(...args)=>{if(fail)throw new Error('blocked');return fs.rename(...args);}});
  const previous=await f.config();
  const deleted=await f.request('/api/config','PUT',{scenes:previous.scenes.slice(1),appMappings:[],expectedScenes:previous.scenes,expectedAppMappings:previous.appMappings,retainUndo:true});
  const token=deleted.body.undoToken,bytes=await f.disk();
  fail=true; assert.equal((await f.request('/api/config','PUT',{undoToken:token})).status,500); assert.equal(await f.disk(),bytes);
  fail=false; assert.equal((await f.request('/api/config','PUT',{undoToken:token})).status,200);
  const again=await f.config();
  const second=await f.request('/api/config','PUT',{scenes:again.scenes.slice(1),appMappings:[],expectedScenes:again.scenes,expectedAppMappings:again.appMappings,retainUndo:true});
  const edited=second.body.config.scenes.map(s=>({...s,details:'Later edit'}));
  await f.request('/api/config','PUT',{scenes:edited});
  const later=await f.disk(),writes=f.writes();
  assert.equal((await f.request('/api/config','PUT',{undoToken:second.body.undoToken})).status,409);
  assert.equal(await f.disk(),later); assert.equal(f.writes(),writes);
});

test('historically accepted empty button URL does not reset owner config during upgrade',async t=>{
  const f=await fixture(t,{paused:true,legacyButton:true}); const cfg=await f.config();
  assert.equal(cfg.scenes[0].buttons[0].label,'Legacy'); assert.equal(cfg.scenes[0].buttons[0].url,'');
  assertOwner(JSON.parse(await f.disk()),f.raw); assert.equal(f.writes(),0);
  const disable=await f.request('/api/schedule','POST',{enabled:false}); assert.equal(disable.status,200);
  assertOwner(JSON.parse(await f.disk()),f.raw);
  assert.deepEqual(JSON.parse(await f.disk()).scenes[0].buttons,f.raw.scenes[0].buttons,'unchanged nested button owner fields survive unrelated mutations');
  assert.equal((await f.request('/api/config','PUT',{scenes:cfg.scenes})).status,400,'new writes still require repair');
  const repaired=cfg.scenes.map((s,i)=>i? s:{...s,buttons:[{label:'Legacy',url:'https://example.com'}]});
  assert.equal((await f.request('/api/config','PUT',{scenes:repaired})).status,200);
  assertOwner(JSON.parse(await f.disk()),f.raw);
});
