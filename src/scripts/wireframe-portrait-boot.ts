/**
 * GPU wireframe portrait boot for the homepage.
 * WebGL renderer + 2D canvas fallback.
 */
import {
  bootWireframe,
  disposeWireframe,
  startWireframeMeshPrefetch,
} from "../lib/wireframe/wireframe-boot";
import type { WireframeScrollDriver } from "../lib/wireframe/wireframe-scroll";

const THEME_LIGHT = "winter";
const PACK_MAGIC = 0x504d4657;

type PortraitElements = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  loop: HTMLVideoElement | null;
  poster: HTMLImageElement | null;
  lightPortrait: HTMLImageElement | null;
  fallback: HTMLElement | null;
};

let activeScroll: WireframeScrollDriver | null = null;
let booting = false;
let gpuLive = false;
let canvas2dLive = false;
let themeListenerBound = false;
let bootAttempts = 0;
let runGen = 0;
let bootGen = 0;

function log(...args: unknown[]) {
  console.log("[wireframe]", ...args);
}

function warmGpuPortrait() {
  startWireframeMeshPrefetch();
  void import("../lib/wireframe/WireframePortrait");
  void import("../lib/wireframe/WebGLWireframePortrait");
}

const onThemeChanged = () => {
  log("theme changed — rebooting");
  schedulePortraitBoot();
};

function isLightTheme() {
  return document.documentElement.getAttribute("data-theme") === THEME_LIGHT;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getElements(): PortraitElements | null {
  const root = document.getElementById("wireframePortrait");
  const canvas = document.getElementById("wireframeCanvas") as HTMLCanvasElement | null;
  if (!root || !canvas) return null;
  return {
    root,
    canvas,
    loop: document.getElementById("wireframeLoop") as HTMLVideoElement | null,
    poster: document.getElementById("wireframePoster") as HTMLImageElement | null,
    lightPortrait: document.getElementById("wireframeLightPortrait") as HTMLImageElement | null,
    fallback: document.getElementById("wireframeFallback"),
  };
}

function setState(root: HTMLElement, state: string) {
  root.dataset.wireframeState = state;
}

function showPoster(el: PortraitElements) {
  if (!gpuLive && !canvas2dLive) el.poster?.classList.remove("hidden");
}

function hidePoster(el: PortraitElements) {
  el.poster?.classList.add("hidden");
}

function showLightPortrait(el: PortraitElements) {
  const base = el.root.getAttribute("data-light-portrait") || "/images/profile-inverted";
  const src = /\.(png|jpe?g|webp|gif)$/i.test(base) ? base : `${base}.png`;
  if (el.lightPortrait) {
    if (el.lightPortrait.getAttribute("src") !== src) el.lightPortrait.src = src;
    el.lightPortrait.classList.remove("hidden");
  }
}

function hideLightPortrait(el: PortraitElements) {
  el.lightPortrait?.classList.add("hidden");
}

function canPlayWebm(loop: HTMLVideoElement | null) {
  if (!loop) return false;
  return Boolean(
    loop.canPlayType('video/webm; codecs="vp9"') ||
      loop.canPlayType('video/webm; codecs="vp8"') ||
      loop.canPlayType("video/webm")
  );
}

function showPrebakedLoop(el: PortraitElements) {
  const loopUrl = el.root.getAttribute("data-loop-url") || "";
  const posterUrl = el.root.getAttribute("data-poster-url") || "";
  if (!el.loop || !loopUrl || prefersReducedMotion() || !canPlayWebm(el.loop)) {
    showPoster(el);
    return;
  }
  el.canvas.classList.add("hidden");
  el.fallback?.classList.add("hidden");
  el.loop.classList.remove("hidden");
  el.loop.muted = true;
  el.loop.playsInline = true;
  el.loop.loop = true;
  if (posterUrl) el.loop.setAttribute("poster", posterUrl);
  const onPlaying = () => hidePoster(el);
  const onFail = () => {
    el.loop?.classList.add("hidden");
    if (!gpuLive && !canvas2dLive) showPoster(el);
  };
  el.loop.onplaying = onPlaying;
  el.loop.onerror = onFail;
  if (el.loop.src !== loopUrl) el.loop.src = loopUrl;
  el.loop.load();
  el.loop.play().then(onPlaying).catch(onFail);
}

function showLiveCanvas(el: PortraitElements) {
  gpuLive = true;
  el.canvas.classList.remove("hidden");
  el.loop?.pause();
  el.loop?.classList.add("hidden");
  el.fallback?.classList.add("hidden");
  hidePoster(el);
  hideLightPortrait(el);
  setState(el.root, "gpu-live");
}

async function attachScroll(el: PortraitElements) {
  if (activeScroll || prefersReducedMotion()) return;
  const { createWireframeScrollDriver } = await import("../lib/wireframe/wireframe-scroll");
  activeScroll = createWireframeScrollDriver(el.root);
  activeScroll.attach();
}

function showLive2dCanvas(el: PortraitElements) {
  canvas2dLive = true;
  el.canvas.classList.remove("hidden");
  el.loop?.pause();
  el.loop?.classList.add("hidden");
  el.fallback?.classList.add("hidden");
  hidePoster(el);
  hideLightPortrait(el);
  setState(el.root, "2d-live");
}

async function bootGpu(el: PortraitElements, gen: number): Promise<boolean> {
  const meshBinUrl = el.root.getAttribute("data-mesh-bin-url") || "";
  if (!meshBinUrl) {
    log("missing data-mesh-bin-url");
    return false;
  }

  warmGpuPortrait();
  log("booting WebGL…", meshBinUrl);

  const ok = await bootWireframe({
    canvas: el.canvas,
    eventTarget: el.root,
    meshUrl: meshBinUrl,
    isLightTheme,
    preferWebGPU: false,
    scrollDriver: null,
    onReady: () => {
      if (gen !== runGen) return;
      showLiveCanvas(el);
      log("live: webgl");
      void attachScroll(el);
    },
  });

  if (gen !== runGen) return false;
  if (!ok) log("WebGL boot failed");
  return ok;
}

async function boot2d(el: PortraitElements, gen: number): Promise<boolean> {
  if (canvas2dLive) return true;
  try {
    log("booting 2D canvas fallback…");
    const { initWireframe2dPortrait } = await import("./wireframe-2d-portrait");
    if (gen !== runGen) return false;
    initWireframe2dPortrait();
    if (gen !== runGen) return false;
    showLive2dCanvas(el);
    log("live: 2d");
    return true;
  } catch (err) {
    console.error("[wireframe] 2D fallback failed:", err);
    return false;
  }
}

async function runBoot(el: PortraitElements) {
  const gen = ++runGen;
  if (booting || gpuLive || canvas2dLive) return;
  booting = true;
  bootAttempts += 1;
  setState(el.root, "booting");

  if (prefersReducedMotion()) {
    showPoster(el);
    if (isLightTheme()) showLightPortrait(el);
    setState(el.root, "reduced-motion");
    booting = false;
    return;
  }

  showPoster(el);
  if (isLightTheme()) showLightPortrait(el);

  const gpuOk = await bootGpu(el, gen);
  booting = false;
  if (gen !== runGen) return;

  if (gpuOk) return;

  const d2Ok = await boot2d(el, gen);
  if (gen !== runGen) return;
  if (!d2Ok && !gpuLive && !canvas2dLive) {
    setState(el.root, "fallback");
    if (!isLightTheme()) showPrebakedLoop(el);
    else {
      showPoster(el);
      if (isLightTheme()) showLightPortrait(el);
    }
  }
}

function teardown() {
  runGen += 1;
  void disposeWireframe();
  activeScroll?.detach();
  activeScroll = null;
  gpuLive = false;
  canvas2dLive = false;
  booting = false;
}

export function initWireframePortrait() {
  const el = getElements();
  if (!el) {
    if (bootAttempts < 120) {
      requestAnimationFrame(() => initWireframePortrait());
    } else {
      log("portrait element not found after retries");
    }
    return;
  }

  log("init", { theme: document.documentElement.getAttribute("data-theme"), attempt: bootAttempts + 1 });
  void runBoot(el);

  if (!themeListenerBound) {
    window.addEventListener("theme:changed", onThemeChanged);
    themeListenerBound = true;
  }
}

export function disposeWireframePortrait() {
  teardown();
}

const schedulePortraitBoot = () => {
  if (!document.getElementById("wireframePortrait")) return;
  const gen = ++bootGen;
  disposeWireframePortrait();
  requestAnimationFrame(() => {
    if (gen !== bootGen) return;
    initWireframePortrait();
  });
};

function registerWireframePortraitBoot() {
  if (typeof document === "undefined") return;
  log("boot listener registered");
  document.addEventListener("astro:page-load", schedulePortraitBoot);
  if (document.readyState !== "loading") {
    schedulePortraitBoot();
  } else {
    document.addEventListener("DOMContentLoaded", schedulePortraitBoot);
  }
  window.addEventListener("load", schedulePortraitBoot, { once: true });
}

registerWireframePortraitBoot();
