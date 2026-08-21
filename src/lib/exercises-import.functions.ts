import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const translateCatalogExercises = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    exerciseIds: z.array(z.string()).optional(),
    limit: z.number().default(10),
    offset: z.number().default(0)
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { translateCatalogWithAI } = await import("@/lib/exercises-translate.server");

    let query = supabaseAdmin
      .from("exercise_catalog")
      .select("id, name_original, category, equipment_original, muscle_group, target, body_part, instructions, instruction_steps, secondary_muscles");
    
    if (data.exerciseIds && data.exerciseIds.length > 0) {
      query = query.in("id", data.exerciseIds);
    } else {
      query = query.range(data.offset, data.offset + data.limit - 1);
    }

    const { data: exercises, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!exercises || exercises.length === 0) return { success: 0, total: 0, errors: [] } as any;

    let success = 0;
    const errors: string[] = [];

    for (const ex of exercises) {
      try {
        const translation = await translateCatalogWithAI(ex);
        
        const { error: insError } = await supabaseAdmin
          .from("exercise_catalog_translations")
          .upsert({
            catalog_exercise_id: ex.id,
            name_pt_br: translation.name,
            category_pt_br: translation.category,
            equipment_pt_br: translation.equipment,
            muscle_group_pt_br: translation.muscle_group,
            target_pt_br: translation.target,
            body_part_pt_br: translation.body_part,
            instructions_pt_br: translation.instructions,
            instruction_steps_pt_br: translation.instruction_steps,
            translation_status: 'draft',
            locale: 'pt-BR'
          } as any);

        if (insError) throw insError;
        success++;
      } catch (err: any) {
        errors.push(`ID ${ex.id}: ${err.message}`);
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
  .inputValidator((data) => z.object({ 
    catalogId: z.string().uuid(), 
    fields: z.any() 
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("exercise_catalog_translations")
      .upsert({
        catalog_exercise_id: data.catalogId,
        ...data.fields,
        translation_status: 'approved',
        locale: 'pt-BR'
      } as any);

    if (error) throw error;
    
    await supabaseAdmin
      .from("exercise_catalog")
      .update({ review_status: 'approved', approved_for_projection: true } as any)
      .eq("id", data.catalogId);

    return { success: true };
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

    if (error) throw error;

    if (data.approved) {
      await supabaseAdmin
        .from("exercise_catalog_translations")
        .update({ translation_status: 'approved' } as any)
        .eq("catalog_exercise_id", data.catalogId);
    }

    return { success: true };
  });

export const translateCatalogBatch = createServerFn({ method: "POST" })
  .handler(async () => {
    const { translateCatalogExercises } = await import("./exercises-import.functions");
    return translateCatalogExercises({ data: { limit: 10, offset: 0 } });
  });

export const importExercises = createServerFn({ method: "POST" })
  .handler(async () => {
    // Mock ou implementação real de disparo de importação
    return { success: true, message: "Importação disparada" };
  });

export const projectApprovedExercises = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const fetchAndProject = async (offset = 0): Promise<number> => {
      const { data: approved, error: fetchError } = await supabaseAdmin
        .from("exercise_catalog")
        .select(`
          *, 
          exercise_catalog_translations!catalog_exercise_id(*)
        `)
        .eq("approved_for_projection", true)
        .is("projected_exercise_id", null)
        .range(offset, offset + 99); 

      if (fetchError) throw fetchError;
      if (!approved || approved.length === 0) return 0;

      let projectedCount = 0;
      for (const item of approved) {
        const translation = item.exercise_catalog_translations?.find((t: any) => t.locale === 'pt-BR' && t.translation_status === 'approved') 
                          || item.exercise_catalog_translations?.[0];

        if (!translation) continue;

        const { data: newEx, error: insError } = await supabaseAdmin
          .from("exercises")
          .insert({
            nome_pt: translation.name_pt_br,
            nome_en: item.name_original,
            categoria: translation.category_pt_br,
            padrao_movimento: translation.padrao_movimento_pt_br,
            grupos_musculares: translation.muscle_group_pt_br ? [translation.muscle_group_pt_br] : [],
            equipamento: translation.equipment_pt_br ? [translation.equipment_pt_br] : [],
            instrucoes: translation.instructions_pt_br,
            source: 'catalog',
            source_id: item.source_exercise_id
          } as any)
          .select("id")
          .single();

        if (insError) {
          console.error(`Falha ao projetar ${item.id}:`, insError);
          continue;
        }

        await supabaseAdmin
          .from("exercise_catalog")
          .update({ projected_exercise_id: newEx.id } as any)
          .eq("id", item.id);
        
        projectedCount++;
      }

      return projectedCount + (approved.length === 100 ? await fetchAndProject(offset + 100) : 0);
    };

    const total = await fetchAndProject();
    return { success: true, projected: total };
  });
