import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerUploadedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    storagePath: z.string(),
    name: z.string(),
    type: z.string(),
    exerciseName: z.string().optional(),
    sourceId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const coachId = context.userId;
    
    try {
      // 1. Verificar persistência no Storage antes de prosseguir
      const { data: listData, error: listError } = await supabaseAdmin.storage
        .from("exercise-media")
        .list(data.storagePath.split('/').slice(0, -2).join('/') + '/' + data.storagePath.split('/').slice(-2, -1)[0], {
          search: data.storagePath.split('/').pop()
        });

      if (listError) throw listError;
      
      const isPersisted = listData && listData.length > 0;
      if (!isPersisted) {
        throw new Error("Arquivo não encontrado no Storage após upload.");
      }

      // 2. Generate long-lived URL
      const { data: urlData, error: urlError } = await supabaseAdmin.storage
        .from("exercise-media")
        .createSignedUrl(data.storagePath, 60 * 60 * 24 * 365 * 100);
        
      if (urlError) throw urlError;

      // 3. Find target exercise
      let targetExerciseId = null;
      
      if (data.sourceId) {
        const { data: ex } = await supabaseAdmin
          .from("exercises")
          .select("id")
          .eq("source_id", data.sourceId)
          .maybeSingle();
        if (ex) targetExerciseId = ex.id;
      }

      if (!targetExerciseId && data.exerciseName) {
        const { data: ex } = await supabaseAdmin
          .from("exercises")
          .select("id")
          .ilike("nome_pt", `%${data.exerciseName}%`)
          .maybeSingle();
        if (ex) targetExerciseId = ex.id;
      }

      // 4. Registrar na exercise_media
      const mediaType = data.type.startsWith('video/') ? 'video' : 
                        (data.name.toLowerCase().endsWith('.gif') ? 'gif' : 'imagem');

      const { error: dbError } = await supabaseAdmin
        .from("exercise_media")
        .insert({
          exercise_id: targetExerciseId || '00000000-0000-0000-0000-000000000000',
          storage_path: data.storagePath,
          url_publica: urlData.signedUrl,
          tipo: mediaType as any,
          ordem: 0
        });
        
      if (dbError) throw new Error(`Erro ao registrar no banco: ${dbError.message}`);

      return { 
        success: true, 
        storagePath: data.storagePath, 
        linked: !!targetExerciseId,
        targetExerciseId 
      };
    } catch (err: any) {
      console.error(`Falha no registro de ${data.name}:`, err);
      return { 
        success: false, 
        error: err.message,
        errorCode: err.code || 'REGISTRATION_ERROR'
      };
    }
  });

// Mantido por compatibilidade temporária se necessário, mas marcado como legado
export const uploadMediaBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    files: z.array(z.any())
  }).parse(data))
  .handler(async () => {
    throw new Error("uploadMediaBatch foi substituído por upload direto + registerUploadedMedia.");
  });
