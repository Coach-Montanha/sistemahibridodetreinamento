import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  X, 
  Video, 
  Image as ImageIcon, 
  Youtube, 
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export type MediaType = "video" | "imagem" | "gif" | "youtube";

export interface MediaItem {
  id?: string;
  storage_path: string;
  url_publica: string;
  tipo: MediaType;
}

interface ExerciseMediaUploadProps {
  exerciseId?: string;
  onMediaChange: (media: MediaItem[]) => void;
  initialMedia?: MediaItem[];
}

export function ExerciseMediaUpload({ 
  exerciseId, 
  onMediaChange, 
  initialMedia = [] 
}: ExerciseMediaUploadProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 100MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data: coachId, error: coachError } = await supabase.rpc("auth_coach_id");
      if (coachError) throw coachError;
      if (!coachId) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${coachId}/${Date.now()}.${fileExt}`;
      const type: MediaType = file.type.startsWith("video/") ? "video" : "imagem";

      const { error: uploadError } = await supabase.storage
        .from("exercise-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Gerar URL assinada de longa duração (100 anos)
      const { data, error: urlError } = await supabase.storage
        .from("exercise-media")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 100);

      if (urlError) throw urlError;

      const newItem: MediaItem = {
        storage_path: fileName,
        url_publica: data.signedUrl,
        tipo: type
      };

      const updatedMedia = [...media, newItem];
      setMedia(updatedMedia);
      onMediaChange(updatedMedia);
      toast.success("Mídia carregada com sucesso");
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error(error.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleYoutubeAdd = () => {
    if (!youtubeUrl.trim()) return;

    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = youtubeUrl.match(regExp);

    if (match && match[2].length === 11) {
      videoId = match[2];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      const newItem: MediaItem = {
        storage_path: `youtube-${videoId}`,
        url_publica: embedUrl,
        tipo: "youtube"
      };

      const updatedMedia = [...media, newItem];
      setMedia(updatedMedia);
      onMediaChange(updatedMedia);
      setYoutubeUrl("");
      toast.success("Link do YouTube adicionado");
    } else {
      toast.error("URL do YouTube inválida");
    }
  };

  const removeMedia = async (index: number) => {
    const item = media[index];
    
    // Se for arquivo do storage, tenta remover do storage também
    if (item.tipo !== "youtube") {
      try {
        await supabase.storage.from("exercise-media").remove([item.storage_path]);
      } catch (err) {
        console.warn("Erro ao remover do storage (pode já ter sido removido):", err);
      }
    }

    const updatedMedia = media.filter((_, i) => i !== index);
    setMedia(updatedMedia);
    onMediaChange(updatedMedia);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Upload de Arquivo (JPG, PNG, MP4, MOV)</Label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 px-4 w-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <Progress value={progress} className="h-1 w-full" />
                <span className="text-xs text-muted-foreground text-center">Enviando...</span>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center px-4">
                  Clique para upload (Máx 100MB)
                </span>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Link do YouTube</Label>
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-border bg-card p-4">
            <Youtube className="mb-2 h-8 w-8 text-red-600" />
            <div className="flex w-full gap-2">
              <Input 
                placeholder="Cole a URL do vídeo..." 
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYoutubeAdd()}
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={handleYoutubeAdd} className="h-8">
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {media.map((item, index) => (
            <div key={index} className="group relative overflow-hidden rounded-lg border border-border bg-card aspect-video">
              {item.tipo === "youtube" ? (
                <iframe
                  src={item.url_publica}
                  className="h-full w-full"
                  allowFullScreen
                />
              ) : item.tipo === "video" ? (
                <video 
                  src={item.url_publica} 
                  controls 
                  className="h-full w-full object-contain bg-black"
                />
              ) : (
                <img 
                  src={item.url_publica} 
                  alt="Mídia do exercício" 
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
              
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeMedia(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
