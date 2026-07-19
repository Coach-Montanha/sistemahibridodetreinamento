import { createFileRoute } from "@tanstack/react-router";
import { SessionBuilder } from "@/components/session-builder/SessionBuilder";

export const Route = createFileRoute("/_authenticated/app/sessoes/$id")({
  component: SessionEdit,
});

function SessionEdit() {
  const { id } = Route.useParams();
  return <SessionBuilder sessionId={id} />;
}