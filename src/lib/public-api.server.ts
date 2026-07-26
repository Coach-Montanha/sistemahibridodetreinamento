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
 * Valida o header `x-api-key` contra o secret PUBLIC_API_KEY e devolve o
 * coach a que a chave dá acesso. Lança ApiError(401) quando inválida.
 */
export function requireApiKey(request: Request): { coachId: string } {
  const expected = process.env.PUBLIC_API_KEY;
  const coachId = process.env.PUBLIC_API_COACH_ID;

  if (!expected || !coachId) {
    console.error("[public-api] PUBLIC_API_KEY/PUBLIC_API_COACH_ID não configurados");
    throw new ApiError(500, "Internal error");
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    throw new ApiError(401, "Unauthorized");
  }

  return { coachId };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json({ error: error.message }, error.status);
  }
  console.error("[public-api]", error);
  return json({ error: "Internal error" }, 500);
}