# Plano de Implementação: Geração em Bloco e Periodização Avançada

O objetivo é permitir que o motor "Continuar Gerando" projete a progressão completa de um bloco solicitado (ex: 4 semanas) de uma só vez, aplicando lógica ondulatória de carga e volume, com feedback passo a passo na interface.

## Mudanças Técnicas

### 1. Backend e IA (Server Functions)
- **Prompt Musculação**: Atualizar o `SYSTEM_PROMPT` em `src/lib/prescricao-ia.server.ts` para instruir a IA a projetar o bloco completo, definindo claramente o objetivo de cada semana (Adaptação, Sobrecarga, Pico, Deload).
- **Prompt Híbrido**: Refatorar `montarHibridoPrompt` em `src/lib/hibrido-ia.server.ts` para solicitar explicitamente a evolução ondulatória de volume e carga ao longo da sequência de sessões.
- **Estrutura de Dados**: Garantir que o campo `week_number` seja retornado corretamente para cada dia de treino gerado.

### 2. Interface (React)
- **PrescreverIaDialog**:
  - Implementar um estado de "Log de Progresso" para exibir feedback passo a passo (ex: "Analisando histórico...", "Projetando Semana 1...", "Gerando Relatório...").
  - Atualizar o botão de "Adicionar treinos" para processar a inserção em lote, criando as semanas (`program_weeks`) necessárias e distribuindo as sessões sequencialmente.
  - Exibir o "Relatório de Evolução" retornado pela IA no topo da prévia.

### 3. Lógica de Persistência
- Ajustar a função `salvarMut` para:
  1. Detectar o número total de semanas solicitadas.
  2. Criar ou reutilizar as semanas alvo.
  3. Inserir sessões respeitando o `numero_dia` e `numero_semana` definidos pela IA.

## Diagrama de Fluxo (Periodização em Bloco)

```text
Usuário -> Seleciona "Continuar Gerando" (ex: 4 semanas)
IA -> Recebe histórico completo (últimas 15 sessões)
IA -> Gera JSON com X treinos, cada um com seu 'week_number'
UI -> Mostra progresso: "Gerando Periodização..." -> "Semana 1 ok" -> ...
UI -> Exibe Relatório de Evolução (Estratégia do Bloco)
Salvar -> Distribui sessões nas novas program_weeks
```

## Detalhes Adicionais
- A variação ondulatória permitirá que a IA troque exercícios ou varie intensidades de forma não linear para evitar estagnação.
- O feedback visual garantirá que o usuário saiba que o sistema está processando um volume maior de dados.
