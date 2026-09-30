// Builds Vibe Studio app icons from scratch (no external tools):
//   electron/assets/icon.png  (512, used by BrowserWindow / Linux)
//   electron/assets/icon.ico  (256/48/32/16 PNG-compressed entries, Windows)
//   electron/assets/icon.icns (1024..16 PNG entries, macOS)
//   electron/assets/tray.png  (44px white pulse on transparent, tray template)
// Design: Discord-blurple rounded square + warm-white pulse waveform,
// echoing the sidebar brand mark.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'assets');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexLerp(a, b, f) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * f));
}

// Pulse waveform polyline (unit space, y up positive around 0.5 baseline).
function pulsePoints() {
  const raw = [
    [0.16, 0.5], [0.30, 0.5], [0.335, 0.5], [0.365, 0.34], [0.40, 0.66],
    [0.435, 0.5], [0.52, 0.5], [0.55, 0.42], [0.58, 0.5], [0.84, 0.5],
  ];
  return raw.map(([x, y]) => [x, y]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let tt = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  tt = Math.max(0, Math.min(1, tt));
  const cx = ax + tt * dx;
  const cy = ay + tt * dy;
  return Math.hypot(px - cx, py - cy);
}

function render(size, { transparent = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const pts = pulsePoints();
  const stroke = size * 0.062;
  const radius = 0.225; // unit space (u/v are 0..1)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const i = (y * size + x) * 4;
      if (transparent) {
        let d = Infinity;
        for (let s = 0; s < pts.length - 1; s++) {
          d = Math.min(d, distToSegment(u, 1 - v, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]));
        }
        const a = d * size < stroke / 2 ? 255 : 0;
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
        rgba[i + 3] = a;
        continue;
      }
      // rounded-rect mask (SDF)
      const cx = Math.min(Math.max(u, radius), 1 - radius);
      const cy = Math.min(Math.max(v, radius), 1 - radius);
      if (Math.hypot(u - cx, v - cy) > radius) {
        rgba[i + 3] = 0;
        continue;
      }
      // vertical blurple gradient
      const [r, g, b] = hexLerp('#6E78F2', '#454FBF', v);
      let d = Infinity;
      for (let s = 0; s < pts.length - 1; s++) {
        d = Math.min(d, distToSegment(u, 1 - v, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]));
      }
      if (d * size < stroke / 2) {
        rgba[i] = 250; rgba[i + 1] = 248; rgba[i + 2] = 245; rgba[i + 3] = 255;
      } else {
        rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
      }
    }
  }
  return rgba;
}

function downscale(src, srcSize, dstSize) {
  const f = srcSize / dstSize;
  const out = Buffer.alloc(dstSize * dstSize * 4);
  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = Math.floor(y * f); sy < Math.floor((y + 1) * f); sy++) {
        for (let sx = Math.floor(x * f); sx < Math.floor((x + 1) * f); sx++) {
          const i = (sy * srcSize + sx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
        }
      }
      const o = (y * dstSize + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
    }
  }
  return out;
}

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

const base = render(1024);
const sizes = [1024, 512, 256, 128, 64, 48, 32, 16];
const pngs = new Map();
for (const s of sizes) {
  const rgba = s === 1024 ? base : downscale(base, 1024, s);
  pngs.set(s, encodePng(s, s, rgba));
}

writeFileSync(join(outDir, 'icon.png'), pngs.get(512));
writeFileSync(join(outDir, 'icon.ico'), buildIco([256, 48, 32, 16].map((s) => ({ size: s, data: pngs.get(s) }))));
writeFileSync(
  join(outDir, 'icon.icns'),
  buildIcns([
    { type: 'ic10', data: pngs.get(1024) },
    { type: 'ic09', data: pngs.get(512) },
    { type: 'ic08', data: pngs.get(256) },
    { type: 'ic07', data: pngs.get(128) },
    { type: 'ic05', data: pngs.get(32) },
    { type: 'ic04', data: pngs.get(16) },
  ])
);
const trayRgba = render(44, { transparent: true });
writeFileSync(join(outDir, 'tray.png'), encodePng(44, 44, trayRgba));

console.log('icons written to', outDir);
for (const f of ['icon.png', 'icon.ico', 'icon.icns', 'tray.png']) {
  const { statSync } = await import('node:fs');
  console.log(f, statSync(join(outDir, f)).size, 'bytes');
}
