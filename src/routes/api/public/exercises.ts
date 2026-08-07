import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/exercises')({
  server: {
    handlers: {
      GET: async () => {
        const files = [
          "src/routes/_authenticated/app.treinos.tsx",
          "src/routes/_authenticated/app.gerar.tsx",
          "src/routes/_authenticated/app.programas.tsx",
          "src/components/session-builder/SessionBuilder.tsx",
          "src/components/session-builder/BlockFormats.tsx",
          "src/components/session-builder/ExercisePicker.tsx",
          "src/components/programa-ia/GerarTreinoModal.tsx",
          "src/components/programa-ia/PrescreverIaDialog.tsx"
        ];
        
        const edgeFunctions = [
          "Nenhuma edge function encontrada (lógica centralizada em TanStack Start Server Functions)."
        ];

        return new Response(JSON.stringify({
          pages: files.filter(f => f.includes('routes')),
          components: files.filter(f => f.includes('components')),
          edge_functions: edgeFunctions
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});
