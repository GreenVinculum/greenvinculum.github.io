import {
  buildGpuMeshBuffers,
  parseMeshBuffer,
  type GpuMeshBuffers,
} from "./mesh-packed";

/** Main-thread mesh prep — faster than worker spawn for typical portrait sizes. */
export function prepareMesh(buffer: ArrayBuffer): GpuMeshBuffers {
  return buildGpuMeshBuffers(parseMeshBuffer(buffer));
}

/** @deprecated Use prepareMesh — worker adds startup latency on dev/first paint. */
export function prepareMeshInWorker(buffer: ArrayBuffer): Promise<GpuMeshBuffers> {
  return Promise.resolve(prepareMesh(buffer));
}
