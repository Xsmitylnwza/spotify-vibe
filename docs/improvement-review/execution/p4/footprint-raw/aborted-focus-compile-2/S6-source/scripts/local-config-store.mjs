import * as filesystem from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { overlayConfigDocument } from './presence-config.mjs';

export function assertSupportedVersion(value, latest) {
  if (value?.version !== undefined && (!Number.isInteger(value.version) || value.version < 1 || value.version > latest)) {
    throw Object.assign(new Error('Unsupported storage schema version.'), { code: 'UNSUPPORTED_SCHEMA', statusCode: 400 });
  }
}

async function syncFile(filePath, fs) {
  const handle = await fs.open(filePath, 'r+');
  try { await handle.sync(); }
  finally { await handle.close(); }
}

// A failed replacement must leave the destination intact, including on Windows.
export async function atomicWriteJson(filePath, value, { fs = filesystem, mode } = {}) {
  const temporaryPath = filePath + '.tmp-' + process.pid + '-' + randomUUID();
  await fs.mkdir(dirname(filePath), { recursive: true });
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', ...(mode === undefined ? {} : { mode }) });
    await syncFile(temporaryPath, fs);
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export async function verifiedBackup(filePath, raw, fs = filesystem, suffix = 'corrupt') {
  const backupPath = filePath + '.' + suffix + '-' + randomUUID();
  await fs.writeFile(backupPath, raw, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await syncFile(backupPath, fs);
  if (!Buffer.from(await fs.readFile(backupPath)).equals(Buffer.from(raw))) {
    throw Object.assign(new Error('Storage backup verification failed.'), { code: 'BACKUP_FAILED' });
  }
  return backupPath;
}

export function createConfigStore({ filePath, createDefault, validate, fs = filesystem }) {
  let writeChain = Promise.resolve();
  let committedDocument;

  function enqueueSave(normalized, writeSlots, baseDocument) {
    const operation = writeChain.then(async () => {
      let previous = baseDocument ?? committedDocument;
      if (previous === undefined) {
        let bytes;
        try { bytes = await fs.readFile(filePath); }
        catch (error) { if (error?.code !== 'ENOENT') throw error; }
        if (bytes !== undefined) {
          previous = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
          assertSupportedVersion(previous, 2);
          validate(previous); // Refuse unreadable/invalid existing data rather than overwriting it.
        }
      }
      const candidate = overlayConfigDocument(previous, normalized, { writeSlots });
      await atomicWriteJson(filePath, candidate, { fs });
      committedDocument = candidate;
    });
    writeChain = operation.catch(() => undefined);
    return operation.then(() => normalized);
  }

  function save(value, { writeSlots = true } = {}) {
    assertSupportedVersion(value, 2);
    return enqueueSave(validate(value), writeSlots);
  }

  async function load() {
    let raw;
    try {
      raw = await fs.readFile(filePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const config = validate(createDefault());
      await save(config);
      return { config, source: 'created', warning: null };
    }
    let parsed;
    let normalized;
    try {
      parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
      assertSupportedVersion(parsed, 2);
      normalized = validate(parsed);
    } catch (error) {
      if (error?.code === 'UNSUPPORTED_SCHEMA') throw error;
      const backupPath = await verifiedBackup(filePath, raw, fs);
      const config = validate(createDefault());
      await enqueueSave(config, true, {});
      return { config, source: 'recovered', warning: 'Configuration was invalid and has been reset. A backup was saved to ' + backupPath + '.' };
    }
    if (parsed.version === 1 && normalized.version === 2) {
      const backupPath = filePath + '.v1-backup';
      try {
        await fs.writeFile(backupPath, raw, { encoding: 'utf8', flag: 'wx' });
        await syncFile(backupPath, fs);
        if (!Buffer.from(await fs.readFile(backupPath)).equals(Buffer.from(raw))) throw new Error('Configuration migration backup verification failed.');
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
        // An older backup is not proof that the current representation is safe.
        if (!Buffer.from(await fs.readFile(backupPath)).equals(Buffer.from(raw))) await verifiedBackup(filePath, raw, fs, 'v1-backup');
      }
    }
    committedDocument = parsed;
    return { config: normalized, source: 'disk', warning: null };
  }

  return { filePath, load, save };
}
