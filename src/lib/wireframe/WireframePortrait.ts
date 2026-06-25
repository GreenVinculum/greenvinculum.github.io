/**
 * Unified wireframe portrait: WebGL (GLSL) default, optional WebGPU via ?wireframeWebGPU=1.
 * WebGPU requires TSL materials; our GLSL shaders run on WebGL.
 */
import type { WireframePortraitOptions } from "./WebGLWireframePortrait";
import { beginWebGLWireframePortrait, disposeWebGLWireframePortrait } from "./WebGLWireframePortrait";

export type { WireframePortraitOptions };

let activeBackend: "webgpu" | "webgl" | null = null;

export function getActiveBackend() {
  return activeBackend;
}

export async function beginWireframePortrait(
  options: WireframePortraitOptions & { preferWebGPU?: boolean }
): Promise<boolean> {
  disposeWireframePortrait();

  const params = new URLSearchParams(location.search);
  const tryWebGpuFirst = options.preferWebGPU === true && params.has("wireframeWebGPU");

  if (tryWebGpuFirst) {
    try {
      const { beginWebGPUWireframePortrait, probeWebGPU } = await import("./WebGPUWireframePortrait");
      if (await probeWebGPU()) {
        const webgpu = await beginWebGPUWireframePortrait(options);
        if (webgpu) {
          activeBackend = "webgpu";
          return true;
        }
      }
    } catch (err) {
      console.warn("[wireframe] WebGPU unavailable:", err);
    }
  }

  const webgl = await beginWebGLWireframePortrait(options);
  if (webgl) {
    activeBackend = "webgl";
    return true;
  }
  return false;
}

export function disposeWireframePortrait() {
  if (activeBackend === "webgpu") {
    import("./WebGPUWireframePortrait").then((m) => m.disposeWebGPUWireframePortrait());
  } else {
    disposeWebGLWireframePortrait();
  }
  activeBackend = null;
}
