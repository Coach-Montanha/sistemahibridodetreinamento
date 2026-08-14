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
  description?: string;
  defaults?: Record<string, any>;
  builtin?: boolean;
};

type Registry = {
  labels: Partial<Record<BlockFormat, string>>;
  descriptions: Partial<Record<BlockFormat, string>>;
  builtinDefaults: Partial<Record<BlockFormat, Record<string, any>>>;
  hidden: BlockFormat[];
  custom: FormatPreset[];
  order: string[];
};

const KEY = "shdt.format-registry.v1";

const EMPTY: Registry = Object.freeze({
  labels: {},
  descriptions: {},
  builtinDefaults: {},
  hidden: [],
  custom: [],
  order: [],
}) as Registry;

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
      descriptions: parsed.descriptions ?? {},
      builtinDefaults: parsed.builtinDefaults ?? {},
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      order: Array.isArray(parsed.order) ? parsed.order : [],
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
    description: registry.descriptions[f],
    defaults: registry.builtinDefaults[f],
    builtin: true,
  }));

  const visibleBuiltins = builtins.filter((p) => !registry.hidden.includes(p.base));
  const rawVisible: FormatPreset[] = [...visibleBuiltins, ...registry.custom];
  const orderMap = new Map(registry.order.map((id, i) => [id, i]));
  const presets: FormatPreset[] = [...rawVisible].sort((a, b) => {
    const ai = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
    const bi = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });

  return {
    registry,
    builtins,
    presets,
    renameBuiltin(base: BlockFormat, label: string) {
      const next = { ...registry, labels: { ...registry.labels, [base]: label } };
      if (!label || label === BLOCK_FORMAT_LABEL[base]) delete next.labels[base];
      write(next);
    },
    describeBuiltin(base: BlockFormat, description: string) {
      const next = { ...registry, descriptions: { ...registry.descriptions, [base]: description } };
      if (!description) delete next.descriptions[base];
      write(next);
    },
    setBuiltinDefaults(base: BlockFormat, defaults: Record<string, any>) {
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(defaults)) {
        if (v !== null && v !== undefined && v !== "") cleaned[k] = v;
      }
      const nextDefaults = { ...registry.builtinDefaults };
      if (Object.keys(cleaned).length === 0) delete nextDefaults[base];
      else nextDefaults[base] = cleaned;
      write({ ...registry, builtinDefaults: nextDefaults });
    },
    resetBuiltin(base: BlockFormat) {
      const labels = { ...registry.labels }; delete labels[base];
      const descriptions = { ...registry.descriptions }; delete descriptions[base];
      const builtinDefaults = { ...registry.builtinDefaults }; delete builtinDefaults[base];
      write({ ...registry, labels, descriptions, builtinDefaults, hidden: registry.hidden.filter((h) => h !== base) });
    },
    removePreset(id: string) {
      if (id.startsWith("builtin:")) {
        const base = id.replace("builtin:", "") as BlockFormat;
        const set = new Set(registry.hidden);
        set.add(base);
        write({ ...registry, hidden: Array.from(set) });
      } else {
        write({ ...registry, custom: registry.custom.filter((p) => p.id !== id) });
      }
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
      return id;
    },
    updateCustom(id: string, patch: Partial<FormatPreset>) {
      write({
        ...registry,
        custom: registry.custom.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    duplicatePreset(source: FormatPreset) {
      const id = `custom:${Date.now().toString(36)}`;
      const clone: FormatPreset = {
        id,
        label: `${source.label} (cópia)`,
        base: source.base,
        description: source.description,
        defaults: source.defaults ? { ...source.defaults } : undefined,
      };
      write({ ...registry, custom: [...registry.custom, clone] });
      return id;
    },
    reorderPresets(activeId: string, overId: string) {
      const ids = presets.map((p) => p.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return;
      const next = [...ids];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      write({ ...registry, order: next });
    },
  };
}

/** Lê o label efetivo de um formato (respeitando renomeações do coach). */
export function useFormatLabel(base: BlockFormat): string {
  const { registry } = useFormatRegistry();
  return registry.labels[base] ?? BLOCK_FORMAT_LABEL[base];
}