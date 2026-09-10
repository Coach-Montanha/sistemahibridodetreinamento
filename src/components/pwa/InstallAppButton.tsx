import React, { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/lib/pwa";
import { toast } from "sonner";

interface InstallAppButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function InstallAppButton({
  className = "",
  variant = "outline",
  size = "sm",
  showLabel = true,
}: InstallAppButtonProps) {
  const { isInstalled, isIOS, hasNativePrompt, promptInstall } = usePwaInstall();
  const [showIosModal, setShowIosModal] = useState(false);

  // Não exibe se já estiver instalado e rodando em modo standalone
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    if (hasNativePrompt) {
      const { outcome } = await promptInstall();
      if (outcome === "accepted") {
        toast.success("Aplicativo Coach Montanha instalado com sucesso!");
      }
    } else {
      // Se o navegador ainda não disparou o evento nativo ou é outro browser
      setShowIosModal(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleInstallClick}
        className={`cursor-pointer gap-1.5 font-medium border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary hover:text-primary transition-all duration-200 ${className}`}
        title="Instalar aplicativo Coach Montanha no seu aparelho"
      >
        <div className="relative flex items-center justify-center">
          <Smartphone className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
          </span>
        </div>
        {showLabel && (
          <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
            <span className="inline sm:hidden">Instalar</span>
            <span className="hidden sm:inline">Instalar App</span>
          </span>
        )}
      </Button>

      <Dialog open={showIosModal} onOpenChange={setShowIosModal}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary mb-2">
              <Download className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Instale o Coach Montanha
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Tenha acesso instantâneo sem barra de navegação, com suporte offline e experiência 100% nativa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm">
            {isIOS ? (
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/40 p-4">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> No Safari do iPhone / iPad:
                </p>
                <ol className="space-y-2.5 text-muted-foreground text-xs leading-relaxed list-decimal list-inside">
                  <li>
                    Toque no botão <span className="font-semibold text-foreground inline-flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border"><Share className="h-3 w-3 text-sky-400" /> Compartilhar</span> na barra inferior do Safari.
                  </li>
                  <li>
                    Role a lista e toque em <span className="font-semibold text-foreground inline-flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border"><PlusSquare className="h-3 w-3 text-emerald-400" /> Adicionar à Tela de Início</span>.
                  </li>
                  <li>
                    Toque em <span className="font-semibold text-foreground">"Adicionar"</span> no canto superior direito para concluir.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/40 p-4">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Como instalar no seu navegador:
                </p>
                <ol className="space-y-2.5 text-muted-foreground text-xs leading-relaxed list-decimal list-inside">
                  <li>
                    Abra o menu de opções do navegador <span className="font-semibold text-foreground">(três pontinhos no topo ou barra de endereços)</span>.
                  </li>
                  <li>
                    Clique ou toque na opção <span className="font-semibold text-foreground">"Instalar aplicativo"</span> ou <span className="font-semibold text-foreground">"Adicionar à tela inicial"</span>.
                  </li>
                  <li>
                    Confirme para ter o Coach Montanha instalado como aplicativo independente.
                  </li>
                </ol>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Carregamento ultrarrápido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Funciona offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Tela cheia sem bordas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Timers e áudios em 1 toque</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            className="w-full cursor-pointer mt-2"
            onClick={() => setShowIosModal(false)}
          >
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
