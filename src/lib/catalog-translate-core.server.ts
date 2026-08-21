/**
 * Núcleo server-only da tradução de catálogo.
 * Server Functions chamam ESTA função — nunca outra Server Function —
 * para não deixar o callee fora do manifesto do worker
 * ("Server function info not found" no ambiente publicado).
 */
import { translateCatalogWithAI } from "./exercises-translate.server";
import { upsertCatalogTranslation } from "./catalog-translation.server";
import { resolveAiModel } from "./ai-gateway.server";

export type TranslateCoreResult = { success: number; total: number; errors: string[] };

export async function translateCatalogCore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  ids: string[],
): Promise<TranslateCoreResult> {
  if (ids.length === 0) return { success: 0, total: 0, errors: ["Nenhum exercício informado."] };

  const { data: exercises, error } = await supabaseAdmin
    .from("exercise_catalog")
    .select(
      "id, name_original, category, equipment_original, muscle_group, target, body_part, instructions, instruction_steps, secondary_muscles",
    )
    .in("id", ids);

  if (error) throw new Error(error.message);
  if (!exercises || exercises.length === 0) {
    return { success: 0, total: 0, errors: ["Exercício não encontrado no catálogo."] };
  }

  const model = resolveAiModel();
  let success = 0;
  const errors: string[] = [];

  for (const ex of exercises) {
    try {
      const t = await translateCatalogWithAI(ex);

      const { translationId } = await upsertCatalogTranslation(supabaseAdmin, {
        catalogId: ex.id,
        status: "draft",
        source: "ai",
        model,
        fields: {
          name_pt_br: t.name,
          category_pt_br: t.category,
          equipment_pt_br: t.equipment,
          muscle_group_pt_br: t.muscle_group,
          target_pt_br: t.target,
          body_part_pt_br: t.body_part,
          instructions_pt_br: t.instructions,
          instruction_steps_pt_br: t.instruction_steps,
        },
      });

      const { data: confirm } = await supabaseAdmin
        .from("exercise_catalog_translations")
        .select("id, name_pt_br")
        .eq("id", translationId)
        .maybeSingle();

      if (!confirm?.name_pt_br) throw new Error("Tradução não confirmada no banco.");
      success++;
    } catch (err: any) {
      console.error("[translateCatalogCore] erro", { id: ex.id, code: err?.code, message: err?.message });
      errors.push(`${ex.name_original}: ${err?.message ?? "erro desconhecido"}`);
    }
  }

  return { success, total: exercises.length, errors };
}
