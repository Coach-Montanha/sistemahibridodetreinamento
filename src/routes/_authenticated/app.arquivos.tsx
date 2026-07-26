import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/arquivos")({
  beforeLoad: () => {
    throw redirect({ to: "/app/configuracoes", search: { section: "arquivos" } });
  },
});
