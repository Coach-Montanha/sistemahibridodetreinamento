import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Iniciar auditoria de mídia para detectar duplicidades e órfãos.
 */
export const startMediaAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Resolve coach_id
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
    if (!coachId) throw new Error("Coach ID não resolvido.");

    // 1. Criar o job de auditoria
    const { data: report, error: reportError } = await supabaseAdmin
      .from("media_audit_reports")
      .insert({ coach_id: coachId, status: "running" })
      .select()
      .single();

    if (reportError) throw reportError;

    try {
      // 2. Listar arquivos recursivamente (usando lógica similar à correlação)
      const listRecursive = async (path: string): Promise<any[]> => {
        const { data: files, error } = await supabaseAdmin.storage
          .from("exercise-media")
          .list(path, { limit: 1000 });
        
        if (error) return [];
        
        let allFiles: any[] = [];
        for (const file of (files || [])) {
          const isFile = !!file.id || !!file.metadata;
          if (!isFile) {
            const subPath = path ? `${path}/${file.name}` : file.name;
            const subFiles = await listRecursive(subPath);
            allFiles = [...allFiles, ...subFiles];
          } else {
            allFiles.push({ ...file, fullPath: path ? `${path}/${file.name}` : file.name });
          }
        }
        return allFiles;
      };

      const allFoundFiles = await listRecursive(coachId);

      // 3. Obter vínculos atuais (filtrado pelo coach para segurança)
      const { data: existingMedia } = await supabaseAdmin
        .from("exercise_media")
        .select("storage_path, exercise_id")
        .eq("coach_id", coachId);

      const linkedPaths = new Set(existingMedia?.map(m => m.storage_path) || []);

      // 4. Mapear itens de auditoria
      // Nota: Fingerprint (hash) real requer download do arquivo, o que é pesado.
      // Por enquanto, usamos (nome, tamanho) como proxy de duplicidade.
      const auditItems = allFoundFiles.map(file => {
        const isOrphaned = !linkedPaths.has(file.fullPath);
        
        // Simulação de detecção de duplicidade por nome e tamanho
        const duplicates = allFoundFiles.filter(f => 
          f.fullPath !== file.fullPath && 
          f.name === file.name && 
          f.metadata?.size === file.metadata?.size
        );

        return {
          report_id: report.id,
          storage_path: file.fullPath,
          size: file.metadata?.size,
          content_type: file.metadata?.mimetype,
          is_orphaned: isOrphaned,
          is_duplicate: duplicates.length > 0,
          linked_exercise_id: existingMedia?.find(m => m.storage_path === file.fullPath)?.exercise_id,
          metadata: { 
            last_modified: file.updated_at,
            duplicate_count: duplicates.length
          }
        };
      });

      if (auditItems.length > 0) {
        await supabaseAdmin.from("media_audit_items").insert(auditItems);
      }

      // 5. Finalizar relatório
      const summary = {
        total_files: auditItems.length,
        orphaned_files: auditItems.filter(i => i.is_orphaned).length,
        duplicates_found: auditItems.filter(i => i.is_duplicate).length,
        size_total: auditItems.reduce((acc, i) => acc + (i.size || 0), 0)
      };

      await supabaseAdmin
        .from("media_audit_reports")
        .update({ status: "completed", summary })
        .eq("id", report.id);

      return { reportId: report.id, summary };
    } catch (err: any) {
      await supabaseAdmin
        .from("media_audit_reports")
        .update({ status: "failed" })
        .eq("id", report.id);
      throw err;
    }
  });

export const getLatestAuditReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });

    const { data: report } = await supabaseAdmin
      .from("media_audit_reports")
      .select("*, media_audit_items(*)")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return report;
  });
