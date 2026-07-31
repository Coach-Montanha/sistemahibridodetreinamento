# Deixar o "Prescrever com IA" visível e autoexplicativo

Hoje o recurso existe, mas só aparece como um botão dentro do card de cada programa de Musculação — quem não abre o card não descobre a função. O plano torna o acesso óbvio e explica claramente o que escrever no prompt e quais são os limites.

## 1. Atalho claro no Hub de Treinos

- Em `app.treinos.tsx`, adicionar uma faixa de destaque no topo (acima das abas): ícone de faísca, título "Prescrever com IA", subtítulo curto ("Descreva a divisão e o volume; a IA monta os treinos da rotina — exclusivo de Musculação") e um botão de ação.
- O botão leva para a aba Programas e destaca os programas de Musculação elegíveis (mesmo padrão de anel de destaque temporário já usado no projeto).
- Sem nenhum programa de Musculação, o botão vira "Criar rotina de Musculação" com um texto curto explicando o pré-requisito.

## 2. Botão mais legível no card do programa

- Manter o botão atual em `app.programas.tsx`, com `title`/`aria-label` descritivo e um selo discreto "IA" no cabeçalho dos cards de Musculação, para saber de longe quais rotinas aceitam a função.

## 3. Janela do prompt com características e limitações

Reformular o corpo do `PrescreverIaDialog.tsx` (sem mexer na lógica de geração/salvamento):

- Bloco "Como usar", colapsável e fechado por padrão: 3 a 4 linhas dizendo o que descrever — divisão (A/B/C), frequência semanal, objetivo, séries/reps, descanso, equipamentos preferidos.
- Chips de exemplo clicáveis (ex.: "Hipertrofia 4x/semana", "Full body 3x/semana", "Foco em membros inferiores") que preenchem o textarea. Só botões shadcn, sem lib nova.
- Bloco "Limitações": exclusivo Musculação; até 4000 caracteres; a IA gera uma prévia e nada é salvo até você confirmar; os treinos entram na última semana da rotina, na sequência dos dias existentes; carga e observações são sugestões a revisar.
- Mini-KPIs no topo do diálogo (3 cards pequenos): rotina alvo, onde os treinos serão inseridos e contador de caracteres — reaproveitando o `KpiRow` que já existe em `src/components/settings/kpi-row.tsx`.

## 4. Design e performance

- Só tokens semânticos do design system; Tailwind + shadcn + Lucide; nenhuma dependência nova.
- O diálogo continua em `React.lazy`; textos de ajuda são estáticos (sem estado global, sem efeito novo). `useMemo`/`useCallback` apenas onde evita re-render real.
- Nenhuma tabela, migração, server function ou endpoint novo.

## Detalhes técnicos

Arquivos tocados: `src/routes/_authenticated/app.treinos.tsx` (faixa de atalho), `src/routes/_authenticated/app.programas.tsx` (selo, rótulos acessíveis, destaque ao vir do atalho) e `src/components/programa-ia/PrescreverIaDialog.tsx` (ajuda, exemplos, limitações, KPIs). Sem mudanças em `prescricao-ia.functions.ts` / `prescricao-ia.server.ts`.

## Trade-off

O diálogo fica um pouco mais alto por causa dos blocos de ajuda — por isso "Como usar" vem fechado por padrão e as limitações ficam em texto compacto, mantendo o prompt como foco visual.
