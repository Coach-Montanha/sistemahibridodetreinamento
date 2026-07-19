import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/primeiro-acesso")({
  component: PrimeiroAcesso,
});

function PrimeiroAcesso() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"login" | "nova">("login");
  const [email, setEmail] = useState("");
  const [tempPw, setTempPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginTemp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: tempPw });
    setLoading(false);
    if (error) return toast.error(error.message);
    setStep("nova");
  }

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // linka students.auth_user_id + marca senha_temporaria=false
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase
        .from("students")
        .update({ auth_user_id: u.user.id, senha_temporaria: false, status: "ativo" })
        .eq("email", u.user.email!);
    }
    setLoading(false);
    toast.success("Senha atualizada!");
    navigate({ to: "/aluno" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="p-6">
          <h1 className="text-xl font-bold">Primeiro acesso do aluno</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "login"
              ? "Use o e-mail e a senha temporária que seu treinador enviou."
              : "Defina sua nova senha."}
          </p>
          {step === "login" ? (
            <form onSubmit={loginTemp} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pa-email">E-mail</Label>
                <Input id="pa-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pa-tp">Senha temporária</Label>
                <Input id="pa-tp" type="password" required value={tempPw} onChange={(e) => setTempPw(e.target.value)} />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>Continuar</Button>
            </form>
          ) : (
            <form onSubmit={trocar} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pa-np">Nova senha</Label>
                <Input id="pa-np" type="password" minLength={8} required value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>Salvar</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            <Link to="/auth" className="text-primary underline">Voltar</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}