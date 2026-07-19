import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "shdt.theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = isDark ? "#0F1115" : "#FAFAF7";
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  const onChange = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener("shdt:theme", onChange);
  const mm = window.matchMedia("(prefers-color-scheme: dark)");
  mm.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("shdt:theme", onChange);
    mm.removeEventListener("change", onChange);
  };
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event("shdt:theme"));
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" } {
  const theme = useSyncExternalStore(subscribe, readStored, () => "dark");
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const resolved: "light" | "dark" =
    theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
  return { theme, setTheme, resolved };
}

/**
 * Inline script string, executed before React hydrates, to avoid the flash
 * of the wrong theme on first paint. Reads localStorage + system preference
 * and sets `class="dark"` on <html> synchronously.
 */
export const themeInitScript = `(() => {
  try {
    var t = localStorage.getItem("${KEY}") || "dark";
    var isDark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch (e) {}
})();`;