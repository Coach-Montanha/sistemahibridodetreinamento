import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Settings2, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getGeneratorPrefs } from "@/lib/generator-prefs.functions";
import { gerarTreino } from "@/lib/gerador.functions";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";

export const Route = createFileRoute("/_authenticated/app/gerar")({
  component: GerarPage,
});

function GerarPage() {
  return <GerarPanel />;
}

export function GerarPanel({ showHeader = true }: { showHeader?: boolean } = {}) {
  const navigate = useNavigate();
  const gerar = useServerFn(gerarTreino);
  const [loading, setLoading] = useState(false);
  const [metodologia, setMetodologia] = useState<Methodology>("hibrido");
  const [escopo, setEscopo] = useState<"sessao" | "semana" | "mes" | "ano">("sessao");
  const [titulo, setTitulo] = useState("Programa gerado");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dias, setDias] = useState(3);
  const [avisos, setAvisos] = useState<string[]>([]);

  const prefs = useQuery({
    queryKey: ["generator-prefs", metodologia],
    queryFn: () => getGeneratorPrefs({ data: { metodologia } }),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAvisos([]);
    try {
      const res = await gerar({
        data: {
          metodologia,
          escopo,
          titulo,
          data_inicio: dataInicio,
          dias_por_semana: dias,
        },
      });
      toast.success(
        `Gerado: ${res.resultado.reduce((s, r) => s + r.sessoes, 0)} sessão(ões)`,
      );
      const list = (res as any).avisos as string[] | undefined;
      if (list && list.length > 0) {
        setAvisos(list);
      }
      if (res.primeira_sessao_id) {
        navigate({ to: "/app/sessoes/$id", params: { id: res.primeira_sessao_id } });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={showHeader ? "mx-auto max-w-2xl p-6" : "mx-auto max-w-2xl"}>
      {showHeader && (
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Wand2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerar treino</h1>
          <p className="text-sm text-muted-foreground">
            Motor automático baseado nos templates da modalidade.
          </p>
        </div>
      </div>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
          <Settings2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="leading-relaxed text-muted-foreground">
            {prefs.data?.origem === "custom"
              ? <>Usando suas preferências de <strong className="text-foreground">{METHODOLOGY_LABEL[metodologia]}</strong>. </>
              : <>Usando templates padrão de <strong className="text-foreground">{METHODOLOGY_LABEL[metodologia]}</strong>. </>}
            <Link
              to="/app/configuracoes"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {prefs.data?.origem === "custom" ? "Ajustar" : "Personalizar"}
            </Link>
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Título do programa</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Modalidade</Label>
              <Select value={metodologia} onValueChange={(v) => setMetodologia(v as Methodology)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((k) => (
                    <SelectItem key={k} value={k}>{METHODOLOGY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escopo</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessao">1 sessão</SelectItem>
                  <SelectItem value="semana">1 semana</SelectItem>
                  <SelectItem value="mes">1 mês (4 semanas)</SelectItem>
                  <SelectItem value="ano">1 ano (52 semanas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Data de início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
            </div>
            <div>
              <Label>Dias por semana</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                disabled={escopo === "sessao"}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Gerando..." : "Gerar treino"}
          </Button>
        </form>

        {avisos.length > 0 && (
          <div className="mt-4 space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              Avisos da geração
            </div>
            <ul className="space-y-1 text-xs leading-relaxed text-warning-foreground/90">
              {avisos.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-warning-foreground/60" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}