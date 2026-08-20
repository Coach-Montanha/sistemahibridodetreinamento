import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mountain } from "lucide-react";

const searchSchema = z.object({ modo: z.enum(["login", "cadastro"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const isExactAuth = routerState.location.pathname === "/auth";
  const [tab, setTab] = useState<"login" | "cadastro">(modo === "cadastro" ? "cadastro" : "login");

  if (!isExactAuth) {
    return <Outlet />;
  }

  async function routeAfterLogin() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return navigate({ to: "/auth" });
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("auth_user_id", u.user.id)
      .maybeSingle();
    if (coach) navigate({ to: "/app" });
    else navigate({ to: "/aluno" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mountain className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">Coach Montanha</span>
        </Link>
        <Card className="p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v === "cadastro" ? "cadastro" : "login")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" id="auth-tab-login">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="cadastro" id="auth-tab-cadastro">
                Criar conta
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" id="auth-content-login">
              <LoginForm onDone={routeAfterLogin} />
            </TabsContent>
            <TabsContent value="cadastro" id="auth-content-cadastro">
              <SignupForm onDone={() => navigate({ to: "/app" })} />
            </TabsContent>
          </Tabs>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          É aluno?{" "}
          <Link to="/auth/primeiro-acesso" className="text-primary underline">
            Primeiro acesso
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    onDone();
  }

  return (
    <form onSubmit={handle} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="li-email">E-mail</Label>
        <Input
          id="li-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="li-pw">Senha</Label>
        <Input
          id="li-pw"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox defaultChecked disabled /> Lembrar de mim (sessão persistente)
      </label>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { nome } },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // cria registro do coach
    if (data.user) {
      const { error: cErr } = await supabase.from("coaches").insert({
        auth_user_id: data.user.id,
        nome,
        email,
      });
      if (cErr) {
        setLoading(false);
        return toast.error(
          "Cadastro criado, mas falhou ao criar perfil de treinador: " + cErr.message,
        );
      }
    }
    setLoading(false);
    toast.success("Conta criada!");
    onDone();
  }

  return (
    <form onSubmit={handle} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="su-nome">Seu nome</Label>
        <Input id="su-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="su-email">E-mail</Label>
        <Input
          id="su-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="su-pw">Senha</Label>
        <Input
          id="su-pw"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando..." : "Criar conta de treinador"}
      </Button>
    </form>
  );
}
