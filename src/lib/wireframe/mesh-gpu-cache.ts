/**
 * IDB cache for prepared GPU mesh buffers — skips parse/build on repeat visits.
 */
import {
  PACK_FORMAT_VERSION,
  WIREFRAME_MESH_VERSION,
  type GpuMeshBuffers,
  type WireframeLayout,
} from "./mesh-packed";
import { BIN_IDB_NAME } from "./mesh-idb-cache";

const GPU_CACHE_VERSION = 1;
const GPU_IDB_STORE = "gpuMeshes";

type CachedGpuMesh = {
  cacheVersion: number;
  formatVersion: number;
  meshVersion: number;
  savedAt: number;
  layout: WireframeLayout;
  pointCount: number;
  drawCount: number;
  texW: number;
  texH: number;
  depthCloudCount: number;
  texData: ArrayBuffer;
  pointIndices: ArrayBuffer;
  depthCloudIndices: ArrayBuffer;
};

export function gpuMeshCacheKey(url: string): string {
  return `wireframeGpu:v${GPU_CACHE_VERSION}:f${PACK_FORMAT_VERSION}:m${WIREFRAME_MESH_VERSION}:${url}`;
}

const openGpuIdb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (!("indexedDB" in globalThis)) return resolve(null);
    const req = indexedDB.open(BIN_IDB_NAME, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meshes")) {
        db.createObjectStore("meshes");
      }
      if (!db.objectStoreNames.contains(GPU_IDB_STORE)) {
        db.createObjectStore(GPU_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

function packGpuMesh(buffers: GpuMeshBuffers): CachedGpuMesh {
  return {
    cacheVersion: GPU_CACHE_VERSION,
    formatVersion: PACK_FORMAT_VERSION,
    meshVersion: WIREFRAME_MESH_VERSION,
    savedAt: Date.now(),
    layout: buffers.layout,
    pointCount: buffers.pointCount,
    drawCount: buffers.drawCount,
    texW: buffers.texW,
    texH: buffers.texH,
    depthCloudCount: buffers.depthCloudCount,
    texData: buffers.texData.buffer.slice(
      buffers.texData.byteOffset,
      buffers.texData.byteOffset + buffers.texData.byteLength
    ),
    pointIndices: buffers.pointIndices.buffer.slice(
      buffers.pointIndices.byteOffset,
      buffers.pointIndices.byteOffset + buffers.pointIndices.byteLength
    ),
    depthCloudIndices: buffers.depthCloudIndices.buffer.slice(
      buffers.depthCloudIndices.byteOffset,
      buffers.depthCloudIndices.byteOffset + buffers.depthCloudIndices.byteLength
    ),
  };
}

function unpackGpuMesh(entry: CachedGpuMesh): GpuMeshBuffers {
  return {
    layout: entry.layout,
    pointCount: entry.pointCount,
    drawCount: entry.drawCount,
    texW: entry.texW,
    texH: entry.texH,
    depthCloudCount: entry.depthCloudCount,
    texData: new Float32Array(entry.texData),
    pointIndices: new Float32Array(entry.pointIndices),
    depthCloudIndices: new Float32Array(entry.depthCloudIndices),
  };
}

export async function loadGpuMeshIdb(key: string): Promise<GpuMeshBuffers | null> {
  const db = await openGpuIdb();
  if (!db) return null;
  const entry = await new Promise<CachedGpuMesh | null>((resolve) => {
    const tx = db.transaction(GPU_IDB_STORE, "readonly");
    const req = tx.objectStore(GPU_IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as CachedGpuMesh | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  if (!entry?.texData) return null;
  if (
    entry.cacheVersion !== GPU_CACHE_VERSION ||
    entry.formatVersion !== PACK_FORMAT_VERSION ||
    entry.meshVersion !== WIREFRAME_MESH_VERSION
  ) {
    return null;
  }
  return unpackGpuMesh(entry);
}

export function saveGpuMeshIdb(key: string, buffers: GpuMeshBuffers): void {
  void openGpuIdb().then((db) => {
    if (!db) return;
    const entry = packGpuMesh(buffers);
    const tx = db.transaction(GPU_IDB_STORE, "readwrite");
    tx.objectStore(GPU_IDB_STORE).put(entry, key);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}
