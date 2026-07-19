import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/marca")({
  component: MarcaPage,
});

function MarcaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coachId, setCoachId] = useState<string>();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [corPrimaria, setCorPrimaria] = useState("#F26B1F");
  const [corSecundaria, setCorSecundaria] = useState("#0F1115");
  const [rodape, setRodape] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("coaches")
        .select("id, logo_url, cor_primaria, cor_secundaria, rodape_export")
        .maybeSingle();
      if (data) {
        setCoachId(data.id);
        setLogoUrl(data.logo_url);
        setCorPrimaria(data.cor_primaria ?? "#F26B1F");
        setCorSecundaria(data.cor_secundaria ?? "#0F1115");
        setRodape(data.rodape_export ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function onUpload(file: File) {
    if (!coachId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${coachId}/logo-${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage
        .from("coach-branding")
        .upload(path, file, { upsert: true });
      if (ue) throw ue;
      const { data: signed } = await supabase.storage
        .from("coach-branding")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setLogoUrl(signed?.signedUrl ?? null);
      toast.success("Logo enviada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("coaches")
        .update({
          logo_url: logoUrl,
          cor_primaria: corPrimaria,
          cor_secundaria: corSecundaria,
          rodape_export: rodape || null,
        })
        .eq("id", coachId!);
      if (error) throw error;
      toast.success("Marca salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marca do treinador</h1>
          <p className="text-sm text-muted-foreground">
            Aparece no cabeçalho e rodapé das exportações PDF/Excel.
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <Label>Logo</Label>
          <div className="mt-2 flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-16 rounded border object-contain bg-white p-1"
              />
            ) : (
              <div className="h-16 w-16 rounded border border-dashed grid place-items-center text-xs text-muted-foreground">
                sem logo
              </div>
            )}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
              <Button asChild variant="outline" disabled={uploading}>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Enviando…" : "Enviar logo"}
                </span>
              </Button>
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Cor primária</Label>
            <div className="mt-2 flex gap-2">
              <Input
                type="color"
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
                className="h-10 w-16 p-1"
              />
              <Input value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cor secundária</Label>
            <div className="mt-2 flex gap-2">
              <Input
                type="color"
                value={corSecundaria}
                onChange={(e) => setCorSecundaria(e.target.value)}
                className="h-10 w-16 p-1"
              />
              <Input value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label>Rodapé</Label>
          <Input
            placeholder="@seuinstagram · seusite.com"
            value={rodape}
            onChange={(e) => setRodape(e.target.value)}
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Salvando…" : "Salvar marca"}
        </Button>
      </Card>
    </div>
  );
}