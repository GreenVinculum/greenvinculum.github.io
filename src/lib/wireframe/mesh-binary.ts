/** Binary wireframe mesh loader (WFMB format). */

export const BIN_MAGIC = 0x424d4657;
export const BIN_FORMAT_VERSION = 2;
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
  /** Float32 view: pointCount × POINT_FLOATS */
  pointData: Float32Array;
  /** Edge pairs: edgeCount × 2 uint16 indices */
  edgeIndices: Uint16Array;
  /** Per-edge ambient flag */
  edgeAmbient: Uint8Array;
};

export function parseBinaryMesh(buffer: ArrayBuffer): ParsedBinaryMesh {
  const view = new DataView(buffer);
  let off = 0;

  const magic = view.getUint32(off, true);
  off += 4;
  if (magic !== BIN_MAGIC) throw new Error("Invalid wireframe mesh binary");

  const formatVersion = view.getUint32(off, true);
  off += 4;
  if (formatVersion !== BIN_FORMAT_VERSION) {
    throw new Error(`Unsupported binary format v${formatVersion}`);
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

  const pointData = new Float32Array(buffer, off, pointCount * POINT_FLOATS);
  off += pointCount * POINT_FLOATS * 4;

  const edgeIndices = new Uint16Array(edgeCount * 2);
  const edgeAmbient = new Uint8Array(edgeCount);
  for (let e = 0; e < edgeCount; e++) {
    edgeIndices[e * 2] = view.getUint16(off, true);
    off += 2;
    edgeIndices[e * 2 + 1] = view.getUint16(off, true);
    off += 2;
    edgeAmbient[e] = view.getUint8(off);
    off += 4; // ambient + pad + reserved
  }

  return { layout, pointCount, edgeCount, pointData, edgeIndices, edgeAmbient };
}

export function readWireframePalette(isLight: boolean): {
  lineRgb: [number, number, number];
  nodeRgb: [number, number, number];
} {
  const style = getComputedStyle(document.documentElement);
  const readRgb = (prop: string, fallback: string): [number, number, number] => {
    const value = style.getPropertyValue(prop).trim() || fallback;
    const parts = value.split(",").map((s) => parseFloat(s.trim()));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  };
  if (isLight) {
    return {
      lineRgb: readRgb("--wireframe-line-mid", "72, 80, 76"),
      nodeRgb: readRgb("--wireframe-node-mid", "92, 100, 96"),
    };
  }
  return {
    lineRgb: readRgb("--wireframe-line", "174, 255, 214"),
    nodeRgb: readRgb("--wireframe-node", "225, 255, 240"),
  };
}
