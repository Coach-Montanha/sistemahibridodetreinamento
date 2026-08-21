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

    // Busca exercícios que não têm tradução NENHUMA (nem draft, nem approved)
    // A query correta é buscar exercícios no catálogo onde não existe registro na exercise_catalog_translations
    const { data: pendingExercises, error: fetchError } = await supabaseAdmin
      .from("exercise_catalog")
      .select("id, name_original")
      .not("id", "in", (
        supabaseAdmin
          .from("exercise_catalog_translations")
          .select("catalog_exercise_id")
      ))
      .limit(2000);

    if (fetchError) {
      console.error("[translation-job:start] Fetch Error:", fetchError);
      throw fetchError;
    }

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
    
    // Importa o tradutor específico de catálogo
    const { translateCatalogExercises } = await import("@/lib/exercises-import.functions");

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
        // Traduz o exercício específico
        const result = await translateCatalogExercises({ 
          data: { 
            exerciseIds: [item.catalog_exercise_id] 
          }
        });

        if (result && result.success > 0) {
           await supabaseAdmin.from("exercise_translation_items")
            .update({ status: "completed" })
            .eq("id", item.id);
           successCount++;
        } else {
          throw new Error(result?.errors?.[0] || "IA não retornou tradução");
        }
      } catch (err: any) {
        console.error(`[translation-job:process] Item ${item.id} failed:`, err);
        await supabaseAdmin.from("exercise_translation_items")
          .update({ status: "failed", error_message: err.message })
          .eq("id", item.id);
        errorCount++;
      }
    }

    // Atualiza o progresso do job
    const { data: job } = await supabaseAdmin.from("exercise_translation_jobs").select("*").eq("id", jobId).single();
    if (job) {
      const currentProcessed = (job.processed_items || 0);
      const currentSuccess = (job.success_count || 0);
      const currentError = (job.error_count || 0);
      const totalItems = (job.total_items || 0);
      
      const newProcessed = currentProcessed + items.length;

      await supabaseAdmin.from("exercise_translation_jobs")
        .update({
          processed_items: newProcessed,
          success_count: currentSuccess + successCount,
          error_count: currentError + errorCount,
          status: (newProcessed >= totalItems) ? "completed" : "running",
          updated_at: new Date().toISOString()
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

    if (!coachId) return null;

    const { data: job } = await supabaseAdmin
      .from("exercise_translation_jobs")
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return job;
  });
