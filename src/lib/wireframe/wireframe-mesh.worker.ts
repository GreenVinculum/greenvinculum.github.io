import { buildGpuMeshBuffers, parseMeshBuffer, type GpuMeshBuffers } from "./mesh-packed";

export type WorkerOutMessage = {
  type: "ready";
  buffers: GpuMeshBuffers;
};

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const mesh = parseMeshBuffer(event.data);
    const buffers = buildGpuMeshBuffers(mesh);
    const msg: WorkerOutMessage = { type: "ready", buffers };
    const transfer: Transferable[] = [
      buffers.texData.buffer,
      buffers.pointIndices.buffer,
      buffers.lineIndices.buffer,
    ];
    self.postMessage(msg, { transfer });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) });
  }
};
