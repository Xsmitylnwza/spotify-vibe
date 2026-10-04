import { STUDIO_ICON_URL } from '../application-badges.mjs';
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
import { ICON_PROVIDER } from '../app-icon-hosting.mjs';
import { startStudioServer } from '../studio-server.mjs';

const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==';
const app = {executable:'C:\\Apps\\Zephyr.exe',name:'Zephyr',icon};
const other = {executable:'C:\\Apps\\Unique.exe',name:'Unique',icon};
const uploaded = 'https://files.catbox.moe/orca.png';
const mapping = sceneId => ({executable:app.executable,name:app.name,sceneId,enabled:true});

async function until(read, predicate) {
  for (let i=0;i<150;i++) { const result = await read(); if (predicate(result)) return result; await delay(10); }
  throw new Error('Fake boundary did not settle');
}

async function fixture(t, { sceneOverrides = {}, consent, mappings = [], uploader = async()=>uploaded, user = {id:'123456789012345678',username:'golf',global_name:'Golf Display'}, running = [], installed = [app,other,{executable:'C:\\Apps\\Code.exe',name:'VS Code',icon}] } = {}) {
  const directory = await mkdtemp(join(tmpdir(),'vibe-p3-http-'));
  const config = createDefaultConfig(); config.slots=[]; config.settings.autostartEnabled=false;
  const scene = config.scenes[0];
  Object.assign(scene,{sceneName:'Coding',activityName:'{app}',details:'Using {app} · {scene}',state:'{user}',
    largeImage:'https://example.com/art.png',largeImageText:'{scene} by {user}',smallImage:'@app',smallImageText:'{app}',
    timerMode:'none',buttons:[{label:'Open {app}',url:'https://example.com'}]});
  Object.assign(scene, sceneOverrides);
  config.ownerUnknown = { keep: ['raw', null] };
  config.appMappings=mappings.map(entry=>({...mapping(scene.id),...entry}));
  await writeFile(join(directory,'presence-config.json'),JSON.stringify(config));
  if (consent!==undefined) await writeFile(join(directory,'icon-hosting.json'),JSON.stringify({consent,provider:ICON_PROVIDER.provider,icons:{}}));
  const probe=createServer(); await new Promise(r=>probe.listen(0,'127.0.0.1',r));
  const port=probe.address().port; await new Promise(r=>probe.close(r));
  const activities=[], commands=[]; let emit, clears=0;
  const studio=await startStudioServer({argv:[],port,dataDirectory:directory,openBrowser:false,exitProcess:false,
    environment:{PRESENCE_AUTOSTART_DISABLE:'1',PRESENCE_APP_DETECTION_DISABLE:'1'},
    getInstalledApps:()=>installed,
    refreshInstalledApps:async()=>{},iconUploader:uploader,
    watchApps:callback=>{emit=callback; callback({apps:running,running:running.map(a=>a.executable),supported:true,error:null}); return ()=>{};},
    createDiscordClient:()=>{
      const rpc=new EventEmitter(); rpc.user=user; rpc.login=async()=>{}; rpc.destroy=async()=>{};
      rpc.request=async(command,args)=>{commands.push(command); activities.push(args.activity);}; rpc.clearActivity=async()=>{clears++;}; return rpc;
    },
  });
  t.after(async()=>{await studio.stop();await rm(directory,{recursive:true,force:true});});
  async function request(path, method='GET', body, headers={}) {
    const res=await fetch(studio.url+path,{method,headers:{'Content-Type':'application/json',...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)})}); return {status:res.status,body:await res.json()};
  }
  await until(()=>request('/api/state'),r=>r.body.connected);
  return {request,emit,activities,commands,directory,config,url:studio.url,stop:()=>studio.stop(),clears:()=>clears,setInstalled:apps=>{installed=apps;}};
}

test('HTTP consent defaults unknown, validates boolean/local origin, and only paired apps upload', async t=>{
  let uploads=0, release;
  const f=await fixture(t,{uploader:()=>{uploads++;return new Promise(r=>{release=()=>r(uploaded);});}});
  assert.deepEqual((await f.request('/api/icon-hosting')).body,{consent:null,...ICON_PROVIDER});
  assert.equal((await f.request('/api/icon-hosting','PUT',{consent:'yes'})).status,400);
  assert.equal((await f.request('/api/icon-hosting','PUT',{consent:true,provider:ICON_PROVIDER.provider},{Origin:'https://foreign.example'})).status,403);
  const foreignHost=await new Promise((resolve,reject)=>{
    const req=httpRequest(f.url,{path:f.url+'/api/icon-hosting',method:'PUT',headers:{Host:'foreign.example','Content-Type':'application/json'}},res=>{
      res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('{"consent":true}');
  });
  assert.equal(foreignHost,403); assert.equal(uploads,0);
  f.emit({apps:[app,other],running:[app.executable,other.executable],supported:true,error:null});
  await f.request('/api/icon-hosting','PUT',{consent:true,provider:ICON_PROVIDER.provider}); assert.equal(uploads,0,'consent alone never uploads unpaired catalog');
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
  assert.equal(uploads,1); assert.equal(f.activities.at(-1).assets.small_text,'Zephyr');
  assert.equal(f.activities.at(-1).name,'Zephyr'); assert.equal(f.activities.at(-1).state,'Golf Display');
  assert.equal(f.activities.at(-1).buttons[0].label,'Open Zephyr');
});

test('startup uploads paired icons and delivery resolves all text and stores templates intact', async t=>{
  let uploads=0;
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app],uploader:async()=>{uploads++;return uploaded;}});
  const live=await until(async()=>f.activities.at(-1),a=>a?.assets?.small_image===uploaded);
  assert.equal(uploads,1); assert.equal(live.name,'Zephyr');assert.equal(live.details,'Using Zephyr · Coding');
  assert.equal(live.state,'Golf Display');assert.equal(live.assets.large_text,'Coding by Golf Display');
  assert.equal(live.assets.small_text,'Zephyr');assert.equal(live.buttons[0].label,'Open Zephyr');
  assert.equal(live.timestamps,undefined);
  assert.deepEqual((await f.request('/api/state')).body.variables,{app:'Zephyr',scene:'Coding',user:'Golf Display'});
  const saved=(await f.request('/api/config')).body;
  assert.equal(saved.scenes[0].activityName,'{app}');assert.equal(saved.scenes[0].smallImage,'@app');
  const disk=JSON.parse(await readFile(join(f.directory,'presence-config.json'),'utf8'));
  assert.equal(disk.scenes[0].state,'{user}');
  await f.request('/api/presence','DELETE');
  assert.equal((await f.request('/api/state')).body.variables,null); assert.equal(f.clears(),1);
});

test('HTTP config save triggers paired upload, keeps explicit small image and rejects overlong resolved text at RPC boundary', async t=>{
  let uploads=0;
  const withoutIcon={...app,icon:''};
  const f=await fixture(t,{consent:false,mappings:[{}],running:[withoutIcon],installed:[withoutIcon],user:null,uploader:async()=>{uploads++;return uploaded;}});
  const first=await until(async()=>f.activities.at(-1),a=>!!a);
  assert.equal(uploads,0);assert.equal(first.state,'Coding');assert.equal(first.assets.small_image,STUDIO_ICON_URL);assert.equal(first.assets.large_image,STUDIO_ICON_URL);
  // A later catalog now has the PNG, but no watcher event or mapping change
  // occurs: config save itself must start this upload.
  await f.request('/api/icon-hosting','PUT',{consent:true,provider:ICON_PROVIDER.provider});
  assert.equal(uploads,0);
  f.setInstalled([app]);
  const saved=(await f.request('/api/config')).body;
  saved.scenes[0].smallImage='https://example.com/explicit.png';
  saved.scenes[0].largeImageSource='app-icon';
  saved.scenes[0].details='{app} {unknown}';
  assert.equal((await f.request('/api/config','PUT',{scenes:saved.scenes})).status,200);
  await until(()=>f.request('/api/installed-apps'),r=>r.body.apps[0].iconSource==='upload');
  assert.equal(f.activities.at(-1).assets.small_image,saved.scenes[0].smallImage);
  assert.equal(f.activities.at(-1).details,'Zephyr {unknown}');assert.equal(uploads,1);
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
  assert.equal(uploads,1);assert.equal(f.activities.at(-1).assets.small_image,STUDIO_ICON_URL);assert.equal(f.activities.at(-1).assets.large_image,STUDIO_ICON_URL);
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
  assert.equal(f.activities.at(-1).assets.large_image,uploaded);
  const disk=JSON.parse(await readFile(join(f.directory,'presence-config.json'),'utf8'));
  assert.equal(disk.scenes[0].smallImageSource,'');assert.equal(disk.scenes[0].largeImageSource,'');
  assert.equal((await f.request('/api/config')).body.scenes[0].smallImage,config.scenes[0].smallImage);
});

test('closing a paired app clears presence and removed pin routes return 404', async t=>{
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app]});
  await until(async()=>f.activities.at(-1),a=>a?.name==='Zephyr');
  for (const [path, method] of [['/api/override','POST'],['/api/override','DELETE'],['/api/presence','POST']]) {
    assert.equal((await f.request(path,method,{sceneId:f.config.scenes[0].id})).status,404);
  }
  f.emit({apps:[],running:[],supported:true,error:null});
  const closed=await until(()=>f.request('/api/state'),r=>r.body.desiredSceneId===null);
  assert.equal(closed.body.selectedApplication,null);
  assert.equal(Object.hasOwn(closed.body,'manualOverride'),false);
});

test('server shutdown drains an aborted in-flight icon upload before releasing its profile',async t=>{
  let release;
  const f=await fixture(t,{consent:true,mappings:[{}],running:[app],uploader:()=>new Promise(resolve=>{release=resolve;})});
  await until(()=>Boolean(release),Boolean);
  let stopped=false;
  const stopping=f.stop().then(()=>{stopped=true;});
  await delay(20); assert.equal(stopped,false,'stop must await background icon work');
  release(uploaded); await stopping;
  assert.equal(stopped,true);
  const cache=JSON.parse(await readFile(join(f.directory,'icon-hosting.json'),'utf8'));
  assert.deepEqual(cache.icons,{},'aborted upload cannot publish after close');
});

test('explicit draft upload uses exact installed PNG behind iconless running identity and never saves Scene draft', async t => {
  let uploads = 0, release;
  const f = await fixture(t, { running: [{ ...app, icon: '' }], uploader: async bytes => {
    uploads++; assert.equal(bytes.toString('base64'), icon.split(',')[1]); return new Promise(resolve => { release = resolve; });
  } });
  const configFile = join(f.directory, 'presence-config.json'), before = await readFile(configFile, 'utf8');
  assert.equal((await f.request('/api/apps')).body.apps[0].icon, icon, 'running row borrows only exact catalog PNG');
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', { executable: app.executable })).status, 403);
  assert.equal((await f.request('/api/icon-hosting', 'PUT', { consent: true, provider: 'catbox' })).status, 400);
  assert.equal((await f.request('/api/icon-hosting', 'PUT', { consent: true })).status, 400);
  assert.equal((await f.request('/api/icon-hosting', 'PUT', { consent: true, provider: ICON_PROVIDER.provider })).status, 200);
  assert.equal(uploads, 0, 'consent alone never uploads unpaired draft catalog');
  const selected = { executable: app.executable.toLowerCase().replaceAll('\\', '/') };
  assert.deepEqual(await f.request('/api/icon-hosting/upload', 'POST', selected), { status: 202, body: { ok: true } });
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', selected)).status, 202);
  assert.equal(uploads, 1); release(uploaded);
  await until(() => f.request('/api/apps'), result => result.body.apps[0].iconStatus === 'ready');
  assert.equal(await readFile(configFile, 'utf8'), before, 'no config, Scene or pairing writes');
  assert.deepEqual((await f.request('/api/config')).body.appMappings, []);
  assert.equal(f.activities.length, 0, 'draft icon upload does not publish presence');
});

test('explicit upload rejects foreign origins, non-JSON, arbitrary path/URL/bytes and invalid local PNG', async t => {
  let uploads = 0;
  const f = await fixture(t, { consent: true, installed: [app, { ...other, icon: 'data:image/png;base64,AAAA' }],
    uploader: async () => { uploads++; return uploaded; } });
  for (const body of [{ executable: app.executable, icon }, { executable: app.executable, url: uploaded },
    { executable: 'C:/private/secrets.png' }, { executable: 'https://img.ge/i/sample.png' }, { executable: 'Zephyr.exe' },
    { executable: '' }, {}, [], null]) {
    const response = await f.request('/api/icon-hosting/upload', 'POST', body); assert.ok(response.status >= 400);
  }
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', { executable: other.executable })).status, 400);
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', { executable: app.executable }, { Origin: 'https://foreign.example' })).status, 403);
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', { executable: app.executable }, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await f.request('/api/icon-hosting', 'PUT', { consent: true, provider: ICON_PROVIDER.provider }, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal(uploads, 0, 'invalid requests cannot read caller files or start network upload');
});

test('HTTP explicit retry succeeds after memoized failure without automatic read/config retries', async t => {
  let uploads = 0;
  const f = await fixture(t, { consent: true, mappings: [{}], running: [app], uploader: async () => {
    uploads++; if (uploads === 1) throw new Error('offline'); return uploaded;
  } });
  await until(() => f.request('/api/apps'), result => result.body.apps[0].iconStatus === 'failed');
  await f.request('/api/apps'); await f.request('/api/config', 'PUT', { scenes: f.config.scenes }); assert.equal(uploads, 1);
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', { executable: app.executable })).status, 202);
  await until(() => f.request('/api/apps'), result => result.body.apps[0].iconStatus === 'ready'); assert.equal(uploads, 2);
});

test('explicitly disabled uploader has unavailable API and automatic upload includes explicit-art saved Scenes', async t => {
  const disabled = await fixture(t, { uploader: null });
  assert.equal((await disabled.request('/api/icon-hosting')).status, 404);
  assert.equal((await disabled.request('/api/icon-hosting/upload', 'POST', { executable: app.executable })).status, 503);
  assert.equal((await disabled.request('/api/icon-hosting', 'PUT', { consent: true, provider: ICON_PROVIDER.provider })).status, 503);
  let uploads = 0;
  const f = await fixture(t, { consent: false, mappings: [{}], running: [app], uploader: async () => { uploads++; return uploaded; } });
  const scenes = f.config.scenes.map(scene => ({ ...scene, smallImage: 'https://example.com/explicit.png' }));
  await f.request('/api/config', 'PUT', { scenes });
  await f.request('/api/icon-hosting', 'PUT', { consent: true, provider: ICON_PROVIDER.provider });
  await until(() => f.request('/api/apps'), result => result.body.apps[0].iconStatus === 'ready');
  assert.equal(uploads, 1, 'saved mapping uses app main image even with stored explicit art');
  assert.equal((await f.request('/api/icon-hosting/upload', 'POST', { executable: app.executable })).status, 202);
  await until(() => f.request('/api/apps'), result => result.body.apps[0].iconStatus === 'ready'); assert.equal(uploads, 1);
});


test('raw SET_ACTIVITY uses selected pack over stored avatar and switches apps sharing one Scene without config writes', async t => {
  const orca = { executable: 'C:/Apps/Orca.exe', name: 'Orca' };
  const discord = { executable: 'C:/Apps/Discord.exe', name: 'Discord' };
  const f = await fixture(t, { consent: false, mappings: [orca, discord], running: [orca], installed: [orca, discord],
    sceneOverrides: { largeImage: 'https://cdn.discordapp.com/embed/avatars/0.png', largeImageUrl: 'https://example.com/custom',
      smallImage: 'https://example.com/small.png', smallImageUrl: 'https://example.com/small', ownerUnknown: { keep: true } } });
  const file = join(f.directory, 'presence-config.json'), bytes = await readFile(file, 'utf8');
  const storedScenes = (await f.request('/api/config')).body.scenes;
  const first = await until(async () => f.activities.at(-1), a => /orca.png$/.test(a?.assets?.large_image));
  assert.equal(f.commands.at(-1), 'SET_ACTIVITY');
  assert.equal(first.assets.large_url, undefined); assert.equal(first.assets.small_image, f.config.scenes[0].smallImage);
  assert.equal(first.assets.small_url, f.config.scenes[0].smallImageUrl);
  const state = (await f.request('/api/state')).body;
  assert.equal(state.applicationImage, first.assets.large_image); assert.equal(state.applicationIconFallback, STUDIO_ICON_URL);
  assert.equal(state.selectedApplicationExecutable, orca.executable);
  f.emit({ apps: [discord], running: [discord.executable], supported: true, error: null });
  const second = await until(async () => f.activities.at(-1), a => /discord.png$/.test(a?.assets?.large_image));
  assert.equal(second.assets.small_image, first.assets.small_image);
  assert.equal((await f.request('/api/state')).body.selectedApplicationExecutable, discord.executable);
  assert.deepEqual((await f.request('/api/config')).body.scenes, storedScenes);
  assert.equal(await readFile(file, 'utf8'), bytes);
});

test('custom-art Scene uploads its saved mapping and completion replaces brand without resetting timer or saving config', async t => {
  let release, uploads = 0;
  const f = await fixture(t, { consent: true, mappings: [{}], running: [app],
    sceneOverrides: { largeImage: 'https://example.com/custom-avatar.png', smallImage: 'https://example.com/custom-small.png',
      timerMode: 'elapsed', ownerUnknown: { opaque: ['keep', null] } },
    uploader: () => { uploads++; return new Promise(resolve => { release = resolve; }); } });
  const file = join(f.directory, 'presence-config.json'), bytes = await readFile(file, 'utf8');
  const storedScenes = (await f.request('/api/config')).body.scenes;
  const initial = await until(async () => f.activities.at(-1), a => a?.assets?.large_image === STUDIO_ICON_URL);
  await until(() => Boolean(release), Boolean); assert.equal(uploads, 1);
  release(uploaded);
  const final = await until(async () => f.activities.at(-1), a => a?.assets?.large_image === uploaded);
  assert.deepEqual(final.timestamps, initial.timestamps); assert.deepEqual(final.buttons, initial.buttons);
  assert.equal(final.details, initial.details); assert.equal(final.assets.small_image, f.config.scenes[0].smallImage);
  assert.equal((await f.request('/api/state')).body.applicationImage, uploaded);
  assert.equal(await readFile(file, 'utf8'), bytes);
  assert.deepEqual((await f.request('/api/config')).body.scenes, storedScenes);
});

test('automatic upload excludes disabled mapping and disabled Scene even when consent is granted', async t => {
  let uploads = 0;
  const f = await fixture(t, { consent: true, mappings: [{ enabled: false }], running: [app],
    uploader: async () => { uploads++; return uploaded; } });
  const scenes = f.config.scenes.map(scene => ({ ...scene, enabled: false }));
  const result = await f.request('/api/config', 'PUT', { scenes, appMappings: [mapping(scenes[0].id)] });
  assert.equal(result.status, 200); assert.equal(uploads, 0);
  assert.equal(result.body.runtime.applicationImage, null);
  assert.equal(result.body.runtime.selectedApplicationExecutable, null);
  assert.equal(result.body.runtime.applicationIconFallback, STUDIO_ICON_URL);
  assert.equal(f.activities.length, 0);
});
