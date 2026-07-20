import { useSyncExternalStore } from "react";
import type { BuilderSet } from "./session-builder-store";

export type SetPreset = {
  id: string;
  name: string;
  sets: Omit<BuilderSet, "id">[];
  updatedAt: number;
};

const KEY = "shdt.exercise-set-presets.v1";
const EMPTY: SetPreset[] = Object.freeze([]) as unknown as SetPreset[];

let cache: SetPreset[] = EMPTY;
let cacheRaw: string | null = null;

function read(): SetPreset[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cacheRaw) return cache;
    cacheRaw = raw;
    if (!raw) {
      cache = EMPTY;
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed : EMPTY;
    return cache;
  } catch {
    cache = EMPTY;
    cacheRaw = null;
    return cache;
  }
}

function write(next: SetPreset[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(next);
  window.localStorage.setItem(KEY, raw);
  cacheRaw = raw;
  cache = next;
  window.dispatchEvent(new Event("set-presets:changed"));
}

function subscribe(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener("set-presets:changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("set-presets:changed", handler);
    window.removeEventListener("storage", handler);
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function useSetPresets() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);

  return {
    presets: list,
    save(name: string, sets: BuilderSet[]) {
      const clean = sets.map(({ id: _id, ...rest }) => rest);
      const now = Date.now();
      const existingIdx = list.findIndex(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      const next =
        existingIdx >= 0
          ? list.map((p, i) =>
              i === existingIdx ? { ...p, sets: clean, updatedAt: now } : p
            )
          : [...list, { id: uid(), name: name.trim(), sets: clean, updatedAt: now }];
      write(next);
    },
    remove(id: string) {
      write(list.filter((p) => p.id !== id));
    },
  };
}

export function materializePreset(preset: SetPreset): BuilderSet[] {
  return preset.sets.map((s) => ({ ...s, id: Math.random().toString(36).slice(2, 10) }));
}