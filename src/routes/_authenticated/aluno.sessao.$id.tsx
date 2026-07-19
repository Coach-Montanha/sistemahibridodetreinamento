import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mountain } from "lucide-react";
import { BLOCK_FORMAT_LABEL, type BlockFormat } from "@/lib/methodology";

export const Route = createFileRoute("/_authenticated/aluno/sessao/$id")({
  component: SessaoAluno,
});

function SessaoAluno() {
  const { id } = Route.useParams();
  const { data: session } = useQuery({
    queryKey: ["aluno-sessao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, titulo, numero_dia, data, program_weeks(numero_semana, programs(titulo, metodologia))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["aluno-blocks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_blocks")
        .select(
          "id, ordem, formato, titulo, duracao_min, config, session_block_exercises(id, ordem, reps, series, pct_1rm, carga_kg, descanso_seg, lado, observacoes, nome_livre, exercises(nome_pt))",
        )
        .eq("session_id", id)
        .order("ordem");
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/aluno" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Meus treinos
          </Link>
          <div className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        {session && (
          <div>
            <div className="text-xs text-muted-foreground">
              {session.program_weeks?.programs?.titulo} · Semana {session.program_weeks?.numero_semana} · Dia {session.numero_dia} · {session.data ?? ""}
            </div>
            <h1 className="text-2xl font-bold">{session.titulo ?? "Treino"}</h1>
          </div>
        )}

        {blocks.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Sessão vazia.</Card>
        ) : (
          blocks.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-primary">
                  {BLOCK_FORMAT_LABEL[b.formato as BlockFormat] ?? b.formato}
                  {b.duracao_min ? ` · ${b.duracao_min} min` : ""}
                </div>
                <div className="text-lg font-semibold">{b.titulo ?? "Bloco"}</div>
                {b.config?.instrucoes && (
                  <div className="mt-1 text-sm text-muted-foreground">{b.config.instrucoes}</div>
                )}
              </div>
              <div className="space-y-2">
                {(b.session_block_exercises ?? [])
                  .sort((a: any, z: any) => a.ordem - z.ordem)
                  .map((ex: any) => (
                    <div key={ex.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">
                            {ex.exercises?.nome_pt ?? ex.nome_livre ?? "Exercício"}
                            {ex.lado ? ` · ${ex.lado}` : ""}
                          </div>
                          <div className="mt-0.5 text-sm text-muted-foreground">
                            {[
                              ex.series ? `${ex.series} séries` : null,
                              ex.reps ? `${ex.reps} reps` : null,
                              ex.pct_1rm ? `${ex.pct_1rm}% 1RM` : null,
                              ex.carga_kg ? `${ex.carga_kg} kg` : null,
                              ex.descanso_seg ? `descanso ${ex.descanso_seg}s` : null,
                            ].filter(Boolean).join(" · ")}
                          </div>
                          {ex.observacoes && (
                            <div className="mt-1 text-xs text-muted-foreground">{ex.observacoes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}