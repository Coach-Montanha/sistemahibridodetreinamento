import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const FORMAT_DEF_SCHEMA = z.object({
  id: z.string(),
  base_format: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  default_config: z.record(z.any()).default({}),
  is_active: z.boolean().default(true),
  is_builtin: z.boolean().default(false),
});

const SET_TYPE_DEF_SCHEMA = z.object({
  id: z.string(),
  label: z.string(),
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
    const typed = data as any;
    const { data: coach } = await context.supabase.from("coaches").select("id").maybeSingle();
    const { error } = await context.supabase
      .from("format_definitions")
      .upsert({ 
        id: typed.id,
        base_format: typed.base_format,
        label: typed.label,
        description: typed.description,
        default_config: typed.default_config as Json,
        is_active: typed.is_active,
        is_builtin: typed.is_builtin,
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
        fields: typed.fields as unknown as Json,
        is_active: typed.is_active,
        is_builtin: typed.is_builtin,
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
