import { useEffect, useState, useMemo } from "react";
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
import { LayoutGrid, Loader2, Save, MousePointer2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarLayout,
  salvarLayout,
  type PosicaoBloco,
} from "@/lib/program-image-layout";
import { cn } from "@/lib/utils";

export function PosicionarBlocosDialog({
  open,
  onOpenChange,
  programaId,
  modalidade,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programaId: string;
  modalidade: string;
  onFinish: () => void;
}) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [blocos, setBlocos] = useState<any[]>([]);
  const [posicoes, setPosicoes] = useState<PosicaoBloco[]>([]);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    (async () => {
      try {
        // Busca primeira sessão para servir de molde
        const { data: sessao } = await supabase
          .from("sessions")
          .select("id, session_blocks(ordem, formato, titulo, config)")
          .eq("program_week_id", 
            supabase.from("program_weeks").select("id").eq("program_id", programaId).limit(1)
          )
          .limit(1)
          .maybeSingle();

        const items = (sessao?.session_blocks ?? []).map((b: any, i: number) => ({
          chave: b.config?.chave || `bloco-${i}`,
          titulo: b.titulo || b.formato,
        }));
        setBlocos(items);

        const { layout } = carregarLayout(programaId, modalidade);
        setPosicoes(layout.posicoesBlocos ?? []);
      } catch (e: any) {
        toast.error("Erro ao carregar estrutura da sessão");
      } finally {
        setCarregando(false);
      }
    })();
  }, [open, programaId, modalidade]);

  const handleReset = () => {
    setPosicoes([]);
    toast.info("Layout resetado para o automático.");
  };

  const handleSave = async () => {
    setSalvando(true);
    try {
      const { layout } = carregarLayout(programaId, modalidade);
      salvarLayout(programaId, { ...layout, posicoesBlocos: posicoes });
      toast.success("Layout salvo!");
      onOpenChange(false);
      onFinish();
    } catch (e) {
      toast.error("Erro ao salvar layout");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Organizar Layout da Imagem (Canvas Livre)
          </DialogTitle>
          <DialogDescription>
            Ative o "Posicionamento Livre" no Preview de Exportação para arrastar os blocos diretamente sobre a imagem. Aqui você pode resetar ou gerenciar a lista de blocos ativos.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px] rounded-xl border border-dashed flex flex-col items-center justify-center bg-muted/20 p-8 text-center">
          {carregando ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <>
              <MousePointer2 className="h-10 w-10 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium mb-1">O arraste agora é feito diretamente no Preview de Exportação.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Vá em Exportar > Posicionamento Livre para organizar visualmente seus {blocos.length} blocos sobre o canvas final.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleReset} className="mr-auto gap-2">
            <RefreshCw className="h-4 w-4" /> Resetar para Automático
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSave} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Confirmar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
