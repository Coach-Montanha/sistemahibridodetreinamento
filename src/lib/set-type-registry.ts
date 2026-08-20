import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSetTypeDefinitions,
  upsertSetTypeDefinition,
  deleteSetTypeDefinition,
} from "./catalog-sync.functions";

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

export function useSetTypeRegistry() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listSetTypeDefinitions);
  const upsertFn = useServerFn(upsertSetTypeDefinition);
  const deleteFn = useServerFn(deleteSetTypeDefinition);

  const { data: definitions = [] } = useQuery({
    queryKey: ["set-type-definitions"],
    queryFn: () => listFn(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["set-type-definitions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["set-type-definitions"] }),
  });

  const custom: SetTypePreset[] = definitions
    .filter((d: any) => !d.is_builtin)
    .map((d: any) => ({
      id: d.id,
      label: d.label,
      fields: (d.fields as unknown as SetFieldConfig[]),
      builtin: false,
    }));

  const presets: SetTypePreset[] = [...BUILTIN_SET_TYPES, ...custom].filter(p => {
    const def = definitions.find((d: any) => d.id === p.id);
    return def ? def.is_active : true;
  });

  return {
    presets,
    addCustom: (preset: Omit<SetTypePreset, "id" | "builtin">) => {
      const id = `custom:${Date.now().toString(36)}`;
      upsertMutation.mutate({
        id,
        label: preset.label,
        fields: preset.fields,
        is_builtin: false,
        is_active: true,
      });
      return id;
    },
    updateCustom: (id: string, patch: Partial<SetTypePreset>) => {
      const def = definitions.find((d: any) => d.id === id);
      if (!def) return;
      upsertMutation.mutate({
        ...def,
        label: patch.label ?? def.label,
        fields: patch.fields ?? def.fields,
      });
    },
    removePreset: (id: string) => {
      if (id.startsWith("builtin:")) {
        const def = definitions.find((d: any) => d.id === id);
        upsertMutation.mutate({
          id,
          label: def?.label ?? id,
          is_active: false,
          is_builtin: true,
        });
      } else {
        deleteMutation.mutate(id);
      }
    },
  };
}
