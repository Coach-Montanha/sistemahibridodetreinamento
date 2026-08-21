import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadMediaBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    files: z.array(z.object({
      name: z.string(),
      type: z.string(),
      base64: z.string(),
      exerciseName: z.string().optional(),
      sourceId: z.string().optional()
    }))
  }).parse(data))
  .handler(async ({ data: { files }, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const coachId = context.userId;

    const results = [];
    
    for (const file of files) {
      try {
        const buffer = Buffer.from(file.base64, 'base64');
        const fileExt = file.name.split('.').pop();
        const storagePath = `${coachId}/bulk/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // 1. Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("exercise-media")
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true
          });
          
        if (uploadError) throw uploadError;

        // 2. Generate long-lived URL
        const { data: urlData, error: urlError } = await supabaseAdmin.storage
          .from("exercise-media")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 100);
          
        if (urlError) throw urlError;

        // 3. Find target exercise
        let targetExerciseId = null;
        
        if (file.sourceId) {
          const { data: ex } = await supabaseAdmin
            .from("exercises")
            .select("id")
            .eq("source_id", file.sourceId)
            .maybeSingle();
          if (ex) targetExerciseId = ex.id;
        }

        if (!targetExerciseId && file.exerciseName) {
          const { data: ex } = await supabaseAdmin
            .from("exercises")
            .select("id")
            .ilike("nome_pt", `%${file.exerciseName}%`)
            .maybeSingle();
          if (ex) targetExerciseId = ex.id;
        }

        // 4. Register in exercise_media if found
        if (targetExerciseId) {
          const mediaType = file.type.startsWith('video/') ? 'video' : 
                            (file.name.toLowerCase().endsWith('.gif') ? 'gif' : 'imagem');

          const { error: dbError } = await supabaseAdmin
            .from("exercise_media")
            .insert({
              exercise_id: targetExerciseId,
              storage_path: storagePath,
              url_publica: urlData.signedUrl,
              tipo: mediaType as any,
              ordem: 0
            });
            
          if (dbError) console.error("Erro ao registrar no banco:", dbError);
        }

        results.push({ 
          name: file.name, 
          success: true, 
          storagePath, 
          linked: !!targetExerciseId,
          targetExerciseId 
        });
      } catch (err: any) {
        results.push({ name: file.name, success: false, error: err.message });
      }
    }
    
    return results;
  });
