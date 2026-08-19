# Plano: Correção da Continuidade de Geração Híbrido/KB Fitness

O objetivo é resolver o erro que impede a continuidade da geração de treinos nas modalidades Híbrido e Kettlebell Fitness, garantindo que o motor de IA receba a configuração estrutural necessária (molde) a partir do histórico do programa.

## Alterações propostas

### 1. Frontend: PrescreverIaDialog.tsx e app.programas.tsx
- **Extração de Molde:** Corrigir a lógica de `PrescreverIaDialog.tsx` para garantir que, ao iniciar a continuidade, ele selecione automaticamente o molde da sessão mais recente se `moldeSelecionado` for "auto".
- **Refinamento do Payload:** Garantir que o objeto `hibrido` enviado ao servidor contenha `sessaoTemplate` preenchido, mesmo quando o histórico é longo ou complexo.
- **Fallbacks de Segurança:** Adicionar verificação no `GerarTreinoModal` (ou no componente pai) para garantir que o molde nunca seja enviado vazio.

### 2. Backend (Server Functions): prescricao-ia.functions.ts
- **Validação de Payload:** Ajustar a verificação de `isHibrido && !data.hibrido` para fornecer erros mais específicos se o problema for a falta do `sessaoTemplate`.
- **Tratamento de Tokens:** Otimizar ainda mais a compactação do histórico para evitar erros 400 em programas com muitas semanas, mantendo o contexto essencial para a periodização.
- **Fallback de Molde Estrutural:** Implementar uma lógica no servidor que, caso o `sessaoTemplate` chegue vazio na continuidade, tente inferi-lo da última sessão válida do programa antes de falhar.

### 3. Motor Híbrido: hibrido-ia.server.ts
- **Estabilidade da Busca:** Garantir que a busca de candidatos por molde não falhe silenciosamente se um dos blocos dinâmicos estiver com configuração incompleta.

## Detalhes técnicos
- Assegurar que `week_number` seja respeitado na evolução para evitar sobreposição de sessões.
- Manter a normalização de equipamentos para evitar o erro de "IA não retornou sessão estruturada" devido a inconsistências de caixa/acento.

A aprovação deste plano permitirá a implementação direta das correções nos arquivos de lógica de IA e diálogos de prescrição.
