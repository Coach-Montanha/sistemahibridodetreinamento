import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const FORMAT_DEF_SCHEMA = z.object({
  id: z.string(),
  base_format: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(), ...{} as any,
  default_config: z.record(z.any()).default({}),
  is_active: z.boolean().default(true),
  is_builtin: z.boolean().default(false),
});

const SET_TYPE_DEF_SCHEMA = z.object({
  id: z.string(),
  label: z.string(), ...{} as any,

  fields: z.array(z.record(z.any())).default([]),
  is_active: z.boolean().default(true),
  is_builtin: z.boolean().default(false),
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
    const { data: coach } = await context.supabase.from("coaches").select("id").maybeSingle();
    const { error } = await context.supabase
      .from("format_definitions")
      .upsert({ 
        id: data.id,
        base_format: data.base_format,
        label: data.label,
        description: data.description,
        default_config: data.default_config as Json,
        is_active: data.is_active,
        is_builtin: data.is_builtin,
        coach_id: coach?.id 
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFormatDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: any) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("format_definitions")
      .delete()
      .eq("id", data.id);
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
    const { data: coach } = await context.supabase.from("coaches").select("id").maybeSingle();
    const { error } = await context.supabase
      .from("set_type_definitions")
      .upsert({ 
        id: data.id,
        label: data.label,
        fields: data.fields as unknown as Json,
        is_active: data.is_active,
        is_builtin: data.is_builtin,
        coach_id: coach?.id 
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSetTypeDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: any) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("set_type_definitions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
