/**
 * Lenis smooth scroll + GSAP ScrollTrigger → wireframe shader uniforms.
 * Scroll only nudges GPU uniforms; point motion stays in the vertex shader.
 */
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type WireframeScrollSample = {
  uScrollY: number;
  uScrollVel: number;
};

export type WireframeScrollDriver = {
  attach: () => void;
  detach: () => void;
  get: () => WireframeScrollSample;
};

export function createWireframeScrollDriver(anchor: HTMLElement): WireframeScrollDriver {
  let uScrollY = 0;
  let uScrollVel = 0;
  let lenis: Lenis | null = null;
  let rafId = 0;
  let trigger: ScrollTrigger | null = null;
  let lastProgress = 0;

  const onRaf = (time: number) => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(onRaf);
  };

  return {
    attach() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.9,
      });

      lenis.on("scroll", ScrollTrigger.update);
      rafId = requestAnimationFrame(onRaf);

      trigger = ScrollTrigger.create({
        trigger: anchor,
        start: "top 92%",
        end: "bottom 8%",
        scrub: 0.45,
        onUpdate(self) {
          uScrollVel = (self.progress - lastProgress) * 6;
          lastProgress = self.progress;
          uScrollY = self.progress;
        },
      });
    },

    detach() {
      trigger?.kill();
      trigger = null;
      cancelAnimationFrame(rafId);
      rafId = 0;
      lenis?.destroy();
      lenis = null;
      uScrollY = 0;
      uScrollVel = 0;
      lastProgress = 0;
    },

    get: () => ({ uScrollY, uScrollVel }),
  };
}
