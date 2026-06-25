/**
 * Mesh fetch + IDB cache. No Three.js — safe to import at page load.
 */
import {
  PACK_FORMAT_VERSION,
  WIREFRAME_MESH_VERSION,
} from "./mesh-packed";

export const BIN_IDB_NAME = "wireframeBinaryCache";
export const BIN_IDB_STORE = "meshes";
export const BIN_CACHE_VERSION = 3;
const DECOMP_CACHE_VERSION = 1;

export type CachedBinaryMesh = {
  cacheVersion: number;
  formatVersion: number;
  meshVersion: number;
  etag: string | null;
  savedAt: number;
  byteLength: number;
  storedGzip: boolean;
  data: ArrayBuffer;
};

type CachedDecompressedMesh = {
  cacheVersion: number;
  formatVersion: number;
  meshVersion: number;
  savedAt: number;
  byteLength: number;
  data: ArrayBuffer;
};

const supportsGzip = () => typeof DecompressionStream !== "undefined";

export function binaryMeshCacheKey(url: string): string {
  return `wireframeBin:v${BIN_CACHE_VERSION}:f${PACK_FORMAT_VERSION}:m${WIREFRAME_MESH_VERSION}:${url}`;
}

function decompressedMeshCacheKey(url: string): string {
  return `wireframeDecomp:v${DECOMP_CACHE_VERSION}:f${PACK_FORMAT_VERSION}:m${WIREFRAME_MESH_VERSION}:${url}`;
}

const openBinIdb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (!("indexedDB" in globalThis)) return resolve(null);
    const req = indexedDB.open(BIN_IDB_NAME, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BIN_IDB_STORE)) {
        db.createObjectStore(BIN_IDB_STORE);
      }
      if (!db.objectStoreNames.contains("gpuMeshes")) {
        db.createObjectStore("gpuMeshes");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

async function gunzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (!supportsGzip()) return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

export async function loadBinaryMeshIdb(key: string): Promise<CachedBinaryMesh | null> {
  const db = await openBinIdb();
  if (!db) return null;
  const entry = await new Promise<CachedBinaryMesh | null>((resolve) => {
    const tx = db.transaction(BIN_IDB_STORE, "readonly");
    const req = tx.objectStore(BIN_IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as CachedBinaryMesh | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  if (!entry?.data) return null;
  if (
    entry.cacheVersion !== BIN_CACHE_VERSION ||
    entry.formatVersion !== PACK_FORMAT_VERSION ||
    entry.meshVersion !== WIREFRAME_MESH_VERSION
  ) {
    return null;
  }
  return entry;
}

async function loadDecompressedMeshIdb(key: string): Promise<CachedDecompressedMesh | null> {
  const db = await openBinIdb();
  if (!db) return null;
  const entry = await new Promise<CachedDecompressedMesh | null>((resolve) => {
    const tx = db.transaction(BIN_IDB_STORE, "readonly");
    const req = tx.objectStore(BIN_IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as CachedDecompressedMesh | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  if (!entry?.data) return null;
  if (
    entry.cacheVersion !== DECOMP_CACHE_VERSION ||
    entry.formatVersion !== PACK_FORMAT_VERSION ||
    entry.meshVersion !== WIREFRAME_MESH_VERSION
  ) {
    return null;
  }
  return entry;
}

async function saveDecompressedMeshIdb(key: string, buffer: ArrayBuffer): Promise<void> {
  const db = await openBinIdb();
  if (!db) return;
  const entry: CachedDecompressedMesh = {
    cacheVersion: DECOMP_CACHE_VERSION,
    formatVersion: PACK_FORMAT_VERSION,
    meshVersion: WIREFRAME_MESH_VERSION,
    savedAt: Date.now(),
    byteLength: buffer.byteLength,
    data: buffer,
  };
  await new Promise<void>((resolve) => {
    const tx = db.transaction(BIN_IDB_STORE, "readwrite");
    tx.objectStore(BIN_IDB_STORE).put(entry, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export async function saveBinaryMeshIdb(
  key: string,
  rawBuffer: ArrayBuffer,
  etag: string | null,
  storedGzip: boolean
): Promise<void> {
  const db = await openBinIdb();
  if (!db) return;
  const entry: CachedBinaryMesh = {
    cacheVersion: BIN_CACHE_VERSION,
    formatVersion: PACK_FORMAT_VERSION,
    meshVersion: WIREFRAME_MESH_VERSION,
    etag,
    savedAt: Date.now(),
    byteLength: rawBuffer.byteLength,
    storedGzip,
    data: rawBuffer,
  };
  await new Promise<void>((resolve) => {
    const tx = db.transaction(BIN_IDB_STORE, "readwrite");
    tx.objectStore(BIN_IDB_STORE).put(entry, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

async function readMeshBytes(entry: CachedBinaryMesh): Promise<ArrayBuffer> {
  if (entry.storedGzip) return gunzip(entry.data);
  return entry.data;
}

async function cacheDecompressed(url: string, buffer: ArrayBuffer): Promise<void> {
  await saveDecompressedMeshIdb(decompressedMeshCacheKey(url), buffer);
}

export async function fetchBinaryMesh(
  url: string,
  signal?: AbortSignal
): Promise<{ buffer: ArrayBuffer; etag: string | null } | null> {
  const key = binaryMeshCacheKey(url);
  const decompKey = decompressedMeshCacheKey(url);
  const cachedDecomp = await loadDecompressedMeshIdb(decompKey);
  if (cachedDecomp) {
    void revalidateMeshInBackground(url);
    return { buffer: cachedDecomp.data, etag: null };
  }

  const cached = await loadBinaryMeshIdb(key);
  const isGzipUrl = url.endsWith(".gz");

  try {
    const headers: HeadersInit = {};
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    const res = await fetch(url, { signal, headers });
    if (res.status === 304 && cached) {
      const buffer = await readMeshBytes(cached);
      void cacheDecompressed(url, buffer);
      return { buffer, etag: cached.etag };
    }
    if (!res.ok) {
      if (cached) {
        const buffer = await readMeshBytes(cached);
        void cacheDecompressed(url, buffer);
        return { buffer, etag: cached.etag };
      }
      return null;
    }
    const raw = await res.arrayBuffer();
    const etag = res.headers.get("etag");
    if (isGzipUrl) {
      const buffer = await gunzip(raw);
      saveBinaryMeshIdb(key, raw, etag, true).catch(() => {});
      void cacheDecompressed(url, buffer);
      return { buffer, etag };
    }
    saveBinaryMeshIdb(key, raw, etag, false).catch(() => {});
    void cacheDecompressed(url, raw);
    return { buffer: raw, etag };
  } catch {
    if (cached) {
      const buffer = await readMeshBytes(cached);
      void cacheDecompressed(url, buffer);
      return { buffer, etag: cached.etag };
    }
    return null;
  }
}

async function revalidateMeshInBackground(url: string): Promise<void> {
  try {
    await fetchBinaryMesh(url);
  } catch {
    /* ignore */
  }
}

type PrefetchState = {
  url: string;
  promise: Promise<ArrayBuffer | null>;
};

let prefetch: PrefetchState | null = null;

declare global {
  interface Window {
    __wireframeMeshPrefetch?: Promise<Response>;
  }
}

async function gunzipRaw(raw: ArrayBuffer, isGzip: boolean): Promise<ArrayBuffer> {
  if (!isGzip || !supportsGzip()) return raw;
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

async function persistEarlyFetch(url: string, raw: ArrayBuffer, isGzip: boolean): Promise<ArrayBuffer> {
  const buffer = await gunzipRaw(raw, isGzip);
  const key = binaryMeshCacheKey(url);
  if (isGzip) {
    saveBinaryMeshIdb(key, raw, null, true).catch(() => {});
  } else {
    saveBinaryMeshIdb(key, raw, null, false).catch(() => {});
  }
  void cacheDecompressed(url, buffer);
  return buffer;
}

function earlyPagePrefetch(url: string): Promise<ArrayBuffer | null> | null {
  const early = typeof window !== "undefined" ? window.__wireframeMeshPrefetch : undefined;
  if (!early) return null;
  const isGzip = url.endsWith(".gz");
  return early
    .then(async (res) => {
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      return persistEarlyFetch(url, raw, isGzip);
    })
    .catch(() => null);
}

/** Load mesh: IDB decompressed → prefetch → network. */
export async function loadWireframeMeshBuffer(url: string): Promise<ArrayBuffer | null> {
  const decompKey = decompressedMeshCacheKey(url);
  const cachedDecomp = await loadDecompressedMeshIdb(decompKey);
  if (cachedDecomp) {
    void revalidateMeshInBackground(url);
    return cachedDecomp.data;
  }

  const pref = getPrefetchedMesh(url);
  if (pref) return pref;

  const result = await fetchBinaryMesh(url);
  return result?.buffer ?? null;
}

/** Start mesh download immediately — before Three.js loads. */
export function prefetchWireframeMesh(url: string): Promise<ArrayBuffer | null> {
  if (prefetch?.url === url) return prefetch.promise;

  const decompPromise = loadDecompressedMeshIdb(decompressedMeshCacheKey(url)).then((entry) => {
    if (entry) {
      void revalidateMeshInBackground(url);
      return entry.data;
    }
    return null;
  });

  const early = earlyPagePrefetch(url);
  const networkPromise = early ?? fetchBinaryMesh(url).then((r) => r?.buffer ?? null);

  const promise = decompPromise.then((cached) => cached ?? networkPromise).catch(() => null);
  prefetch = { url, promise };
  return promise;
}

export function getPrefetchedMesh(url: string): Promise<ArrayBuffer | null> | null {
  if (prefetch?.url === url) return prefetch.promise;
  return null;
}
