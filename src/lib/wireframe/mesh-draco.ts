/** WFDZ: Draco-compressed positions + attribute sidecar + edges. */

import { PACK_FORMAT_VERSION, PACK_MAGIC, WIREFRAME_MESH_VERSION, parsePackedMesh } from "./mesh-packed";

export const DRACO_WRAP_MAGIC = 0x5a444657;
export const DRACO_WRAP_VERSION = 1;
const LAYOUT_FLOATS = 15;
const ATTR_BYTES = 10;

type DracoMod = {
  Decoder: new () => {
    GetEncodedGeometryType: (b: { Init: (d: Int8Array, n: number) => void }) => number;
    DecodeBufferToPointCloud: (b: unknown, pc: unknown) => unknown;
    GetAttributeId: (pc: unknown, t: number) => number;
    GetAttribute: (pc: unknown, id: number) => unknown;
    GetAttributeFloatForAllPoints: (pc: unknown, attr: unknown, arr: { GetValue: (i: number) => number; size: () => number }) => void;
  };
  DecoderBuffer: new () => { Init: (d: Int8Array, n: number) => void };
  PointCloud: new () => unknown;
  DracoFloat32Array: new () => { GetValue: (i: number) => number; size: () => number };
  destroy: (x: unknown) => void;
  POINT_CLOUD: number;
  POSITION: number;
};

let decoderMod: DracoMod | null = null;

async function dracoDecoder(): Promise<DracoMod> {
  if (decoderMod) return decoderMod;
  const draco3d = await import("draco3d");
  decoderMod = await new Promise((resolve) => {
    draco3d.default.createDecoderModule({}).then(resolve);
  });
  return decoderMod!;
}

export function isDracoWrapped(buffer: ArrayBuffer): boolean {
  return buffer.byteLength >= 4 && new DataView(buffer).getUint32(0, true) === DRACO_WRAP_MAGIC;
}

export async function decodeDracoWireframe(wfdz: ArrayBuffer): Promise<ArrayBuffer> {
  const view = new DataView(wfdz);
  let off = 0;
  if (view.getUint32(off, true) !== DRACO_WRAP_MAGIC) throw new Error("Not WFDZ");
  off += 4;
  if (view.getUint32(off, true) !== DRACO_WRAP_VERSION) throw new Error("Bad WFDZ version");
  off += 4;
  if (view.getUint32(off, true) !== WIREFRAME_MESH_VERSION) throw new Error("Mesh version");
  off += 4;
  const pointCount = view.getUint32(off, true);
  off += 4;
  const edgeCount = view.getUint32(off, true);
  off += 4;
  for (let i = 0; i < LAYOUT_FLOATS; i++) off += 4;
  const dracoLen = view.getUint32(off, true);
  off += 4;
  const attrsLen = view.getUint32(off, true);
  off += 4;
  const dracoBytes = new Uint8Array(wfdz, off, dracoLen);
  off += dracoLen;
  const attrsBytes = new Uint8Array(wfdz, off, attrsLen);
  off += attrsLen;
  const edgeBytes = edgeCount * 4;

  const mod = await dracoDecoder();
  const decoder = new mod.Decoder();
  const buf = new mod.DecoderBuffer();
  buf.Init(new Int8Array(dracoBytes.buffer, dracoBytes.byteOffset, dracoBytes.byteLength), dracoBytes.byteLength);
  const pc = new mod.PointCloud();
  decoder.DecodeBufferToPointCloud(buf, pc);
  const posId = decoder.GetAttributeId(pc, mod.POSITION);
  const posAttr = decoder.GetAttribute(pc, posId);
  const posArr = new mod.DracoFloat32Array();
  decoder.GetAttributeFloatForAllPoints(pc, posAttr, posArr);

  const headerBytes = 4 + 4 + 4 + 4 + 4 + LAYOUT_FLOATS * 4;
  const pointBytes = pointCount * 16;
  const out = new ArrayBuffer(headerBytes + pointBytes + edgeBytes);
  const outView = new DataView(out);
  let o = 0;
  outView.setUint32(o, PACK_MAGIC, true); o += 4;
  outView.setUint32(o, PACK_FORMAT_VERSION, true); o += 4;
  outView.setUint32(o, WIREFRAME_MESH_VERSION, true); o += 4;
  outView.setUint32(o, pointCount, true); o += 4;
  outView.setUint32(o, edgeCount, true); o += 4;
  for (let i = 0; i < LAYOUT_FLOATS; i++) {
    outView.setFloat32(o, view.getFloat32(24 + i * 4, true), true);
    o += 4;
  }

  for (let i = 0; i < pointCount; i++) {
    outView.setUint16(o, Math.round(posArr.GetValue(i * 3)), true); o += 2;
    outView.setUint16(o, Math.round(posArr.GetValue(i * 3 + 1)), true); o += 2;
    outView.setInt16(o, Math.round(posArr.GetValue(i * 3 + 2) * 10), true); o += 2;
    const a = i * ATTR_BYTES;
    for (let b = 0; b < ATTR_BYTES; b++) outView.setUint8(o++, attrsBytes[a + b]);
  }

  new Uint8Array(out, headerBytes + pointBytes, edgeBytes).set(new Uint8Array(wfdz, off, edgeBytes));

  mod.destroy(buf);
  mod.destroy(pc);
  mod.destroy(decoder);
  mod.destroy(posArr);

  return out;
}

export async function resolveMeshBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (isDracoWrapped(buffer)) return decodeDracoWireframe(buffer);
  return buffer;
}
