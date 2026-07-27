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
import { LayoutEditor } from "./layout-editor";
import {
  carregarLayout,
  salvarLayout,
  salvarTemplateModalidade,
  limparOverridePrograma,
  type ImageLayout,
  type OrigemLayout,
} from "@/lib/program-image-layout";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { prepararSessoesParaImagem, type SessaoImagemPreparada } from "@/lib/session-image";
import {
  exportarSessoesEmMassa,
  exportarSessoesPDF,
  renderizarPreviewDataURL,
} from "@/lib/image-export";

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

const ORIGEM_TEXTO: Record<OrigemLayout, string> = {
  programa: "Ajustes deste programa",
  modalidade: "Padrão da modalidade",
  padrao: "Preset padrão",
};

function GuiaDeUso() {
  const passos = [
    {
      icon: SlidersHorizontal,
      titulo: "Editar o layout",
      texto:
        "Escolha um preset e ajuste a grade de 12 colunas, o fundo, o respiro e a escala do texto. A pré-visualização atualiza sozinha.",
    },
    {
      icon: GripVertical,
      titulo: "Reordenar arrastando",
      texto:
        "Nos programas e no construtor, segure o puxador de seis pontinhos para mover semanas, dias, blocos e exercícios. Pelo teclado: Espaço e setas.",
    },
    {
      icon: Download,
      titulo: "Exportar",
      texto:
        "PNG e JPG saem em um ZIP com todas as sessões; o PDF sai em arquivo único com uma página por sessão.",
    },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground transition-colors duration-200 hover:text-foreground"
          aria-label="Como usar o layout de imagem"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold leading-tight">Como usar</p>
          <p className="text-xs leading-snug text-muted-foreground">
            Três passos para sair do ajuste à imagem final.
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
  const [origem, setOrigem] = useState<OrigemLayout>("padrao");
  const [sessoes, setSessoes] = useState<SessaoImagemPreparada[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gerandoPreview, setGerandoPreview] = useState(false);
  const [exportando, setExportando] = useState<null | "png" | "jpg" | "pdf">(null);

  const sessionIds = useMemo(() => (programa ? idsDasSessoes(programa) : []), [programa]);
  const modalidade = programa?.metodologia ?? null;
  const modalidadeLabel = modalidade
    ? (METHODOLOGY_LABEL[modalidade as Methodology] ?? modalidade)
    : null;

  // Carrega layout salvo + dados das sessões ao abrir
  useEffect(() => {
    if (!programa) {
      setSessoes(null);
      setPreview(null);
      return;
    }
    const resolvido = carregarLayout(programa.id, modalidade);
    setLayout(resolvido.layout);
    setOrigem(resolvido.origem);
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

  // Preview ao vivo da primeira sessão (debounce curto)
  useEffect(() => {
    if (!layout || !sessoes || sessoes.length === 0) return;
    let cancelado = false;
    setGerandoPreview(true);
    const t = setTimeout(async () => {
      try {
        const url = await renderizarPreviewDataURL(
          { ...sessoes[0].input, layout },
          1100,
        );
        if (!cancelado) setPreview(url);
      } catch {
        /* preview é acessório */
      } finally {
        if (!cancelado) setGerandoPreview(false);
      }
    }, 220);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [layout, sessoes]);

  function atualizarLayout(next: ImageLayout) {
    setLayout(next);
    if (programa) {
      salvarLayout(programa.id, next);
      setOrigem("programa");
    }
  }

  function definirComoPadraoDaModalidade() {
    if (!layout || !modalidade) return;
    salvarTemplateModalidade(modalidade, layout);
    toast.success(`Layout salvo como padrão de ${modalidadeLabel}`);
  }

  function restaurarPadraoDaModalidade() {
    if (!programa) return;
    limparOverridePrograma(programa.id);
    const resolvido = carregarLayout(programa.id, modalidade);
    setLayout(resolvido.layout);
    setOrigem(resolvido.origem);
    toast.success("Ajustes deste programa descartados");
  }

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
                Ajuste a grade de 12 colunas e exporte todas as sessões em PNG, JPG ou PDF.
              </DialogDescription>
            </div>
            <GuiaDeUso />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={origem === "programa" ? "default" : "outline"}
              className="font-medium"
            >
              {ORIGEM_TEXTO[origem]}
            </Badge>
            {modalidadeLabel && (
              <span className="text-[11px] leading-snug text-muted-foreground">
                Modalidade: {modalidadeLabel}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh]">
          <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            {layout ? (
              <LayoutEditor layout={layout} onChange={atualizarLayout} />
            ) : (
              <Skeleton className="h-72 w-full rounded-lg" />
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pré-visualização
                </span>
                {gerandoPreview && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="overflow-hidden rounded-lg border border-border/60 bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-2">
                {preview ? (
                  <img
                    src={preview}
                    alt="Pré-visualização da imagem da sessão"
                    className="w-full rounded-md shadow-sm transition-opacity duration-300"
                  />
                ) : (
                  <Skeleton className="aspect-video w-full rounded-md" />
                )}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {sessoes
                  ? `${sessoes.length} sessão(ões) serão exportadas com este layout.`
                  : "Carregando sessões do programa…"}
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 transition-colors duration-200"
              disabled={!layout || !modalidade}
              onClick={definirComoPadraoDaModalidade}
            >
              <BookmarkCheck className="h-4 w-4" />
              <span className="truncate">
                Salvar como padrão{modalidadeLabel ? ` de ${modalidadeLabel}` : ""}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground transition-colors duration-200 hover:text-foreground"
              disabled={origem !== "programa"}
              onClick={restaurarPadraoDaModalidade}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!sessoes?.length || !!exportando}
            onClick={() => exportar("jpg")}
          >
            {exportando === "jpg" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            JPG
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!sessoes?.length || !!exportando}
            onClick={() => exportar("pdf")}
          >
            {exportando === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            PDF
          </Button>
          <Button
            className="gap-2"
            disabled={!sessoes?.length || !!exportando}
            onClick={() => exportar("png")}
          >
            {exportando === "png" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            Exportar PNG
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}