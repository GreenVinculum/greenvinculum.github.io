/** Tiny entry: prefetch mesh on page load without pulling in Three.js. */
import { isPackedMesh } from "./mesh-packed";
import { getPrefetchedMesh, loadWireframeMeshBuffer, prefetchWireframeMesh } from "./mesh-idb-cache";
import { gpuMeshCacheKey, loadGpuMeshIdb, saveGpuMeshIdb } from "./mesh-gpu-cache";
import type { GpuMeshBuffers } from "./mesh-packed";

const DRACO_WRAP_MAGIC = 0x5a444657;
export const WIREFRAME_MESH_URL = "/data/wireframe-mesh.pck.gz";

let warmedGpuUrl: string | null = null;
let warmedGpuBuffers: Promise<GpuMeshBuffers | null> | null = null;

function resolveMeshUrl(meshUrl?: string | null): string {
  return (
    meshUrl ??
    document.getElementById("wireframePortrait")?.getAttribute("data-mesh-bin-url") ??
    WIREFRAME_MESH_URL
  );
}

/** Start mesh + GPU IDB + renderer chunk downloads as early as possible (homepage head). */
export function startWireframePortraitWarmup(meshUrl?: string | null) {
  const url = resolveMeshUrl(meshUrl);
  prefetchWireframeMesh(url);

  if (warmedGpuUrl !== url) {
    warmedGpuUrl = url;
    warmedGpuBuffers = loadGpuMeshIdb(gpuMeshCacheKey(url));
  }

  void import("./WireframePortrait");
  void import("./WebGLWireframePortrait");
  void import("three");
}

export function startWireframeMeshPrefetch(meshUrl?: string | null) {
  startWireframePortraitWarmup(meshUrl);
}

async function fetchMeshAsset(packed?: string | null): Promise<ArrayBuffer | null> {
  if (!packed) return null;
  const pref = getPrefetchedMesh(packed);
  let buffer = await (pref ?? loadWireframeMeshBuffer(packed));
  if (buffer && !isPackedMesh(buffer) && !isDracoWrapped(buffer)) {
    console.warn("[wireframe] cached mesh invalid — refetching");
    buffer = await fetchFreshMesh(packed);
  }
  return buffer;
}

function isDracoWrapped(buffer: ArrayBuffer): boolean {
  return buffer.byteLength >= 4 && new DataView(buffer).getUint32(0, true) === DRACO_WRAP_MAGIC;
}

async function fetchFreshMesh(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = await res.arrayBuffer();
    if (url.endsWith(".gz") && typeof DecompressionStream !== "undefined") {
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).arrayBuffer();
    }
    return raw;
  } catch {
    return null;
  }
}

async function decodeMeshBuffer(raw: ArrayBuffer): Promise<ArrayBuffer> {
  if (raw.byteLength >= 4 && new DataView(raw).getUint32(0, true) === DRACO_WRAP_MAGIC) {
    const { decodeDracoWireframe } = await import("./mesh-draco");
    return decodeDracoWireframe(raw);
  }
  return raw;
}

async function resolveGpuBuffers(
  meshUrl: string,
  buffer: ArrayBuffer,
  cachedGpu: GpuMeshBuffers | null
): Promise<GpuMeshBuffers> {
  if (cachedGpu) return cachedGpu;

  const gpuKey = gpuMeshCacheKey(meshUrl);
  const fromIdb = await loadGpuMeshIdb(gpuKey);
  if (fromIdb) return fromIdb;

  const { prepareMesh } = await import("./mesh-prepare");
  const gpuBuffers = prepareMesh(buffer);
  saveGpuMeshIdb(gpuKey, gpuBuffers);
  return gpuBuffers;
}

export async function bootWireframe(options: {
  canvas: HTMLCanvasElement;
  eventTarget?: HTMLElement;
  meshUrl: string;
  isLightTheme: () => boolean;
  preferWebGPU?: boolean;
  onReady?: () => void;
  scrollDriver?: import("./wireframe-scroll").WireframeScrollDriver | null;
}): Promise<boolean> {
  const meshUrl = options.meshUrl;
  const gpuKey = gpuMeshCacheKey(meshUrl);
  const portraitModulePromise = import("./WireframePortrait");

  const gpuFromWarmup =
    warmedGpuUrl === meshUrl && warmedGpuBuffers ? warmedGpuBuffers : loadGpuMeshIdb(gpuKey);

  const [rawBuffer, cachedGpu] = await Promise.all([
    fetchMeshAsset(meshUrl),
    gpuFromWarmup,
  ]);

  if (!rawBuffer && !cachedGpu) {
    console.warn("[wireframe] mesh fetch failed:", meshUrl);
    return false;
  }

  let gpuBuffers: GpuMeshBuffers;
  try {
    if (cachedGpu) {
      gpuBuffers = cachedGpu;
    } else {
      let buffer: ArrayBuffer;
      try {
        buffer = await decodeMeshBuffer(rawBuffer!);
      } catch (err) {
        console.warn("[wireframe] mesh decode failed:", err);
        return false;
      }
      gpuBuffers = await resolveGpuBuffers(meshUrl, buffer, null);
    }
  } catch (err) {
    console.warn("[wireframe] mesh prepare failed:", err);
    return false;
  }

  const portraitModule = await portraitModulePromise;
  const { w, h } = gpuBuffers.layout;
  if (w > 0 && h > 0) {
    options.canvas.width = w;
    options.canvas.height = h;
  }

  const ok = await portraitModule.beginWireframePortrait({
    canvas: options.canvas,
    eventTarget: options.eventTarget,
    gpuBuffers,
    isLightTheme: options.isLightTheme,
    preferWebGPU: options.preferWebGPU,
    onReady: options.onReady,
    scrollDriver: options.scrollDriver,
  });

  if (ok) {
    console.info("[wireframe] live:", portraitModule.getActiveBackend?.() ?? "gpu");
  }
  return ok;
}

export async function disposeWireframe(): Promise<void> {
  const { disposeWireframePortrait } = await import("./WireframePortrait");
  disposeWireframePortrait();
}
