// Helpers para os endpoints /api/public/* (leitura externa autenticada por chave).
export const PUBLIC_API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...PUBLIC_API_CORS },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: PUBLIC_API_CORS });
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Valida o header `x-api-key` contra as chaves geradas no app (tabela api_keys)
 * e, como fallback, contra o secret PUBLIC_API_KEY. Devolve o coach a que a
 * chave dá acesso. Lança ApiError(401) quando inválida.
 */
export async function requireApiKey(request: Request): Promise<{ coachId: string }> {
  const provided = request.headers.get("x-api-key");
  if (!provided) throw new ApiError(401, "Unauthorized");

  const { sha256Hex } = await import("./api-keys.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id, coach_id")
    .eq("key_hash", await sha256Hex(provided))
    .is("revoked_at", null)
    .maybeSingle();

  if (data) {
    await supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
    return { coachId: data.coach_id as string };
  }

  // Fallback: chave legada guardada em variável de ambiente.
  const expected = process.env.PUBLIC_API_KEY;
  const envCoachId = process.env.PUBLIC_API_COACH_ID;
  if (expected && envCoachId && provided === expected) {
    return { coachId: envCoachId };
  }

  throw new ApiError(401, "Unauthorized");
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json({ error: error.message }, error.status);
  }
  console.error("[public-api]", error);
  return json({ error: "Internal error" }, 500);
}