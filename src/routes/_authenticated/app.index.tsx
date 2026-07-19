import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, PlusSquare, Users } from "lucide-react";
import { useCoach } from "@/hooks/use-coach";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: coach } = useCoach();

  const stats = useQuery({
    queryKey: ["dashboard-stats", coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const [ex, prog, stu, ses] = await Promise.all([
        supabase.from("exercises").select("id", { count: "exact", head: true }),
        supabase.from("programs").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
      ]);
      return {
        exercises: ex.count ?? 0,
        programs: prog.count ?? 0,
        students: stu.count ?? 0,
        sessions: ses.count ?? 0,
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {coach?.nome ?? "treinador"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bem-vindo ao seu sistema híbrido de programação.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Exercícios", value: stats.data?.exercises ?? "…" },
          { label: "Programas", value: stats.data?.programs ?? "…" },
          { label: "Sessões", value: stats.data?.sessions ?? "…" },
          { label: "Alunos", value: stats.data?.students ?? "…" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <PlusSquare className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">Nova sessão</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte um treino por blocos com drag-and-drop.
          </p>
          <Button asChild className="mt-4">
            <Link to="/app/sessoes/nova">Abrir construtor</Link>
          </Button>
        </Card>
        <Card className="p-6">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">Banco de exercícios</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre exercícios com vídeo, imagem ou gif.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app/exercicios">Abrir</Link>
          </Button>
        </Card>
        <Card className="p-6">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">Alunos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão de alunos e atribuição de programas (em breve).
          </p>
          <Button variant="outline" disabled className="mt-4">
            Em breve
          </Button>
        </Card>
      </div>
    </div>
  );
}