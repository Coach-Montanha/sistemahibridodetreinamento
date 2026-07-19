import { useSyncExternalStore } from "react";
import {
  BLOCK_FORMAT_LABEL,
  ENABLED_FORMATS,
  type BlockFormat,
} from "./methodology";

/**
 * Registro leve de "presets" de bloco: rótulos customizados e formatos extras
 * criados pelo coach, persistidos no navegador. Cada preset se apoia em um
 * "base" (BlockFormat) — reutilizamos os editores existentes.
 */

export type FormatPreset = {
  id: string;
  label: string;
  base: BlockFormat;
  defaults?: Record<string, any>;
  builtin?: boolean;
};

type Registry = {
  labels: Partial<Record<BlockFormat, string>>;
  hidden: BlockFormat[];
  custom: FormatPreset[];
};

const KEY = "shdt.format-registry.v1";

const EMPTY: Registry = Object.freeze({ labels: {}, hidden: [], custom: [] }) as Registry;

// Cache the last snapshot so useSyncExternalStore doesn't loop on new refs.
let cache: Registry = EMPTY;
let cacheRaw: string | null = null;

function read(): Registry {
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
    cache = {
      labels: parsed.labels ?? {},
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
    return cache;
  } catch {
    cache = EMPTY;
    cacheRaw = null;
    return cache;
  }
}

function getServerSnapshot(): Registry {
  return EMPTY;
}

function write(next: Registry) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(next);
  window.localStorage.setItem(KEY, raw);
  cacheRaw = raw;
  cache = next;
  window.dispatchEvent(new Event("format-registry:changed"));
}

function subscribe(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener("format-registry:changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("format-registry:changed", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useFormatRegistry() {
  const registry = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const builtins: FormatPreset[] = ENABLED_FORMATS.map((f) => ({
    id: `builtin:${f}`,
    label: registry.labels[f] ?? BLOCK_FORMAT_LABEL[f],
    base: f,
    builtin: true,
  }));

  const visibleBuiltins = builtins.filter((p) => !registry.hidden.includes(p.base));
  const presets: FormatPreset[] = [...visibleBuiltins, ...registry.custom];

  return {
    registry,
    builtins,
    presets,
    renameBuiltin(base: BlockFormat, label: string) {
      const next = { ...registry, labels: { ...registry.labels, [base]: label } };
      if (!label || label === BLOCK_FORMAT_LABEL[base]) delete next.labels[base];
      write(next);
    },
    toggleBuiltin(base: BlockFormat, visible: boolean) {
      const set = new Set(registry.hidden);
      if (visible) set.delete(base);
      else set.add(base);
      write({ ...registry, hidden: Array.from(set) });
    },
    addCustom(preset: Omit<FormatPreset, "id" | "builtin">) {
      const id = `custom:${Date.now().toString(36)}`;
      write({ ...registry, custom: [...registry.custom, { ...preset, id }] });
    },
    updateCustom(id: string, patch: Partial<FormatPreset>) {
      write({
        ...registry,
        custom: registry.custom.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    removeCustom(id: string) {
      write({ ...registry, custom: registry.custom.filter((p) => p.id !== id) });
    },
  };
}

/** Lê o label efetivo de um formato (respeitando renomeações do coach). */
export function useFormatLabel(base: BlockFormat): string {
  const { registry } = useFormatRegistry();
  return registry.labels[base] ?? BLOCK_FORMAT_LABEL[base];
}