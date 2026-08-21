/**
 * Adaptador único do Lovable AI Gateway.
 *
 * Todos os motores (tradução individual, tradução em massa, Híbrido,
 * Kettlebell Fitness e continuação de programas) devem passar por aqui.
 * Regras:
 *  - modelo resolvido em um único lugar (LOVABLE_AI_MODEL quando existir);
 *  - nunca expor a chave ao navegador (arquivo *.server.ts);
 *  - telemetria sem Authorization / API key / prompt completo;
 *  - erros HTTP classificados em códigos estáveis, nunca convertidos em sucesso.
 */

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_REQUEST_INVALID"
  | "AI_MODEL_INVALID"
  | "AI_RESPONSE_FORMAT_UNSUPPORTED"
  | "AI_PAYLOAD_TOO_LARGE"
  | "AI_UNAUTHORIZED"
  | "AI_RATE_LIMITED"
  | "AI_NO_CREDITS"
  | "AI_UPSTREAM_ERROR"
  | "AI_EMPTY_CONTENT"
  | "AI_INVALID_JSON";

export class AiGatewayError extends Error {
  code: AiErrorCode;
  status: number | null;
  detail: string;
  constructor(code: AiErrorCode, message: string, status: number | null = null, detail = "") {
    super(message);
    this.name = "AiGatewayError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Limite conservador de caracteres do prompt antes de considerar payload grande demais. */
export const MAX_PROMPT_CHARS = 120_000;

export function resolveAiModel(): string {
  const configured = process.env.LOVABLE_AI_MODEL;
  if (configured && configured.trim().length > 0) return configured.trim();
  return "google/gemini-2.5-flash";
}

function sanitize(body: string): string {
  return body.replace(/(sk-|Bearer\s+)[A-Za-z0-9._-]+/gi, "[redacted]").slice(0, 600);
}

function classify(status: number, body: string): AiGatewayError {
  const lower = body.toLowerCase();
  if (status === 400) {
    if (lower.includes("response_format") || lower.includes("json_object")) {
      return new AiGatewayError(
        "AI_RESPONSE_FORMAT_UNSUPPORTED",
        "O modelo não aceitou o formato de resposta estruturada.",
        status,
        sanitize(body),
      );
    }
    if (lower.includes("model")) {
      return new AiGatewayError(
        "AI_MODEL_INVALID",
        "O modelo de IA configurado não é aceito pelo gateway.",
        status,
        sanitize(body),
      );
    }
    if (lower.includes("token") || lower.includes("too large") || lower.includes("length")) {
      return new AiGatewayError(
        "AI_PAYLOAD_TOO_LARGE",
        "O conteúdo enviado excedeu o limite do modelo.",
        status,
        sanitize(body),
      );
    }
    return new AiGatewayError("AI_REQUEST_INVALID", "Requisição inválida para a IA.", status, sanitize(body));
  }
  if (status === 401 || status === 403) {
    return new AiGatewayError("AI_UNAUTHORIZED", "Acesso à IA bloqueado ou não autorizado.", status, sanitize(body));
  }
  if (status === 429) {
    return new AiGatewayError("AI_RATE_LIMITED", "Limite de uso da IA atingido, tente em instantes.", status, sanitize(body));
  }
  if (status === 402) {
    return new AiGatewayError("AI_NO_CREDITS", "Créditos de IA esgotados.", status, sanitize(body));
  }
  return new AiGatewayError("AI_UPSTREAM_ERROR", `Falha temporária da IA (erro ${status}).`, status, sanitize(body));
}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

export type CallAiJsonArgs = {
  /** Nome curto do fluxo, só para telemetria (ex.: "traducao-individual"). */
  scope: string;
  system?: string;
  prompt: string;
  temperature?: number;
};

export type CallAiJsonResult<T = any> = {
  json: T;
  raw: string;
  model: string;
  finishReason: string | null;
  requestId: string | null;
};

/**
 * Chamada única de JSON estruturado ao gateway.
 * Faz no máximo UMA repetição sem `response_format` quando o 400 for
 * especificamente causado por esse campo.
 */
export async function callLovableAiJson<T = any>(args: CallAiJsonArgs): Promise<CallAiJsonResult<T>> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new AiGatewayError("AI_NOT_CONFIGURED", "Serviço de IA indisponível no momento.");
  }

  const promptChars = args.prompt.length + (args.system?.length ?? 0);
  if (promptChars > MAX_PROMPT_CHARS) {
    throw new AiGatewayError(
      "AI_PAYLOAD_TOO_LARGE",
      `As instruções/histórico excedem o limite (${promptChars} caracteres, máximo ${MAX_PROMPT_CHARS}).`,
    );
  }

  const model = resolveAiModel();

  const attempt = async (useResponseFormat: boolean) => {
    const messages: Array<{ role: string; content: string }> = [];
    if (args.system) messages.push({ role: "system", content: args.system });
    messages.push({
      role: "user",
      content: useResponseFormat ? args.prompt : `${args.prompt}\n\nResponda SOMENTE com JSON válido, sem texto extra.`,
    });

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model,
        messages,
        ...(useResponseFormat ? { response_format: { type: "json_object" } } : {}),
        ...(args.temperature != null ? { temperature: args.temperature } : {}),
      }),
    });

    const requestId = res.headers.get("x-request-id");

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = classify(res.status, body);
      console.error("[ai-gateway] falha", {
        scope: args.scope,
        model,
        status: res.status,
        code: err.code,
        requestId,
        promptChars,
        detail: err.detail,
      });
      throw err;
    }

    const payload: any = await res.json();
    const conteudo = payload?.choices?.[0]?.message?.content;
    const finishReason = payload?.choices?.[0]?.finish_reason ?? null;

    console.info("[ai-gateway] ok", {
      scope: args.scope,
      model,
      requestId,
      finishReason,
      responseChars: typeof conteudo === "string" ? conteudo.length : 0,
    });

    if (typeof conteudo !== "string" || conteudo.trim().length === 0) {
      throw new AiGatewayError("AI_EMPTY_CONTENT", "A IA não retornou conteúdo.", 200);
    }

    let json: T;
    try {
      json = JSON.parse(stripFences(conteudo)) as T;
    } catch {
      throw new AiGatewayError("AI_INVALID_JSON", "A IA retornou um JSON inválido.", 200, sanitize(conteudo));
    }

    return { json, raw: conteudo, model, finishReason, requestId } as CallAiJsonResult<T>;
  };

  try {
    return await attempt(true);
  } catch (err) {
    if (err instanceof AiGatewayError && err.code === "AI_RESPONSE_FORMAT_UNSUPPORTED") {
      console.warn("[ai-gateway] repetindo sem response_format", { scope: args.scope, model });
      return await attempt(false);
    }
    throw err;
  }
}
