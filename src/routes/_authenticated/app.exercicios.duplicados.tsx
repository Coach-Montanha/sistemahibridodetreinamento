import { createFileRoute } from "@tanstack/react-router";
import { MediaAuditDashboard } from "@/components/admin/MediaAuditDashboard";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/exercicios/duplicados")({
  component: DuplicadosPage,
});

function DuplicadosPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Gestão de Duplicados e Integridade
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identifique e resolva conflitos de mídia, arquivos duplicados ou órfãos no seu banco de exercícios.
        </p>
      </div>
      
      <MediaAuditDashboard />
    </div>
  );
}
