# Editor visual para os formatos de bloco faltantes

## Problema
Na tela "Editar sessão", ao adicionar um bloco de **Musculação (séries × reps)** aparece só a mensagem
"Este formato de bloco ainda não tem editor visual". O mesmo acontece com **Circuito**, **MetCon**,
**Finalizador** e **Bloco livre** — 5 dos 11 formatos ficam sem edição, e é justamente o formato que a
função "Prescrever com IA" usa para gravar os treinos.

## Escopo
Ativar editor visual para os 5 formatos órfãos reaproveitando o que já existe
(`BlockExercises`, `SetsEditor`, `ExercisePicker`, `ModoToggle`). Nada de tabela, migração,
lib ou componente novo além de um formulário no arquivo que já concentra os formatos.

## Passo a passo

1. **`src/components/session-builder/BlockFormats.tsx`**
   - Novo `SetsRepsForm` (Musculação / Circuito / MetCon / Finalizador):
     - Cabeçalho compacto com os campos que já existem no config padrão:
       `Séries`, `Reps` (texto, aceita "8-12"), `Descanso (seg)`.
     - `ModoToggle` (Circuito × Séries fixas) ao lado — reuso do componente atual.
     - Lista de exercícios via `BlockExercises` (drag-and-drop e `SetsEditor` por exercício
       já vêm de graça, incluindo séries tipadas).
     - Para MetCon/Finalizador os mesmos campos servem; só muda o texto de dica.
   - Novo `LivreForm` (Bloco livre):
     - Campo de texto (`Textarea`) para instruções livres, gravado em `config.instrucoes`.
     - `BlockExercises` opcional abaixo.

2. **`src/components/session-builder/BlockCard.tsx`**
   - Mapear no `switch`: `bodybuilding_sets | circuito | metcon | finalizador` → `SetsRepsForm`,
     `livre` → `LivreForm`. O `default` com a mensagem "sem editor visual" some da prática.

3. **`src/lib/session-builder-store.ts`**
   - Conferir/completar os defaults de config para `circuito`, `metcon`, `finalizador`, `livre`
     no mesmo padrão do `bodybuilding_sets` (`series`, `reps`, `descanso_seg`, `modo_execucao`).
     Nenhuma mudança de tipo ou de persistência — os campos já existem no schema.

4. **Verificação**
   - Criar sessão → adicionar bloco Musculação → editar séries/reps/descanso, adicionar exercícios,
     reordenar, salvar rascunho e reabrir.
   - Conferir que um treino vindo de "Prescrever com IA" agora abre editável.

## Performance / trade-offs
- Zero dependência nova; só um formulário a mais no bundle já carregado do construtor.
- Um único componente cobre 4 formatos (diferença apenas no texto de dica) em vez de 4 arquivos.
- Sem estado global novo: continua tudo no store Zustand já existente do construtor.
- Trade-off: MetCon e Finalizador ficam com o mesmo editor de séries×reps em vez de um
  editor especializado (tempo/tarefa). Se você quiser um editor próprio para MetCon depois,
  dá pra separar sem refazer nada.
