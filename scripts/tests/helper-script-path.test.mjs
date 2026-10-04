import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { helperScriptPath, unpackedPath } from '../helper-script-path.mjs';

const packaged = 'C:\\Users\\u\\AppData\\Local\\Programs\\Vibe Studio\\resources\\app.asar\\scripts\\windows-apps.ps1';

test('packaged helper scripts resolve to app.asar.unpacked, source runs are unchanged', () => {
  assert.equal(unpackedPath(packaged), packaged.replace('\\app.asar\\', '\\app.asar.unpacked\\'));
  const base = pathToFileURL(packaged).href;
  assert.equal(helperScriptPath('installed-apps.ps1', base), packaged.replace('\\app.asar\\', '\\app.asar.unpacked\\').replace('windows-apps', 'installed-apps'));
  assert.equal(unpackedPath('C:\\repo\\scripts\\windows-apps.ps1'), 'C:\\repo\\scripts\\windows-apps.ps1');
  assert.equal(unpackedPath('C:\\x\\app.asar.unpacked\\scripts\\a.ps1'), 'C:\\x\\app.asar.unpacked\\scripts\\a.ps1');
  for (const name of ['windows-apps.ps1', 'installed-apps.ps1']) assert.ok(existsSync(helperScriptPath(name)), name);
});

test('every PowerShell helper is unpacked from the asar by electron-builder', () => {
  const build = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).build;
  assert.equal(build.asar, true);
  assert.deepEqual(build.asarUnpack, ['scripts/*.ps1']);
  const helpers = readdirSync(new URL('..', import.meta.url)).filter((name) => name.endsWith('.ps1'));
  assert.deepEqual(helpers.sort(), ['installed-apps.ps1', 'windows-apps.ps1']);
});
