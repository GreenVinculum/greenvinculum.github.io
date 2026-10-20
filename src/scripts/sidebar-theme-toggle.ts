import { THEMES, toggleTheme } from "./theme-preference";

let themeListenerBound = false;

function syncSidebarThemeToggle() {
  const isLight = document.documentElement.getAttribute("data-theme") === THEMES.light;
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-sidebar-theme-toggle]");
  for (const button of buttons) {
    if (button.dataset.bound !== "true") {
      button.dataset.bound = "true";
      button.addEventListener("click", () => {
        if (typeof window.__toggleTheme === "function") window.__toggleTheme();
        else toggleTheme();
      });
    }
    button.setAttribute("aria-pressed", String(isLight));
    button.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    button.title = isLight ? "Switch to dark theme" : "Switch to light theme";
    const label = button.querySelector<HTMLElement>("[data-sidebar-theme-label]");
    if (label) label.textContent = isLight ? "Dark theme" : "Light theme";
  }
}

export function initSidebarThemeToggle(): void {
  if (!themeListenerBound) {
    themeListenerBound = true;
    window.addEventListener("theme:changed", syncSidebarThemeToggle);
  }
  syncSidebarThemeToggle();
}
