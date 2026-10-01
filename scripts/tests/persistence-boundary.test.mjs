import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createConfigStore } from '../local-config-store.mjs';
import { createDefaultConfig, validateConfig } from '../presence-config.mjs';
import { saveAppSecrets, loadAppSecrets } from '../app-secrets.mjs';

const failure = code => Object.assign(new Error('injected filesystem failure'), { code });
async function fixture(t) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'vibe-persistence-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'config.json');
  const config = validateConfig(createDefaultConfig());
  await fs.writeFile(filePath, JSON.stringify(config));
  const original = await fs.readFile(filePath, 'utf8');
  const store = adapters => createConfigStore({ filePath, createDefault: createDefaultConfig, validate: validateConfig, fs: { ...fs, ...adapters } });
  return { directory, filePath, config, original, store };
}

for (const code of ['EPERM', 'EEXIST', 'ENOSPC']) {
  test('config replacement ' + code + ' preserves destination and cleans temp', async t => {
    const f = await fixture(t);
    const adapters = code === 'ENOSPC' ? { writeFile: async (path, ...args) => { await fs.writeFile(path, ...args); throw failure(code); } }
      : { rename: async () => { throw failure(code); } };
    await assert.rejects(f.store(adapters).save({ ...f.config, settings: { ...f.config.settings, scheduleEnabled: false } }), { code });
    assert.equal(await fs.readFile(f.filePath, 'utf8'), f.original);
    assert.deepEqual(await fs.readdir(f.directory), ['config.json']);
  });
}

test('config read I/O failure does not reset bytes', async t => {
  const f = await fixture(t);
  await assert.rejects(f.store({ readFile: async () => { throw failure('EACCES'); } }).load(), { code: 'EACCES' });
  assert.equal(await fs.readFile(f.filePath, 'utf8'), f.original);
});

test('future config schema refuses load/save without changing bytes', async t => {
  const f = await fixture(t);
  const future = { ...f.config, version: 99, futureSetting: 'preserve' };
  await fs.writeFile(f.filePath, JSON.stringify(future));
  const raw = await fs.readFile(f.filePath, 'utf8');
  await assert.rejects(f.store().load(), { code: 'UNSUPPORTED_SCHEMA' });
  assert.throws(() => f.store().save(future), { code: 'UNSUPPORTED_SCHEMA' });
  assert.equal(await fs.readFile(f.filePath, 'utf8'), raw);
});

for (const boundary of ['write', 'verify']) {
  test('corrupt config backup ' + boundary + ' failure preserves original', async t => {
    const f = await fixture(t);
    const raw = '{ malformed';
    await fs.writeFile(f.filePath, raw);
    const adapters = boundary === 'write' ? { writeFile: async () => { throw failure('ENOSPC'); } }
      : { readFile: async (path, ...args) => path === f.filePath ? fs.readFile(path, ...args) : 'wrong bytes' };
    await assert.rejects(f.store(adapters).load());
    assert.equal(await fs.readFile(f.filePath, 'utf8'), raw);
  });
}

test('corrupt recovery verifies actual backup bytes and keeps original if replacement fails', async t => {
  const f = await fixture(t);
  const raw = '{ malformed';
  await fs.writeFile(f.filePath, raw);
  await assert.rejects(f.store({ rename: async () => { throw failure('EPERM'); } }).load());
  assert.equal(await fs.readFile(f.filePath, 'utf8'), raw);
  const backup = (await fs.readdir(f.directory)).find(name => name.includes('.corrupt-'));
  assert.equal(await fs.readFile(join(f.directory, backup), 'utf8'), raw);
  assert.equal((await f.store().load()).source, 'recovered');
});

test('v1 migration backup failure blocks load and preserves slots and bytes', async t => {
  const f = await fixture(t);
  const raw = JSON.stringify({ ...f.config, version: 1 });
  await fs.writeFile(f.filePath, raw);
  await assert.rejects(f.store({ writeFile: async () => { throw failure('ENOSPC'); } }).load());
  assert.equal(await fs.readFile(f.filePath, 'utf8'), raw);
  const loaded = await f.store().load();
  assert.deepEqual(loaded.config.slots, f.config.slots);
  assert.equal(await fs.readFile(f.filePath + '.v1-backup', 'utf8'), raw);
});

test('concurrent secret partial updates merge inside one queue', async t => {
  const f = await fixture(t);
  const filePath = join(f.directory, 'secrets.json');
  await Promise.all([
    saveAppSecrets({ filePath, discordClientId: '1526867893508116620' }),
    saveAppSecrets({ filePath, giphyApiKey: 'abcdefghijklmnopqrstuvwx' }),
  ]);
  const saved = await loadAppSecrets({ filePath });
  assert.equal(saved.discordClientId, '1526867893508116620');
  assert.equal(saved.giphyApiKey, 'abcdefghijklmnopqrstuvwx');
  assert.equal((await fs.readdir(f.directory)).filter(name => name.includes('.tmp-')).length, 0);
});

for (const boundary of ['read', 'write', 'rename', 'cleanup', 'future', 'backup']) {
  test('secrets ' + boundary + ' failure never deletes or overwrites the last file', async t => {
    const f = await fixture(t);
    const filePath = join(f.directory, 'secrets.json');
    await saveAppSecrets({ filePath, discordClientId: '1526867893508116620' });
    if (boundary === 'future') await fs.writeFile(filePath, '{"version":99,"futureKey":"keep"}');
    if (boundary === 'backup') await fs.writeFile(filePath, '{ malformed');
    const original = await fs.readFile(filePath, 'utf8');
    const adapters = { ...fs };
    if (boundary === 'read') adapters.readFile = async () => { throw failure('EACCES'); };
    if (boundary === 'write' || boundary === 'backup') adapters.writeFile = async () => { throw failure('ENOSPC'); };
    if (boundary === 'rename' || boundary === 'cleanup') adapters.rename = async () => { throw failure('EPERM'); };
    if (boundary === 'cleanup') adapters.rm = async () => { throw failure('EACCES'); };
    await assert.rejects(saveAppSecrets({ filePath, giphyApiKey: 'abcdefghijklmnopqrstuvwx', fs: adapters }));
    assert.equal(await fs.readFile(filePath, 'utf8'), original);
    if (boundary === 'future') await assert.rejects(loadAppSecrets({ filePath }), { code: 'UNSUPPORTED_SCHEMA' });
    // Queue remains usable after failure.
    if (!['future', 'backup'].includes(boundary)) {
      await saveAppSecrets({ filePath, giphyApiKey: 'abcdefghijklmnopqrstuvwx' });
      assert.equal((await loadAppSecrets({ filePath })).discordClientId, '1526867893508116620');
    }
  });
}

test('malformed non-UTF8 config recovery preserves exact original backup bytes', async t => {
  const f = await fixture(t);
  const bytes = Buffer.from([0x7b, 0xff, 0xfe, 0x7d]);
  await fs.writeFile(f.filePath, bytes);
  assert.equal((await f.store().load()).source, 'recovered');
  const backup = (await fs.readdir(f.directory)).find(name => name.includes('.corrupt-'));
  assert.deepEqual(await fs.readFile(join(f.directory, backup)), bytes);
});

test('malformed secrets recovery preserves exact original backup bytes', async t => {
  const f = await fixture(t);
  const filePath = join(f.directory, 'secrets.json');
  const bytes = Buffer.from([0x7b, 0xff, 0xfe, 0x7d]);
  await fs.writeFile(filePath, bytes);
  await saveAppSecrets({ filePath, discordClientId: '1526867893508116620' });
  const backup = (await fs.readdir(f.directory)).find(name => name.startsWith('secrets.json.corrupt-'));
  assert.deepEqual(await fs.readFile(join(f.directory, backup)), bytes);
  assert.equal((await loadAppSecrets({ filePath })).discordClientId, '1526867893508116620');
});

test('config temporary-file fsync failure preserves durable destination', async t => {
  const f = await fixture(t);
  const store = f.store({ open: async () => { throw failure('EIO'); } });
  await assert.rejects(store.save({ ...f.config, settings: { ...f.config.settings, scheduleEnabled: false } }), { code: 'EIO' });
  assert.equal(await fs.readFile(f.filePath, 'utf8'), f.original);
  assert.deepEqual(await fs.readdir(f.directory), ['config.json']);
});

test('owner fields retained in config store across failed and successful replacement', async t => {
  const f = await fixture(t);
  const seeded = { ...f.config, ownerExtension: { root: [null, true] }, settings: { ...f.config.settings, ownerExtension: { settings: 9 } }, scenes: f.config.scenes.map(scene => ({ ...scene, ownerExtension: { identity: scene.id } })), slots: [...f.config.slots].reverse().map(slot => ({ ...slot, ownerExtension: { identity: slot.id } })) };
  await fs.writeFile(f.filePath, JSON.stringify(seeded));
  let fail = true;
  const store = f.store({ rename: async (...args) => { if (fail) throw failure('EPERM'); return fs.rename(...args); } });
  const loaded = await store.load();
  const original = await fs.readFile(f.filePath, 'utf8');
  await assert.rejects(store.save({ ...loaded.config, settings: { ...loaded.config.settings, scheduleEnabled: false } }, { writeSlots: false }));
  assert.equal(await fs.readFile(f.filePath, 'utf8'), original);
  fail = false;
  await store.save({ ...loaded.config, settings: { ...loaded.config.settings, scheduleEnabled: false } }, { writeSlots: false });
  const disk = JSON.parse(await fs.readFile(f.filePath, 'utf8'));
  assert.deepEqual(disk.ownerExtension, seeded.ownerExtension);
  assert.deepEqual(disk.settings.ownerExtension, seeded.settings.ownerExtension);
  assert.deepEqual(disk.slots, seeded.slots);
  assert.deepEqual(disk.scenes[0].ownerExtension, seeded.scenes[0].ownerExtension);
});

test('owner fields in secrets metadata survive partial updates and clearGiphyApiKey', async t => {
  const f = await fixture(t);
  const filePath = join(f.directory, 'secrets.json');
  const metadata = { ownerExtension: { history: [null, false, { label: 'ไทย😀' }] }, migrationNote: 'retain exactly' };
  await fs.writeFile(filePath, JSON.stringify({ version: 1, discordClientId: '', giphyApiKey: '', ...metadata }));
  await saveAppSecrets({ filePath, clearGiphyApiKey: true });
  let disk = JSON.parse(await fs.readFile(filePath, 'utf8'));
  assert.deepEqual(disk.ownerExtension, metadata.ownerExtension);
  assert.equal(disk.migrationNote, metadata.migrationNote);
  await saveAppSecrets({ filePath, discordClientId: '1526867893508116620' });
  disk = JSON.parse(await fs.readFile(filePath, 'utf8'));
  assert.deepEqual(disk.ownerExtension, metadata.ownerExtension);
  assert.equal(disk.migrationNote, metadata.migrationNote);
  assert.equal(disk.giphyApiKey, '');
});

test('owner fields are retained by a direct store save before load', async t => {
  const f = await fixture(t);
  const raw = { ...f.config, ownerExtension: { direct: true }, scenes: f.config.scenes.map(scene => ({ ...scene, ownerExtension: { id: scene.id } })) };
  await fs.writeFile(f.filePath, JSON.stringify(raw));
  await f.store().save({ ...f.config, settings: { ...f.config.settings, scheduleEnabled: false } });
  const disk = JSON.parse(await fs.readFile(f.filePath, 'utf8'));
  assert.deepEqual(disk.ownerExtension, raw.ownerExtension);
  assert.deepEqual(disk.scenes[0].ownerExtension, raw.scenes[0].ownerExtension);
});
