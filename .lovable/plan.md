# Plano - Corrigir HTTP 500 no Upload e Deduplicar Fila

O objetivo é resolver a falha de upload (HTTP 500) e garantir que a fila de mídias não aceite arquivos duplicados. O upload será migrado para o modelo direto do navegador para maior resiliência e observabilidade.

## User Review Required

> [!IMPORTANT]
> A implementação mudará o fluxo de upload para ser feito diretamente pelo navegador via Supabase Client, o que requer que as RLS Policies do Storage permitam `INSERT` para o papel `authenticated`.

## Proposed Changes

### 1. Deduplicação da Fila (Frontend)
- **Bloqueio de Duplicados**: Atualizar `handleFileSelection` em `ExerciseBulkMediaUpload.tsx` para verificar se o arquivo (por nome e tamanho) já existe na fila antes de adicioná-lo.
- **Feedback Visual**: Exibir um aviso caso o usuário tente selecionar arquivos que já foram adicionados.

### 2. Migração para Upload Direto (Storage)
- **Substituir `uploadMediaBatch`**: Em vez de enviar base64 para uma server function, o componente usará o `supabase.storage.from('exercise-media').upload()` diretamente.
- **Autorização de Path**: Garantir que o path gerado siga a estrutura `{coachId}/bulk/{filename}`.
- **Resiliência**: Tratar erros de rede e do Storage de forma granular no frontend.

### 3. Persistência e Vínculo (Backend)
- **Nova Server Function `registerUploadedMedia`**: Após o upload bem-sucedido no Storage pelo navegador, a UI chamará esta função para registrar a mídia no banco de dados (`exercise_media`) e tentar o vínculo automático.
- **Validação de Persistência**: A função verificará se o arquivo realmente existe no Storage antes de gravar no banco.

### 4. Observabilidade
- **Status Granular**: A fila mostrará os estados `uploading`, `uploaded` (no storage) e `registered` (no banco).
- **Relatório de Erro**: Manter e expandir a exibição de `errorCode` e `httpStatus` originais do Supabase.

## Technical Details

### Arquivo: `src/components/admin/ExerciseBulkMediaUpload.tsx`
- Importar `supabase` de `@/integrations/supabase/client`.
- Refatorar `startUpload` para iterar e fazer `supabase.storage.upload`.

### Arquivo: `src/lib/bulk-media.functions.ts`
- Criar `registerUploadedMedia` recebendo apenas o `storagePath`, `name` e `type`.
- Remover ou depreciar o processamento de base64 que causava o HTTP 500 (provavelmente por limite de tamanho de payload ou timeout).
