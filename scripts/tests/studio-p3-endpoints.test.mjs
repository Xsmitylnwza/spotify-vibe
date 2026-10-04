import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createDefaultConfig } from '../presence-config.mjs';
import { startStudioServer } from '../studio-server.mjs';

const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==';
const app = {executable:'C:\\Apps\\Orca.exe',name:'Orca',icon};
const other = {executable:'C:\\Apps\\Unique.exe',name:'Unique',icon};
const uploaded = 'https://files.catbox.moe/orca.png';
const mapping = sceneId => ({executable:app.executable,name:app.name,sceneId,enabled:true});

async function until(read, predicate) {
  for (let i=0;i<150;i++) { const result = await read(); if (predicate(result)) return result; await delay(10); }
  throw new Error('Fake boundary did not settle');
}

async function fixture(t, { consent, mappings = [], uploader = async()=>uploaded, user = {id:'123456789012345678',username:'golf',global_name:'Golf Display'}, running = [], installed = [app,other,{executable:'C:\\Apps\\Code.exe',name:'VS Code',icon}] } = {}) {
  const directory = await mkdtemp(join(tmpdir(),'vibe-p3-http-'));
  const config = createDefaultConfig(); config.slots=[]; config.settings.autostartEnabled=false;
  const scene = config.scenes[0];
  Object.assign(scene,{sceneName:'Coding',activityName:'{app}',details:'Using {app} · {scene}',state:'{user}',
    largeImage:'https://example.com/art.png',largeImageText:'{scene} by {user}',smallImage:'@app',smallImageText:'{app}',
    timerMode:'none',buttons:[{label:'Open {app}',url:'https://example.com'}]});
  config.appMappings=mappings.map(entry=>({...mapping(scene.id),...entry}));
  await writeFile(join(directory,'presence-config.json'),JSON.stringify(config));
  if (consent!==undefined) await writeFile(join(directory,'icon-hosting.json'),JSON.stringify({consent,icons:{}}));
  const probe=createServer(); await new Promise(r=>probe.listen(0,'127.0.0.1',r));
  const port=probe.address().port; await new Promise(r=>probe.close(r));
  const activities=[]; let emit, clears=0;
  const studio=await startStudioServer({argv:[],port,dataDirectory:directory,openBrowser:false,exitProcess:false,
    environment:{PRESENCE_AUTOSTART_DISABLE:'1',PRESENCE_APP_DETECTION_DISABLE:'1'},
    getInstalledApps:()=>installed,
    refreshInstalledApps:async()=>{},iconUploader:uploader,
    watchApps:callback=>{emit=callback; callback({apps:running,running:running.map(a=>a.executable),supported:true,error:null}); return ()=>{};},
    createDiscordClient:()=>{
      const rpc=new EventEmitter(); rpc.user=user; rpc.login=async()=>{}; rpc.destroy=async()=>{};
      rpc.request=async(_,args)=>{activities.push(args.activity);}; rpc.clearActivity=async()=>{clears++;}; return rpc;
    },
  });
  t.after(async()=>{await studio.stop();await rm(directory,{recursive:true,force:true});});
  async function request(path, method='GET', body, headers={}) {
    const res=await fetch(studio.url+path,{method,headers:{'Content-Type':'application/json',...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)})}); return {status:res.status,body:await res.json()};
  }
  await until(()=>request('/api/state'),r=>r.body.connected);
  return {request,emit,activities,directory,config,url:studio.url,clears:()=>clears,setInstalled:apps=>{installed=apps;}};
}

test('HTTP consent defaults unknown, validates boolean/local origin, and only paired apps upload', async t=>{
  let uploads=0, release;
  const f=await fixture(t,{uploader:()=>{uploads++;return new Promise(r=>{release=()=>r(uploaded);});}});
  assert.deepEqual((await f.request('/api/icon-hosting')).body,{consent:null,provider:'catbox'});
  assert.equal((await f.request('/api/icon-hosting','PUT',{consent:'yes'})).status,400);
  assert.equal((await f.request('/api/icon-hosting','PUT',{consent:true},{Origin:'https://foreign.example'})).status,403);
  const foreignHost=await new Promise((resolve,reject)=>{
    const req=httpRequest(f.url,{path:f.url+'/api/icon-hosting',method:'PUT',headers:{Host:'foreign.example','Content-Type':'application/json'}},res=>{
      res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('{"consent":true}');
  });
  assert.equal(foreignHost,403); assert.equal(uploads,0);
  f.emit({apps:[app,other],running:[app.executable,other.executable],supported:true,error:null});
  await f.request('/api/icon-hosting','PUT',{consent:true}); assert.equal(uploads,0,'consent alone never uploads unpaired catalog');
  await f.request('/api/app-mappings','PUT',{selectionMode:'apps',mappings:[mapping(f.config.scenes[0].id)]});
  assert.equal(uploads,1);
  for (const path of ['/api/apps','/api/installed-apps']) {
    const apps=(await f.request(path)).body.apps;
    assert.equal(apps.find(a=>a.executable===app.executable).iconStatus,'uploading');
    assert.equal(apps.find(a=>a.executable===other.executable).publicIcon,'');
  }
  release();
  await until(()=>f.request('/api/apps'),r=>r.body.apps[0].iconSource==='upload');
  await until(async()=>f.activities.at(-1),a=>a?.assets?.small_image===uploaded);
  assert.equal(uploads,1); assert.equal(f.activities.at(-1).assets.small_text,'Orca');
  assert.equal(f.activities.at(-1).name,'Orca'); assert.equal(f.activities.at(-1).state,'Golf Display');
  assert.equal(f.activities.at(-1).buttons[0].label,'Open Orca');
});

test('startup uploads paired icons and delivery resolves all text; a pin keeps the open paired app and stores templates intact', async t=>{
  let uploads=0;
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app],uploader:async()=>{uploads++;return uploaded;}});
  const live=await until(async()=>f.activities.at(-1),a=>a?.assets?.small_image===uploaded);
  assert.equal(uploads,1); assert.equal(live.name,'Orca');assert.equal(live.details,'Using Orca · Coding');
  assert.equal(live.state,'Golf Display');assert.equal(live.assets.large_text,'Coding by Golf Display');
  assert.equal(live.assets.small_text,'Orca');assert.equal(live.buttons[0].label,'Open Orca');
  assert.equal(live.timestamps,undefined);
  assert.deepEqual((await f.request('/api/state')).body.variables,{app:'Orca',scene:'Coding',user:'Golf Display'});
  const saved=(await f.request('/api/config')).body;
  assert.equal(saved.scenes[0].activityName,'{app}');assert.equal(saved.scenes[0].smallImage,'@app');
  const disk=JSON.parse(await readFile(join(f.directory,'presence-config.json'),'utf8'));
  assert.equal(disk.scenes[0].state,'{user}');
  const pin=await f.request('/api/override','POST',{sceneId:saved.scenes[0].id});
  assert.equal(pin.status,200);assert.equal(pin.body.applied,true);
  assert.equal(f.activities.at(-1).name,'Orca');assert.equal(f.activities.at(-1).details,'Using Orca · Coding');
  assert.equal(f.activities.at(-1).assets.small_image,uploaded);
  assert.deepEqual(pin.body.runtime.variables,{app:'Orca',scene:'Coding',user:'Golf Display'});
  await f.request('/api/presence','DELETE');
  assert.equal((await f.request('/api/state')).body.variables,null); assert.equal(f.clears(),1);
});

test('HTTP config save triggers paired upload, keeps explicit small image and rejects overlong resolved text at RPC boundary', async t=>{
  let uploads=0;
  const withoutIcon={...app,icon:''};
  const f=await fixture(t,{consent:false,mappings:[{}],running:[withoutIcon],installed:[withoutIcon],user:null,uploader:async()=>{uploads++;return uploaded;}});
  const first=await until(async()=>f.activities.at(-1),a=>!!a);
  assert.equal(uploads,0);assert.equal(first.state,'Coding');assert.equal(first.assets.small_image,undefined);
  // A later catalog now has the PNG, but no watcher event or mapping change
  // occurs: config save itself must start this upload.
  await f.request('/api/icon-hosting','PUT',{consent:true});
  assert.equal(uploads,0);
  f.setInstalled([app]);
  const saved=(await f.request('/api/config')).body;
  saved.scenes[0].smallImage='https://example.com/explicit.png';
  saved.scenes[0].details='{app} {unknown}';
  assert.equal((await f.request('/api/config','PUT',{scenes:saved.scenes})).status,200);
  await until(()=>f.request('/api/installed-apps'),r=>r.body.apps[0].iconSource==='upload');
  assert.equal(f.activities.at(-1).assets.small_image,saved.scenes[0].smallImage);
  assert.equal(f.activities.at(-1).details,'Orca {unknown}');assert.equal(uploads,1);
  const before=f.activities.length;
  saved.scenes[0].details='{app}'.repeat(40);
  const changed=await f.request('/api/config','PUT',{scenes:saved.scenes});
  assert.equal(changed.status,200,'template saved independently of delivery');
  assert.match(changed.body.runtime.lastError,/Details/);assert.equal(f.activities.length,before);
  assert.equal((await f.request('/api/config')).body.scenes[0].details,saved.scenes[0].details);
});

test('HTTP failed upload remains default without read retries and pack is always ready', async t=>{
  let uploads=0;
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app],uploader:async()=>{uploads++;throw new Error('fake offline');}});
  const catalog=await until(()=>f.request('/api/installed-apps'),r=>r.body.apps[0].iconStatus==='failed');
  assert.equal(catalog.body.apps[0].publicIcon,'');assert.equal(catalog.body.apps[0].iconSource,'default');
  assert.equal(catalog.body.apps[2].iconSource,'pack');assert.equal(catalog.body.apps[2].iconStatus,'ready');
  for (let i=0;i<3;i++) await f.request('/api/apps');
  await f.request('/api/config','PUT',{scenes:f.config.scenes});
  assert.equal(uploads,1);assert.equal(f.activities.at(-1).assets.small_image,undefined);
});

test('HTTP switching automatic image source to explicit artwork clears its flag across persistence and reload', async t=>{
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app]});
  const config=(await f.request('/api/config')).body;
  config.scenes[0].smallImageSource='app-icon'; config.scenes[0].smallImage='';
  config.scenes[0].largeImageSource='app-icon'; config.scenes[0].largeImage='';
  await f.request('/api/config','PUT',{scenes:config.scenes});
  await until(async()=>f.activities.at(-1),a=>a?.assets?.small_image===uploaded && a?.assets?.large_image===uploaded);
  delete config.scenes[0].smallImageSource; delete config.scenes[0].largeImageSource;
  config.scenes[0].smallImage='https://example.com/custom-small.png';
  config.scenes[0].largeImage='https://example.com/custom-large.png';
  const saved=await f.request('/api/config','PUT',{scenes:config.scenes});
  assert.equal(saved.status,200);assert.equal(saved.body.config.scenes[0].smallImageSource,'');
  assert.equal(f.activities.at(-1).assets.small_image,config.scenes[0].smallImage);
  assert.equal(f.activities.at(-1).assets.large_image,config.scenes[0].largeImage);
  const disk=JSON.parse(await readFile(join(f.directory,'presence-config.json'),'utf8'));
  assert.equal(disk.scenes[0].smallImageSource,'');assert.equal(disk.scenes[0].largeImageSource,'');
  assert.equal((await f.request('/api/config')).body.scenes[0].smallImage,config.scenes[0].smallImage);
});

test('a pinned Scene still uses its open paired app for {app} and the app icon; with none open it uses the Scene name', async t=>{
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app]});
  const sceneId=f.config.scenes[0].id;
  assert.equal((await f.request('/api/override','POST',{sceneId})).status,200);
  const pinned=await until(()=>f.request('/api/state'),r=>r.body.manualOverride && r.body.variables?.app==='Orca');
  assert.equal(pinned.body.selectedApplication,'Orca');
  const live=await until(async()=>f.activities.at(-1),a=>a?.name==='Orca' && a?.assets?.small_image===uploaded);
  assert.equal(live.details,'Using Orca · Coding');
  f.emit({apps:[],running:[],supported:true,error:null});
  const closed=await until(()=>f.request('/api/state'),r=>r.body.variables?.app==='Coding');
  assert.equal(closed.body.selectedApplication,null);
  assert.equal(closed.body.manualOverride.sceneId,sceneId,'the pin itself stays');
});
