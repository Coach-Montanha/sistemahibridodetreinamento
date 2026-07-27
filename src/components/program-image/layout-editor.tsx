import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  PRESETS_LAYOUT,
  type FundoImagem,
  type ImageLayout,
} from "@/lib/program-image-layout";

const FUNDOS: { value: FundoImagem; label: string }[] = [
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Grafite" },
  { value: "transparente", label: "Transparente" },
];

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 min-w-9 rounded-md px-3 text-xs font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Campo({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        {hint && <span className="text-xs tabular-nums text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function LayoutEditor({
  layout,
  onChange,
}: {
  layout: ImageLayout;
  onChange: (next: ImageLayout) => void;
}) {
  const set = (patch: Partial<ImageLayout>) => onChange({ ...layout, ...patch });
  const presetAtivo = Object.entries(PRESETS_LAYOUT).find(
    ([, p]) =>
      p.layout.largura === layout.largura &&
      p.layout.altura === layout.altura &&
      p.layout.esquerdaSpan === layout.esquerdaSpan &&
      p.layout.colunasPrincipal === layout.colunasPrincipal,
  )?.[0];

  return (
    <div className="space-y-6">
      <Campo label="Preset">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(PRESETS_LAYOUT).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...p.layout })}
              className={cn(
                "rounded-lg border p-3 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                presetAtivo === key
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <div className="text-sm font-semibold">{p.nome}</div>
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {p.descricao}
              </div>
            </button>
          ))}
        </div>
      </Campo>

      <Campo
        label="Grade de 12 colunas"
        hint={
          layout.esquerdaSpan > 0
            ? `faixa ${layout.esquerdaSpan} / principal ${12 - layout.esquerdaSpan}`
            : "sem faixa esquerda"
        }
      >
        <div
          className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1"
          role="group"
          aria-label="Colunas reservadas à faixa esquerda"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((col) => {
            const naFaixa = col <= layout.esquerdaSpan;
            return (
              <button
                key={col}
                type="button"
                aria-label={`Faixa esquerda com ${col} colunas`}
                onClick={() =>
                  set({ esquerdaSpan: layout.esquerdaSpan === col ? 0 : Math.min(col, 6) })
                }
                disabled={col > 6}
                className={cn(
                  "h-14 flex-1 rounded-md text-[10px] font-bold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  naFaixa
                    ? "bg-primary/85 text-primary-foreground"
                    : col <= 6
                      ? "bg-background text-muted-foreground hover:bg-accent"
                      : "bg-background/60 text-muted-foreground/40",
                )}
              >
                {col}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          A faixa esquerda recebe Preparação de movimento e Aquecimento. Clique na mesma
          coluna para desligá-la e distribuir tudo na grade principal.
        </p>
      </Campo>

      <div className="grid gap-6 sm:grid-cols-2">
        <Campo label="Colunas do principal">
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <Segment
                key={n}
                active={layout.colunasPrincipal === n}
                onClick={() => set({ colunasPrincipal: n })}
              >
                {n === 0 ? "Auto" : n}
              </Segment>
            ))}
          </div>
        </Campo>

        <Campo label="Fundo">
          <div className="flex flex-wrap gap-2">
            {FUNDOS.map((f) => (
              <Segment
                key={f.value}
                active={layout.fundo === f.value}
                onClick={() => set({ fundo: f.value })}
              >
                {f.label}
              </Segment>
            ))}
          </div>
        </Campo>

        <Campo label="Respiro entre blocos" hint={`${layout.gap} px`}>
          <Slider
            value={[layout.gap]}
            min={24}
            max={200}
            step={8}
            onValueChange={([v]) => set({ gap: v })}
          />
        </Campo>

        <Campo label="Escala do texto" hint={`${Math.round(layout.escalaTexto * 100)}%`}>
          <Slider
            value={[Math.round(layout.escalaTexto * 100)]}
            min={50}
            max={130}
            step={2}
            onValueChange={([v]) => set({ escalaTexto: v / 100 })}
          />
        </Campo>

        <Campo label="Margem lateral" hint={`${layout.margemX} px`}>
          <Slider
            value={[layout.margemX]}
            min={40}
            max={320}
            step={8}
            onValueChange={([v]) => set({ margemX: v })}
          />
        </Campo>

        <Campo label="Rodapé da assinatura" hint={`${layout.margemBase} px`}>
          <Slider
            value={[layout.margemBase]}
            min={140}
            max={520}
            step={10}
            onValueChange={([v]) => set({ margemBase: v })}
          />
        </Campo>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Badge variant="outline" className="tabular-nums">
          {layout.largura}×{layout.altura}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          Ajustes salvos automaticamente para este programa.
        </span>
      </div>
    </div>
  );
}