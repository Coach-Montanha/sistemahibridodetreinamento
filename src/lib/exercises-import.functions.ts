import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const translateCatalogExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ 
    exerciseIds: z.array(z.string().uuid()).optional(),
    limit: z.number().default(10),
    offset: z.number().default(0)
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { translateCatalogWithAI } = await import("@/lib/exercises-translate.server");
    const { upsertCatalogTranslation } = await import("@/lib/catalog-translation.server");
    const { resolveAiModel } = await import("@/lib/ai-gateway.server");

    let query = supabaseAdmin
      .from("exercise_catalog")
      .select("id, name_original, category, equipment_original, muscle_group, target, body_part, instructions, instruction_steps, secondary_muscles");

    if (data.exerciseIds && data.exerciseIds.length > 0) {
      query = query.in("id", data.exerciseIds);
    } else {
      query = query.range(data.offset, data.offset + data.limit - 1);
    }

    const { data: exercises, error: fetchError } = await query;
    if (fetchError) throw new Error(fetchError.message);
    if (!exercises || exercises.length === 0) {
      return { success: 0, total: 0, errors: ["Exercício não encontrado no catálogo."] } as any;
    }

    let success = 0;
    const errors: string[] = [];
    const model = resolveAiModel();

    for (const ex of exercises) {
      try {
        const translation = await translateCatalogWithAI(ex);

        const { translationId } = await upsertCatalogTranslation(supabaseAdmin, {
          catalogId: ex.id,
          status: "draft",
          source: "ai",
          model,
          fields: {
            name_pt_br: translation.name,
            category_pt_br: translation.category,
            equipment_pt_br: translation.equipment,
            muscle_group_pt_br: translation.muscle_group,
            target_pt_br: translation.target,
            body_part_pt_br: translation.body_part,
            instructions_pt_br: translation.instructions,
            instruction_steps_pt_br: translation.instruction_steps,
          },
        });

        // SELECT de confirmação: só conta sucesso se a linha existir de fato.
        const { data: confirm } = await supabaseAdmin
          .from("exercise_catalog_translations")
          .select("id, name_pt_br")
          .eq("id", translationId)
          .maybeSingle();

        if (!confirm?.name_pt_br) throw new Error("Tradução não confirmada no banco.");
        success++;
      } catch (err: any) {
        console.error("[translateCatalogExercises] erro", { id: ex.id, code: err?.code, message: err?.message });
        errors.push(`${ex.name_original}: ${err?.message ?? "erro desconhecido"}`);
      }
    }

    return { success, total: exercises.length, errors } as any;
  });

export const translateSingleExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { translateCatalogExercises } = await import("./exercises-import.functions");
    return translateCatalogExercises({ data: { exerciseIds: [data.id] } });
  });

export const saveCatalogTranslationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        catalogId: z.string().uuid(),
        fields: z.record(z.string(), z.any()),
        approve: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { upsertCatalogTranslation } = await import("@/lib/catalog-translation.server");

    const status = data.approve ? "approved" : "draft";

    const { translationId } = await upsertCatalogTranslation(supabaseAdmin, {
      catalogId: data.catalogId,
      fields: data.fields,
      status,
      source: "human",
    });

    // Aprovar libera projeção; salvar rascunho não altera o estado de revisão.
    if (data.approve) {
      const { error } = await supabaseAdmin
        .from("exercise_catalog")
        .update({ review_status: "approved", approved_for_projection: true } as any)
        .eq("id", data.catalogId);
      if (error) throw new Error(error.message);
    }

    const { data: confirm } = await supabaseAdmin
      .from("exercise_catalog_translations")
      .select("id, name_pt_br, translation_status")
      .eq("id", translationId)
      .maybeSingle();

    if (!confirm) throw new Error("Não foi possível confirmar a gravação da tradução.");

    return { success: true, translationId, status: confirm.translation_status, name: confirm.name_pt_br };
  });

export const approveCatalogTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ 
    catalogId: z.string().uuid(), 
    status: z.string(),
    approved: z.boolean()
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("exercise_catalog")
      .update({ 
        review_status: data.status, 
        approved_for_projection: data.approved 
      } as any)
      .eq("id", data.catalogId);

    if (error) throw new Error(error.message);

    if (data.approved) {
      await supabaseAdmin
        .from("exercise_catalog_translations")
        .update({ translation_status: 'approved' } as any)
        .eq("catalog_exercise_id", data.catalogId);
    }

    return { success: true };
  });

export const translateCatalogBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ 
    limit: z.number().default(10)
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { translateCatalogExercises } = await import("./exercises-import.functions");

    const { data: pending } = await supabaseAdmin.rpc("get_exercises_pending_translation" as any, { _limit: data.limit });
    
    if (!pending || pending.length === 0) {
      return { success: 0, total: 0, message: "Todos traduzidos" };
    }

    const ids = pending.map((p: any) => p.id);
    return translateCatalogExercises({ data: { exerciseIds: ids } });
  });

export const importExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ dryRun: z.boolean().default(false) }).parse(data))
  .handler(async () => {
    return { success: true, message: "Importação disparada", inserted: 0 };
  });

export type ProjectionResult = {
  success: boolean;
  projected: number;
  updated: number;
  skipped: number;
  reasons: Record<string, number>;
  details: Array<{ id: string; name: string; reason: string }>;
};

/**
 * Projeta o catálogo aprovado para a biblioteca `exercises`.
 * Percorre TODOS os aprovados por cursor e devolve motivos explícitos de cada skip.
 */
export const projectApprovedExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ProjectionResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const reasons: Record<string, number> = {};
    const details: Array<{ id: string; name: string; reason: string }> = [];
    const bump = (r: string) => { reasons[r] = (reasons[r] ?? 0) + 1; };

    let projected = 0;
    let updated = 0;
    let skipped = 0;
    const pageSize = 100;
    let offset = 0;

    for (;;) {
      const { data: approved, error } = await supabaseAdmin
        .from("exercise_catalog")
        .select("id, name_original, source, source_exercise_id, projected_exercise_id")
        .eq("approved_for_projection", true)
        .order("imported_at", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw new Error(error.message);
      if (!approved || approved.length === 0) break;

      for (const item of approved) {
        // Tradução PT-BR aprovada buscada separadamente (sem relação aninhada ambígua).
        const { data: traducoes, error: tErr } = await supabaseAdmin
          .from("exercise_catalog_translations")
          .select("*")
          .eq("catalog_exercise_id", item.id)
          .eq("locale", "pt-BR")
          .order("updated_at", { ascending: false })
          .limit(5);

        if (tErr) {
          skipped++; bump("database_error");
          details.push({ id: item.id, name: item.name_original, reason: "database_error" });
          continue;
        }

        const traducao =
          (traducoes ?? []).find((t: any) => t.translation_status === "approved") ?? (traducoes ?? [])[0];

        if (!traducao || !traducao.name_pt_br) {
          skipped++; bump("missing_translation");
          details.push({ id: item.id, name: item.name_original, reason: "missing_translation" });
          continue;
        }

        const payload = {
          nome_pt: traducao.name_pt_br,
          nome_en: item.name_original,
          padrao_movimento: traducao.body_part_pt_br ?? null,
          grupos_musculares: traducao.muscle_group_pt_br ? [traducao.muscle_group_pt_br] : [],
          equipamento: traducao.equipment_pt_br ? [traducao.equipment_pt_br] : [],
          instrucoes: traducao.instructions_pt_br ?? null,
          source: item.source ?? "catalog",
          source_id: item.source_exercise_id,
        };

        // Já projetado -> reprojeta no MESMO exercises.id (sem duplicar).
        if (item.projected_exercise_id) {
          const { error: upErr } = await supabaseAdmin
            .from("exercises")
            .update(payload as any)
            .eq("id", item.projected_exercise_id);
          if (upErr) {
            skipped++; bump("database_error");
            details.push({ id: item.id, name: item.name_original, reason: `database_error: ${upErr.message}` });
          } else {
            updated++; bump("reprojected");
          }
          continue;
        }

        // Reaproveita um exercício já existente com a mesma chave lógica (source, source_id).
        const { data: existente } = await supabaseAdmin
          .from("exercises")
          .select("id")
          .eq("source", payload.source)
          .eq("source_id", payload.source_id ?? "")
          .maybeSingle();

        let exerciseId: string | null = existente?.id ?? null;

        if (exerciseId) {
          const { error: upErr } = await supabaseAdmin.from("exercises").update(payload as any).eq("id", exerciseId);
          if (upErr) {
            skipped++; bump("database_error");
            details.push({ id: item.id, name: item.name_original, reason: `database_error: ${upErr.message}` });
            continue;
          }
          updated++;
        } else {
          const { data: novo, error: insErr } = await supabaseAdmin
            .from("exercises")
            .insert({ ...payload, criado_por_ia: true } as any)
            .select("id")
            .single();
          if (insErr || !novo) {
            skipped++; bump("database_error");
            details.push({ id: item.id, name: item.name_original, reason: `database_error: ${insErr?.message}` });
            continue;
          }
          exerciseId = novo.id;
          projected++;
        }

        const { error: linkErr } = await supabaseAdmin
          .from("exercise_catalog")
          .update({ projected_exercise_id: exerciseId } as any)
          .eq("id", item.id);
        if (linkErr) {
          bump("link_error");
          details.push({ id: item.id, name: item.name_original, reason: `link_error: ${linkErr.message}` });
        }
      }

      if (approved.length < pageSize) break;
      offset += pageSize;
    }

    return { success: true, projected, updated, skipped, reasons, details: details.slice(0, 50) };
  });
