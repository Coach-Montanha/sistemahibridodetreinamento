import * as React from "react";
import {
  UploadCloud,
  File as FileIcon,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileUploadItem {
  id: string;
  file: File;
  progress?: number;
  status?: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  onFileRemove?: (fileId: string) => void;
  items?: FileUploadItem[];
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(mimeOrName: string) {
  const lower = mimeOrName.toLowerCase();
  if (lower.includes("image") || /\.(jpe?g|png|webp|gif|svg)$/i.test(lower)) {
    return <FileImage className="h-5 w-5 text-sky-500" />;
  }
  if (lower.includes("pdf") || /\.pdf$/i.test(lower)) {
    return <FileText className="h-5 w-5 text-rose-500" />;
  }
  if (
    lower.includes("spreadsheet") ||
    lower.includes("excel") ||
    lower.includes("csv") ||
    /\.(xlsx?|csv)$/i.test(lower)
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  }
  if (lower.includes("video") || /\.(mp4|mov|avi|mkv|webm)$/i.test(lower)) {
    return <FileVideo className="h-5 w-5 text-amber-500" />;
  }
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      onFilesSelected,
      onFileRemove,
      items = [],
      accept,
      multiple = true,
      maxFiles,
      maxSizeBytes = 50 * 1024 * 1024, // 50MB default
      disabled = false,
      className,
      title = "Arraste seus arquivos aqui ou clique para selecionar",
      description = "Suporta múltiplos formatos de arquivo",
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const validateAndDispatch = React.useCallback(
      (incoming: FileList | File[]) => {
        setErrorMsg(null);
        const fileArr = Array.from(incoming);
        if (fileArr.length === 0) return;

        if (maxFiles && fileArr.length > maxFiles) {
          setErrorMsg(`Máximo de ${maxFiles} arquivos permitidos por vez.`);
          return;
        }

        const validFiles: File[] = [];
        for (const file of fileArr) {
          if (maxSizeBytes && file.size > maxSizeBytes) {
            setErrorMsg(
              `O arquivo "${file.name}" ultrapassa o limite de ${formatFileSize(maxSizeBytes)}.`
            );
            return;
          }
          validFiles.push(file);
        }

        if (validFiles.length > 0 && onFilesSelected) {
          onFilesSelected(validFiles);
        }
      },
      [maxFiles, maxSizeBytes, onFilesSelected]
    );

    const handleDrop = React.useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        if (disabled) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          validateAndDispatch(e.dataTransfer.files);
        }
      },
      [disabled, validateAndDispatch]
    );

    const handleDragOver = React.useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setDragOver(true);
      },
      [disabled]
    );

    const handleDragLeave = React.useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
      },
      []
    );

    return (
      <div ref={ref} className={cn("w-full space-y-4", className)}>
        {/* Dropzone Area */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "cursor-pointer hover:border-primary/60 hover:bg-muted/30",
            dragOver
              ? "border-primary bg-primary/10 scale-[1.008] shadow-sm"
              : "border-border/70 bg-card/60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                validateAndDispatch(e.target.files);
                e.target.value = "";
              }
            }}
          />

          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full transition-all duration-200",
              dragOver
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-105"
            )}
          >
            <UploadCloud className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Validation Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-5 w-5 text-destructive/70 hover:text-destructive"
              onClick={() => setErrorMsg(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* File Queue / Uploading List */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => {
              const isUploading = item.status === "uploading" || (item.progress !== undefined && item.progress < 100);
              const isSuccess = item.status === "success" || item.progress === 100;
              const isError = item.status === "error";

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-2xs transition-all"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted/60">
                    {getFileIcon(item.file.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-foreground">
                        {item.file.name}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>

                    {isUploading && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={item.progress ?? 0} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {item.progress ?? 0}%
                        </span>
                      </div>
                    )}

                    {isError && item.errorMessage && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {item.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {isSuccess && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {onFileRemove && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => onFileRemove(item.id)}
                        title="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
FileUpload.displayName = "FileUpload";
