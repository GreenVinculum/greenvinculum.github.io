/** DaisyUI theme names used for light (warm white) and dark (bluish black). */
export const THEME_STORAGE_KEY = "themePreference";
export const THEMES = {
  light: "winter",
  dark: "dim",
} as const;

/** VHS look paired with each theme: dark → cinematic, light → neon. */
export const VHS_STYLES = {
  [THEMES.dark]: "cinematic",
  [THEMES.light]: "neon",
} as const;

export type ThemeName = (typeof THEMES)[keyof typeof THEMES];
export type VhsStyleName = (typeof VHS_STYLES)[ThemeName];

export function vhsStyleForTheme(theme: ThemeName): VhsStyleName {
  return VHS_STYLES[theme];
}

export function isThemeName(value: string | null): value is ThemeName {
  return value === THEMES.light || value === THEMES.dark;
}

export function getSystemTheme(): ThemeName {
  if (typeof window === "undefined") return THEMES.light;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEMES.dark : THEMES.light;
}

export function getStoredTheme(): ThemeName | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(stored) ? stored : null;
}

export function resolveTheme(): ThemeName {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemeName): void {
  const root = document.documentElement;
  const vhsStyle = vhsStyleForTheme(theme);

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-vhs-style", vhsStyle);
  root.style.colorScheme = theme === THEMES.dark ? "dark" : "light";

  const applyToBody = () => {
    document.body?.setAttribute("data-theme", theme);
    document.body?.setAttribute("data-vhs-style", vhsStyle);
  };
  if (document.body) {
    applyToBody();
  } else {
    document.addEventListener("DOMContentLoaded", applyToBody, { once: true });
  }

  window.dispatchEvent(new CustomEvent("theme:changed", { detail: { theme, vhsStyle } }));
}

export function setTheme(theme: ThemeName): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export function clearThemeOverride(): void {
  localStorage.removeItem(THEME_STORAGE_KEY);
  applyTheme(getSystemTheme());
}

export function toggleTheme(): void {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === THEMES.dark ? THEMES.light : THEMES.dark);
}

let systemListenerAttached = false;

export function initThemePreference(): void {
  localStorage.removeItem("vhsStylePreference");
  syncThemePreference();

  if (systemListenerAttached) return;
  systemListenerAttached = true;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (!getStoredTheme()) {
      applyTheme(getSystemTheme());
    }
  };

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSystemChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(onSystemChange);
  }
}

export function syncThemePreference(): void {
  applyTheme(resolveTheme());
}

declare global {
  interface Window {
    __setTheme?: (theme: ThemeName) => void;
    __toggleTheme?: () => void;
    __clearThemeOverride?: () => void;
  }
}

export function attachThemeGlobals(): void {
  window.__setTheme = setTheme;
  window.__toggleTheme = toggleTheme;
  window.__clearThemeOverride = clearThemeOverride;
}
