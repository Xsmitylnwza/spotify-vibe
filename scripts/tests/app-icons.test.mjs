import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve('scripts', '..');
const asset = (f) => readFileSync(resolve(root, 'electron/assets', f));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

test('icon.ico holds crisp PNG entries for 16..256', () => {
  const ico = asset('icon.ico');
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = [];
  for (let i = 0; i < ico.readUInt16LE(4); i++) sizes.push(ico[6 + i * 16] || 256);
  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 24, 32, 48, 64, 256]);
});

test('icon.png is 512 and tray.png is a 44px PNG with alpha', () => {
  const png = asset('icon.png');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [512, 512]);
  const tray = asset('tray.png');
  assert.deepEqual([tray.readUInt32BE(16), tray.readUInt32BE(20), tray[25]], [44, 44, 6]);
});

test('NSIS installer/uninstaller and win icons use electron/assets/icon.ico', () => {
  assert.equal(pkg.build.win.icon, 'electron/assets/icon.ico');
  assert.equal(pkg.build.nsis.installerIcon, 'electron/assets/icon.ico');
  assert.equal(pkg.build.nsis.uninstallerIcon, 'electron/assets/icon.ico');
});

test('Studio HTML uses the new ghost mark once, not the old Rebel Ghost', () => {
  const html = readFileSync(resolve(root, 'scripts/discord-presence-studio.html'), 'utf8');
  assert.equal(html.split('vs-ghost-mask\\"').length - 1, 1, 'mask id defined once');
  assert.ok(html.includes('url(#vs-ghost-mask)'));
  assert.ok(!html.includes('M32 10C21 10 14 20'), 'old Rebel Ghost path gone');
});
