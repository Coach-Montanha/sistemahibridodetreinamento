import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ImageDown,
  FileDown,
  Loader2,
  HelpCircle,
  BookmarkCheck,
  RotateCcw,
  GripVertical,
  SlidersHorizontal,
  Download,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { carregarLayout, salvarLayout, type ImageLayout, PRESETS_LAYOUT } from "@/lib/program-image-layout";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { prepararSessoesParaImagem, type SessaoImagemPreparada } from "@/lib/session-image";
import {
  exportarSessoesEmMassa,
  exportarSessoesPDF,
  renderizarPreviewDataURL,
} from "@/lib/image-export";
import { UnifiedCanvasEditor } from "./UnifiedCanvasEditor";

type Programa = {
  id: string;
  titulo?: string | null;
  metodologia?: string | null;
  program_weeks?: any[];
};

function idsDasSessoes(programa: Programa): string[] {
  return (programa.program_weeks ?? [])
    .slice()
    .sort((a: any, b: any) => (a.numero_semana ?? 0) - (b.numero_semana ?? 0))
    .flatMap((w: any) =>
      (w.sessions ?? [])
        .slice()
        .sort((a: any, b: any) => (a.numero_dia ?? 0) - (b.numero_dia ?? 0))
        .map((s: any) => String(s.id)),
    );
}

export const NOVIDADES_KEY = "program-image-novidades-dispensadas";

export function novidadesPendentes(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NOVIDADES_KEY) !== "1";
  } catch {
    return false;
  }
}

export function useNovidadesPendentes(): boolean {
  const [pendente, setPendente] = useState(false);
  useEffect(() => setPendente(novidadesPendentes()), []);
  return pendente;
}

type Destaque = "origem" | "template" | "ajuda" | null;

const ANEL =
  "ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-md transition-shadow duration-200";

function GuiaDeUso({ realcado }: { realcado?: boolean }) {
  const passos = [
    {
      icon: LayoutGrid,
      titulo: "Canvas Livre",
      texto: "Arraste os blocos para qualquer lugar da imagem. O sistema salvará as coordenadas automaticamente.",
    },
    {
      icon: Download,
      titulo: "Exportar",
      texto: "PNG e JPG saem em um ZIP com todas as sessões; o PDF sai em arquivo único com uma página por sessão.",
    },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 text-muted-foreground transition-colors duration-200 hover:text-foreground",
            realcado && ANEL,
          )}
          aria-label="Como usar o layout de imagem"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold leading-tight">Como usar</p>
          <p className="text-xs leading-snug text-muted-foreground">
            Ajuste e exporte suas imagens.
          </p>
        </div>
        <ul className="space-y-4 px-4 py-4">
          {passos.map((p) => (
            <li key={p.titulo} className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <p.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold leading-tight">{p.titulo}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ProgramImageDialog({
  programa,
  onOpenChange,
}: {
  programa: Programa | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!programa;
  const [layout, setLayout] = useState<ImageLayout | null>(null);
  const [sessoes, setSessoes] = useState<SessaoImagemPreparada[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gerandoPreview, setGerandoPreview] = useState(false);
  const [exportando, setExportando] = useState<null | "png" | "jpg" | "pdf">(null);
  const [novidades, setNovidades] = useState(false);
  const [destaque, setDestaque] = useState<Destaque>(null);

  const sessionIds = useMemo(() => (programa ? idsDasSessoes(programa) : []), [programa]);
  const modalidade = programa?.metodologia ?? null;
  const modalidadeLabel = modalidade
    ? (METHODOLOGY_LABEL[modalidade as Methodology] ?? modalidade)
    : null;

  useEffect(() => {
    if (open) setNovidades(novidadesPendentes());
  }, [open]);

  useEffect(() => {
    if (!destaque) return;
    const t = setTimeout(() => setDestaque(null), 1600);
    return () => clearTimeout(t);
  }, [destaque]);

  function dispensarNovidades() {
    setNovidades(false);
    try {
      window.localStorage.setItem(NOVIDADES_KEY, "1");
    } catch {
      /* storage indisponível */
    }
  }

  useEffect(() => {
    if (!programa) {
      setSessoes(null);
      setPreview(null);
      return;
    }
    const resolvido = carregarLayout(programa.id, modalidade);
    setLayout(resolvido.layout);
    let cancelado = false;
    (async () => {
      try {
        const dados = await prepararSessoesParaImagem(sessionIds);
        if (!cancelado) setSessoes(dados);
      } catch (e: any) {
        if (!cancelado) toast.error(e?.message ?? "Não foi possível carregar as sessões");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [programa, sessionIds, modalidade]);

  async function exportar(formato: "png" | "jpg" | "pdf") {
    if (!layout || !sessoes || sessoes.length === 0) return;
    setExportando(formato);
    try {
      const base = (programa?.titulo ?? "programa").replace(/[^\w\-]+/g, "_");
      const itens = sessoes.map((s) => ({ ...s, input: { ...s.input, layout } }));
      if (formato === "pdf") {
        await exportarSessoesPDF(itens, `${base}.pdf`);
      } else {
        await exportarSessoesEmMassa(itens, formato, `${base}_${formato}.zip`);
      }
      toast.success(`Exportação concluída (${sessoes.length} sessões)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar");
    } finally {
      setExportando(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="space-y-2 border-b border-border/60 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base leading-tight">
                Layout de imagem
                {programa?.titulo && (
                  <Badge variant="secondary" className="max-w-[16rem] truncate font-normal">
                    {programa.titulo}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="leading-snug">
                Arraste os blocos e exporte em PNG, JPG ou PDF.
              </DialogDescription>
            </div>
            <GuiaDeUso realcado={destaque === "ajuda"} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {modalidadeLabel && (
              <span className="text-[11px] leading-snug text-muted-foreground">
                Modalidade: {modalidadeLabel}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[72vh]">
          <div className="flex flex-col gap-6 px-6 py-5">
            {novidades && (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 duration-200 animate-in fade-in">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 space-y-3">
                    <p className="text-sm font-semibold leading-tight">Novo Motor de Canvas</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Agora você pode arrastar livremente os blocos para qualquer lugar da imagem.
                    </p>
                    <Button variant="ghost" size="sm" onClick={dispensarNovidades}>Entendi</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canvas Livre</span>
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-1">
                    {Object.entries(PRESETS_LAYOUT).map(([id, p]) => (
                      <Button
                        key={id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-[10px] uppercase font-bold",
                          layout?.largura === (p as any).layout.largura && "bg-background shadow-sm"
                        )}
                        onClick={() => {
                          if (!layout) return;
                          const next: ImageLayout = { ...layout, largura: (p as any).layout.largura, altura: (p as any).layout.altura };
                          setLayout(next);
                          salvarLayout(programa!.id, next);
                        }}
                      >
                        {(p as any).nome}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 gap-1 text-[10px] uppercase font-bold"
                    onClick={() => {
                      if (!layout) return;
                      const next: ImageLayout = { ...layout, fundo: layout.fundo === 'claro' ? 'escuro' : 'claro' };
                      setLayout(next);
                      salvarLayout(programa!.id, next);
                    }}
                  >
                    {layout?.fundo === 'claro' ? 'Modo Escuro' : 'Modo Claro'}
                  </Button>
                </div>
                {gerandoPreview && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              {layout && sessoes && sessoes.length > 0 ? (
                <UnifiedCanvasEditor
                  layout={layout}
                  blocos={sessoes[0].input.principal}
                  metodologiaLabel={sessoes[0].input.metodologiaLabel}
                  coachLabel={sessoes[0].input.coachLabel}
                  onChange={(newLayout: ImageLayout) => {
                    setLayout(newLayout);
                    salvarLayout(programa!.id, newLayout);
                  }}
                />
              ) : (
                <Skeleton className="aspect-video w-full rounded-md" />
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={!sessoes?.length || !!exportando} onClick={() => exportar("jpg")}>
              {exportando === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />} JPG
            </Button>
            <Button variant="outline" disabled={!sessoes?.length || !!exportando} onClick={() => exportar("pdf")}>
              {exportando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
            </Button>
            <Button disabled={!sessoes?.length || !!exportando} onClick={() => exportar("png")}>
              {exportando === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />} Exportar PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}