// Builds Vibe Studio app icons from scratch (no external tools):
//   electron/assets/icon.png  (512, used by BrowserWindow / Linux)
//   electron/assets/icon.ico  (256/48/32/16 PNG-compressed entries, Windows)
//   electron/assets/icon.icns (1024..16 PNG entries, macOS)
//   electron/assets/tray.png  (44px white ghost on transparent, tray template)
// Design: Discord-blurple rounded square + white Rebel Ghost mascot,
// echoing the sidebar brand mark (electron/assets/logo-ghost.svg).
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

// ---------------------------------------------------------------------------
// Rebel Ghost logo (A2) — 64x64 unit space, mirrors logo-ghost.svg.
// ---------------------------------------------------------------------------
const GHOST_BODY = 'M32 10C21 10 14 20 14 31V44l9-6 9 6 9-6 9 6V31C50 20 43 10 32 10Z';
const GHOST_FILL_CUTS = [
  'M22 27l8 1.5-1.5 7-8-1.5Z', // left eye
  'M30.5 13l4.5 0-2.5 5.5 4 0-6.5 8.5 2-6-4 0Z', // forehead bolt
];
const GHOST_STROKE_CUTS = [
  { d: 'M39 30Q43 33.5 47 29.5', w: 3 }, // winking right eye
  { d: 'M25 38.5Q32.5 44 40 37', w: 3 }, // smirk
];

// Minimal SVG path parser: M/m L/l H/h V/v C/c Q/q Z/z (single subpath each).
function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcQqZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const subpaths = [];
  let cur = null;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let i = 0, cmd = null;
  const num = () => parseFloat(tokens[i++]);
  const lineTo = (x, y) => { cx = x; cy = y; cur.push(['L', x, y]); };
  while (i < tokens.length) {
    if (/[MmLlHhVvCcQqZz]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M': cx = num(); cy = num(); sx = cx; sy = cy; cur = [['M', cx, cy]]; subpaths.push(cur); cmd = 'L'; break;
      case 'm': cx += num(); cy += num(); sx = cx; sy = cy; cur = [['M', cx, cy]]; subpaths.push(cur); cmd = 'l'; break;
      case 'L': lineTo(num(), num()); break;
      case 'l': lineTo(cx + num(), cy + num()); break;
      case 'H': lineTo(num(), cy); break;
      case 'h': lineTo(cx + num(), cy); break;
      case 'V': lineTo(cx, num()); break;
      case 'v': lineTo(cx, cy + num()); break;
      case 'C': { const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num(); cur.push(['C', x1, y1, x2, y2, x, y]); cx = x; cy = y; break; }
      case 'c': { const x1 = cx + num(), y1 = cy + num(), x2 = cx + num(), y2 = cy + num(), x = cx + num(), y = cy + num(); cur.push(['C', x1, y1, x2, y2, x, y]); cx = x; cy = y; break; }
      case 'Q': { const x1 = num(), y1 = num(), x = num(), y = num(); cur.push(['Q', x1, y1, x, y]); cx = x; cy = y; break; }
      case 'q': { const x1 = cx + num(), y1 = cy + num(), x = cx + num(), y = cy + num(); cur.push(['Q', x1, y1, x, y]); cx = x; cy = y; break; }
      case 'Z': case 'z': cur.push(['Z']); cx = sx; cy = sy; break;
      default: throw new Error('unsupported path token near ' + tokens[i]);
    }
  }
  return subpaths;
}

function flattenSubpath(ops) {
  const pts = [];
  let cx = 0, cy = 0;
  for (const op of ops) {
    if (op[0] === 'M' || op[0] === 'L') { cx = op[1]; cy = op[2]; pts.push([cx, cy]); }
    else if (op[0] === 'Q') {
      const [, x1, y1, x, y] = op, N = 16;
      for (let k = 1; k <= N; k++) {
        const t = k / N, mt = 1 - t;
        pts.push([mt * mt * cx + 2 * mt * t * x1 + t * t * x, mt * mt * cy + 2 * mt * t * y1 + t * t * y]);
      }
      cx = x; cy = y;
    } else if (op[0] === 'C') {
      const [, x1, y1, x2, y2, x, y] = op, N = 24;
      for (let k = 1; k <= N; k++) {
        const t = k / N, mt = 1 - t;
        pts.push([
          mt * mt * mt * cx + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x,
          mt * mt * mt * cy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y,
        ]);
      }
      cx = x; cy = y;
    }
  }
  return pts;
}

const BODY_PTS = flattenSubpath(parsePath(GHOST_BODY)[0]);
const FILL_CUT_PTS = GHOST_FILL_CUTS.map((d) => flattenSubpath(parsePath(d)[0]));
const STROKE_CUT_PTS = GHOST_STROKE_CUTS.map((s) => ({ pts: flattenSubpath(parsePath(s.d)[0]), w: s.w }));
const GHOST_BBOX = BODY_PTS.reduce(
  (b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)],
  [Infinity, Infinity, -Infinity, -Infinity]
);

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
    const [xi, yi] = pts[a], [xj, yj] = pts[b];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
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

function distToPoly(px, py, pts) {
  let d = Infinity;
  for (let s = 0; s < pts.length - 1; s++) {
    d = Math.min(d, distToSegment(px, py, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]));
  }
  return d;
}

// Ghost coverage at a point in 64-unit space (0 or 1).
function ghostAt(gx, gy) {
  if (gx < GHOST_BBOX[0] || gx > GHOST_BBOX[2] || gy < GHOST_BBOX[1] || gy > GHOST_BBOX[3]) return 0;
  if (!pointInPoly(gx, gy, BODY_PTS)) return 0;
  for (const p of FILL_CUT_PTS) if (pointInPoly(gx, gy, p)) return 0;
  for (const s of STROKE_CUT_PTS) if (distToPoly(gx, gy, s.pts) < s.w / 2) return 0;
  return 1;
}

// 2x2 supersampled coverage for a pixel; go/gs map pixels -> 64-unit space.
function ghostAA(x, y, go, gs) {
  const k = 64 / gs;
  let cov = 0;
  for (const [ox, oy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    cov += ghostAt((x + 0.5 + ox - go) * k, (y + 0.5 + oy - go) * k);
  }
  return cov / 4;
}

// ---------------------------------------------------------------------------
function render(size, { transparent = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = 0.225; // unit space (u/v are 0..1)
  const gs = size * (transparent ? 0.88 : 0.68); // ghost pixel size
  const go = (size - gs) / 2; // ghost offset
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const i = (y * size + x) * 4;
      if (transparent) {
        const cov = ghostAA(x, y, go, gs);
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
        rgba[i + 3] = Math.round(cov * 255);
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
      const cov = ghostAA(x, y, go, gs);
      if (cov > 0) {
        rgba[i] = Math.round(r * (1 - cov) + 250 * cov);
        rgba[i + 1] = Math.round(g * (1 - cov) + 248 * cov);
        rgba[i + 2] = Math.round(b * (1 - cov) + 245 * cov);
      } else {
        rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b;
      }
      rgba[i + 3] = 255;
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
