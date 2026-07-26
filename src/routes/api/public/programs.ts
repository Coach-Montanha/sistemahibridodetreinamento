import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/programs")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/public-api.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const { requireApiKey, json, errorResponse, ApiError } = await import(
          "@/lib/public-api.server"
        );
        try {
          const { coachId } = await requireApiKey(request);

          const rawLimit = new URL(request.url).searchParams.get("limit");
          let limit = 50;
          if (rawLimit !== null) {
            const parsed = Number(rawLimit);
            if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
              throw new ApiError(400, "Invalid limit");
            }
            limit = parsed;
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("programs")
            .select("id, titulo, metodologia, data_inicio, duracao_semanas, program_weeks(id)")
            .eq("coach_id", coachId)
            .order("data_inicio", { ascending: false })
            .limit(limit);

          if (error) throw error;

          return json({
            data: (data ?? []).map((p) => ({
              id: p.id,
              title: p.titulo,
              methodology: p.metodologia,
              start_date: p.data_inicio,
              weeks_count:
                (p.program_weeks as { id: string }[] | null)?.length || p.duracao_semanas,
            })),
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});