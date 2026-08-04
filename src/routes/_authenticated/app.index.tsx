import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Dumbbell, PlusSquare, Users } from "lucide-react";
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

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col p-6">
          <PlusSquare className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold leading-none">Nova sessão</h3>
          <p className="mt-2 text-sm text-muted-foreground flex-grow">
            Monte um treino por blocos com drag-and-drop.
          </p>
          <Button asChild className="mt-6 w-full shadow-lg shadow-primary/20">
            <Link to="/app/sessoes/nova">Abrir construtor</Link>
          </Button>
        </Card>

        <Card className="flex flex-col p-6">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold leading-none">Hub de Treinos</h3>
          <p className="mt-2 text-sm text-muted-foreground flex-grow">
            Visualize e organize suas sessões e programas.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full border-primary/20 hover:bg-primary/5">
            <Link to="/app/treinos">Gerenciar treinos</Link>
          </Button>
        </Card>

        <Card className="flex flex-col p-6">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold leading-none text-balance">Banco de exercícios</h3>
          <p className="mt-2 text-sm text-muted-foreground flex-grow">
            Cadastre exercícios com vídeo, imagem ou gif.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full border-primary/20 hover:bg-primary/5">
            <Link to="/app/exercicios">Abrir banco</Link>
          </Button>
        </Card>

        <Card className="flex flex-col p-6 opacity-80 grayscale-[0.5]">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-lg font-semibold leading-none">Alunos</h3>
          <p className="mt-2 text-sm text-muted-foreground flex-grow">
            Gestão de alunos e atribuição de programas.
          </p>
          <Button asChild variant="ghost" className="mt-6 w-full cursor-not-allowed bg-muted/50 hover:bg-muted/50">
            <Link to="/app/alunos">Em breve</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}