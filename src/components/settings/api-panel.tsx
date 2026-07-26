import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, KeyRound, Loader2, Plus, ShieldOff } from "lucide-react";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { PanelHeader } from "./panel-shell";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (value: string, id: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(id);
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
      } catch {
        toast.error("Não foi possível copiar");
      }
    },
  };
}

function CopyButton({
  value,
  id,
  label = "Copiar",
}: {
  value: string;
  id: string;
  label?: string;
}) {
  const { copied, copy } = useCopy();
  const done = copied === id;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => copy(value, id)}
      className="shrink-0 gap-1.5 transition-colors duration-200"
    >
      {done ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{done ? "Copiado" : label}</span>
    </Button>
  );
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function ApiPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const [nome, setNome] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [toRevoke, setToRevoke] = useState<string | null>(null);

  const keys = useQuery({ queryKey: ["api-keys"], queryFn: () => list({}) });

  const createMut = useMutation({
    mutationFn: () => create({ data: { nome: nome.trim() || undefined } }),
    onSuccess: (res) => {
      setFreshKey(res.key);
      setNome("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar a chave"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Chave revogada");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao revogar"),
  });

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const rows = keys.data ?? [];
  const ativas = rows.filter((k) => !k.revoked_at).length;

  return (
    <section>
      <PanelHeader
        icon={KeyRound}
        title="Chave da API"
        description="Gere chaves para consumir os endpoints públicos de programas. A chave completa aparece uma única vez."
        aside={
          <Badge variant="secondary" className="tabular-nums">
            {ativas} ativa{ativas === 1 ? "" : "s"}
          </Badge>
        }
      />

      <div className="grid max-w-3xl gap-6">
        <Card className="space-y-5 p-5 md:p-6">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Nova chave</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              256 bits aleatórios, guardados apenas como impressão digital — nem o app consegue
              lê-la depois.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label
                htmlFor="api-key-nome"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Nome (opcional)
              </Label>
              <Input
                id="api-key-nome"
                placeholder="Integração com o site"
                value={nome}
                maxLength={60}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending}
              className="sm:min-w-[170px]"
            >
              {createMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Gerar chave</>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-border px-5 py-4 md:px-6">
            <h3 className="text-sm font-semibold tracking-tight">Chaves emitidas</h3>
          </div>
          {keys.isLoading ? (
            <div className="space-y-3 p-5 md:p-6">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground md:px-6">
              Nenhuma chave emitida ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((k) => {
                const revogada = Boolean(k.revoked_at);
                return (
                  <li
                    key={k.id}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors duration-200 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between md:px-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{k.nome}</span>
                        {revogada ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            revogada
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                            ativa
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {k.key_prefix}••••{k.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {fmt(k.created_at)} · último uso {fmt(k.last_used_at)}
                      </p>
                    </div>
                    {!revogada && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToRevoke(k.id)}
                        className="shrink-0 gap-1.5 text-destructive transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <ShieldOff className="h-3.5 w-3.5" /> Revogar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 p-5 md:p-6">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Como usar</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Envie a chave no header <span className="font-mono">x-api-key</span>.
            </p>
          </div>
          <div className="space-y-2">
            {["/api/public/programs", "/api/public/programs/:id"].map((path) => (
              <div
                key={path}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                  GET
                </Badge>
                <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {origin}
                  {path}
                </code>
                <CopyButton value={`${origin}${path}`} id={path} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={Boolean(freshKey)} onOpenChange={(o) => !o && setFreshKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copie sua chave agora</DialogTitle>
            <DialogDescription>
              Este é o único momento em que a chave completa é exibida. Guarde-a em local seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{freshKey}</code>
            <CopyButton value={freshKey ?? ""} id="fresh" />
          </div>
          <DialogFooter>
            <Button onClick={() => setFreshKey(null)}>Já guardei</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(toRevoke)} onOpenChange={(o) => !o && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar esta chave?</AlertDialogTitle>
            <AlertDialogDescription>
              Qualquer integração usando esta chave deixa de funcionar imediatamente. A ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toRevoke) revokeMut.mutate(toRevoke);
                setToRevoke(null);
              }}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}