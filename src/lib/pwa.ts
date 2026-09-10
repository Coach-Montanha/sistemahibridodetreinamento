import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/**
 * Detecta se o aplicativo já está rodando em modo nativo / standalone (instalado)
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Detecta se o dispositivo é iOS / iPadOS
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

/**
 * Registra o Service Worker do Coach Montanha em produção
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Verifica atualizações periódicas
        reg.addEventListener("updatefound", () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[PWA] Nova versão do Coach Montanha disponível.");
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn("[PWA] Falha ao registrar Service Worker:", err);
      });
  });
}

/**
 * Hook para controlar a instalação do PWA
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [iosDevice, setIosDevice] = useState<boolean>(false);

  useEffect(() => {
    setIsInstalled(isStandalone());
    setIosDevice(isIOS());

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<{
    outcome: "accepted" | "dismissed" | "ios_instructions" | "unavailable";
  }> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        return { outcome: choice.outcome };
      } catch (err) {
        console.error("[PWA] Erro ao disparar prompt de instalação:", err);
        return { outcome: "unavailable" };
      }
    }

    if (iosDevice && !isInstalled) {
      return { outcome: "ios_instructions" };
    }

    return { outcome: "unavailable" };
  }, [deferredPrompt, iosDevice, isInstalled]);

  const canInstall = !isInstalled && (deferredPrompt !== null || iosDevice);

  return {
    canInstall,
    isInstalled,
    isIOS: iosDevice,
    hasNativePrompt: deferredPrompt !== null,
    promptInstall,
  };
}
