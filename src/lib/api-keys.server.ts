import type { SupabaseClient } from "@supabase/supabase-js";

export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Resolve o coach do usuário autenticado usando o client com RLS do próprio usuário. */
export async function resolveCoachId(supabase: SupabaseClient<any>): Promise<string | null> {
  const { data, error } = await supabase.rpc("auth_coach_id");
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

/** Gera uma chave de 256 bits (equivalente a `openssl rand -hex 32`) com prefixo legível. */
export function mintKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `chm_sk_${hex}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}