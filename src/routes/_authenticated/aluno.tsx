import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mountain, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aluno")({
  component: AlunoHome,
});

function AlunoHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: ["aluno-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, titulo, numero_dia, data, status")
        .eq("status", "publicada")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            <span className="font-semibold">Meus treinos</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        {sessions.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Nenhum treino liberado ainda.
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((s: any) => (
              <Card key={s.id} className="p-4">
                <div className="text-sm text-muted-foreground">
                  Dia {s.numero_dia} · {s.data ?? "sem data"}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {s.titulo ?? "Treino"}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}