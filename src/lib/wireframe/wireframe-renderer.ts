import { AdditiveBlending, Clock, type WebGLRenderer } from "three";

/** Cap DPR — portrait is display-sized; 1.25 saves fill-rate on retina. */
export const WIREFRAME_MAX_PIXEL_RATIO = 1.25;

export function clampPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, WIREFRAME_MAX_PIXEL_RATIO);
}

export function configureWireframeRenderer(
  renderer: WebGLRenderer,
  width: number,
  height: number
) {
  const pr = clampPixelRatio();
  renderer.setPixelRatio(pr);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
}

export type VisibilityPause = {
  attach: () => void;
  detach: () => void;
  isPaused: () => boolean;
};

export function createVisibilityPause(onPause: () => void, onResume: () => void): VisibilityPause {
  let paused = document.hidden;
  const onChange = () => {
    const hidden = document.hidden;
    if (hidden === paused) return;
    paused = hidden;
    if (hidden) onPause();
    else onResume();
  };
  return {
    isPaused: () => paused,
    attach: () => document.addEventListener("visibilitychange", onChange),
    detach: () => document.removeEventListener("visibilitychange", onChange),
  };
}

export function createRenderClock(): Clock {
  const clock = new Clock();
  clock.start();
  return clock;
}

export function elapsedWireframeTime(clock: Clock): number {
  return clock.getElapsedTime();
}
