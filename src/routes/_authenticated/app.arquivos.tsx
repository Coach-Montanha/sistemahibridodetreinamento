import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  UploadCloud,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  File as FileIcon,
  FolderArchive,
} from "lucide-react";
import { toast } from "sonner";
import { useCoach } from "@/hooks/use-coach";

export const Route = createFileRoute("/_authenticated/app/arquivos")({
  component: ArquivosPage,
});

const BUCKET = "coach-files";

function ArquivosPage() {
  const { data: coach } = useCoach();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<
    { name: string; progress: number }[]
  >([]);
  const [toDelete, setToDelete] = useState<{ name: string; path: string } | null>(
    null,
  );

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["coach-files", coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(coach!.id, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    },
  });

  const upload = useCallback(
    async (fileList: FileList | File[]) => {
      if (!coach) return;
      const arr = Array.from(fileList);
      setUploading(arr.map((f) => ({ name: f.name, progress: 0 })));
      try {
        await Promise.all(
          arr.map(async (file, i) => {
            const path = `${coach.id}/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(path, file, { upsert: false, contentType: file.type });
            setUploading((prev) =>
              prev.map((u, idx) => (idx === i ? { ...u, progress: 100 } : u)),
            );
            if (error) throw error;
          }),
        );
        toast.success(
          arr.length === 1
            ? "Arquivo enviado"
            : `${arr.length} arquivos enviados`,
        );
        qc.invalidateQueries({ queryKey: ["coach-files"] });
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setTimeout(() => setUploading([]), 600);
      }
    },
    [coach, qc],
  );

  const del = useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido");
      qc.invalidateQueries({ queryKey: ["coach-files"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error || !data) return toast.error(error?.message ?? "Falha ao gerar link");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const totalBytes = files.reduce(
    (acc, f) => acc + (f.metadata?.size ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Arquivos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie e baixe planilhas, PDFs, mídias e outros arquivos do seu trabalho.
          </p>
        </div>
        {files.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {files.length} arquivos · {formatBytes(totalBytes)}
          </div>
        )}
      </header>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        className={`group relative mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/70 hover:border-primary/50 hover:bg-accent/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          className={`grid h-12 w-12 place-items-center rounded-full transition-colors duration-200 ${
            dragOver
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary group-hover:bg-primary/20"
          }`}
        >
          <UploadCloud className="h-6 w-6" />
        </div>
        <div className="mt-1 text-sm font-medium">
          Arraste arquivos aqui ou clique para selecionar
        </div>
        <div className="text-xs text-muted-foreground">
          Aceita qualquer formato · até múltiplos arquivos por vez
        </div>
      </label>

      {uploading.length > 0 && (
        <div className="mb-6 space-y-2">
          {uploading.map((u) => (
            <Card key={u.name} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.name}</div>
                <Progress value={u.progress} className="mt-2 h-1.5" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              className="h-16 animate-pulse border-border/60 bg-muted/40"
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <FolderArchive className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-semibold">Nenhum arquivo ainda</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie planilhas, PDFs e mídias para ter tudo à mão.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-2">
          {files.map((f) => {
            const path = `${coach!.id}/${f.name}`;
            const displayName = f.name.replace(/^\d+-/, "");
            const size = f.metadata?.size ?? 0;
            const when = f.created_at
              ? new Date(f.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "";
            const Icon = iconFor(displayName);
            return (
              <Card
                key={f.id ?? f.name}
                className="group flex items-center gap-4 border-border/70 p-4 transition-colors duration-150 hover:border-primary/40 hover:bg-accent/20"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{displayName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(size)} · {when}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => download(path, displayName)}
                    aria-label="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setToDelete({ name: displayName, path })}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) del.mutate(toDelete.path);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls", "csv", "numbers"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext)) return FileText;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext))
    return FileImage;
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return FileVideo;
  return FileIcon;
}

function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}