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
import { Wand2 } from "lucide-react";
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
            Motor automático baseado nos templates da metodologia.
          </p>
        </div>
      </div>
      )}

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Título do programa</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Metodologia</Label>
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
      </Card>
    </div>
  );
}