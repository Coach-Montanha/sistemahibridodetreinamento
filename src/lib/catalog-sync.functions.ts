import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { ENABLED_FORMATS, BLOCK_FORMAT_LABEL } from "./methodology";

// Note: Using broad validation as z.object({ ... }).parse(raw) without refinements
// to stay compatible with the server function environment's specific schema handling.
const FORMAT_DEF_SCHEMA = z.object({
  id: z.string(),
  base_format: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  default_config: z.any().optional(),
  is_active: z.boolean().optional(),
  is_builtin: z.boolean().optional(),
  metadata: z.any().optional(),
});

const SET_TYPE_DEF_SCHEMA = z.object({
  id: z.string(),
  label: z.string(),
  fields: z.any().optional(),
  is_active: z.boolean().optional(),
  is_builtin: z.boolean().optional(),
});

export const listFormatDefinitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("format_definitions")
      .select("*")
      .order("label");
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertFormatDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: any) => FORMAT_DEF_SCHEMA.parse(raw))
  .handler(async ({ data, context }) => {
    const typed = data as any;
    const { data: coach } = await context.supabase.from("coaches").select("id").maybeSingle();
    const { error } = await context.supabase
      .from("format_definitions")
      .upsert({ 
        id: typed.id,
        base_format: typed.base_format,
        label: typed.label,
        description: typed.description,
        default_config: (typed.default_config ?? {}) as Json,
        is_active: typed.is_active ?? true,
        is_builtin: typed.is_builtin ?? false,
        metadata: (typed.metadata ?? {}) as Json,
        coach_id: coach?.id 
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFormatDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: any) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const typed = data as any;
    const { error } = await context.supabase
      .from("format_definitions")
      .delete()
      .eq("id", typed.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSetTypeDefinitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("set_type_definitions")
      .select("*")
      .order("label");
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertSetTypeDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: any) => SET_TYPE_DEF_SCHEMA.parse(raw))
  .handler(async ({ data, context }) => {
    const typed = data as any;
    const { data: coach } = await context.supabase.from("coaches").select("id").maybeSingle();
    const { error } = await context.supabase
      .from("set_type_definitions")
      .upsert({ 
        id: typed.id,
        label: typed.label,
        fields: (typed.fields ?? []) as unknown as Json,
        is_active: typed.is_active ?? true,
        is_builtin: typed.is_builtin ?? false,
        coach_id: coach?.id 
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSetTypeDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: any) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const typed = data as any;
    const { error } = await context.supabase
      .from("set_type_definitions")
      .delete()
      .eq("id", typed.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAvailableBlockFormats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: coach } = await context.supabase.from("coaches").select("id").maybeSingle();
    const { data: definitions, error } = await context.supabase
      .from("format_definitions")
      .select("*")
      .eq("is_active", true)
      .or(`coach_id.is.null,coach_id.eq.${coach?.id}`);

    if (error) throw new Error(error.message);

    const builtins = ENABLED_FORMATS.map(f => {
      const def = definitions?.find(d => d.id === `builtin:${f}`);
      return {
        id: `builtin:${f}`,
        base: f,
        label: def?.label || BLOCK_FORMAT_LABEL[f],
        description: def?.description || "",
        defaults: (def?.default_config as Record<string, any>) || {},
        builtin: true
      };
    });

    const custom = (definitions || [])
      .filter(d => !d.is_builtin)
      .map(d => ({
        id: d.id,
        base: d.base_format,
        label: d.label,
        description: d.description || "",
        defaults: (d.default_config as Record<string, any>) || {},
        builtin: false
      }));

    return [...builtins, ...custom];
  });
