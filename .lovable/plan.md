# Plano de Correção: RLS no Registro de Mídias

O registro de mídias falha após o upload porque a `exercise_media` possui RLS restrito a exercícios pertencentes ao `auth_coach_id()`, mas o registro está sendo feito usando `supabaseAdmin` sem garantir que o `coach_id` seja propagado ou que o exercício pertença ao usuário atual.

## Alterações

### 1. Backend (Server Functions)
- **src/lib/bulk-media.functions.ts**:
    - Obter o `coachId` real usando `auth_coach_id()` via `supabaseAdmin.rpc`.
    - Garantir que buscas de exercícios e inserções de mídia respeitem o `coach_id` do usuário.
    - Se o `exercise_id` não for encontrado, criar um exercício "Temporário/Curadoria" vinculado ao `coach_id` em vez de usar o UUID nulo `0000...`, para satisfazer a RLS.
    - Substituir o uso de `supabaseAdmin` por `context.supabase` onde for possível para respeitar RLS, ou garantir filtros de segurança se usar `supabaseAdmin`.

### 2. Frontend (UI Feedback)
- **src/components/admin/ExerciseBulkMediaUpload.tsx**:
    - Melhorar o tratamento de "Sucesso" para considerar apenas quando o registro no banco também for concluído.
    - Exibir avisos claros quando o upload no Storage funciona, mas o vínculo com o exercício falha.

## Verificação
- Testar upload de mídia com um usuário Coach.
- Verificar se a mídia aparece vinculada ao exercício correto ou na fila de curadoria.
- Confirmar que não há erro de RLS no log.
