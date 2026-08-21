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

    try {
      // 1. Obter o coach_id real vinculado ao usuário autenticado via RPC administrativa
      const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
      console.log(`[bulk-media:register] Context userId: ${context.userId}, Resolved coachId: ${coachId}`);

      if (!coachId) {
        throw new Error(`Não foi possível resolver o coach_id para o usuário ${context.userId}. Verifique se você possui um perfil de treinador.`);
      }

      // 2. Verificar persistência no Storage antes de prosseguir
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

      // 3. Generate long-lived URL
      const { data: urlData, error: urlError } = await supabaseAdmin.storage
        .from("exercise-media")
        .createSignedUrl(data.storagePath, 60 * 60 * 24 * 365 * 100);
        
      if (urlError) throw urlError;

      // 4. Find target exercise (deve pertencer ao coach ou ser global)
      let targetExerciseId = null;
      
      if (data.sourceId) {
        const { data: ex } = await supabaseAdmin
          .from("exercises")
          .select("id")
          .eq("source_id", data.sourceId)
          .or(`coach_id.eq.${coachId},coach_id.is.null`)
          .maybeSingle();
        if (ex) targetExerciseId = ex.id;
      }

      if (!targetExerciseId && data.exerciseName) {
        const { data: ex } = await supabaseAdmin
          .from("exercises")
          .select("id")
          .ilike("nome_pt", `%${data.exerciseName}%`)
          .or(`coach_id.eq.${coachId},coach_id.is.null`)
          .maybeSingle();
        if (ex) targetExerciseId = ex.id;
      }

      // 5. Se não encontrar exercício, NÃO criar placeholder artificial.
      // O item permanecerá em media_import_items/media_correlation_items com status unlinked.
      if (!targetExerciseId) {
        return { 
          success: true, 
          storagePath: data.storagePath, 
          linked: false, 
          status: "needs_review",
          errorCode: "EXERCISE_NOT_MATCHED"
        };
      }

      // 6. Registrar na exercise_media
      const mediaType = data.type.startsWith('video/') ? 'video' : 
                        (data.name.toLowerCase().endsWith('.gif') ? 'gif' : 'imagem');

      console.log(`[bulk-media:register] Attempting insert into exercise_media for exercise ${targetExerciseId}`);
      const { error: dbError } = await supabaseAdmin
        .from("exercise_media")
        .insert({
          exercise_id: targetExerciseId,
          storage_path: data.storagePath,
          url_publica: urlData.signedUrl,
          tipo: mediaType as any,
          ordem: 0
        });
        
      if (dbError) {
        console.error(`[bulk-media:register] DB Error:`, dbError);
        throw new Error(`Erro ao registrar no banco: ${dbError.message} (Code: ${dbError.code})`);
      }

      return { 
        success: true, 
        storagePath: data.storagePath, 
        linked: true, // Sempre vinculado agora (seja real ou placeholder)
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

export const getMyCoachId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
    return coachId as string | null;
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
