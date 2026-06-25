/** Convert packed/binary mesh → 2D canvas wireframe structures. */
import type { ParsedBinaryMesh } from "./mesh-binary";
import { parseMeshBuffer } from "./mesh-packed";

const ZONE_NAMES = ["hat", "face", "shirt", "arm", "fill"] as const;

function zoneName(code: number): string {
  return ZONE_NAMES[code % ZONE_NAMES.length] ?? "fill";
}

function levelName(flags: number): string {
  const v = flags & 3;
  return v === 0 ? "small" : v === 1 ? "medium" : "large";
}

export function packedMeshToCanvas(mesh: ParsedBinaryMesh) {
  const { layout, pointCount, pointData, edgeIndices, edgeCount } = mesh;
  const points = [];

  for (let i = 0; i < pointCount; i++) {
    const o = i * 16;
    const kindFlag = pointData[o + 13];
    const packed15 = pointData[o + 15];
    const levelFlags = packed15 & 0xff;
    const groupByte = (packed15 >> 8) & 0xff;
    const zone = zoneName(pointData[o + 14]);
    const level = levelName(levelFlags);

    points.push({
      baseX: pointData[o],
      baseY: pointData[o + 1],
      x: pointData[o],
      y: pointData[o + 1],
      lum: pointData[o + 3],
      edge: pointData[o + 4],
      feature: pointData[o + 5],
      z: pointData[o + 2],
      kind: kindFlag > 0.5 ? "ambient" : zone === "fill" ? "fill" : "structure",
      strategic: false,
      keepScore: pointData[o + 4] + pointData[o + 5],
      groupId: groupByte % 9,
      zone,
      level,
      depthJitter: (pointData[o + 6] - 0.5) * 7,
      sizeJitter: pointData[o + 7],
      pulseOffset: pointData[o + 8] * Math.PI * 2,
      driftPhase: 0,
      driftSpeed: 0.8,
      driftAmp: 1.2,
      zoneOverride: null,
      levelOverride: null,
      repulseX: 0,
      repulseY: 0,
      driftX: 0,
      driftY: 0,
      toneBand: Math.max(0, Math.min(3, Math.floor(pointData[o + 3] * 4))),
    });
  }

  const neighbors = Array.from({ length: pointCount }, () => []);
  for (let e = 0; e < edgeCount; e++) {
    const i = edgeIndices[e * 2];
    const j = edgeIndices[e * 2 + 1];
    if (i >= pointCount || j >= pointCount) continue;
    const dx = points[i].baseX - points[j].baseX;
    const dy = points[i].baseY - points[j].baseY;
    const d2 = dx * dx + dy * dy;
    const ambient = points[i].kind === "ambient" || points[j].kind === "ambient";
    neighbors[i].push({ j, d2, ambient });
    neighbors[j].push({ j: i, d2, ambient });
  }

  for (let i = 0; i < pointCount; i++) {
    neighbors[i].sort((a, b) => a.d2 - b.d2);
    const maxLinks = points[i].kind === "ambient" ? 8 : points[i].kind === "fill" ? 14 : 20;
    neighbors[i] = neighbors[i].slice(0, maxLinks);
  }

  return { points, neighbors, layout };
}

export async function loadMeshBufferForCanvas(url: string): Promise<ReturnType<typeof packedMeshToCanvas> | null> {
  try {
    const { fetchBinaryMesh, getPrefetchedMesh } = await import("./mesh-idb-cache");
    const { resolveMeshBuffer } = await import("./mesh-draco");
    const pref = getPrefetchedMesh(url);
    const fetched = await (pref ?? fetchBinaryMesh(url).then((r) => r?.buffer ?? null));
    if (!fetched) return null;
    const buffer = await resolveMeshBuffer(fetched.slice(0));
    return packedMeshToCanvas(parseMeshBuffer(buffer));
  } catch {
    return null;
  }
}
