/**
 * Converts wireframe-mesh.json → wireframe-mesh.pck.gz (packed v3).
 * Run: npm run encode:wireframe-mesh
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "public/data/wireframe-mesh.json");
const pckPath = path.join(root, "public/data/wireframe-mesh.pck");
const gzPath = `${pckPath}.gz`;
const legacyBinPath = path.join(root, "public/data/wireframe-mesh.bin");

const WIREFRAME_MESH_VERSION = 5;
const PACK_MAGIC = 0x504d4657;
const PACK_FORMAT_VERSION = 3;

const maxEdgesArg = process.argv.find((a) => a.startsWith("--max-edges="));
const MAX_EDGES = maxEdgesArg ? Number(maxEdgesArg.split("=")[1]) : 70_000;

const ZONES = ["hat", "face", "shirt", "arm", "other"];
const zoneIndex = (z) => {
  const i = ZONES.indexOf(z || "other");
  return i >= 0 ? i : ZONES.length - 1;
};
const levelIndex = (l) => (l === "large" ? 2 : l === "medium" ? 1 : 0);
const u8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

if (!fs.existsSync(jsonPath)) {
  console.error("Missing", jsonPath);
  process.exit(1);
}

console.log("Reading JSON…");
const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const points = raw.pts.map((row) => ({
  baseX: row[0],
  baseY: row[1],
  lum: row[2],
  edge: row[3],
  feature: row[4],
  z: row[5],
  kind: row[6],
  strategic: !!row[7],
  keepScore: row[8],
  groupId: row[9],
  zone: row[10],
  level: row[11],
  depthJitter: row[12],
  sizeJitter: row[13],
  pulseOffset: row[14],
}));

const allEdges = [];
for (let i = 0; i < raw.nbrs.length; i++) {
  const pi = points[i];
  for (const [j, amb] of raw.nbrs[i]) {
    if (!Number.isInteger(j) || j < 0 || j >= points.length || j <= i) continue;
    const pj = points[j];
    const ambient = !!amb;
    const edgeMix = (pi.edge + pj.edge) * 0.5;
    const featureMix = (pi.feature + pj.feature) * 0.5;
    const zoneBoost =
      (pi.zone === "hat" || pj.zone === "hat" ? 0.35 : 0) +
      (pi.zone === "face" || pj.zone === "face" ? 0.25 : 0) +
      (pi.zone === "arm" || pj.zone === "arm" ? 0.15 : 0);
    const shirtPenalty = pi.zone === "shirt" && pj.zone === "shirt" ? -0.12 : 0;
    const priority =
      (ambient ? 0.08 : 0.42) +
      edgeMix * 0.38 +
      featureMix * 0.45 +
      zoneBoost +
      shirtPenalty +
      (pi.strategic || pj.strategic ? 0.12 : 0);
    allEdges.push({ i, j, priority });
  }
}
allEdges.sort((a, b) => b.priority - a.priority);
const edges = allEdges.slice(0, Math.min(MAX_EDGES, allEdges.length));

const layout = raw.layout || {};
const layoutKeys = [
  "w", "h", "cx", "cy", "minX", "maxX", "minY", "maxY",
  "rx", "pivotX", "pivotY", "drawX", "drawY", "drawW", "drawH",
];
const layoutVals = layoutKeys.map((k) => Number(layout[k]) || 0);

const headerBytes = 4 + 4 + 4 + 4 + 4 + layoutKeys.length * 4;
const pointBytes = points.length * 16;
const edgeBytes = edges.length * 4;
const total = headerBytes + pointBytes + edgeBytes;

const buf = new ArrayBuffer(total);
const view = new DataView(buf);
let off = 0;

view.setUint32(off, PACK_MAGIC, true); off += 4;
view.setUint32(off, PACK_FORMAT_VERSION, true); off += 4;
view.setUint32(off, WIREFRAME_MESH_VERSION, true); off += 4;
view.setUint32(off, points.length, true); off += 4;
view.setUint32(off, edges.length, true); off += 4;
for (const v of layoutVals) {
  view.setFloat32(off, v, true);
  off += 4;
}

for (let i = 0; i < points.length; i++) {
  const p = points[i];
  view.setUint16(off, Math.round(p.baseX), true); off += 2;
  view.setUint16(off, Math.round(p.baseY), true); off += 2;
  view.setInt16(off, Math.round(p.z * 10), true); off += 2;
  view.setUint8(off++, u8(p.lum));
  view.setUint8(off++, u8(p.edge));
  view.setUint8(off++, u8(p.feature));
  view.setUint8(off++, u8(p.depthJitter));
  view.setUint8(off++, u8(p.sizeJitter));
  view.setUint8(off++, u8(p.pulseOffset));
  view.setUint8(off++, p.kind === "ambient" ? 255 : 0);
  view.setUint8(off++, zoneIndex(p.zone));
  view.setUint8(off++, levelIndex(p.level) | (p.strategic ? 16 : 0));
  view.setUint8(off++, p.groupId & 0xff);
}

for (const e of edges) {
  view.setUint16(off, e.i, true); off += 2;
  view.setUint16(off, e.j, true); off += 2;
}

fs.writeFileSync(pckPath, Buffer.from(buf));
const gz = zlib.gzipSync(Buffer.from(buf), { level: 9 });
fs.writeFileSync(gzPath, gz);

const jsonMb = (fs.statSync(jsonPath).size / 1048576).toFixed(2);
const pckMb = (fs.statSync(pckPath).size / 1048576).toFixed(2);
const gzMb = (fs.statSync(gzPath).size / 1048576).toFixed(2);
console.log(`Wrote ${pckPath}`);
console.log(`Wrote ${gzPath}`);
console.log(`  points: ${points.length}, edges: ${edges.length} (dropped ${allEdges.length - edges.length})`);
console.log(`  size: ${jsonMb} MB JSON → ${pckMb} MB packed → ${gzMb} MB gzip`);
