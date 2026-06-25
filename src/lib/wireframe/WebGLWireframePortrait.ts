import { OrthographicCamera, Scene, WebGLRenderer } from "three";
import type { GpuMeshBuffers } from "./mesh-packed";
import { readWireframePalette } from "./mesh-binary";
import {
  applyInteractionUniforms,
  WireframeInteraction,
} from "./wireframe-interaction";
import {
  applyDepthCloudPalette,
  applyWireframePalette,
  disposeWireframeGpuGeometry,
  gpuBuffersToDepthCloudGeometry,
  gpuBuffersToGeometry,
  type WireframeGpuGeometry,
} from "./wireframe-geometry";
import {
  clampPixelRatio,
  configureWireframeRenderer,
  createRenderClock,
  createVisibilityPause,
  elapsedWireframeTime,
} from "./wireframe-renderer";

import type { WireframeScrollDriver } from "./wireframe-scroll";

export type WireframePortraitOptions = {
  canvas: HTMLCanvasElement;
  eventTarget?: HTMLElement;
  gpuBuffers: GpuMeshBuffers;
  isLightTheme: () => boolean;
  onReady?: () => void;
  scrollDriver?: WireframeScrollDriver | null;
};

export class WebGLWireframePortrait {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private raf = 0;
  private interaction: WireframeInteraction;
  private gpuGeo: WireframeGpuGeometry;
  private depthCloudGeo: WireframeGpuGeometry | null;
  private isLightTheme: () => boolean;
  private onTheme: () => void;
  private visibility: ReturnType<typeof createVisibilityPause>;
  private clock = createRenderClock();
  private layout: GpuMeshBuffers["layout"];
  private scrollDriver: WireframeScrollDriver | null;

  constructor(
    private canvas: HTMLCanvasElement,
    buffers: GpuMeshBuffers,
    opts: Omit<WireframePortraitOptions, "canvas" | "gpuBuffers">
  ) {
    this.isLightTheme = opts.isLightTheme;
    this.scrollDriver = opts.scrollDriver ?? null;
    this.layout = buffers.layout;
    const display = { w: canvas.width || buffers.layout.w, h: canvas.height || buffers.layout.h };
    this.gpuGeo = gpuBuffersToGeometry(buffers, display);
    this.depthCloudGeo = gpuBuffersToDepthCloudGeometry(buffers, this.gpuGeo.pointTexture, display);

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.debug.checkShaderErrors = true;
    configureWireframeRenderer(this.renderer, display.w, display.h);

    if (this.depthCloudGeo) this.scene.add(this.depthCloudGeo.points);
    this.scene.add(this.gpuGeo.points);

    this.interaction = new WireframeInteraction(
      opts.eventTarget ?? canvas,
      canvas,
      display.w,
      display.h
    );
    this.interaction.attach();
    this.onTheme = () => this.applyPalette();
    window.addEventListener("theme:changed", this.onTheme);
    this.visibility = createVisibilityPause(
      () => cancelAnimationFrame(this.raf),
      () => {
        this.clock.getDelta();
        this.raf = requestAnimationFrame(this.animate);
      }
    );
    this.visibility.attach();
    this.applyPalette();

    this.raf = requestAnimationFrame(this.animate);
    opts.onReady?.();
  }

  private applyPalette() {
    const isLight = this.isLightTheme();
    const { lineRgb } = readWireframePalette(isLight);
    applyWireframePalette(this.gpuGeo.uniforms, lineRgb, isLight);
    if (this.depthCloudGeo) applyDepthCloudPalette(this.depthCloudGeo.uniforms, lineRgb, isLight);
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    if (this.visibility.isPaused()) return;

    const uTime = elapsedWireframeTime(this.clock);
    const scroll = this.scrollDriver?.get();
    const tick = this.interaction.tick(uTime, scroll);
    applyInteractionUniforms(this.gpuGeo.uniforms, tick);
    if (this.depthCloudGeo) applyInteractionUniforms(this.depthCloudGeo.uniforms, tick);
    const pr = clampPixelRatio();
    this.gpuGeo.uniforms.uPixelRatio.value = pr;
    if (this.depthCloudGeo) this.depthCloudGeo.uniforms.uPixelRatio.value = pr;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.interaction.detach();
    window.removeEventListener("theme:changed", this.onTheme);
    this.visibility.detach();
    this.scene.remove(this.gpuGeo.points);
    if (this.depthCloudGeo) {
      this.scene.remove(this.depthCloudGeo.points);
      disposeWireframeGpuGeometry(this.depthCloudGeo, { keepTexture: true });
    }
    disposeWireframeGpuGeometry(this.gpuGeo);
    this.renderer.dispose();
  }
}

let activePortrait: WebGLWireframePortrait | null = null;

export async function beginWebGLWireframePortrait(options: WireframePortraitOptions): Promise<boolean> {
  try {
    activePortrait?.dispose();
    activePortrait = null;
    activePortrait = new WebGLWireframePortrait(options.canvas, options.gpuBuffers, {
      isLightTheme: options.isLightTheme,
      eventTarget: options.eventTarget,
      onReady: options.onReady,
      scrollDriver: options.scrollDriver,
    });
    return true;
  } catch (err) {
    console.warn("WebGL wireframe failed:", err);
    activePortrait = null;
    return false;
  }
}

export function disposeWebGLWireframePortrait() {
  activePortrait?.dispose();
  activePortrait = null;
}
