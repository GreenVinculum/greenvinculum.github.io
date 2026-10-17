/**
 * Subsample the packed wireframe into a small JSON the page can draw immediately.
 * Usage: node scripts/extract-rough-mesh.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = path.join(root, "public/data/wireframe-mesh.pck.gz");
const outPath = path.join(root, "public/data/wireframe-mesh-rough.json");

const LAYOUT_KEYS = [
  "w", "h", "cx", "cy", "minX", "maxX", "minY", "maxY",
  "rx", "pivotX", "pivotY", "drawX", "drawY", "drawW", "drawH",
];

function subsample(buffer) {
  const view = new DataView(buffer);
  let off = 20;
  const pointCount = view.getUint32(off, true);
  off += 4;
  off += 4;
  const layout = {};
  for (const key of LAYOUT_KEYS) {
    layout[key] = view.getFloat32(off, true);
    off += 4;
  }

  const step = Math.max(1, Math.floor(pointCount / 1400));
  const xy = [];
  const lum = [];
  for (let i = 0; i < pointCount; i++) {
    const x = view.getUint16(off, true);
    const y = view.getUint16(off + 2, true);
    const edge = view.getUint8(off + 7) / 255;
    const feature = view.getUint8(off + 8) / 255;
    const brightness = view.getUint8(off + 6);
    off += 16;
    const keep = edge > 0.42 || feature > 0.34 || i % step === 0;
    if (!keep) continue;
    xy.push(x, y);
    lum.push(brightness);
    if (xy.length >= 7000) break;
  }

  return {
    v: 1,
    w: layout.w,
    h: layout.h,
    count: xy.length / 2,
    xy,
    lum,
  };
}

const packed = zlib.gunzipSync(fs.readFileSync(srcPath));
const rough = subsample(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength));
fs.writeFileSync(outPath, JSON.stringify(rough));
console.log(`wrote ${outPath} (${rough.count} points, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
