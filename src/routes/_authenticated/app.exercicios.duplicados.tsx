import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/exercicios/duplicados")({
  beforeLoad: () => {
    throw redirect({ to: "/app/configuracoes", search: { section: "fusao" } });
  },
});
