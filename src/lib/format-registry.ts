import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BLOCK_FORMAT_LABEL,
  ENABLED_FORMATS,
  type BlockFormat,
} from "./methodology";
import {
  listFormatDefinitions,
  upsertFormatDefinition,
  deleteFormatDefinition,
} from "./catalog-sync.functions";

/**
 * Registro leve de "presets" de bloco: rótulos customizados e formatos extras
 * criados pelo coach, persistidos no banco de dados.
 */

export type FormatPreset = {
  id: string;
  label: string;
  base: BlockFormat;
  description?: string;
  defaults?: Record<string, any>;
  builtin?: boolean;
};

export function useFormatRegistry() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listFormatDefinitions);
  const upsertFn = useServerFn(upsertFormatDefinition);
  const deleteFn = useServerFn(deleteFormatDefinition);

  const { data: definitions = [] } = useQuery({
    queryKey: ["format-definitions"],
    queryFn: () => listFn(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["format-definitions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["format-definitions"] }),
  });

  const builtins: FormatPreset[] = ENABLED_FORMATS.map((f) => {
    const def = definitions.find((d: any) => d.id === `builtin:${f}`);
    return {
      id: `builtin:${f}`,
      label: def?.label ?? BLOCK_FORMAT_LABEL[f],
      base: f,
      description: def?.description ?? undefined,
      defaults: (def?.default_config as Record<string, any>) ?? undefined,
      builtin: true,
    };
  });

  const custom: FormatPreset[] = definitions
    .filter((d: any) => !d.is_builtin)
    .map((d: any) => ({
      id: d.id,
      label: d.label,
      base: d.base_format as BlockFormat,
      description: d.description ?? undefined,
      defaults: (d.default_config as Record<string, any>) ?? undefined,
      builtin: false,
    }));

  const presets: FormatPreset[] = [...builtins, ...custom].filter(p => {
    const def = definitions.find((d: any) => d.id === p.id);
    return def ? def.is_active : true;
  });

  return {
    presets,
    builtins,
    isLoading: false,
    renameBuiltin(base: BlockFormat, label: string) {
      upsertMutation.mutate({
        id: `builtin:${base}`,
        base_format: base,
        label,
        is_builtin: true,
        is_active: true,
      });
    },
    describeBuiltin(base: BlockFormat, description: string) {
      const def = definitions.find((d: any) => d.id === `builtin:${base}`);
      upsertMutation.mutate({
        id: `builtin:${base}`,
        base_format: base,
        label: def?.label ?? BLOCK_FORMAT_LABEL[base],
        description,
        is_builtin: true,
        is_active: true,
      });
    },
    setBuiltinDefaults(base: BlockFormat, defaults: Record<string, any>) {
      const def = definitions.find((d: any) => d.id === `builtin:${base}`);
      upsertMutation.mutate({
        id: `builtin:${base}`,
        base_format: base,
        label: def?.label ?? BLOCK_FORMAT_LABEL[base],
        default_config: defaults,
        is_builtin: true,
        is_active: true,
      });
    },
    resetBuiltin(base: BlockFormat) {
      deleteMutation.mutate(`builtin:${base}`);
    },
    removePreset(id: string) {
      if (id.startsWith("builtin:")) {
        const base = id.replace("builtin:", "") as BlockFormat;
        const def = definitions.find((d: any) => d.id === id);
        upsertMutation.mutate({
          id,
          base_format: base,
          label: def?.label ?? BLOCK_FORMAT_LABEL[base],
          is_active: false,
          is_builtin: true,
        });
      } else {
        deleteMutation.mutate(id);
      }
    },
    toggleBuiltin(base: BlockFormat, visible: boolean) {
      const id = `builtin:${base}`;
      const def = definitions.find((d: any) => d.id === id);
      upsertMutation.mutate({
        id,
        base_format: base,
        label: def?.label ?? BLOCK_FORMAT_LABEL[base],
        is_active: visible,
        is_builtin: true,
      });
    },
    async addCustom(preset: Omit<FormatPreset, "id" | "builtin">) {
      const id = `custom:${Date.now().toString(36)}`;
      await upsertMutation.mutateAsync({
        id,
        base_format: preset.base,
        label: preset.label,
        description: preset.description,
        default_config: preset.defaults,
        is_builtin: false,
        is_active: true,
      });
      return id;
    },
    updateCustom(id: string, patch: Partial<FormatPreset>) {
      const def = definitions.find((d: any) => d.id === id);
      if (!def) return;
      upsertMutation.mutate({
        ...def,
        base_format: patch.base ?? def.base_format,
        label: patch.label ?? def.label,
        description: patch.description ?? def.description,
        default_config: patch.defaults ?? def.default_config,
      });
    },
    async duplicatePreset(source: FormatPreset) {
      const id = `custom:${Date.now().toString(36)}`;
      await upsertMutation.mutateAsync({
        id,
        base_format: source.base,
        label: `${source.label} (cópia)`,
        description: source.description,
        default_config: source.defaults,
        is_builtin: false,
        is_active: true,
      });
      return id;
    },
    reorderPresets(activeId: string, overId: string) {
      // TODO: Implement server-side ordering if needed
    },
  };
}

/** Lê o label efetivo de um formato (respeitando renomeações do coach). */
export function useFormatLabel(base: BlockFormat): string {
  const { presets } = useFormatRegistry();
  const found = presets.find(p => p.id === `builtin:${base}` || p.id === base);
  return found?.label ?? BLOCK_FORMAT_LABEL[base] ?? base;
}
