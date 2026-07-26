import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/marca")({
  beforeLoad: () => {
    throw redirect({ to: "/app/configuracoes", search: { section: "marca" } });
  },
});
