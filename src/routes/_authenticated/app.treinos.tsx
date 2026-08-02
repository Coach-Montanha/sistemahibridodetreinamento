import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Dumbbell, FolderKanban, PlusSquare, Wand2 } from "lucide-react";
import { ProgramasPanel } from "./app.programas";
import { GerarPanel } from "./app.gerar";
import { SessionBuilder } from "@/components/session-builder/SessionBuilder";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  aba: fallback(z.string(), "programas").default("programas"),
  ia: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/_authenticated/app/treinos")({
  validateSearch: zodValidator(searchSchema),
  component: TreinosHub,
});

const TABS = [
  { key: "programas", label: "Programas", icon: FolderKanban },
  { key: "nova", label: "Nova sessão", icon: PlusSquare },
  { key: "gerar", label: "Gerar treino", icon: Wand2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function TreinosHub() {
  const { aba, ia } = Route.useSearch();
  const navigate = useNavigate({ from: "/app/treinos" });
  const active: TabKey =
    (TABS.find((t) => t.key === aba)?.key as TabKey) ?? "programas";

  function setTab(key: TabKey) {
    navigate({ search: { aba: key, ia: false }, replace: true });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Treinos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Programas, nova sessão e gerador automático — tudo num só lugar.
            </p>
          </div>
        </div>
        {active !== "programas" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTab("programas")}
            className="text-muted-foreground hover:text-foreground"
          >
            Voltar
          </Button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Seções de treinos"
        className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-1 sm:mb-8"
      >
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.key)}
              className={`inline-flex flex-1 min-w-max items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {active === "programas" && (
          <ProgramasPanel key={ia ? "ia" : "todos"} showHeader={false} destacarIa={ia} />
        )}
        {active === "nova" && <SessionBuilder />}
        {active === "gerar" && <GerarPanel showHeader={false} />}
      </div>
    </div>
  );
}