import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageDown, Loader2, ImageIcon, AlertTriangle } from "lucide-react";
import { prepararSessaoParaImagem } from "@/lib/session-image";
import {
  exportarSessaoImagem,
  exportarSessoesPDF,
  renderizarPreviewDataURL,
  type SessaoImagemInput,
} from "@/lib/image-export";
import { PRESETS_LAYOUT, carregarLayout, salvarLayout } from "@/lib/program-image-layout";
import { UnifiedCanvasEditor } from "../program-image/UnifiedCanvasEditor";
import { cn } from "@/lib/utils";

type Formato = "png" | "jpg" | "pdf";

export function ExportImageDialog({
  open,
  onOpenChange,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
}) {
  const [formato, setFormato] = useState<Formato>("png");
  const [presetId, setPresetId] = useState<string>("padrao");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    input: SessaoImagemInput;
    nomeArquivo: string;
  } | null>(null);
  const [baixando, setBaixando] = useState(false);

  const [layout, setLayout] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setLayout(carregarLayout(sessionId).layout);
    }
  }, [open, sessionId]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    (async () => {
      try {
        const prep = await prepararSessaoParaImagem(sessionId);
        if (cancel) return;
        const comLayout = { ...prep, input: { ...prep.input, layout } };
        setPayload(comLayout);
        const url = await renderizarPreviewDataURL(
          comLayout.input,
          Math.min(1280, layout.largura),
        );
        if (cancel) return;
        setPreview(url);
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "Falha ao preparar preview");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, sessionId, layout]);

  async function baixar() {
    if (!payload) return;
    setBaixando(true);
    try {
      if (formato === "pdf") {
        await exportarSessoesPDF([payload], `${payload.nomeArquivo}.pdf`);
      } else {
        await exportarSessaoImagem(payload.input, payload.nomeArquivo, formato);
      }
      toast.success(`${payload.nomeArquivo}.${formato} baixado`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-6">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <ImageDown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Exportar como imagem
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">
                Escolha o formato de tela e o arquivo: pronto pra publicar nas redes,
                enviar ao aluno ou imprimir.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {layout && payload ? (
            <UnifiedCanvasEditor
              layout={layout}
              blocos={payload.input.principal}
              metodologiaLabel={payload.input.metodologiaLabel}
              coachLabel={payload.input.coachLabel}
              onChange={(newLayout) => {
                setLayout(newLayout);
                salvarLayout(sessionId, newLayout);
              }}
            />
          ) : (
            <div className="aspect-video animate-pulse rounded-lg bg-muted" />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Formato de tela
              </p>
              <div className="flex gap-2">
                {Object.entries(PRESETS_LAYOUT).map(([id, p]) => (
                  <Button
                    key={id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-[10px] uppercase font-bold",
                      layout?.largura === p.layout.largura && "bg-primary text-primary-foreground border-primary"
                    )}
                    onClick={() => {
                      const next = { ...layout, largura: p.layout.largura, altura: p.layout.altura };
                      setLayout(next);
                      salvarLayout(sessionId, next);
                    }}
                  >
                    {p.nome}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Arquivo
              </p>
              <ToggleGroup
                type="single"
                value={formato}
                onValueChange={(v) => v && setFormato(v as Formato)}
                className="gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
              >
                {(["png", "jpg", "pdf"] as const).map((f) => (
                  <ToggleGroupItem
                    key={f}
                    value={f}
                    className="h-8 min-w-[64px] rounded-md px-3 text-xs font-semibold uppercase tracking-wide transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                  >
                    {f}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {payload && (
              <div className="min-w-0 text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Nome do arquivo
                </p>
                <p className="mt-1 truncate text-sm font-mono font-medium text-foreground">
                  {payload.nomeArquivo}.{formato}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={baixando}>
            Cancelar
          </Button>
          <Button
            onClick={baixar}
            disabled={loading || !!error || baixando || !payload}
            className="gap-2"
          >
            {baixando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Baixando…
              </>
            ) : (
              <>
                <ImageDown className="h-4 w-4" /> Baixar {formato.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}