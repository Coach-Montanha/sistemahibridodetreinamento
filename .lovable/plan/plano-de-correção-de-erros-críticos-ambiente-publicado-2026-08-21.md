# Plano de Correção de Erros Críticos (Ambiente Publicado)

Este plano aborda os erros de permissão (RLS) na importação de mídias e a instabilidade na geração híbrida com IA, conforme diagnosticado no documento fornecido pelo usuário.

## 1. Segurança e RLS (Importação de Mídias)

A causa raiz do erro 403 Forbidden no `INSERT` em `media_import_jobs` é uma falha na resolução do `coach_id` nas políticas de RLS, possivelmente ignorando o proprietário (`auth_user_id` na tabela `coaches`).

### Ações:
- Criar a função `public.auth_coach_id()` se não existir, ou garantir que ela utilize `SECURITY DEFINER` e resolva tanto o dono (`coaches.auth_user_id`) quanto membros (`coach_members.auth_user_id`).
- Aplicar uma nova migration que redefine as políticas de RLS para as tabelas `media_import_jobs`, `media_import_items`, `media_correlation_jobs` e `media_correlation_items`.
- Garantir que `INSERT` use `WITH CHECK (coach_id = public.auth_coach_id())`.

## 2. Geração Híbrida (IA e Contrato de Dados)

O erro `AI_SCHEMA_MISMATCH` ocorre quando a IA retorna um JSON válido mas com estrutura ligeiramente diferente do esperado (ex: falta da chave `sessoes` no nível raiz).

### Ações:
- **Resiliência do Parser**: Atualizar `normalizarPrescricaoHibrido` em `src/lib/hibrido-ia.server.ts` para aceitar wrappers comuns (`data`, `result`, `output`) e suportar respostas que venham como array direto.
- **Fallback Determinístico**: Implementar um mecanismo de fallback que, em caso de erro de schema da IA, monte a sessão a partir do molde e do pool de exercícios validado, marcando a resposta com `usedFallback: true`.
- **Unificação de Contrato**: Corrigir a divergência onde o backend retorna `sessoes` e o frontend espera `days`. Padronizar o DTO para evitar erros de renderização e salvamento.

## 3. Melhorias no Fluxo de Continuação

- Garantir que o `sessaoTemplate` completo seja preservado e enviado corretamente na função "Continuar Gerando", evitando que a IA receba moldes vazios ou incompletos.

## Detalhes Técnicos

```text
- Tabela: media_import_jobs, media_import_items
- Função SQL: public.auth_coach_id() (SECURITY DEFINER)
- Arquivo Server: src/lib/hibrido-ia.server.ts
- Arquivo UI: src/components/programa-ia/PrescreverIaDialog.tsx
- Arquivo Lib: src/lib/continuation.server.ts
```
