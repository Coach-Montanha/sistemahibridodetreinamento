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
import { ImageDown, Loader2, ImageIcon, AlertTriangle, LayoutGrid, MousePointer2 } from "lucide-react";
import { prepararSessaoParaImagem } from "@/lib/session-image";
import {
  exportarSessaoImagem,
  exportarSessoesPDF,
  renderizarPreviewDataURL,
  type SessaoImagemInput,
} from "@/lib/image-export";
import { PRESETS_LAYOUT, salvarLayout, type ImageLayout, type PosicaoBloco } from "@/lib/program-image-layout";
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
  const [dragMode, setDragMode] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);

  const layout = useMemo(
    () => (PRESETS_LAYOUT[presetId] ?? PRESETS_LAYOUT.padrao).layout,
    [presetId],
  );

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
  
  const blocks = useMemo(() => {
    if (!payload) return [];
    return [...payload.input.esquerda, ...payload.input.principal];
  }, [payload]);

  const handleDrag = (e: React.MouseEvent, canvasRect: DOMRect) => {
    if (!draggingBlock || !payload) return;
    const x = (e.clientX - canvasRect.left) / canvasRect.width;
    const y = (e.clientY - canvasRect.top) / canvasRect.height;
    
    const newPosicoes = (payload.input.layout?.posicoesBlocos || []).map(p => 
      p.chave === draggingBlock ? { ...p, x, y } : p
    );
    
    if (!newPosicoes.find(p => p.chave === draggingBlock)) {
      const zona = payload.input.esquerda.some(b => b.chave === draggingBlock) ? 'esquerda' : 'principal';
      newPosicoes.push({ chave: draggingBlock, zona: zona as any, ordem: 99, x, y });
    }
    
    const nextLayout = { ...payload.input.layout!, posicoesBlocos: newPosicoes };
    setPayload({ ...payload, input: { ...payload.input, layout: nextLayout } });
  };

  const handleSaveLayout = () => {
    if (!payload?.input.layout) return;
    salvarLayout(sessionId, payload.input.layout as ImageLayout);
    toast.success("Layout salvo com sucesso");
    setDragMode(false);
  };

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
          <div
            style={{ aspectRatio: `${layout.largura} / ${layout.altura}` }}
            className={cn(
              "relative mx-auto max-h-[52vh] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/40",
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
              <div 
                className="relative h-full w-full group"
                onMouseMove={(e) => {
                  if (dragMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleDrag(e, rect);
                  }
                }}
                onMouseUp={() => setDraggingBlock(null)}
                onMouseLeave={() => setDraggingBlock(null)}
              >
                <img
                  src={preview}
                  alt="Preview da sessão"
                  className={cn(
                    "h-full w-full object-contain",
                    dragMode && "cursor-crosshair"
                  )}
                />
                
                {dragMode && (
                   <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-[size:20px_20px]" />
                )}

                {dragMode && blocks.map(b => {
                   // Apenas visual para indicar onde clicar, as coordenadas reais são no canvas
                   // Mas para facilitar, podemos deixar botões flutuantes sobre a imagem
                   return null; 
                })}
              </div>
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
                Formato de tela
              </p>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger className="h-9 w-[220px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESETS_LAYOUT).map(([id, p]) => (
                    <SelectItem key={id} value={id} className="text-sm">
                      {p.nome} · {p.layout.largura}×{p.layout.altura}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button 
            variant={dragMode ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setDragMode(!dragMode)}
            className="mr-auto gap-2"
          >
            {dragMode ? <MousePointer2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            {dragMode ? "Modo Arrastar Ativo" : "Posicionamento Livre"}
          </Button>

          {dragMode ? (
            <Button onClick={handleSaveLayout} className="gap-2">
               <ImageIcon className="h-4 w-4" /> Salvar Posições
            </Button>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}