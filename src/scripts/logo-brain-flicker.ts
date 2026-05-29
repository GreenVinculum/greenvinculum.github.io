const GAP_MIN_MS = 2_800;
const GAP_MAX_MS = 9_500;
const BURST_MIN_MS = 280;
const BURST_MAX_MS = 650;

let gapTimer: ReturnType<typeof setTimeout> | undefined;
let burstTimer: ReturnType<typeof setTimeout> | undefined;
let observer: MutationObserver | undefined;
let listenersBound = false;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function steadyGlowFilter(): string {
  return "brightness(1.55) saturate(1.12) drop-shadow(0 0 3px rgba(255, 252, 240, 0.95)) drop-shadow(0 0 8px rgba(230, 255, 245, 0.75)) drop-shadow(0 0 14px rgba(210, 255, 235, 0.45))";
}

function stopFlickerSchedule(): void {
  clearTimeout(gapTimer);
  clearTimeout(burstTimer);
  document.querySelectorAll<HTMLElement>(".site-logo-brain-light").forEach((el) => {
    el.classList.remove("is-flicker-burst");
    el.style.removeProperty("--burst-ms");
    el.style.filter = "";
  });
}

function isLit(stack: HTMLElement): boolean {
  return stack.classList.contains("is-lit");
}

function scheduleGap(brain: HTMLElement, stack: HTMLElement): void {
  if (!isLit(stack)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const gap = randomBetween(GAP_MIN_MS, GAP_MAX_MS);
  gapTimer = window.setTimeout(() => startBurst(brain, stack), gap);
}

function startBurst(brain: HTMLElement, stack: HTMLElement): void {
  if (!isLit(stack)) return;

  const duration = randomBetween(BURST_MIN_MS, BURST_MAX_MS);
  brain.style.setProperty("--burst-ms", `${duration}ms`);
  brain.classList.add("is-flicker-burst");

  burstTimer = window.setTimeout(() => {
    brain.classList.remove("is-flicker-burst");
    brain.style.removeProperty("--burst-ms");
    brain.style.filter = steadyGlowFilter();
    scheduleGap(brain, stack);
  }, duration);
}

function syncBrainFlicker(): void {
  stopFlickerSchedule();

  const stack = document.querySelector<HTMLElement>(".site-logo-stack");
  const brain = stack?.querySelector<HTMLElement>(".site-logo-brain-light");
  if (!stack || !brain) return;

  if (!stack.classList.contains("is-lit")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  scheduleGap(brain, stack);
}

function bindStackObserver(stack: HTMLElement): void {
  observer?.disconnect();
  observer = new MutationObserver(() => syncBrainFlicker());
  observer.observe(stack, { attributes: true, attributeFilter: ["class"] });
}

export function initLogoBrainFlicker(): void {
  const stack = document.querySelector<HTMLElement>(".site-logo-stack");
  if (!stack) return;

  bindStackObserver(stack);
  syncBrainFlicker();

  if (!listenersBound) {
    listenersBound = true;
    window.addEventListener("theme:changed", syncBrainFlicker);
  }
}
