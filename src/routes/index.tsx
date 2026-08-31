import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ modo: z.enum(["login", "cadastro"]).optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (coach) {
        throw redirect({ to: "/app" });
      }
      throw redirect({ to: "/aluno" });
    }
    throw redirect({ to: "/auth", search: search.modo ? { modo: search.modo } : undefined });
  },
  component: () => null,
});
