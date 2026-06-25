/** Packed wireframe mesh (WFMP v3) — 16 B/point, 4 B/edge. */

import { parseBinaryMesh } from "./mesh-binary";

export const PACK_MAGIC = 0x504d4657;
export const PACK_FORMAT_VERSION = 3;
export const WIREFRAME_MESH_VERSION = 5;
export const POINT_FLOATS = 16;

const LAYOUT_KEYS = [
  "w", "h", "cx", "cy", "minX", "maxX", "minY", "maxY",
  "rx", "pivotX", "pivotY", "drawX", "drawY", "drawW", "drawH",
] as const;

export type WireframeLayout = Record<(typeof LAYOUT_KEYS)[number], number>;

export type ParsedBinaryMesh = {
  layout: WireframeLayout;
  pointCount: number;
  edgeCount: number;
  pointData: Float32Array;
  edgeIndices: Uint16Array;
  edgeAmbient: Uint8Array;
};

export type GpuMeshBuffers = {
  layout: WireframeLayout;
  pointCount: number;
  drawCount: number;
  texData: Float32Array;
  texW: number;
  texH: number;
  pointIndices: Float32Array;
  depthCloudIndices: Float32Array;
  depthCloudCount: number;
};

const POINT_BYTES = 16;

export function isPackedMesh(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 8) return false;
  return new DataView(buffer).getUint32(0, true) === PACK_MAGIC;
}

export function parsePackedMesh(buffer: ArrayBuffer): ParsedBinaryMesh {
  const view = new DataView(buffer);
  let off = 0;

  const magic = view.getUint32(off, true);
  off += 4;
  if (magic !== PACK_MAGIC) throw new Error("Invalid packed wireframe mesh");

  const formatVersion = view.getUint32(off, true);
  off += 4;
  if (formatVersion !== PACK_FORMAT_VERSION) {
    throw new Error(`Unsupported pack format v${formatVersion}`);
  }

  const meshVersion = view.getUint32(off, true);
  off += 4;
  if (meshVersion !== WIREFRAME_MESH_VERSION) {
    throw new Error(`Mesh version mismatch (v${meshVersion})`);
  }

  const pointCount = view.getUint32(off, true);
  off += 4;
  const edgeCount = view.getUint32(off, true);
  off += 4;

  const layout = {} as WireframeLayout;
  for (const key of LAYOUT_KEYS) {
    layout[key] = view.getFloat32(off, true);
    off += 4;
  }

  const pointData = new Float32Array(pointCount * POINT_FLOATS);
  for (let i = 0; i < pointCount; i++) {
    const x = view.getUint16(off, true);
    off += 2;
    const y = view.getUint16(off, true);
    off += 2;
    const z = view.getInt16(off, true) / 10;
    off += 2;
    const lum = view.getUint8(off++) / 255;
    const edge = view.getUint8(off++) / 255;
    const feature = view.getUint8(off++) / 255;
    const depthJitter = view.getUint8(off++) / 255;
    const sizeJitter = Math.max(0.5, view.getUint8(off++) / 255);
    const pulseOffset = view.getUint8(off++) / 255;
    const kind = view.getUint8(off++) > 0 ? 1 : 0;
    const zone = view.getUint8(off++);
    const levelFlags = view.getUint8(off++);
    const groupByte = view.getUint8(off++);

    const o = i * POINT_FLOATS;
    pointData[o] = x;
    pointData[o + 1] = y;
    pointData[o + 2] = z;
    pointData[o + 3] = lum;
    pointData[o + 4] = edge;
    pointData[o + 5] = feature;
    pointData[o + 6] = depthJitter;
    pointData[o + 7] = sizeJitter;
    pointData[o + 8] = pulseOffset;
    pointData[o + 9] = 0;
    pointData[o + 10] = 0;
    pointData[o + 11] = 0;
    pointData[o + 12] = 0;
    pointData[o + 13] = kind;
    pointData[o + 14] = zone;
    pointData[o + 15] = levelFlags | (groupByte << 8);
  }

  const edgeIndices = new Uint16Array(edgeCount * 2);
  const edgeAmbient = new Uint8Array(edgeCount);
  for (let e = 0; e < edgeCount; e++) {
    edgeIndices[e * 2] = view.getUint16(off, true);
    off += 2;
    edgeIndices[e * 2 + 1] = view.getUint16(off, true);
    off += 2;
    edgeAmbient[e] = 0;
  }

  return { layout, pointCount, edgeCount, pointData, edgeIndices, edgeAmbient };
}

/** CPU-side GPU buffer build — adds edge midpoints for single-Points line look. */
export function buildGpuMeshBuffers(mesh: ParsedBinaryMesh): GpuMeshBuffers {
  const { pointCount, edgeCount, pointData, edgeIndices, layout } = mesh;
  const MID_FLAG = 128;
  const drawCount = pointCount + edgeCount;
  const texW = 256;
  const texH = Math.ceil((drawCount * 4) / texW);
  const expanded = new Float32Array(drawCount * POINT_FLOATS);

  expanded.set(pointData.subarray(0, pointCount * POINT_FLOATS));

  for (let e = 0; e < edgeCount; e++) {
    const i = edgeIndices[e * 2];
    const j = edgeIndices[e * 2 + 1];
    const si = i * POINT_FLOATS;
    const sj = j * POINT_FLOATS;
    const o = (pointCount + e) * POINT_FLOATS;
    expanded[o] = (pointData[si] + pointData[sj]) * 0.5;
    expanded[o + 1] = (pointData[si + 1] + pointData[sj + 1]) * 0.5;
    expanded[o + 2] = (pointData[si + 2] + pointData[sj + 2]) * 0.5;
    expanded[o + 3] = (pointData[si + 3] + pointData[sj + 3]) * 0.5;
    expanded[o + 4] = Math.max(pointData[si + 4], pointData[sj + 4]) * 1.08;
    expanded[o + 5] = Math.max(pointData[si + 5], pointData[sj + 5]);
    expanded[o + 6] = (pointData[si + 6] + pointData[sj + 6]) * 0.5;
    expanded[o + 7] = (pointData[si + 7] + pointData[sj + 7]) * 0.5;
    expanded[o + 8] = (pointData[si + 8] + pointData[sj + 8]) * 0.5;
    expanded[o + 13] = 0;
    expanded[o + 14] = pointData[si + 14];
    expanded[o + 15] = (pointData[si + 15] & 15) | MID_FLAG;
  }

  const texData = new Float32Array(texW * texH * 4);
  for (let i = 0; i < drawCount; i++) {
    const src = i * POINT_FLOATS;
    for (let row = 0; row < 4; row++) {
      const linear = i * 4 + row;
      const dst = linear * 4;
      texData[dst] = expanded[src + row * 4];
      texData[dst + 1] = expanded[src + row * 4 + 1];
      texData[dst + 2] = expanded[src + row * 4 + 2];
      texData[dst + 3] = expanded[src + row * 4 + 3];
    }
  }

  const pointIndices = new Float32Array(drawCount);
  for (let i = 0; i < drawCount; i++) pointIndices[i] = i;

  const depthCloudIndices = buildDepthCloudIndices(expanded, pointCount);

  return {
    layout,
    pointCount,
    drawCount,
    texData,
    texW,
    texH,
    pointIndices,
    depthCloudIndices: depthCloudIndices.indices,
    depthCloudCount: depthCloudIndices.count,
  };
}

/** Sparse back-layer indices: ambient + low-detail structure for volume (no edge midpoints). */
function buildDepthCloudIndices(
  expanded: Float32Array,
  pointCount: number
): { indices: Float32Array; count: number } {
  const list: number[] = [];
  for (let i = 0; i < pointCount; i++) {
    const o = i * POINT_FLOATS;
    const kind = expanded[o + 13];
    const feature = expanded[o + 5];
    if (kind > 0.5) {
      list.push(i);
    } else if (i % 4 === 0 && feature < 0.42) {
      list.push(i);
    }
  }
  return { indices: new Float32Array(list), count: list.length };
}

export function parseMeshBuffer(buffer: ArrayBuffer): ParsedBinaryMesh {
  if (isPackedMesh(buffer)) return parsePackedMesh(buffer);
  return parseBinaryMesh(buffer);
}
