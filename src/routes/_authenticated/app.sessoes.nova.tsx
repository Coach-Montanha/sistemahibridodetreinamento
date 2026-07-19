import { createFileRoute } from "@tanstack/react-router";
import { SessionBuilder } from "@/components/session-builder/SessionBuilder";

export const Route = createFileRoute("/_authenticated/app/sessoes/nova")({
  component: () => <SessionBuilder />,
});