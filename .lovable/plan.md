# Plano de Correção: Motor de IA para Progressão Híbrida/KB Fitness

O objetivo é garantir que a "IA de Progressão" identifique corretamente a modalidade da rotina (Híbrido/KB Fitness) e utilize o motor específico, evitando a tag genérica de "Musculação" e garantindo que novos exercícios sejam sugeridos com base no histórico das últimas semanas e no molde da última sessão.

## Mudanças Técnicas

### 1. Frontend: PrescreverIaDialog.tsx
- **Correção da Tag Visual**: Ajustar a lógica da `Badge` para exibir a modalidade correta (Híbrido/KB Fitness) com base no `programa.metodologia`.
- **Payload de Híbrido**: Garantir que o objeto `hibrido` seja enviado no payload da mutação `gerarMut` quando a metodologia for híbrida ou kettlebell_fitness, incluindo sinalizadores para análise de histórico.

### 2. Backend: prescricao-ia.functions.ts
- **Detecção de Modalidade**: Refinar a lógica de `isHibrido` para incluir explicitamente as rotinas com metodologia `hibrido` ou `kettlebell_fitness`.
- **Busca de Histórico Expandida**: Alterar a busca para incluir as últimas semanas (conforme solicitado), fornecendo à IA um contexto mais rico da progressão.
- **Mapeamento de Molde**: Garantir que o `molde` extraído da última sessão seja passado corretamente para o motor `montarHibridoPrompt`.
- **Normalização Específica**: Assegurar que a resposta da IA passe por `normalizarPrescricaoHibrido` para manter a integridade do formato de blocos/zonas.

### 3. Ajuste de Prompt (hibrido-ia.server.ts)
- **Instrução de Variabilidade**: Atualizar o prompt do motor híbrido para encorajar a IA a sugerir novos exercícios que preencham os moldes, em vez de apenas repetir os mesmos movimentos com cargas maiores (conforme a resposta "Novos Exercícios IA").

## Verificação
- Testar o clique em "Continuar progressão" em uma rotina Híbrida.
- Validar se a tag exibida no diálogo é "Híbrido" ou "Kettlebell Fitness" em vez de "Musculação".
- Confirmar se a geração da prescrição ocorre sem erros e respeita os blocos da sessão anterior.
