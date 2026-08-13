# Plano de Ação: Correção da Geração Continuada e Layout de Colunas

O usuário relatou erros de carregamento ("This page didn't load") após ajustes no motor de IA e problemas no posicionamento de blocos na exportação. O objetivo é garantir que a IA gere variações coerentes com a metodologia (Híbrido/KB Fitness) e que o layout da imagem respeite as colunas definidas.

## Medidas Técnicas

### 1. Resiliência do Motor Híbrido/KB Fitness
*   **Problema:** O erro "This page didn't load" geralmente ocorre por estouro de memória ou falha no parsing de JSON gigante retornado pela IA.
*   **Solução:** 
    *   Otimizar a busca de `buscarCandidatosDoMolde` em `src/lib/hibrido-ia.server.ts` para garantir que o pool de exercícios não exceda limites do contexto da IA.
    *   Refinar `prescribeTrainingWithAi` em `src/lib/prescricao-ia.functions.ts` para garantir que a identificação da última sessão seja segura contra falhas de conexão ou permissão.

### 2. Correção da Variação de Treinos (Continuidade)
*   **Problema:** O usuário quer variações que respeitem a estrutura mas não sejam idênticas.
*   **Solução:** 
    *   Ajustar o `montarHibridoPrompt` para instruir a IA a variar exercícios do pool, evitando repetições de sessões passadas (injetando o histórico no prompt).
    *   Garantir que o `sessaoTemplate` gerado automaticamente (fallback) seja robusto.

### 3. Layout Colunado na Exportação
*   **Problema:** Blocos sobrepostos ou desorganizados no PNG/JPG.
*   **Solução:** 
    *   Atualizar `src/lib/program-image-layout.ts` e `src/lib/a4-image-export.ts` para aplicar rigorosamente as "Zonas" (Esquerda vs Principal).
    *   Garantir que o Canvas de posicionamento no `ExportImageDialog.tsx` salve as coordenadas corretamente.

### 4. Segurança e RLS
*   **Revisão:** Garantir que todas as tabelas novas/modificadas (`program_weeks`, `sessions`) tenham as permissões `GRANT` e políticas RLS corretas para evitar erros 401/403 que causam o "This page didn't load".

## Detalhes Técnicos (Desenvolvedor)
*   Uso de `createServerFn` com `requireSupabaseAuth`.
*   Manipulação de `JSONB` na coluna `regras_progressao` de `programs`.
*   Cálculo dinâmico de coordenadas X/Y no gerador de imagem baseado nas colunas A4.
