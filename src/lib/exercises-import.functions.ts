import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type MethodologyKey = Database["public"]["Enums"]["methodology_key"];

const DATASET_SHA = "fe2e63a4a2cbf634c88e38644ec86068d9127735";
const DATASET_URL = `https://raw.githubusercontent.com/Coach-Montanha/exercises-dataset/${DATASET_SHA}/data/exercises.json`;

const ImportSchema = z.object({
  dryRun: z.boolean().default(true),
  limit: z.number().optional(),
});

export const importExercises = createServerFn({ method: "POST" })
  .inputValidator((data) => ImportSchema.parse(data))
  .handler(async ({ data: { dryRun, limit } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const response = await fetch(DATASET_URL);
      if (!response.ok) throw new Error(`Falha ao baixar dataset: ${response.statusText}`);
      
      const allExercises = await response.json();
      const exercisesToProcess = limit ? allExercises.slice(0, limit) : allExercises;
      
      const report = {
        total: allExercises.length,
        processed: exercisesToProcess.length,
        inserted: 0,
        updated: 0,
        errors: 0,
        dryRun,
        sha: DATASET_SHA,
      };

      if (dryRun) return report;

      const mapEquipment = (equip: string): string => {
        const e = equip?.toLowerCase() || "";
        if (e === "kettlebell") return "Kettlebell";
        if (e === "barbell") return "Barbell";
        if (e === "dumbbell") return "Dumbbell";
        if (e === "body weight") return "Ginásticos";
        if (["cable", "machine", "plate"].includes(e)) return "Alternativos Musculação";
        return "Pendente";
      };

      const batchSize = 100;
      for (let i = 0; i < exercisesToProcess.length; i += batchSize) {
        const batch = exercisesToProcess.slice(i, i + batchSize);
        
        const rows = batch.map((ex: any) => {
          return {
            source: "coach-montanha-exercises-dataset",
            source_commit: DATASET_SHA,
            source_exercise_id: ex.id.toString(),
            name_original: ex.name,
            category: ex.category,
            body_part: ex.body_part,
            equipment_original: ex.equipment,
            target: ex.target,
            muscle_group: ex.muscle_group,
            secondary_muscles: Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : [],
            instructions: ex.instructions || {},
            instruction_steps: ex.instruction_steps || {},
            attribution: ex.attribution || "© Gym visual — https://gymvisual.com/",
            image_path: ex.image,
            gif_path: ex.gif_url,
            review_status: "pending",
            approved_for_projection: false
          };
        });

        const { error } = await supabaseAdmin
          .from("exercise_catalog")
          .upsert(rows, { onConflict: "source,source_exercise_id" });

        if (error) {
          console.error("Erro no lote de importação:", error);
          report.errors += batch.length;
        } else {
          report.inserted += batch.length;
        }
      }

      return report;
    } catch (err: any) {
      console.error("Falha na importação:", err);
      throw new Error(`Erro na importação: ${err.message}`);
    }
  });

export const projectApprovedExercises = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: approved, error: fetchError } = await supabaseAdmin
      .from("exercise_catalog")
      .select("*")
      .eq("approved_for_projection", true)
      .is("projected_exercise_id", null);

    if (fetchError) throw fetchError;
    if (!approved || approved.length === 0) return { projected: 0 };

    let projectedCount = 0;

    for (const item of approved) {
      const equipLower = item.equipment_original?.toLowerCase() || "";
      const equipment = [
        equipLower === "kettlebell" ? "Kettlebell" :
        equipLower === "barbell" ? "Barbell" :
        equipLower === "dumbbell" ? "Dumbbell" :
        equipLower === "body weight" ? "Ginásticos" :
        ["cable", "machine", "plate"].includes(equipLower) ? "Alternativos Musculação" :
        "Objetos Alternativos"
      ];

      const methodologies: MethodologyKey[] = [];
      if (equipment.includes("Kettlebell") || equipment.includes("Ginásticos")) {
        methodologies.push("kettlebell_fitness");
      }
      methodologies.push("hibrido");

      const muscleGroups = [
        item.muscle_group,
        ...(Array.isArray(item.secondary_muscles) ? (item.secondary_muscles as string[]) : [])
      ].filter((m): m is string => typeof m === "string" && m.length > 0);

      const instructions = typeof item.instructions === "object" && item.instructions !== null
        ? (item.instructions as any).en 
        : typeof item.instruction_steps === "object" && item.instruction_steps !== null && Array.isArray((item.instruction_steps as any).en)
          ? (item.instruction_steps as any).en.join("\n")
          : "";

      const exerciseRow: Database["public"]["Tables"]["exercises"]["Insert"] = {
        coach_id: null,
        nome_en: item.name_original,
        nome_pt: item.name_original,
        instrucoes: instructions || null,
        equipamento: equipment,
        metodologias: methodologies,
        grupos_musculares: muscleGroups,
        source: item.source,
        source_id: item.source_exercise_id,
        source_commit: item.source_commit,
        criado_por_ia: false,
        unilateral: false
      };

      const { data: newEx, error: insError } = await supabaseAdmin
        .from("exercises")
        .upsert(exerciseRow, { onConflict: "source,source_id" })
        .select("id")
        .single();

      if (insError) {
        console.error(`Erro ao projetar ${item.source_exercise_id}:`, insError);
        continue;
      }

      await supabaseAdmin
        .from("exercise_catalog")
        .update({ projected_exercise_id: newEx.id })
        .eq("id", item.id);

      projectedCount++;
    }

    return { projected: projectedCount };
  });

