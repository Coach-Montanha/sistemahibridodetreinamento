import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDiagnosticInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    try {
      // 1. Resolve Coach ID
      const { data: coachId } = await (supabaseAdmin.rpc as any)("auth_coach_id_for_user", { _user_id: userId });

      // 2. Database Counts
      const [
        { count: mediaCount },
        { count: jobsCount },
        { count: itemsCount },
        { count: exercisesCount }
      ] = await Promise.all([
        supabaseAdmin.from("exercise_media").select("*", { count: 'exact', head: true }),
        supabaseAdmin.from("media_correlation_jobs").select("*", { count: 'exact', head: true }).eq("coach_id", coachId || userId),
        supabaseAdmin.from("media_correlation_items").select("*", { count: 'exact', head: true }),
        supabaseAdmin.from("exercises").select("*", { count: 'exact', head: true }).or(`coach_id.eq.${coachId},coach_id.is.null`)
      ]);

      // 3. Last Job Status
      const { data: lastJob } = await supabaseAdmin
        .from("media_correlation_jobs")
        .select("id, status, created_at, stats")
        .eq("coach_id", coachId || userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. Environment (Non-sensitive)
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "unknown";
      const projectRef = supabaseUrl.split('.')[0].replace('https://', '');

      return {
        success: true,
        env: {
          projectRef,
          bucket: "exercise-media",
          buildId: process.env.VITE_BUILD_ID || "dev",
        },
        auth: {
          userId,
          coachId,
        },
        database: {
          exercise_media: mediaCount || 0,
          correlation_jobs: jobsCount || 0,
          correlation_items: itemsCount || 0,
          exercises: exercisesCount || 0
        },
        lastJob
      };
    } catch (error: any) {
      console.error("[diagnostico] Error:", error);
      return { success: false, error: error.message };
    }
  });
