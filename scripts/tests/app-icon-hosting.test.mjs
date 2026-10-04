import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createIconHosting, createIconUploader, iconPng, publicIconUrl, appIconIdentity } from '../app-icon-hosting.mjs';

// Generated 1x1 PNG, including chunk CRCs. No owner images or network calls.
export function tinyPng(value = 0) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type),data]); let crc = 0xffffffff;
    for (const byte of body) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc>>>1)^((crc&1)?0xedb88320:0); }
    const out = Buffer.alloc(data.length+12); out.writeUInt32BE(data.length); body.copy(out,4);
    out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4); return out;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),
    chunk('IDAT',deflateSync(Buffer.from([0,value,0,0,255]))),chunk('IEND',Buffer.alloc(0))]);
}
export const iconApp = (value=0) => ({executable:'C:\\Apps\\Unique.exe',name:'Unique',icon:'data:image/png;base64,'+tinyPng(value).toString('base64')});
async function directory(t) {
  const dir = await mkdtemp(join(tmpdir(),'vibe-p3-icons-'));
  t.after(()=>rm(dir,{recursive:true,force:true})); return dir;
}

test('unknown/denied consent never uploads; approved pairing coalesces and reloads hash cache', async t => {
  const dir = await directory(t); let calls=0, release;
  const hosting = createIconHosting(dir,{uploader:async bytes=>{ calls++; assert.deepEqual(bytes,tinyPng()); await new Promise(r=>{release=r;}); return 'https://files.catbox.moe/icon.png'; }});
  assert.deepEqual(await hosting.settings(),{consent:null,provider:'catbox'});
  await hosting.pair([iconApp()]); await hosting.setConsent(false); await hosting.pair([iconApp()]);
  assert.equal(calls,0); assert.equal((await hosting.decorate(iconApp())).iconStatus,'needs-consent');
  await hosting.setConsent(true); await Promise.all([hosting.pair([iconApp()]),hosting.pair([iconApp()])]);
  assert.equal(calls,1); assert.equal((await hosting.decorate(iconApp())).iconStatus,'uploading');
  release(); await hosting.drain(); const decorated = await hosting.decorate(iconApp());
  assert.equal(decorated.iconSource,'upload'); assert.equal(decorated.iconStatus,'ready');
  const saved = JSON.parse(await readFile(join(dir,'icon-hosting.json'),'utf8'));
  assert.equal(saved.icons[appIconIdentity(iconApp())].sha256,createHash('sha256').update(tinyPng()).digest('hex'));
  const restarted = createIconHosting(dir,{uploader:async()=>{throw new Error('must not upload');}});
  await restarted.pair([iconApp()]); await restarted.drain(); assert.equal((await restarted.decorate(iconApp())).publicIcon,decorated.publicIcon);
  assert.equal((await restarted.decorate({...iconApp(),icon:''})).publicIcon,decorated.publicIcon);
  assert.equal((await restarted.decorate(iconApp(1))).publicIcon,'');
  assert.equal(appIconIdentity(iconApp()),appIconIdentity({...iconApp(),executable:'c:/apps/unique.exe'}));
  assert.notEqual(appIconIdentity(iconApp()),appIconIdentity({...iconApp(),executable:'D:\\Apps\\Unique.exe'}));
});

test('pack wins every consent state; upload failures memoize each SHA and changed PNG retries', async t => {
  let calls=0; const hosting = createIconHosting(await directory(t),{uploader:async()=>{calls++;throw new Error('offline');}});
  const packed = {...iconApp(),executable:'C:\\Apps\\Code.exe',name:'VS Code'};
  for (const consent of [null,false,true]) {
    if (consent!==null) await hosting.setConsent(consent);
    await hosting.pair([packed]); assert.equal((await hosting.decorate(packed)).iconSource,'pack');
  }
  assert.equal(calls,0);
  await hosting.pair([iconApp()]); await hosting.drain(); await hosting.pair([iconApp()]);
  assert.equal(calls,1); assert.equal((await hosting.decorate(iconApp())).iconStatus,'failed');
  await hosting.pair([iconApp(1)]); await hosting.drain(); assert.equal(calls,2);
  await hosting.pair([iconApp()]); await hosting.drain(); assert.equal(calls,2,'earlier failed SHA remains memoized');
});

test('strict PNG and public HTTPS validation plus anonymous Catbox multipart with fake fetch', async () => {
  for (const invalid of ['data:image/jpeg;base64,AAAA','data:image/png;base64,AAAA','https://example.com/a.png']) assert.throws(()=>iconPng(invalid));
  const oversized=tinyPng(); oversized.writeUInt32BE(257,16);
  assert.throws(()=>iconPng('data:image/png;base64,'+oversized.toString('base64')),/256/);
  for (const url of ['http://files.catbox.moe/x.png','https://localhost/x.png','https://127.0.0.1/x.png',
    'https://[::1]/x.png','https://10.0.0.1/x.png','https://user:pass@files.catbox.moe/x.png','data:image/png;base64,AA']) assert.equal(publicIconUrl(url),false,url);
  const upload = createIconUploader({fetchImpl:async(url,opts)=>{
    assert.equal(url,'https://catbox.moe/user/api.php'); assert.equal(opts.method,'POST');
    assert.deepEqual([...opts.body.keys()],['reqtype','fileToUpload']); assert.equal(opts.body.get('reqtype'),'fileupload');
    const file=opts.body.get('fileToUpload'); assert.equal(file.name,'icon.png'); assert.equal(file.type,'image/png');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()),tinyPng()); return new Response('https://files.catbox.moe/test.png\n');
  }});
  assert.equal(await upload(tinyPng()),'https://files.catbox.moe/test.png');
  await assert.rejects(createIconUploader({fetchImpl:async()=>new Response('https://localhost/icon.png')})(tinyPng()),/public HTTPS/);
  await assert.rejects(createIconUploader({fetchImpl:async()=>new Response('no',{status:500})})(tinyPng()),/failed/);
});

test('failed atomic writes leave consent and cache unchanged; revoke aborts late upload', async t => {
  const dir=await directory(t), file=join(dir,'icon-hosting.json');
  await writeFile(file,JSON.stringify({consent:false,provider:'catbox',icons:{},ownerExtension:42}));
  const failed=createIconHosting(dir,{writeJson:async()=>{throw new Error('disk failure');}});
  await assert.rejects(failed.setConsent(true),/disk failure/); assert.equal((await failed.settings()).consent,false);
  assert.equal(JSON.parse(await readFile(file,'utf8')).consent,false);
  let release, signal;
  const hosting=createIconHosting(dir,{uploader:async(_,options)=>{signal=options.signal;await new Promise(r=>{release=r;});return 'https://files.catbox.moe/late.png';}});
  await hosting.setConsent(true); await hosting.pair([iconApp()]); await hosting.setConsent(false);
  assert.equal(signal.aborted,true); release(); await hosting.drain();
  assert.equal((await hosting.decorate(iconApp())).publicIcon,'');
  assert.equal(JSON.parse(await readFile(file,'utf8')).ownerExtension,42);
});

test('an empty small image keeps the app-icon default; explicit images and the large image are untouched', async () => {
  const { withApplicationBadge } = await import('../application-badges.mjs');
  const scene = { sceneName: 'Coding', largeImage: 'https://example.com/a.png', smallImage: '' };
  const icon = 'https://files.catbox.moe/abc.png';
  assert.equal(withApplicationBadge(scene, { name: 'Claude' }, { publicIcon: icon }).smallImage, icon);
  assert.equal(withApplicationBadge(scene, { name: 'Claude' }, { publicIcon: icon }).largeImage, scene.largeImage);
  assert.equal(withApplicationBadge({ ...scene, smallImage: 'https://example.com/s.png' }, { name: 'Claude' }, { publicIcon: icon }).smallImage, 'https://example.com/s.png');
  assert.equal(withApplicationBadge(scene, { name: 'Unknown' }, { publicIcon: '' }).smallImage, '');
  assert.equal(withApplicationBadge({ ...scene, activityName: 'Morning Vibe' }, { name: 'Claude' }, { publicIcon: icon }).activityName, 'Morning Vibe', 'activity text stays the owner template');
});

test('without an injected host, nothing uploads: non-pack apps get no public icon and no consent prompt, pack icons stay', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-icons-off-'));
  try {
    const hosting = createIconHosting(directory);
    assert.equal(hosting.uploadsEnabled, false);
    await hosting.setConsent(true);
    const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==';
    const unknown = { executable: 'C:\Apps\Unique.exe', name: 'Unique', icon };
    await hosting.pair([unknown]);
    assert.deepEqual(hosting.view(unknown), { ...unknown, publicIcon: '', iconSource: 'default', iconStatus: '' });
    const orca = hosting.view({ executable: 'C:/Users/u/AppData/Local/Programs/orca/Orca.exe', name: 'Orca', icon });
    assert.equal(orca.iconSource, 'pack'); assert.match(orca.publicIcon, /^https:\/\/raw\.githubusercontent\.com\/.+\/orca\.png$/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
