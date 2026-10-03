// Builds Vibe Studio app icons from the committed source PNGs (no external tools):
//   electron/assets/icon.png  (512, used by BrowserWindow / Linux)
//   electron/assets/icon.ico  (256/64/48/32/24/16 PNG-compressed entries, Windows)
//   electron/assets/icon.icns (1024..16 PNG entries, macOS)
//   electron/assets/tray.png  (44px white ghost on transparent, tray template)
// Sources: electron/assets/src/ghost-09-<size>.png and ghost-09-tray-<size>.png,
// rasterized from the approved 'Swooping ghost' SVGs (src/ghost-09*.svg are the
// masters; logo-ghost.svg is the mono mark). Each size is rasterized separately so small sizes stay crisp.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'assets');
const srcDir = join(outDir, 'src');
mkdirSync(outDir, { recursive: true });

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function loadPng(name, size) {
  const data = readFileSync(join(srcDir, name));
  if (!data.subarray(0, 8).equals(PNG_SIG) || data.readUInt32BE(16) !== size || data.readUInt32BE(20) !== size) {
    throw new Error(name + ' is not a ' + size + 'x' + size + ' PNG');
  }
  return data;
}

const icon = new Map([1024, 512, 256, 128, 64, 48, 32, 24, 16].map((s) => [s, loadPng('ghost-09-' + s + '.png', s)]));

function buildIco(pngs) {
  // pngs: [{ size, data }]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    e[0] = p.size >= 256 ? 0 : p.size;
    e[1] = p.size >= 256 ? 0 : p.size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(p.data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += p.data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

function buildIcns(entries) {
  // entries: [{ type: 'ic07', data }]
  const parts = [];
  let total = 8;
  for (const e of entries) {
    const head = Buffer.alloc(8);
    head.write(e.type, 0, 4, 'ascii');
    head.writeUInt32BE(8 + e.data.length, 4);
    parts.push(head, e.data);
    total += 8 + e.data.length;
  }
  const magic = Buffer.alloc(8);
  magic.write('icns', 0, 4, 'ascii');
  magic.writeUInt32BE(total, 4);
  return Buffer.concat([magic, ...parts]);
}


writeFileSync(join(outDir, 'icon.png'), icon.get(512));
writeFileSync(join(outDir, 'icon.ico'), buildIco([256, 64, 48, 32, 24, 16].map((s) => ({ size: s, data: icon.get(s) }))));
writeFileSync(
  join(outDir, 'icon.icns'),
  buildIcns([
    { type: 'ic10', data: icon.get(1024) },
    { type: 'ic09', data: icon.get(512) },
    { type: 'ic08', data: icon.get(256) },
    { type: 'ic07', data: icon.get(128) },
    { type: 'ic05', data: icon.get(32) },
    { type: 'ic04', data: icon.get(16) },
  ])
);
writeFileSync(join(outDir, 'tray.png'), loadPng('ghost-09-tray-44.png', 44));

console.log('icons written to', outDir);
for (const f of ['icon.png', 'icon.ico', 'icon.icns', 'tray.png']) {
  console.log(f, statSync(join(outDir, f)).size, 'bytes');
}
