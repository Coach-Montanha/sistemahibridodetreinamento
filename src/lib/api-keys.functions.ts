import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApiKeyRow = {
  id: string;
  nome: string;
  key_prefix: string;
  last4: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApiKeyRow[]> => {
    const { resolveCoachId, adminClient } = await import("./api-keys.server");
    const coachId = await resolveCoachId(context.supabase);
    if (!coachId) return [];
    const supabaseAdmin = await adminClient();
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, nome, key_prefix, last4, created_at, last_used_at, revoked_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ApiKeyRow[];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { nome?: string }) =>
    z.object({ nome: z.string().trim().min(1).max(60).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ key: string; row: ApiKeyRow }> => {
    const { resolveCoachId, adminClient, mintKey, sha256Hex } = await import(
      "./api-keys.server"
    );
    const coachId = await resolveCoachId(context.supabase);
    if (!coachId) throw new Error("Treinador não encontrado para este usuário");

    const key = mintKey();
    const supabaseAdmin = await adminClient();
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        coach_id: coachId,
        nome: data.nome ?? "Chave da API",
        key_hash: await sha256Hex(key),
        key_prefix: key.slice(0, 7),
        last4: key.slice(-4),
      })
      .select("id, nome, key_prefix, last4, created_at, last_used_at, revoked_at")
      .single();
    if (error) throw new Error(error.message);
    return { key, row: row as ApiKeyRow };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { resolveCoachId, adminClient } = await import("./api-keys.server");
    const coachId = await resolveCoachId(context.supabase);
    if (!coachId) throw new Error("Treinador não encontrado para este usuário");
    const supabaseAdmin = await adminClient();
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("coach_id", coachId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });