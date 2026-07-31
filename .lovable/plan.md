# Etapa 1 — Musculação: IA dedicada, blocos combinados e exportação multiformato

## Objetivo
Fechar a Etapa 1 (Musculação) em três frentes, sem lib nova e sem tabela nova:
1. Motor de IA (Gemini) 100% isolado do banco de exercícios da plataforma.
2. Sessões de musculação com blocos individuais **e combinados** (Bi-set, Tri-set, Superset).
3. Exportação da imagem do treino em vários formatos de tela (A4, quadrado, 3:4, story) e de arquivo (PNG, JPG, PDF).

---

## Parte A — Motor de IA da Musculação (isolamento obrigatório)

1. `src/lib/prescricao-ia.server.ts`
   - Reforçar no `SYSTEM_PROMPT`: apenas exercícios clássicos de sala de musculação; proibido kettlebell, LPO, ginástico, CrossFit/MetCon.
   - Estender o schema de saída para aceitar agrupamento: cada exercício ganha `group` (ex.: `"A1"`, `"A2"`) e `group_type` (`"individual" | "biset" | "triset" | "superset"`).
   - Normalizador (`normalizarPrescricao`) passa a validar/limpar esses dois campos com fallback `individual`.
2. `src/lib/prescricao-ia.functions.ts`
   - Nada de leitura da tabela `exercises` (já é assim hoje) — vou deixar isso explícito em comentário e manter a checagem `metodologia === "musculacao"`.
   - Continua no Gemini via Lovable AI Gateway.
3. `src/components/programa-ia/PrescreverIaDialog.tsx`
   - Prévia mostra os agrupamentos (chip "Bi-set" agrupando A1/A2).
   - Na gravação: exercícios da IA continuam salvos como texto livre em `session_block_exercises` (campo de nome/observação já existente), **sem** vincular `exercise_id` do banco — garantia técnica do isolamento.

## Parte B — Blocos combinados na sessão de musculação

4. `src/lib/session-builder-store.ts`
   - No config do formato `bodybuilding_sets`, acrescentar `agrupamento` opcional por exercício (`grupo: string`), já dentro do JSON de config existente. Sem migração.
5. `src/components/session-builder/BlockFormats.tsx`
   - No `SetsRepsForm`, um seletor compacto por exercício: `Individual | A1 | A2 | A3` (ou botão "agrupar com o anterior"). Exercícios do mesmo grupo aparecem com barra lateral e rótulo "Bi-set / Tri-set" calculado com `useMemo`.
   - Reaproveita `BlockExercises`, `SetsEditor` e o drag-and-drop atuais — nenhum componente novo pesado.

## Parte C — Formatos de imagem e de exportação

6. `src/lib/program-image-layout.ts`
   - Ampliar `PRESETS_LAYOUT` com: **Quadrado 1:1** (2160×2160), **Retrato 3:4** (2160×2880), **Story 9:16** (1440×2560). Mantém A4 paisagem e adiciona **A4 retrato** (2480×3508). São só objetos de layout — custo zero de bundle.
7. `src/components/session/ExportImageDialog.tsx`
   - Trocar o toggle PNG/JPG por dois controles: **Formato de tela** (select com os presets acima, preview com o aspect-ratio real) e **Arquivo** (PNG / JPG / PDF).
   - PDF reusa `exportarSessoesPDF` (jsPDF já no projeto, carregado por `import()` dinâmico — segue lazy).
8. `src/lib/image-export.ts`
   - `exportarSessaoImagem` e `renderizarPreviewDataURL` passam a receber o `ImageLayout` escolhido (hoje usam o padrão) e `exportarSessaoPDF` para uma sessão só, na orientação do preset.
   - Preview continua em resolução reduzida (largura ~1280) para não travar a UI.

---

## Detalhes técnicos
- Sem lib nova: canvas nativo + jsPDF/JSZip já existentes, ambos por `import()` dinâmico.
- Diálogos pesados continuam em `React.lazy`.
- Presets são constantes puras; a escolha do usuário persiste no `localStorage` já usado pela cascata programa → modalidade → padrão.
- `useMemo` só nos cálculos de agrupamento e no preset ativo; sem memo decorativo.

## Trade-offs
- O agrupamento (bi-set) fica no JSON de config do bloco, não em coluna nova — zero migração, mas não é consultável por SQL.
- Exercícios vindos da IA ficam como texto livre (sem `exercise_id`): é exatamente o isolamento pedido, com o custo de não terem mídia/vídeo do banco.
- MetCon e afins seguem fora do motor de IA (Etapa 1 é só musculação).
