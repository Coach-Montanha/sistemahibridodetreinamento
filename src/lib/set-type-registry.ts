import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SetFieldKey =
  | "serie_rep"
  | "carga"
  | "tempo_seg"
  | "intervalo_seg"
  | "inclinacao_pct"
  | "distancia"
  | "ritmo"
  | "cadencia"
  | "obs";

export interface SetFieldConfig {
  key: SetFieldKey;
  label: string;
  placeholder?: string;
  wide?: boolean;
}

export interface SetTypePreset {
  id: string;
  label: string;
  fields: SetFieldConfig[];
  builtin?: boolean;
}

interface SetTypeRegistry {
  presets: SetTypePreset[];
  addCustom: (preset: Omit<SetTypePreset, "id" | "builtin">) => string;
  updateCustom: (id: string, patch: Partial<SetTypePreset>) => void;
  removePreset: (id: string) => void;
}

export const BUILTIN_SET_TYPES: SetTypePreset[] = [
  {
    id: "reps_carga",
    label: "Repetições e carga",
    builtin: true,
    fields: [
      { key: "serie_rep", label: "Série/rep", placeholder: "3x15" },
      { key: "carga", label: "Carga (kg)", placeholder: "0" },
      { key: "intervalo_seg", label: "Intervalo (s)", placeholder: "60" },
    ],
  },
  {
    id: "reps_carga_tempo",
    label: "Repetições, carga e tempo",
    builtin: true,
    fields: [
      { key: "serie_rep", label: "Série/rep", placeholder: "3x15" },
      { key: "carga", label: "Carga (kg)", placeholder: "0" },
      { key: "tempo_seg", label: "Tempo (s)", placeholder: "30" },
      { key: "intervalo_seg", label: "Intervalo (s)", placeholder: "60" },
    ],
  },
  {
    id: "reps_tempo",
    label: "Repetições e tempo",
    builtin: true,
    fields: [
      { key: "serie_rep", label: "Série/rep", placeholder: "3x15" },
      { key: "tempo_seg", label: "Tempo (s)", placeholder: "30" },
      { key: "intervalo_seg", label: "Intervalo (s)", placeholder: "60" },
    ],
  },
  {
    id: "tempo_inclinacao",
    label: "Tempo e inclinação",
    builtin: true,
    fields: [
      { key: "tempo_seg", label: "Tempo (s)", placeholder: "60" },
      { key: "inclinacao_pct", label: "Inclinação (%)", placeholder: "5" },
      { key: "intervalo_seg", label: "Intervalo (s)", placeholder: "60" },
    ],
  },
  {
    id: "corrida",
    label: "Corrida",
    builtin: true,
    fields: [
      { key: "distancia", label: "Distância", placeholder: "1 km" },
      { key: "ritmo", label: "Ritmo (min/km)", placeholder: "5:30" },
      { key: "intervalo_seg", label: "Intervalo (s)", placeholder: "120" },
    ],
  },
  {
    id: "cadencia",
    label: "Cadência",
    builtin: true,
    fields: [
      { key: "serie_rep", label: "Série/rep", placeholder: "3x8" },
      { key: "cadencia", label: "Cadência", placeholder: "3-1-2-0" },
      { key: "intervalo_seg", label: "Intervalo (s)", placeholder: "60" },
    ],
  },
  {
    id: "observacoes",
    label: "Observações",
    builtin: true,
    fields: [
      { key: "obs", label: "Observações", placeholder: "Ex: foco na descida", wide: true },
    ],
  },
];

export const useSetTypeRegistry = create<SetTypeRegistry>()(
  persist(
    (set) => ({
      presets: BUILTIN_SET_TYPES,
      addCustom: (preset) => {
        const id = `custom:${Date.now().toString(36)}`;
        set((state) => ({
          presets: [...state.presets, { ...preset, id, builtin: false }],
        }));
        return id;
      },
      updateCustom: (id, patch) => {
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },
      removeCustom: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        }));
      },
    }),
    {
      name: "shdt.set-type-registry.v1",
    }
  )
);
