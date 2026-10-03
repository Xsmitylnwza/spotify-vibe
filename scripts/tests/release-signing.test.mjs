import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applySignedInstaller } from '../../electron/release-signing.mjs';
import { verifyUpdaterFeed } from '../../electron/release-artifacts.mjs';

const require = createRequire(import.meta.url);
const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap');
const version = '1.0.7';
const installer = `Vibe-Studio-Setup-${version}.exe`;
const sha512 = (bytes) => createHash('sha512').update(bytes).digest('base64');

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'vibe-sign-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const signedDirectory = join(directory, 'signed');
  mkdirSync(signedDirectory);
  const unsigned = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200_000, 7)]);
  writeFileSync(join(directory, installer), unsigned);
  writeFileSync(join(directory, `${installer}.blockmap`), 'stale');
  writeFileSync(join(directory, 'latest.yml'), `version: ${version}\nfiles:\n  - url: ${installer}\n    sha512: ${sha512(unsigned)}\n    size: ${unsigned.length}\npath: ${installer}\nsha512: ${sha512(unsigned)}\nreleaseDate: '2026-10-03T00:00:00.000Z'\n`);
  return { directory, signedDirectory, unsigned };
}

test('signed installer replaces the build and the feed and blockmap describe the signed bytes', async (t) => {
  const { directory, signedDirectory, unsigned } = fixture(t);
  const signed = Buffer.concat([unsigned, Buffer.from('authenticode-signature-table')]);
  writeFileSync(join(signedDirectory, installer), signed);
  await applySignedInstaller({ directory, signedDirectory, version, buildBlockMap });
  assert.ok(readFileSync(join(directory, installer)).equals(signed));
  verifyUpdaterFeed(readFileSync(join(directory, 'latest.yml'), 'utf8'), version, installer, signed);
  assert.match(readFileSync(join(directory, 'latest.yml'), 'utf8'), /releaseDate: '2026-10-03T00:00:00.000Z'/);
  assert.notEqual(readFileSync(join(directory, `${installer}.blockmap`), 'utf8'), 'stale');
});

test('signing output that is unchanged, renamed or extra is rejected before touching the build', async (t) => {
  const { directory, signedDirectory, unsigned } = fixture(t);
  writeFileSync(join(signedDirectory, installer), unsigned);
  await assert.rejects(applySignedInstaller({ directory, signedDirectory, version, buildBlockMap }), /identical/);
  writeFileSync(join(signedDirectory, 'other.exe'), unsigned);
  await assert.rejects(applySignedInstaller({ directory, signedDirectory, version, buildBlockMap }), /exactly/);
  assert.match(readFileSync(join(directory, `${installer}.blockmap`), 'utf8'), /stale/);
});
