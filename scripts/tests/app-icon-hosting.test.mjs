import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createIconHosting, createIconUploader, iconPng, publicIconUrl, appIconIdentity, ICON_PROVIDER } from '../app-icon-hosting.mjs';

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

function fakeHost({ link = 'https://img.ge/i/test.png', contentType = 'image/png', bytes = tinyPng(), status = 200, failPost = false, missingSession = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options }); assert.equal(options.redirect, 'error');
    if (url === 'https://img.ge/en') return new Response('<meta name="csrf-token" content="ephemeral123">', {
      headers: missingSession ? {} : { 'Set-Cookie': 'session=ephemeral; HttpOnly' },
    });
    if (url === 'https://img.ge/en/upload') {
      assert.equal(options.method, 'POST'); assert.equal(options.headers.Cookie, 'session=ephemeral');
      assert.equal(options.headers['X-CSRF-TOKEN'], 'ephemeral123');
      assert.deepEqual([...options.body.keys()], ['file', 'name', 'type', 'size', 'upload_auto_delete']);
      assert.equal(options.body.get('upload_auto_delete'), '0'); assert.equal(options.body.get('name'), 'icon.png');
      const file = options.body.get('file'); assert.equal(file.name, 'icon.png'); assert.equal(file.type, 'image/png');
      assert.deepEqual(Buffer.from(await file.arrayBuffer()), tinyPng());
      return new Response(JSON.stringify({ type: 'success', direct_link: link }), { status: failPost ? 500 : 200 });
    }
    assert.equal(options.headers, undefined, 'anonymous public GET never sends session cookies');
    return new Response(bytes, { status, headers: { 'Content-Type': contentType } });
  };
  return { upload: createIconUploader({ fetchImpl }), calls };
}

test('anonymous IMG.GE adapter posts generic PNG with no expiry and verifies direct public bytes before return', async () => {
  const host = fakeHost();
  assert.equal(await host.upload(tinyPng()), 'https://img.ge/i/test.png'); assert.equal(host.calls.length, 3);
  for (const value of ['data:image/jpeg;base64,AAAA', 'data:image/png;base64,AAAA', 'https://example.com/a.png']) assert.throws(() => iconPng(value));
  const oversized = tinyPng(); oversized.writeUInt32BE(257, 16);
  assert.throws(() => iconPng('data:image/png;base64,' + oversized.toString('base64')), /256/);
  const corrupt = tinyPng(); corrupt[30] ^= 1;
  assert.throws(() => iconPng('data:image/png;base64,' + corrupt.toString('base64')), /checksum/);
  assert.throws(() => iconPng('data:image/png;base64,' + tinyPng().subarray(0, 33).toString('base64')), /Incomplete/);
  for (const url of ['http://img.ge/i/a.png', 'https://localhost/x.png', 'https://127.0.0.1/x.png', 'https://[::1]/x.png',
    'https://10.0.0.1/x.png', 'https://user:pass@img.ge/x.png', 'https://img.ge:444/x.png', 'data:image/png;base64,AA']) assert.equal(publicIconUrl(url), false);
});

test('host failure, redirects, non-PNG, changed/oversized bytes and untrusted returned URLs never succeed', async () => {
  await assert.rejects(fakeHost({ failPost: true }).upload(tinyPng()), /upload failed/);
  await assert.rejects(fakeHost({ missingSession: true }).upload(tinyPng()), /session unavailable/);
  for (const link of ['https://localhost/x.png', 'https://img.ge.evil.example/i/x.png', 'https://evil.example/i/x.png',
    'https://img.ge/i/x.png?token=secret', 'https://img.ge/en/test', 'https://user:pass@img.ge/i/x.png']) {
    const host = fakeHost({ link }); await assert.rejects(host.upload(tinyPng()), /public HTTPS PNG/);
    assert.equal(host.calls.length, 2, 'untrusted URL never fetched');
  }
  await assert.rejects(fakeHost({ status: 302 }).upload(tinyPng()), /reachable PNG/);
  await assert.rejects(fakeHost({ contentType: 'text/html' }).upload(tinyPng()), /reachable PNG/);
  await assert.rejects(fakeHost({ bytes: tinyPng(1) }).upload(tinyPng()), /bytes changed/);
  await assert.rejects(fakeHost({ bytes: Buffer.alloc(300000) }).upload(tinyPng()), /bytes changed/);
});

test('host migration resets old consent and ignores old cache while preserving raw unknown fields', async t => {
  const dir = await directory(t), file = join(dir, 'icon-hosting.json'), id = appIconIdentity(iconApp());
  const entry = { url: 'https://files.catbox.moe/old.png', sha256: createHash('sha256').update(tinyPng()).digest('hex'), ownerExtra: 42 };
  await writeFile(file, JSON.stringify({ consent: true, provider: 'catbox', ownerExtension: { sacred: true }, icons: { [id]: entry, future: ['raw'] } }));
  let calls = 0;
  const hosting = createIconHosting(dir, { uploader: async () => { calls++; return 'https://img.ge/i/new.png'; } });
  assert.deepEqual(await hosting.settings(), { consent: null, ...ICON_PROVIDER });
  await hosting.pair([iconApp()]); assert.equal(calls, 0); assert.equal(hosting.view(iconApp()).publicIcon, '');
  assert.equal(JSON.parse(await readFile(file, 'utf8')).provider, 'catbox', 'reading never rewrites raw disk');
  await assert.rejects(hosting.setConsent(true, 'catbox'), /provider changed/);
  await hosting.setConsent(true); const migrated = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(migrated.ownerExtension, { sacred: true }); assert.deepEqual(migrated.icons.future, ['raw']);
  assert.equal(migrated.icons[id].url, entry.url); assert.equal(migrated.icons[id].ownerExtra, 42);
  assert.equal(hosting.view(iconApp()).publicIcon, '');
  await hosting.upload(iconApp()); await hosting.drain(); assert.equal(calls, 1);
  assert.equal(hosting.view(iconApp()).publicIcon, 'https://img.ge/i/new.png');
  assert.equal(JSON.parse(await readFile(file, 'utf8')).icons[id].ownerExtra, 42);
});

test('explicit retry clears only failed SHA and coalesces an in-flight identity', async t => {
  let calls = 0, release;
  const hosting = createIconHosting(await directory(t), { uploader: async () => {
    calls++; if (calls === 1) throw new Error('offline'); await new Promise(resolve => { release = resolve; }); return 'https://img.ge/i/retried.png';
  } });
  await hosting.setConsent(true); await hosting.pair([iconApp()]); await hosting.drain();
  await hosting.pair([iconApp()]); await hosting.drain(); assert.equal(calls, 1);
  await Promise.all([hosting.upload(iconApp()), hosting.upload(iconApp())]); assert.equal(calls, 2);
  release(); await hosting.drain(); assert.equal(hosting.view(iconApp()).iconStatus, 'ready');
});

test('invalid URL and failed cache persistence remain failed and never advertise ready', async t => {
  for (const options of [{ uploader: async () => 'https://localhost/icon.png' },
    { uploader: async () => 'https://img.ge/i/test.png', writeJson: async (_, doc) => { if (Object.keys(doc.icons).length) throw new Error('disk full'); } }]) {
    const hosting = createIconHosting(await directory(t), options); await hosting.setConsent(true);
    await hosting.upload(iconApp()); await hosting.drain(); assert.equal(hosting.view(iconApp()).iconStatus, 'failed');
    assert.equal(hosting.view(iconApp()).publicIcon, '');
  }
});
async function directory(t) {
  const dir = await mkdtemp(join(tmpdir(),'vibe-p3-icons-'));
  t.after(()=>rm(dir,{recursive:true,force:true})); return dir;
}

test('unknown/denied consent never uploads; approved pairing coalesces and reloads hash cache', async t => {
  const dir = await directory(t); let calls=0, release;
  const hosting = createIconHosting(dir,{uploader:async bytes=>{ calls++; assert.deepEqual(bytes,tinyPng()); await new Promise(r=>{release=r;}); return 'https://files.catbox.moe/icon.png'; }});
  assert.deepEqual(await hosting.settings(),{consent:null,...ICON_PROVIDER});
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

test('failed atomic writes leave consent and cache unchanged; revoke aborts late upload', async t => {
  const dir=await directory(t), file=join(dir,'icon-hosting.json');
  await writeFile(file,JSON.stringify({consent:false,provider:'imgge',icons:{},ownerExtension:42}));
  const failed=createIconHosting(dir,{uploader:null,writeJson:async()=>{throw new Error('disk failure');}});
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

test('explicitly disabled host never uploads: non-pack apps get no public icon and no consent prompt, pack icons stay', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-icons-off-'));
  try {
    const hosting = createIconHosting(directory, { uploader: null });
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
