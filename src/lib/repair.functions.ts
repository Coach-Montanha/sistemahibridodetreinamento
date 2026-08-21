import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Localiza sessões com exercícios pendentes e tenta reparar o vínculo
 * baseado em regras determinísticas.
 */
export const repairPendingExerciseLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ dryRun: z.boolean().default(true) }).parse(data))
  .handler(async ({ data: { dryRun }, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Localizar itens de sessão suspeitos
    const { data: suspectItems } = await supabaseAdmin
      .from("session_block_exercises")
      .select(`
        id, 
        nome_livre, 
        exercise_id, 
        ordem,
        session_block_id
      `)
      .or("exercise_id.is.null,nome_livre.ilike.[Pendente] %")
      .limit(500);

    if (!suspectItems || suspectItems.length === 0) return { repaired: 0, suspects: 0, dryRun };

    // 2. Buscar exercícios reais para correspondência
    const { data: exercises } = await supabaseAdmin
      .from("exercises")
      .select("id, nome_pt, source_id")
      .is("coach_id", null); // Prioridade para catálogo global

    let repairedCount = 0;
    const report: any[] = [];

    for (const item of suspectItems) {
      const originalText = item.nome_livre || "";
      let matchedId: string | null = null;

      // Extração de ID do dataset se estiver no nome do arquivo (ex: 0361-...)
      const sourceIdMatch = originalText.match(/^(\d{4})-/);
      if (sourceIdMatch) {
        const sourceId = sourceIdMatch[1];
        const match = exercises?.find(ex => ex.source_id === sourceId);
        if (match) matchedId = match.id;
      }

      // Match por nome se o prefixo [Pendente] for removido
      if (!matchedId) {
        const cleanName = originalText.replace(/^\[Pendente\]\s*/, "").split(".")[0].trim();
        const match = exercises?.find(ex => ex.nome_pt?.toLowerCase() === cleanName.toLowerCase());
        if (match) matchedId = match.id;
      }

      if (matchedId) {
        if (!dryRun) {
          await supabaseAdmin
            .from("session_block_exercises")
            .update({ 
              exercise_id: matchedId,
              nome_livre: null 
            })
            .eq("id", item.id);
        }
        repairedCount++;
        report.push({ id: item.id, from: originalText, to: matchedId });
      }
    }

    return { 
      repaired: repairedCount, 
      suspects: suspectItems.length, 
      dryRun,
      report: report.slice(0, 50) 
    };
  });
