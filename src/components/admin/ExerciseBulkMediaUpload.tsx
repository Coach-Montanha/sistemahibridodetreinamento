import React, { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  X, 
  Image as ImageIcon,
  PlayCircle,
  Link2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadMediaBatch } from "@/lib/bulk-media.functions";

interface FileEntry {
  file: File;
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'registered' | 'success' | 'error';
  error?: string;
  match?: {
    id: string;
    name: string;
  };
}


export function ExerciseBulkMediaUpload() {
  const [files, setFiles] = useState<FileEntry[]>(() => {
    const saved = sessionStorage.getItem('bulk_upload_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const serializable = files.map(({ file, ...rest }) => rest);
    sessionStorage.setItem('bulk_upload_queue', JSON.stringify(serializable));
  }, [files]);


  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newEntries: FileEntry[] = selectedFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substring(7),
      name: f.name,
      type: f.type,
      size: f.size,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadMutation = useMutation({
    mutationFn: async (batch: { name: string; type: string; base64: string; exerciseName: string }[]) => {
      return await uploadMediaBatch({ data: { files: batch } });
    }
  });

  const startUpload = async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) {
      toast.info("Nenhum arquivo pendente para upload");
      return;
    }

    setIsProcessing(true);
    const batchSize = 5;
    const total = pending.length;
    let processed = 0;

    for (let i = 0; i < total; i += batchSize) {
      const currentBatch = pending.slice(i, i + batchSize);
      
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        currentBatch.find(b => b.id === f.id) ? { ...f, status: 'uploading' } : f
      ));

      try {
        const payload = await Promise.all(currentBatch.map(async entry => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(entry.file);
          });

          // Extrair possível nome do exercício do nome do arquivo
          // Ex: "supino-reto.gif" -> "Supino Reto"
          const exerciseName = entry.name.split('.')[0].replace(/[-_]/g, ' ');

          return {
            name: entry.name,
            type: entry.type || 'image/gif',
            base64,
            exerciseName
          };
        }));

        const results = await uploadMutation.mutateAsync(payload);

        setFiles(prev => prev.map(f => {
          const result = results.find(r => r.name === f.name);
          if (result) {
            return { 
              ...f, 
              status: result.success ? 'registered' : 'error',
              error: result.error,
              match: result.linked && result.targetExerciseId ? { id: result.targetExerciseId, name: 'Vinculado' } : undefined
            };
          }
          return f;
        }));

        processed += currentBatch.length;
      } catch (err: any) {
        console.error("Erro no lote:", err);
        setFiles(prev => prev.map(f => 
          currentBatch.find(b => b.id === f.id) ? { ...f, status: 'error', error: err.message } : f
        ));
      }
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
    toast.success("Upload em massa concluído");
  };

  const stats = useMemo(() => {
    return {
      total: files.length,
      pending: files.filter(f => f.status === 'pending').length,
      success: files.filter(f => f.status === 'success').length,
      error: files.filter(f => f.status === 'error').length,
      linked: files.filter(f => f.match).length
    };
  }, [files]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Arquivos totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.success}</div>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.linked}</div>
            <p className="text-xs text-muted-foreground">Vinculados automaticamente</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            <Upload className="mr-2 h-4 w-4" />
            Selecionar Arquivos
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*,video/*"
            onChange={handleFileSelection}
          />
          <Button 
            onClick={startUpload}
            disabled={isProcessing || stats.pending === 0}
            className="flex-1 sm:flex-none"
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
            Iniciar Importação
          </Button>
        </div>
        
        {files.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={isProcessing}>
            <X className="mr-2 h-4 w-4" /> Limpar Lista
          </Button>
        )}
      </div>

      {files.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Fila de Upload</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Arquivo</th>
                    <th className="p-3 font-medium">Tamanho</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {files.map(entry => (
                    <tr key={entry.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {entry.type.startsWith('video/') ? <PlayCircle className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                          <span className="truncate max-w-[200px]" title={entry.name}>{entry.name}</span>
                          {entry.match && (
                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                              <Link2 className="h-3 w-3" />
                              {entry.match.name}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {(entry.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="p-3">
                        {entry.status === 'pending' && <Badge variant="outline">Pendente</Badge>}
                        {entry.status === 'uploading' && (
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Enviando
                          </div>
                        )}
                        {entry.status === 'registered' && (
                          <div className="flex items-center gap-1.5 text-green-500 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            OK
                          </div>
                        )}

                        {entry.status === 'error' && (
                          <div className="flex items-center gap-1.5 text-destructive font-medium" title={entry.error}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Erro
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(entry.id)}
                          disabled={entry.status === 'uploading'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
