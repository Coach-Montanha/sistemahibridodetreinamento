import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Iniciar um job de tradução para o catálogo.
 */
export const startCatalogTranslationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Resolve coach_id
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
    if (!coachId) throw new Error("Coach ID não resolvido.");

    // 1. Identificar exercícios pendentes no catálogo
    // Como exercise_catalog é um schema importado, buscamos do banco
    const { data: pendingExercises } = await supabaseAdmin
      .from("exercise_catalog")
      .select("id")
      .is("nome_pt", null)
      .limit(2000); // Limite razoável para um job

    if (!pendingExercises || pendingExercises.length === 0) {
      return { success: false, message: "Nenhum exercício pendente de tradução no catálogo." };
    }

    // 2. Criar o job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("exercise_translation_jobs")
      .insert({
        coach_id: coachId,
        status: "pending",
        total_items: pendingExercises.length
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 3. Criar os itens do job
    const items = pendingExercises.map(ex => ({
      job_id: job.id,
      catalog_exercise_id: ex.id,
      status: "pending"
    }));

    await supabaseAdmin.from("exercise_translation_items").insert(items);

    return { jobId: job.id, total: pendingExercises.length };
  });

/**
 * Processar um lote de tradução.
 */
export const processCatalogTranslationBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ jobId: z.string().uuid(), batchSize: z.number().default(10) }).parse(data))
  .handler(async ({ data: { jobId, batchSize }, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { translateCatalogBatch } = await import("@/lib/exercise-catalog.functions");

    // 1. Buscar itens pendentes
    const { data: items } = await supabaseAdmin
      .from("exercise_translation_items")
      .select("id, catalog_exercise_id")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .limit(batchSize);

    if (!items || items.length === 0) {
      await supabaseAdmin.from("exercise_translation_jobs").update({ status: "completed" }).eq("id", jobId);
      return { processed: 0, status: "completed" };
    }

    // 2. Marcar como processando
    const itemIds = items.map(i => i.id);
    await supabaseAdmin.from("exercise_translation_items").update({ status: "processing" }).in("id", itemIds);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        // Usar a lógica de tradução existente (Gemini 2.0 Flash)
        const result = await translateCatalogBatch({ 
          data: { 
            exerciseIds: [item.catalog_exercise_id],
            autoApprove: false 
          }
        });

        if (result.success) {
          await supabaseAdmin.from("exercise_translation_items")
            .update({ status: "draft" })
            .eq("id", item.id);
          successCount++;
        } else {
          throw new Error(result.error || "Erro desconhecido na tradução");
        }
      } catch (err: any) {
        await supabaseAdmin.from("exercise_translation_items")
          .update({ status: "error", error_message: err.message })
          .eq("id", item.id);
        errorCount++;
      }
    }

    // 3. Atualizar o job
    const { data: job } = await supabaseAdmin.from("exercise_translation_jobs").select("*").eq("id", jobId).single();
    if (job) {
      await supabaseAdmin.from("exercise_translation_jobs")
        .update({
          processed_items: job.processed_items + items.length,
          success_count: job.success_count + successCount,
          error_count: job.error_count + errorCount,
          status: (job.processed_items + items.length >= job.total_items) ? "completed" : "running"
        })
        .eq("id", jobId);
    }

    return { successCount, errorCount, processed: items.length };
  });

export const getLatestTranslationJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });

    const { data: job } = await supabaseAdmin
      .from("exercise_translation_jobs")
      .select("*, exercise_translation_items(*)")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return job;
  });
