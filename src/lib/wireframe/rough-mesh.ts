/** Instant portrait sketch from a prebaked, cached point sample. */

export type RoughMesh = {
  v: number;
  w: number;
  h: number;
  count: number;
  xy: number[];
  lum: number[];
};

const CACHE_KEY = "wireframeRoughMesh:v1";

export function readCachedRoughMesh(): RoughMesh | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoughMesh;
    if (parsed?.v !== 1 || !Array.isArray(parsed.xy) || parsed.xy.length < 8) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeRoughMesh(mesh: RoughMesh) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(mesh));
  } catch {
    /* quota — the network copy is still fine */
  }
}

export async function loadRoughMesh(url: string): Promise<RoughMesh | null> {
  const cached = readCachedRoughMesh();
  if (cached) return cached;
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    const mesh = (await res.json()) as RoughMesh;
    if (!mesh?.xy?.length) return null;
    storeRoughMesh(mesh);
    return mesh;
  } catch {
    return null;
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Draw the coarse cloud. `progress` 0→1 floats points into place. */
export function drawRoughMesh(
  canvas: HTMLCanvasElement,
  mesh: RoughMesh,
  progress: number,
  time: number,
  light: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cssW = canvas.clientWidth || mesh.w;
  const cssH = canvas.clientHeight || mesh.h;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pxW = Math.max(1, Math.round(cssW * dpr));
  const pxH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  ctx.setTransform(pxW / mesh.w, 0, 0, pxH / mesh.h, 0, 0);
  ctx.clearRect(0, 0, mesh.w, mesh.h);
  const color = light ? "24, 32, 40" : "174, 255, 214";
  const n = mesh.xy.length / 2;
  for (let i = 0; i < n; i++) {
    const stagger = (i % 19) / 19;
    const arrive = smoothstep(stagger * 0.45, stagger * 0.45 + 0.4, progress);
    if (arrive < 0.02) continue;
    const drift = 1 - arrive;
    const x = mesh.xy[i * 2] + Math.sin(time * 0.0022 + stagger * 14) * drift * 7;
    const y = mesh.xy[i * 2 + 1] - drift * (16 + stagger * 42);
    const brightness = (mesh.lum[i] ?? 180) / 255;
    ctx.fillStyle = `rgba(${color},${(0.28 + brightness * 0.62) * arrive})`;
    const r = 1.15 + brightness * 1.1;
    ctx.fillRect(x - r * 0.5, y - r * 0.5, r, r);
  }
}
