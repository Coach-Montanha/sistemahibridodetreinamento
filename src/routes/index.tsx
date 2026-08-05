import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mountain, Dumbbell, LineChart, Calendar } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Mountain className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Coach Montanha</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ modo: "cadastro" }}>Começar</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Sistema Híbrido de Treinamento
          </p>
          <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Prescreva treinos como você programa —{" "}
            <span className="text-primary">em blocos, em 5 modalidades.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Treinamento Híbrido, Kettlebell Sport, Kettlebell Fitness, Levantamento de Peso e
            Musculação. Construtor visual de sessão, banco de exercícios com mídia
            e liberação individual por aluno.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ modo: "cadastro" }}>Criar conta de treinador</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Dumbbell, title: "Construtor por blocos", desc: "E2MOM, AMRAP, AQ/TR, %1RM, hipertrofia — cada formato com seus campos." },
            { icon: Calendar, title: "Programas e semanas", desc: "Programe um dia, uma semana, um mês ou o ano inteiro." },
            { icon: LineChart, title: "Aluno vê o que você libera", desc: "Portal do aluno com histórico e feedback de RPE." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
