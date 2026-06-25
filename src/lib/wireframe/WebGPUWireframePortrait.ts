import {

  AdditiveBlending,

  OrthographicCamera,

  Points,

  Scene,

  ShaderMaterial,

  WebGPURenderer,

} from "three/webgpu";

import type { GpuMeshBuffers } from "./mesh-packed";

import { readWireframePalette } from "./mesh-binary";

import {

  applyDepthCloudPalette,

  applyWireframePalette,

  disposeWireframeGpuGeometry,

  gpuBuffersToDepthCloudGeometry,

  gpuBuffersToGeometry,

  type WireframeGpuGeometry,

} from "./wireframe-geometry";

import {

  applyInteractionUniforms,

  WireframeInteraction,

} from "./wireframe-interaction";

import {

  clampPixelRatio,

  configureWireframeRenderer,

  createRenderClock,

  createVisibilityPause,

  elapsedWireframeTime,

} from "./wireframe-renderer";

import type { WireframePortraitOptions } from "./WebGLWireframePortrait";



export async function probeWebGPU(): Promise<boolean> {

  if (!("gpu" in navigator)) return false;

  try {

    const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;

    const adapter = await gpu?.requestAdapter({ powerPreference: "high-performance" });

    return !!adapter;

  } catch {

    return false;

  }

}



export class WebGPUWireframePortrait {

  private renderer!: WebGPURenderer;

  private scene = new Scene();

  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  private raf = 0;

  private interaction!: WireframeInteraction;

  private gpuGeo!: WireframeGpuGeometry;

  private depthCloudGeo: WireframeGpuGeometry | null = null;

  private isLightTheme: () => boolean;

  private onTheme: () => void;

  private visibility!: ReturnType<typeof createVisibilityPause>;

  private clock = createRenderClock();

  private layout!: GpuMeshBuffers["layout"];
  private scrollDriver: WireframePortraitOptions["scrollDriver"];

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

    this.renderer = new WebGPURenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    configureWireframeRenderer(this.renderer as unknown as import("three").WebGLRenderer, display.w, display.h);

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
  }



  async start(onReady?: () => void) {

    await this.renderer.init();

    this.raf = requestAnimationFrame(this.animate);

    onReady?.();

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

    const scroll = this.scrollDriver?.get();
    const tick = this.interaction.tick(elapsedWireframeTime(this.clock), scroll);

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



let activePortrait: WebGPUWireframePortrait | null = null;



export async function beginWebGPUWireframePortrait(options: WireframePortraitOptions): Promise<boolean> {

  try {

    if (!(await probeWebGPU())) return false;

    activePortrait?.dispose();

    activePortrait = null;

    const portrait = new WebGPUWireframePortrait(options.canvas, options.gpuBuffers, {
      isLightTheme: options.isLightTheme,
      eventTarget: options.eventTarget,
      scrollDriver: options.scrollDriver,
    });

    activePortrait = portrait;

    await portrait.start(options.onReady);

    return true;

  } catch (err) {

    console.warn("WebGPU wireframe failed:", err);

    activePortrait = null;

    return false;

  }

}



export function disposeWebGPUWireframePortrait() {

  activePortrait?.dispose();

  activePortrait = null;

}


