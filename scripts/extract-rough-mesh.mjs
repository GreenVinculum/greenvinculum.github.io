/**
 * Bake face-following strokes from the packed wireframe mesh.
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
const MAX_SPARKS = 10000;

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const ax = points[0][0];
  const ay = points[0][1];
  const bx = points[points.length - 1][0];
  const by = points[points.length - 1][1];
  const abx = bx - ax;
  const aby = by - ay;
  const abLen = abx * abx + aby * aby || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const t = Math.max(0, Math.min(1, ((points[i][0] - ax) * abx + (points[i][1] - ay) * aby) / abLen));
    const dx = points[i][0] - (ax + abx * t);
    const dy = points[i][1] - (ay + aby * t);
    const dist = dx * dx + dy * dy;
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon * epsilon) {
    return simplify(points.slice(0, index + 1), epsilon).slice(0, -1).concat(simplify(points.slice(index), epsilon));
  }
  return [points[0], points[points.length - 1]];
}

function subsample(buffer) {
  const view = new DataView(buffer);
  let off = 12;
  const pointCount = view.getUint32(off, true);
  off += 4;
  const edgeCount = view.getUint32(off, true);
  off += 4;
  const layout = {};
  for (const key of LAYOUT_KEYS) {
    layout[key] = view.getFloat32(off, true);
    off += 4;
  }

  const xs = new Uint16Array(pointCount);
  const ys = new Uint16Array(pointCount);
  const lums = new Uint8Array(pointCount);
  for (let i = 0; i < pointCount; i++) {
    xs[i] = view.getUint16(off, true);
    ys[i] = view.getUint16(off + 2, true);
    lums[i] = view.getUint8(off + 6);
    off += 16;
  }

  const edgeOff = off;
  const adj = Array.from({ length: pointCount }, () => []);
  for (let e = 0; e < edgeCount; e++) {
    const i = view.getUint16(edgeOff + e * 4, true);
    const j = view.getUint16(edgeOff + e * 4 + 2, true);
    adj[i].push(j, e);
    adj[j].push(i, e);
  }

  const used = new Uint8Array(edgeCount);
  const walk = (prev, cur, edge) => {
    const pts = [cur];
    let guard = 0;
    while (guard++ < 600) {
      used[edge] = 1;
      const vx = xs[cur] - xs[prev];
      const vy = ys[cur] - ys[prev];
      const vl = Math.hypot(vx, vy) || 1;
      let best = null;
      let bestCos = 0.62;
      const list = adj[cur];
      for (let k = 0; k < list.length; k += 2) {
        const nextEdge = list[k + 1];
        if (used[nextEdge]) continue;
        const next = list[k];
        const wx = xs[next] - xs[cur];
        const wy = ys[next] - ys[cur];
        const wl = Math.hypot(wx, wy) || 1;
        const cos = (vx * wx + vy * wy) / (vl * wl);
        if (cos > bestCos) {
          bestCos = cos;
          best = { next, nextEdge };
        }
      }
      if (!best) break;
      prev = cur;
      cur = best.next;
      edge = best.nextEdge;
      pts.push(cur);
    }
    return pts;
  };

  const lines = [];
  let pathCount = 0;
  for (let e = 0; e < edgeCount; e++) {
    if (used[e]) continue;
    const i = view.getUint16(edgeOff + e * 4, true);
    const j = view.getUint16(edgeOff + e * 4 + 2, true);
    const forward = walk(i, j, e);
    const backward = walk(j, i, e);
    const seq = backward.reverse().concat(forward);
    if (seq.length < 2) continue;
    let length = 0;
    const points = seq.map((index) => [xs[index], ys[index]]);
    for (let k = 1; k < points.length; k++) {
      length += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
    }
    const mid = points[points.length >> 1];
    const bust =
      mid[0] > layout.w * 0.16 &&
      mid[0] < layout.w * 0.84 &&
      mid[1] > layout.h * 0.03 &&
      mid[1] < layout.h * 0.97;
    if (bust ? length < 0.7 : length < 2.4) continue;
    const simplified = simplify(points, bust ? 0.04 : 0.4);
    let added = false;
    for (let k = 1; k < simplified.length; k++) {
      const x1 = Math.round(simplified[k - 1][0]);
      const y1 = Math.round(simplified[k - 1][1]);
      const x2 = Math.round(simplified[k][0]);
      const y2 = Math.round(simplified[k][1]);
      if (x1 === x2 && y1 === y2) continue;
      if (Math.hypot(x2 - x1, y2 - y1) > 26) continue;
      const mx = (x1 + x2) * 0.5;
      const my = (y1 + y2) * 0.5;
      if (mx < layout.w * 0.16 || mx > layout.w * 0.84 || my < layout.h * 0.03 || my > layout.h * 0.97) continue;
      lines.push(x1, y1, x2, y2);
      added = true;
    }
    if (added) pathCount += 1;
  }

  const seen = new Set();
  for (let i = 0; i < lines.length; i += 4) {
    const a = `${lines[i]},${lines[i + 1]}`;
    const b = `${lines[i + 2]},${lines[i + 3]}`;
    seen.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }
  const cell = 8;
  const grid = new Map();
  const bustPoint = (x, y) =>
    x > layout.w * 0.16 && x < layout.w * 0.84 && y > layout.h * 0.03 && y < layout.h * 0.97;
  for (let i = 0; i < pointCount; i++) {
    if (!bustPoint(xs[i], ys[i])) continue;
    const key = `${xs[i] / cell | 0},${ys[i] / cell | 0}`;
    const list = grid.get(key);
    if (list) list.push(i);
    else grid.set(key, [i]);
  }
  let addedLinks = 0;
  const addLink = (i, j) => {
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[j];
    const y2 = ys[j];
    if (Math.hypot(x2 - x1, y2 - y1) > 12) return false;
    const a = `${x1},${y1}`;
    const b = `${x2},${y2}`;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    lines.push(x1, y1, x2, y2);
    addedLinks += 1;
    return true;
  };
  for (let i = 0; i < pointCount && addedLinks < 22000; i++) {
    if (!bustPoint(xs[i], ys[i])) continue;
    const cx = xs[i] / cell | 0;
    const cy = ys[i] / cell | 0;
    const near = [];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const list = grid.get(`${cx + ox},${cy + oy}`);
        if (!list) continue;
        for (const j of list) {
          if (j === i) continue;
          const dist = Math.hypot(xs[j] - xs[i], ys[j] - ys[i]);
          if (dist < 2.2 || dist > 9) continue;
          near.push({ j, dist });
        }
      }
    }
    near.sort((a, b) => a.dist - b.dist);
    const chosen = [];
    for (let n = 0; n < near.length && chosen.length < 2 && addedLinks < 22000; n++) {
      const j = near[n].j;
      if (addLink(i, j)) chosen.push(j);
    }
    if (chosen.length === 2 && addedLinks < 22000) addLink(chosen[0], chosen[1]);
  }

  const bustIds = [];
  for (let i = 0; i < pointCount; i++) {
    if (bustPoint(xs[i], ys[i])) bustIds.push(i);
  }
  const sparks = [];
  const sparkStep = Math.max(1, Math.floor(bustIds.length / MAX_SPARKS));
  for (let n = 0; n < bustIds.length && sparks.length < MAX_SPARKS * 3; n += sparkStep) {
    const i = bustIds[n];
    sparks.push(xs[i], ys[i], lums[i]);
  }

  return {
    v: 11,
    w: layout.w,
    h: layout.h,
    lines,
    sparks,
    lineCount: lines.length / 4,
    pathCount,
    sparkCount: sparks.length / 3,
    bustLinks: addedLinks,
  };
}

const packed = zlib.gunzipSync(fs.readFileSync(srcPath));
const rough = subsample(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength));
const nav = {
  v: 12,
  w: rough.w,
  h: rough.h,
  sparks: rough.sparks.map((n) => Math.round(n * 10) / 10),
  sparkCount: rough.sparkCount,
};
fs.writeFileSync(outPath, JSON.stringify(nav));
console.log(
  `wrote ${outPath} (${nav.sparkCount} navigation points, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`
);
