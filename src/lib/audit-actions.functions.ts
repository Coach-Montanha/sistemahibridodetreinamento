import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Executa ações de limpeza e reparo em arquivos órfãos ou duplicados.
 */
export const executeAuditAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ 
    action: z.enum(["delete_orphan", "delete_duplicate", "cleanup_report"]),
    itemId: z.string().optional(),
    reportId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Resolve coach_id
    const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: context.userId });
    if (!coachId) throw new Error("Coach ID não resolvido.");

    if (data.action === "delete_orphan" && data.itemId) {
      // 1. Buscar o item para obter o path
      const { data: item } = await supabaseAdmin
        .from("media_audit_items")
        .select("storage_path")
        .eq("id", data.itemId)
        .single();

      if (!item) throw new Error("Item não encontrado.");

      // 2. Deletar do storage
      const { error: storageError } = await supabaseAdmin.storage
        .from("exercise-media")
        .remove([item.storage_path]);

      if (storageError) throw storageError;

      // 3. Deletar o registro de auditoria
      await supabaseAdmin.from("media_audit_items").delete().eq("id", data.itemId);
      
      return { success: true, message: "Arquivo órfão removido." };
    }

    if (data.action === "cleanup_report" && data.reportId) {
      // Remove apenas itens órfãos do relatório atual
      const { data: orphans } = await supabaseAdmin
        .from("media_audit_items")
        .select("storage_path, id")
        .eq("report_id", data.reportId)
        .eq("is_orphaned", true);

      if (orphans && orphans.length > 0) {
        const paths = orphans.map(o => o.storage_path);
        const { error: storageError } = await supabaseAdmin.storage
          .from("exercise-media")
          .remove(paths);
        
        if (storageError) throw storageError;

        const ids = orphans.map(o => o.id);
        await supabaseAdmin.from("media_audit_items").delete().in("id", ids);
      }

      return { success: true, count: orphans?.length || 0 };
    }

    throw new Error("Ação não implementada.");
  });
