import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function MarcaPanel() {
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

  return (
    <section>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <Card className="max-w-2xl space-y-8 border-0 bg-transparent p-0 shadow-none">
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Logo
            </Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo do treinador"
                  className="h-16 w-16 shrink-0 rounded-lg border border-border bg-card object-contain p-1.5"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-border/80 text-[11px] text-muted-foreground">
                  sem logo
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button asChild variant="outline" disabled={uploading} className="transition-colors duration-200">
                  <span>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? "Enviando…" : "Enviar logo"}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { label: "Cor primária", value: corPrimaria, set: setCorPrimaria },
              { label: "Cor secundária", value: corSecundaria, set: setCorSecundaria },
            ].map((c) => (
              <div key={c.label} className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    aria-label={c.label}
                    value={c.value}
                    onChange={(e) => c.set(e.target.value)}
                    className="h-10 w-14 shrink-0 cursor-pointer p-1"
                  />
                  <Input
                    value={c.value}
                    onChange={(e) => c.set(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rodapé
            </Label>
            <Input
              placeholder="@seuinstagram · seusite.com"
              value={rodape}
              onChange={(e) => setRodape(e.target.value)}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Exibido no pé de cada página exportada.
            </p>
          </div>

          <Button onClick={save} disabled={saving} className="w-full sm:w-auto sm:min-w-[180px]">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
            ) : (
              "Salvar marca"
            )}
          </Button>
        </Card>
      )}
    </section>
  );
}
