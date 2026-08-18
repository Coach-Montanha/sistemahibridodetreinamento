# Plano de Implementação: Sincronização de Moldes de Geração com a IA

O objetivo é garantir que a estrutura de blocos (molde) definida pelo treinador em **Configurações > Geração & Bloco** seja respeitada e utilizada pelo motor de IA ao gerar novas sessões de Musculação, resolvendo a falta de sincronia atual.

## Alterações Técnicas

### 1. Backend: Motor de IA (Musculação)
- **`src/lib/prescricao-ia.server.ts`**:
    - Atualizar o `SYSTEM_PROMPT` para instruir a IA a seguir um "MOLDE ESTRUTURAL" (Template) quando fornecido.
    - Adicionar um novo campo `molde` à interface `RotinaContexto` para receber a lista de blocos configurados.
    - Refatorar `montarUserPrompt` para injetar esse molde no prompt da IA, definindo títulos e formatos de blocos obrigatórios.

### 2. Integração: Fluxo de Dados
- **`src/lib/prescricao-ia.functions.ts`**:
    - Atualizar a função `prescribeTrainingWithAi` para buscar as preferências de geração (`generator_preferences`) do treinador para a modalidade "Musculação" caso nenhum molde manual tenha sido enviado.
    - Repassar esse molde para a construção do prompt da IA.

### 3. Frontend: Diálogo de Prescrição
- **`src/components/programa-ia/PrescreverIaDialog.tsx`**:
    - Garantir que, ao prescrever um treino de Musculação, o sistema verifique se existem "Padrões de Geração" definidos.
    - Adicionar uma lógica para carregar as preferências de blocos (via `getGeneratorPrefs`) e enviá-las no payload da requisição de IA.

## Verificação
1. Criar um padrão de 3 blocos (Ex: Aquecimento, Principal, Core) em Configurações > Musculação.
2. Solicitar uma prescrição de Musculação via IA.
3. Validar se a resposta da IA respeita exatamente os 3 blocos definidos.
