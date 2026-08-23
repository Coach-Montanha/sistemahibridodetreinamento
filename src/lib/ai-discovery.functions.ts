import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Utilitário para obter o melhor modelo disponível dinamicamente.
 * Evita erros de "invalid model" quando o gateway atualiza a lista de modelos permitidos.
 */
export const getBestAvailableModel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Delega ao adaptador único do gateway: resolve LOVABLE_AI_MODEL quando
    // configurada e cai no modelo padrão permitido (google/gemini-2.5-flash).
    const { resolveAiModel } = await import("@/lib/ai-gateway.server");
    return resolveAiModel();
  });
