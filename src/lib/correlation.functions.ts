import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Inventariar mídias no Storage para um coach.
 */
export const startMediaInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const coachId = context.userId;

    // 1. Criar o job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("media_correlation_jobs")
      .insert({
        coach_id: coachId,
        status: "running"
      })
      .select()
      .single();

    if (jobError) throw jobError;

    try {
      // 2. Listar arquivos no bucket (apenas da pasta do coach)
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from("exercise-media")
        .list(coachId, { limit: 1000, offset: 0 });

      if (listError) throw listError;

      // 3. Pegar exercícios do banco para comparar
      const { data: exercises } = await supabaseAdmin
        .from("exercises")
        .select("id, nome_pt, nome_en, source_id")
        .or(`coach_id.eq.${coachId},coach_id.is.null`);

      const correlationItems = (files || []).map(file => {
        const filename = file.name;
        const basename = filename.split(".")[0];
        const sanitizedBasename = basename.replace(/[-_]/g, " ").toLowerCase();
        
        let matchedId: string | null = null;
        let matchType: "none" | "deterministic" | "exact" | "ambiguous" = "none";

        // Busca por source_id (se o nome do arquivo for um UUID ou contiver o ID)
        const deterministic = exercises?.find(ex => 
          ex.source_id && (filename.includes(ex.source_id) || ex.source_id === basename)
        );

        if (deterministic) {
          matchedId = deterministic.id;
          matchType = "deterministic";
        } else {
          // Busca por nome exato
          const exact = exercises?.filter(ex => 
            ex.nome_pt?.toLowerCase() === sanitizedBasename || 
            ex.nome_en?.toLowerCase() === sanitizedBasename
          );

          if (exact && exact.length === 1) {
            matchedId = exact[0].id;
            matchType = "exact";
          } else if (exact && exact.length > 1) {
            matchType = "ambiguous";
          }
        }

        return {
          job_id: job.id,
          storage_path: `${coachId}/${filename}`,
          filename,
          matched_exercise_id: matchedId,
          match_type: matchType,
          status: matchType === "deterministic" || matchType === "exact" ? "pending" : "review_needed"
        };
      });

      // 4. Salvar itens do inventário
      if (correlationItems.length > 0) {
        await supabaseAdmin.from("media_correlation_items").insert(correlationItems);
      }

      // 5. Atualizar estatísticas do job
      const stats = {
        total_files: correlationItems.length,
        exact_matches: correlationItems.filter(i => i.match_type === "exact" || i.match_type === "deterministic").length,
        ambiguous_matches: correlationItems.filter(i => i.match_type === "ambiguous").length,
        no_matches: correlationItems.filter(i => i.match_type === "none").length,
        applied: 0
      };

      await supabaseAdmin
        .from("media_correlation_jobs")
        .update({ status: "completed", stats })
        .eq("id", job.id);

      return { jobId: job.id, stats };
    } catch (err: any) {
      await supabaseAdmin
        .from("media_correlation_jobs")
        .update({ status: "failed" })
        .eq("id", job.id);
      throw err;
    }
  });

/**
 * Obter o último job de correlação.
 */
export const getLatestCorrelationJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const coachId = context.userId;

    const { data: job } = await supabaseAdmin
      .from("media_correlation_jobs")
      .select("*, media_correlation_items(*)")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return job;
  });

/**
 * Aplicar correlações automáticas.
 */
export const applyAutoCorrelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data: { jobId }, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Buscar itens pendentes que são determinísticos ou exatos
    const { data: items } = await supabaseAdmin
      .from("media_correlation_items")
      .select("*")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .in("match_type", ["deterministic", "exact"]);

    if (!items || items.length === 0) return { applied: 0 };

    let appliedCount = 0;

    for (const item of items) {
      if (!item.matched_exercise_id) continue;

      try {
        // Obter URL assinada
        const { data: urlData } = await supabaseAdmin.storage
          .from("exercise-media")
          .createSignedUrl(item.storage_path, 60 * 60 * 24 * 365 * 100);

        if (!urlData) continue;

        const mediaType = item.filename.toLowerCase().endsWith('.gif') ? 'gif' : 
                          (item.filename.toLowerCase().match(/\.(mp4|mov|avi|webm)$/) ? 'video' : 'imagem');

        // Registrar na exercise_media
        const { error: dbError } = await supabaseAdmin
          .from("exercise_media")
          .insert({
            exercise_id: item.matched_exercise_id,
            storage_path: item.storage_path,
            url_publica: urlData.signedUrl,
            tipo: mediaType as any,
            ordem: 0
          });

        if (!dbError) {
          await supabaseAdmin
            .from("media_correlation_items")
            .update({ status: "applied" })
            .eq("id", item.id);
          appliedCount++;
        }
      } catch (err) {
        console.error(`Erro ao aplicar mídia ${item.filename}:`, err);
      }
    }

    // Atualizar estatísticas do job
    const { data: job } = await supabaseAdmin.from("media_correlation_jobs").select("stats").eq("id", jobId).single();
    if (job) {
      const newStats = { ...(job.stats as any), applied: (job.stats as any).applied + appliedCount };
      await supabaseAdmin.from("media_correlation_jobs").update({ stats: newStats }).eq("id", jobId);
    }

    return { applied: appliedCount };
  });
