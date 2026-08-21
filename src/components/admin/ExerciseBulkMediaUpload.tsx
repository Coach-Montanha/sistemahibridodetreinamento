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
  Trash2,
  Copy,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registerUploadedMedia, getMyCoachId } from "@/lib/bulk-media.functions";
import { supabase } from "@/integrations/supabase/client";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileEntry {
  file?: File;
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'registered' | 'success' | 'error';
  error?: string;
  errorCode?: string;
  httpStatus?: number;
  storageBucket?: string;
  storagePath?: string;
  match?: {
    id: string;
    name: string;
  };
}

export function ExerciseBulkMediaUpload() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 1. Hidratação inicial a partir do banco de dados
  const { data: latestJob } = useQuery({
    queryKey: ['latest-import-job'],
    queryFn: async () => {
      const coachId = await getMyCoachId();
      if (!coachId) return null;

      const { data: job } = await supabase
        .from('media_import_jobs')
        .select('*, media_import_items(*)')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return job;
    }
  });

  React.useEffect(() => {
    if (latestJob && latestJob.media_import_items) {
      const dbFiles: FileEntry[] = latestJob.media_import_items.map((item: any) => ({
        id: item.id,
        name: item.filename,
        type: item.content_type || 'image/jpeg',
        size: item.size || 0,
        status: item.status === 'success' ? 'registered' : item.status,
        storagePath: item.storage_path,
        error: item.error_message,
        errorCode: item.error_code,
        exercise_id: item.exercise_id
      }));
      
      setFiles(prev => {
        // Preservar arquivos locais (file objects) que ainda não foram persistidos
        const localOnly = prev.filter(f => f.file && !dbFiles.some(db => db.name === f.name));
        return [...dbFiles, ...localOnly];
      });
      setActiveJobId(latestJob.id);
    }
  }, [latestJob]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const duplicates: string[] = [];
    const newEntries: FileEntry[] = [];

    selectedFiles.forEach(f => {
      const isDuplicate = files.some(existing => 
        existing.name === f.name && existing.size === f.size
      );

      if (isDuplicate) {
        duplicates.push(f.name);
      } else {
        newEntries.push({
          file: f,
          id: Math.random().toString(36).substring(7),
          name: f.name,
          type: f.type,
          size: f.size,
          status: 'pending'
        });
      }
    });

    if (duplicates.length > 0) {
      toast.warning(`${duplicates.length} arquivos já estão na fila e foram ignorados.`);
    }

    if (newEntries.length > 0) {
      setFiles(prev => [...prev, ...newEntries]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const registerMutation = useMutation({
    mutationFn: async (data: { storagePath: string; name: string; type: string; exerciseName: string }) => {
      return await registerUploadedMedia({ data });
    }
  });

  const startUpload = async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) {
      toast.info("Nenhum arquivo pendente para upload");
      return;
    }

    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      setIsProcessing(false);
      return;
    }
    
    const coachId = await getMyCoachId();
    if (!coachId) {
      toast.error("Coach ID não encontrado");
      setIsProcessing(false);
      return;
    }

    // 1. Criar Job no Banco
    const { data: job, error: jobError } = await supabase
      .from('media_import_jobs')
      .insert({
        coach_id: coachId,
        total_files: pending.length,
        status: 'running',
        metadata: { client_timestamp: new Date().toISOString() }
      })
      .select()
      .single();


    if (jobError) {
      toast.error("Erro ao iniciar job de importação");
      setIsProcessing(false);
      return;
    }

    setActiveJobId(job.id);

    let successCount = 0;
    let failCount = 0;

    for (const entry of pending) {
      if (!entry.file) continue;

      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'uploading' } : f));

      try {
        const fileExt = entry.name.split('.').pop();
        const storagePath = `${coachId}/bulk/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 2. Criar Item no Banco (Status: uploading)
        const { data: item, error: itemError } = await supabase
          .from('media_import_items')
          .insert({
            job_id: job.id,
            coach_id: coachId,
            filename: entry.name,
            size: entry.size,
            content_type: entry.type,
            status: 'uploading',
            storage_path: storagePath
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // 3. Upload real
        const { error: uploadError } = await supabase.storage
          .from("exercise-media")
          .upload(storagePath, entry.file, {
            contentType: entry.type || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // 4. Registro/Correlação
        const exerciseName = entry.name.split('.')[0].replace(/[-_]/g, ' ');
        const registrationResult = await registerMutation.mutateAsync({
          storagePath,
          name: entry.name,
          type: entry.type || 'image/gif',
          exerciseName
        });

        // 5. Atualizar Item no Banco
        await supabase
          .from('media_import_items')
          .update({
            status: registrationResult.success ? 'success' : 'error',
            error_message: registrationResult.error,
            exercise_id: registrationResult.targetExerciseId
          })
          .eq('id', item.id);

        if (registrationResult.success) successCount++;
        else failCount++;

        setFiles(prev => prev.map(f => {
          if (f.id === entry.id) {
            return {
              ...f,
              status: registrationResult.success ? 'registered' : 'error',
              error: registrationResult.error,
              errorCode: registrationResult.errorCode,
              storageBucket: 'exercise-media',
              storagePath,
              match: registrationResult.linked && registrationResult.targetExerciseId 
                ? { id: registrationResult.targetExerciseId, name: 'Vinculado' } 
                : undefined
            };
          }
          return f;
        }));

      } catch (err: any) {
        failCount++;
        console.error(`Erro no upload de ${entry.name}:`, err);
        setFiles(prev => prev.map(f => 
          f.id === entry.id ? { 
            ...f, 
            status: 'error', 
            error: err.message || "Falha no upload",
            errorCode: err.code || 'STORAGE_ERROR'
          } : f
        ));
      }
    }

    // Finalizar Job no Banco
    await supabase
      .from('media_import_jobs')
      .update({
        status: failCount === 0 ? 'completed' : 'failed',
        processed_files: successCount,
        failed_files: failCount
      })
      .eq('id', job.id);

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
    queryClient.invalidateQueries({ queryKey: ["latest-import-job"] });
    
    if (successCount === pending.length) {
      toast.success("Upload concluído com sucesso");
    } else {
      toast.warning(`Processamento finalizado: ${successCount} OK, ${failCount} Falhas`);
    }
  };

  const stats = useMemo(() => {
    return {
      total: files.length,
      pending: files.filter(f => f.status === 'pending').length,
      success: files.filter(f => f.status === 'registered' || f.status === 'success').length,
      error: files.filter(f => f.status === 'error').length,
      linked: files.filter(f => f.match || f.status === 'registered').length
    };
  }, [files]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Arquivos na fila</p>
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
            <p className="text-xs text-muted-foreground">Total Vinculado</p>
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
            <CardTitle className="text-sm">Histórico e Fila de Importação</CardTitle>
            <CardDescription>
              {activeJobId ? `Job Ativo: ${activeJobId.substring(0, 8)}...` : 'Nenhum job ativo persistido'}
            </CardDescription>
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
                          {(entry.match || entry.status === 'registered') && (
                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                              <Link2 className="h-3 w-3" />
                              {entry.match?.name || 'Vinculado'}
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
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-destructive font-medium">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Erro {entry.httpStatus && `(${entry.httpStatus})`}
                            </div>
                            <div className="text-[10px] text-destructive max-w-[150px] truncate" title={entry.error}>
                              {entry.errorCode || 'UPLOAD_FAILED'}: {entry.error}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {entry.status === 'error' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => {
                                      const details = {
                                        name: entry.name,
                                        status: entry.status,
                                        error_code: entry.errorCode,
                                        error_message: entry.error,
                                        http_status: entry.httpStatus,
                                        storage_bucket: entry.storageBucket,
                                        storage_path: entry.storagePath
                                      };
                                      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
                                      toast.success("Detalhes copiados");
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar detalhes do erro</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFile(entry.id)}
                            disabled={entry.status === 'uploading'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
