import { THEMES, toggleTheme } from "./theme-preference";

const PULL_THRESHOLD_PX = 28;
const MAX_PULL_PX = 48;
const RELEASE_MS = 280;

export function initThemePullCord(): void {
  const root = document.querySelector<HTMLElement>(".theme-pull-cord");
  if (!root || root.dataset.bound === "true") return;
  root.dataset.bound = "true";

  const handle = root.querySelector<HTMLButtonElement>(".theme-pull-cord__handle");
  const stack = root.closest<HTMLElement>(".site-logo-stack");
  if (!handle) return;

  const syncLit = () => {
    const isLit = document.documentElement.getAttribute("data-theme") === THEMES.light;
    stack?.classList.toggle("is-lit", isLit);
    handle.setAttribute("aria-pressed", String(isLit));
    handle.setAttribute(
      "aria-label",
      isLit
        ? "Pull cord to turn off the light (switch to dark theme)"
        : "Pull cord to turn on the light (switch to warm white theme)"
    );
  };

  const setPullVisual = (pullPx: number) => {
    const clamped = Math.max(0, Math.min(pullPx, MAX_PULL_PX));
    root.style.setProperty("--pull-offset", `${clamped}px`);
  };

  const resetPullVisual = () => {
    root.style.setProperty("--pull-offset", "0px");
  };

  const releaseCord = (onComplete?: () => void) => {
    root.classList.remove("is-grabbing", "is-dragging", "is-pulling");
    root.classList.add("is-releasing");
    resetPullVisual();
    window.setTimeout(() => {
      root.classList.remove("is-releasing");
      onComplete?.();
    }, RELEASE_MS);
  };

  let startY = 0;
  let pulled = false;

  const finishPull = () => {
    if (pulled) return;
    pulled = true;
    root.classList.add("is-pulling");
    setPullVisual(MAX_PULL_PX * 0.75);
    window.setTimeout(() => {
      releaseCord(() => {
        if (typeof window.__toggleTheme === "function") {
          window.__toggleTheme();
        } else {
          toggleTheme();
        }
        syncLit();
        pulled = false;
      });
    }, 180);
  };

  handle.addEventListener("pointerdown", (event) => {
    pulled = false;
    startY = event.clientY;
    handle.setPointerCapture(event.pointerId);
    root.classList.add("is-grabbing");
  });

  handle.addEventListener("pointermove", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    const delta = event.clientY - startY;
    if (delta > 4) root.classList.add("is-dragging");
    setPullVisual(delta);
    if (delta >= PULL_THRESHOLD_PX) finishPull();
  });

  const endPointer = (event: PointerEvent) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    handle.releasePointerCapture(event.pointerId);
    const delta = event.clientY - startY;
    if (delta >= PULL_THRESHOLD_PX * 0.65) {
      finishPull();
    } else if (delta > 6) {
      releaseCord();
    } else {
      root.classList.remove("is-grabbing", "is-dragging");
      resetPullVisual();
    }
  };

  handle.addEventListener("pointerup", endPointer);
  handle.addEventListener("pointercancel", endPointer);

  handle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      finishPull();
    }
  });

  window.addEventListener("theme:changed", syncLit);
  resetPullVisual();
  syncLit();
}
