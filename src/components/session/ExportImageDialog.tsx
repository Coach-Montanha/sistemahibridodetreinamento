import { useEffect, useState } from "react";
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
import { ImageDown, Loader2, ImageIcon, AlertTriangle } from "lucide-react";
import { prepararSessaoParaImagem } from "@/lib/session-image";
import {
  exportarSessaoImagem,
  renderizarPreviewDataURL,
  type SessaoImagemInput,
} from "@/lib/image-export";
import { cn } from "@/lib/utils";

type Formato = "png" | "jpg";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    input: SessaoImagemInput;
    nomeArquivo: string;
  } | null>(null);
  const [baixando, setBaixando] = useState(false);

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
        setPayload(prep);
        const url = await renderizarPreviewDataURL(prep.input, 1280);
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
  }, [open, sessionId]);

  async function baixar() {
    if (!payload) return;
    setBaixando(true);
    try {
      await exportarSessaoImagem(payload.input, payload.nomeArquivo, formato);
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
                Canvas 5760×2160, pronto pra publicar nas redes ou enviar ao aluno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border border-border/60 bg-muted/40",
              "aspect-[5760/2160]",
            )}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Renderizando preview…</span>
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <span className="text-sm font-medium text-destructive">{error}</span>
              </div>
            )}
            {!loading && !error && preview && (
              <img
                src={preview}
                alt="Preview da sessão"
                className="h-full w-full object-contain"
              />
            )}
            {!loading && !error && !preview && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Formato
              </p>
              <ToggleGroup
                type="single"
                value={formato}
                onValueChange={(v) => v && setFormato(v as Formato)}
                className="gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
              >
                <ToggleGroupItem
                  value="png"
                  className="h-8 min-w-[64px] rounded-md px-3 text-xs font-semibold uppercase tracking-wide transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                >
                  PNG
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="jpg"
                  className="h-8 min-w-[64px] rounded-md px-3 text-xs font-semibold uppercase tracking-wide transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                >
                  JPG
                </ToggleGroupItem>
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