import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function createConfigStore({ filePath, createDefault, validate }) {
  let writeChain = Promise.resolve();

  async function atomicWrite(value) {
    const directory = dirname(filePath);
    const temporaryPath = filePath + '.tmp-' + process.pid;
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, JSON.stringify(value, null, 2) + '\n', 'utf8');
    try {
      await rename(temporaryPath, filePath);
    } catch (error) {
      if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error;
      await rm(filePath, { force: true });
      await rename(temporaryPath, filePath);
    }
  }

  function save(value) {
    const normalized = validate(value);
    writeChain = writeChain.then(() => atomicWrite(normalized));
    return writeChain.then(() => normalized);
  }

  async function load() {
    try {
      const raw = await readFile(filePath, 'utf8');
      return { config: validate(JSON.parse(raw)), source: 'disk', warning: null };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        const config = validate(createDefault());
        await save(config);
        return { config, source: 'created', warning: null };
      }

      const config = validate(createDefault());
      let backupPath = null;
      try {
        await access(filePath);
        backupPath = filePath + '.corrupt-' + timestampForFile();
        await rename(filePath, backupPath);
      } catch {
        backupPath = null;
      }
      await save(config);
      return {
        config,
        source: 'recovered',
        warning: 'Configuration was invalid and has been reset.'
          + (backupPath ? ' A backup was saved to ' + backupPath + '.' : ''),
      };
    }
  }

  return {
    filePath,
    load,
    save,
  };
}
