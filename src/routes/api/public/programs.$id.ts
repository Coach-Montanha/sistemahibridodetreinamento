import { createFileRoute } from "@tanstack/react-router";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SetsEnvelope = { notes: string | null; sets_detail: unknown | null };

function parseObservacoes(raw: string | null): SetsEnvelope {
  if (!raw) return { notes: null, sets_detail: null };
  if (!raw.startsWith("__sets__:")) return { notes: raw, sets_detail: null };
  try {
    const payload = JSON.parse(raw.slice("__sets__:".length)) as {
      sets?: unknown;
      notes?: unknown;
    };
    return {
      notes: typeof payload.notes === "string" && payload.notes ? payload.notes : null,
      sets_detail: payload.sets ?? null,
    };
  } catch {
    return { notes: null, sets_detail: null };
  }
}

function byNumber(key: string) {
  return (a: Record<string, unknown>, b: Record<string, unknown>) =>
    Number(a[key] ?? 0) - Number(b[key] ?? 0);
}

export const Route = createFileRoute("/api/public/programs/$id")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/public-api.server");
        return preflight();
      },
      GET: async ({ request, params }) => {
        const { requireApiKey, json, errorResponse, ApiError } = await import(
          "@/lib/public-api.server"
        );
        try {
          const { coachId } = requireApiKey(request);
          const id = params.id;
          if (!UUID_RE.test(id)) throw new ApiError(400, "Invalid program id");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("programs")
            .select(
              `id, titulo, descricao, metodologia, data_inicio, duracao_semanas, status,
               program_weeks (
                 id, numero_semana, rotulo, data_inicio, eh_semana_especial, observacoes,
                 sessions (
                   id, numero_dia, data, titulo, status,
                   session_blocks (
                     id, ordem, formato, titulo, duracao_min, config,
                     session_block_exercises (
                       id, ordem, reps, series, pct_1rm, carga_kg, descanso_seg, lado,
                       observacoes, nome_livre, exercises ( id, nome_pt, metodologias, equipamento )
                     )
                   )
                 )
               )`,
            )
            .eq("id", id)
            .eq("coach_id", coachId)
            .maybeSingle();

          if (error) throw error;
          if (!data) throw new ApiError(404, "Not found");

          const weeks = [...((data.program_weeks as any[]) ?? [])]
            .sort(byNumber("numero_semana"))
            .map((w) => ({
              id: w.id,
              week_number: w.numero_semana,
              label: w.rotulo ?? null,
              start_date: w.data_inicio ?? null,
              is_special: w.eh_semana_especial,
              notes: w.observacoes ?? null,
              sessions: [...(w.sessions ?? [])].sort(byNumber("numero_dia")).map((s: any) => ({
                id: s.id,
                day_number: s.numero_dia,
                date: s.data ?? null,
                title: s.titulo ?? null,
                status: s.status,
                blocks: [...(s.session_blocks ?? [])].sort(byNumber("ordem")).map((b: any) => ({
                  id: b.id,
                  order: b.ordem,
                  format: b.formato,
                  title: b.titulo ?? null,
                  duration_min: b.duracao_min ?? null,
                  config: b.config ?? {},
                  exercises: [...(b.session_block_exercises ?? [])]
                    .sort(byNumber("ordem"))
                    .map((e: any) => {
                      const { notes, sets_detail } = parseObservacoes(e.observacoes ?? null);
                      return {
                        id: e.id,
                        order: e.ordem,
                        exercise_id: e.exercises?.id ?? null,
                        name: e.exercises?.nome_pt ?? e.nome_livre ?? null,
                        modalities: e.exercises?.metodologias ?? [],
                        equipment: e.exercises?.equipamento ?? [],
                        sets: e.series ?? null,
                        reps: e.reps ?? null,
                        pct_1rm: e.pct_1rm ?? null,
                        load_kg: e.carga_kg ?? null,
                        rest_sec: e.descanso_seg ?? null,
                        side: e.lado ?? null,
                        notes,
                        sets_detail,
                      };
                    }),
                })),
              })),
            }));

          return json({
            data: {
              id: data.id,
              title: data.titulo,
              description: data.descricao ?? null,
              methodology: data.metodologia,
              start_date: data.data_inicio,
              weeks_count: weeks.length || data.duracao_semanas,
              status: data.status,
              weeks,
            },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});