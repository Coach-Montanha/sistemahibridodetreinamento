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

    // Busca exercícios que ainda NÃO possuem tradução (nem draft, nem aprovada)
    const { data: pendingExercises, error: fetchError } = await supabaseAdmin
      .rpc("get_exercises_pending_translation" as any, { _limit: 2000 });

    if (fetchError) {
      console.error("[translation-job:start] Fetch Error:", fetchError);
      throw fetchError;
    }

    const exercises = Array.isArray(pendingExercises) ? pendingExercises : [];

    if (exercises.length === 0) {
      return { success: false, message: "Todos os exercícios do catálogo já possuem tradução ou estão em fila." } as any;
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("exercise_translation_jobs")
      .insert({
        coach_id: coachId,
        status: "pending",
        total_items: exercises.length,
        processed_items: 0,
        success_count: 0,
        error_count: 0
      } as any)
      .select()
      .single();

    if (jobError) throw jobError;

    const items = exercises.map(ex => ({
      job_id: job.id,
      catalog_exercise_id: ex.id,
      status: "pending"
    }));

    await supabaseAdmin.from("exercise_translation_items").insert(items as any);

    return { jobId: job.id, total: exercises.length } as any;
  });

/**
 * Processar um lote de tradução.
 */
export const processCatalogTranslationBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ jobId: z.string().uuid(), batchSize: z.number().default(10) }).parse(data))
  .handler(async ({ data: { jobId, batchSize }, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { translateCatalogCore } = await import("@/lib/catalog-translate-core.server");

    // Verifica que o job pertence ao coach autenticado
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
    if (!coachId) throw new Error("Coach ID não resolvido.");

    const { data: ownerJob } = await supabaseAdmin
      .from("exercise_translation_jobs")
      .select("id, coach_id")
      .eq("id", jobId)
      .maybeSingle();

    if (!ownerJob || ownerJob.coach_id !== coachId) throw new Error("Job não encontrado.");


    const { data: items } = await supabaseAdmin
      .from("exercise_translation_items")
      .select("id, catalog_exercise_id")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .limit(batchSize);

    if (!items || items.length === 0) {
      await supabaseAdmin.from("exercise_translation_jobs").update({ status: "completed" } as any).eq("id", jobId);
      return { processed: 0, status: "completed" } as any;
    }

    const itemIds = items.map(i => i.id);
    await supabaseAdmin.from("exercise_translation_items").update({ status: "processing" } as any).in("id", itemIds);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const result = await translateCatalogCore(supabaseAdmin, [item.catalog_exercise_id]);

        if (result.success > 0) {
           await supabaseAdmin.from("exercise_translation_items")
            .update({ status: "completed" } as any)
            .eq("id", item.id);
           successCount++;
        } else {
          throw new Error(result.errors?.[0] || "IA não retornou tradução");
        }
      } catch (err: any) {
        console.error(`[translation-job:process] Item ${item.id} failed:`, err?.message);
        await supabaseAdmin.from("exercise_translation_items")
          .update({ status: "failed", error_message: String(err?.message ?? "erro").slice(0, 500) } as any)
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
      
      const newProcessed = currentProcessed + items.length;

      await supabaseAdmin.from("exercise_translation_jobs")
        .update({
          processed_items: newProcessed,
          success_count: currentSuccess + successCount,
          error_count: currentError + errorCount,
          status: (newProcessed >= totalItems) ? "completed" : "running",
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", jobId);
    }

    return { successCount, errorCount, processed: items.length } as any;
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
