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
    
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
    if (!coachId) throw new Error("Coach ID não resolvido.");

    const { data: pendingExercises } = await supabaseAdmin
      .from("exercise_catalog")
      .select("id")
      .is("nome_pt", null)
      .limit(2000);

    if (!pendingExercises || pendingExercises.length === 0) {
      return { success: false, message: "Nenhum exercício pendente de tradução no catálogo." };
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("exercise_translation_jobs")
      .insert({
        coach_id: coachId,
        status: "pending",
        total_items: pendingExercises.length,
        processed_items: 0,
        success_count: 0,
        error_count: 0
      })
      .select()
      .single();

    if (jobError) throw jobError;

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
    const { translateCatalogBatch } = await import("@/lib/exercises-import.functions");

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

    const itemIds = items.map(i => i.id);
    await supabaseAdmin.from("exercise_translation_items").update({ status: "processing" }).in("id", itemIds);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const result: any = await translateCatalogBatch({ 
          data: { 
            limit: 1,
            offset: 0 
          }
        });

        // A função translateCatalogBatch retorna { success, errors, total }
        if (result && (result.success > 0 || result.total > 0)) {
           // Se result.success > 0, um exercício foi traduzido. 
           // Como estamos chamando de 1 em 1 para controle fino do job:
           await supabaseAdmin.from("exercise_translation_items")
            .update({ status: "draft" })
            .eq("id", item.id);
           successCount++;
        } else {
          throw new Error("Falha na tradução via lote");
        }
      } catch (err: any) {
        await supabaseAdmin.from("exercise_translation_items")
          .update({ status: "error", error_message: err.message })
          .eq("id", item.id);
        errorCount++;
      }
    }

    const { data: job } = await supabaseAdmin.from("exercise_translation_jobs").select("*").eq("id", jobId).single();
    if (job) {
      const currentProcessed = (job.processed_items || 0);
      const currentSuccess = (job.success_count || 0);
      const currentError = (job.error_count || 0);
      const totalItems = (job.total_items || 0);

      await supabaseAdmin.from("exercise_translation_jobs")
        .update({
          processed_items: currentProcessed + items.length,
          success_count: currentSuccess + successCount,
          error_count: currentError + errorCount,
          status: (currentProcessed + items.length >= totalItems) ? "completed" : "running"
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
