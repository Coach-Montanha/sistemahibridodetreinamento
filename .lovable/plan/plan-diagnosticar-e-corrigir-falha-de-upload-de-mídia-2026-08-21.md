# Plan - Diagnosticar e Corrigir Falha de Upload de Mídia

O objetivo é descobrir por que o upload está falhando silenciosamente no Storage e corrigir a interface para fornecer feedback preciso ao usuário, removendo o falso toast de sucesso.

## User Review Required

> [!IMPORTANT]
> A implementação assume que a tabela `exercise_media` possui uma coluna `exercise_id` que pode aceitar valores nulos ou um GUID dummy (`00000000-0000-0000-0000-000000000000`) para mídias não vinculadas.

## Proposed Changes

### Observabilidade e Feedback (Frontend)
- **Refatorar Fila de Upload:** Atualizar `ExerciseBulkMediaUpload.tsx` para exibir detalhes técnicos em caso de erro (código HTTP, mensagem do backend, bucket, path).
- **Log de Depuração:** Adicionar botão "Copiar detalhes do erro" para facilitar diagnósticos futuros.
- **Toast Inteligente:** Substituir a mensagem genérica por uma que reflita o estado real (Sucesso Total, Parcial ou Falha Total).

### Resiliência de Backend (Server Functions)
- **Diagnóstico do Storage:** Refatorar `uploadMediaBatch` para capturar e retornar o erro bruto do Supabase Storage.
- **Validação de Payload:** Garantir que o buffer e o MIME type estão sendo processados corretamente.
- **Persistência de Mídia:** Garantir o registro em `exercise_media` mesmo que o vínculo com um exercício falhe, permitindo correlação posterior.

### Inventário e Correlação
- **Inventário Recursivo:** Ajustar `startMediaInventory` para navegar corretamente em subpastas do Storage.

## Technical Details

### Frontend: `src/components/admin/ExerciseBulkMediaUpload.tsx`
- Adicionar propriedades `errorCode`, `errorMessage`, `httpStatus`, `bucket`, `path` ao tipo `FileEntry`.
- Alterar lógica do `toast` final baseada em `stats.success` vs `stats.total`.

### Backend: `src/lib/bulk-media.functions.ts`
- Retornar objeto de erro completo: `{ success: false, error: uploadError.message, details: uploadError }`.
- Verificar se `exercise_id` permite nulo; caso contrário, usar o fallback seguro.

### Armazenamento: Supabase Policies
- Validar se o papel `authenticated` tem permissão de `INSERT` no bucket `exercise-media` para o prefixo `{auth.uid()}/bulk/`.
