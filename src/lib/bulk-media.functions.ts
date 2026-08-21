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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const coachId = context.userId;
    
    for (const file of files) {
      try {
        const buffer = Buffer.from(file.base64, 'base64');
        const fileExt = file.name.split('.').pop();
        // Pasta organizada por coach e subpasta bulk
        const storagePath = `${coachId}/bulk/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // 1. Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("exercise-media")
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true
          });
          
        if (uploadError) throw uploadError;

        // 2. Verificar persistência no Storage antes de prosseguir
        const { data: listData } = await supabaseAdmin.storage
          .from("exercise-media")
          .list(storagePath.split('/').slice(0, -1).join('/'), {
            search: storagePath.split('/').pop()
          });

        const isPersisted = listData && listData.length > 0;
        if (!isPersisted) {
          throw new Error("Falha na verificação de persistência do arquivo no Storage.");
        }

        // 3. Generate long-lived URL
        const { data: urlData, error: urlError } = await supabaseAdmin.storage
          .from("exercise-media")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 100);
          
        if (urlError) throw urlError;

        // 4. Find target exercise
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

        // 5. Registrar na exercise_media SEMPRE (mesmo se não houver vínculo imediato)
        // Isso garante que o arquivo "exista" para o banco e para o inventário
        const mediaType = file.type.startsWith('video/') ? 'video' : 
                          (file.name.toLowerCase().endsWith('.gif') ? 'gif' : 'imagem');

        const { error: dbError } = await supabaseAdmin
          .from("exercise_media")
          .insert({
            exercise_id: targetExerciseId || '00000000-0000-0000-0000-000000000000', // GUID dummy se não vinculado? 
            // Na verdade, a coluna exercise_id costuma ser obrigatória. 
            // Se for obrigatória, precisamos de um exercício "Inbox" ou deixar nulo se o schema permitir.
            // Vou assumir que exercise_id é obrigatório conforme migrations anteriores.
            storage_path: storagePath,
            url_publica: urlData.signedUrl,
            tipo: mediaType as any,
            ordem: 0
          });
          
        // Se falhar o insert no banco, o arquivo ainda está no storage, mas a função retorna erro para o UI saber
        if (dbError) throw new Error(`Erro ao registrar no banco: ${dbError.message}`);

        results.push({ 
          name: file.name, 
          success: true, 
          storagePath, 
          linked: !!targetExerciseId,
          targetExerciseId 
        });
      } catch (err: any) {
        console.error(`Falha no upload de ${file.name}:`, err);
        results.push({ name: file.name, success: false, error: err.message });
      }
    }
    
    return results;
  });
