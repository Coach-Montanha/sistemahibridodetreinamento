import { create } from "zustand";
import type { BlockFormat } from "./methodology";

export type SetType =
  | "reps_carga"
  | "reps_carga_tempo"
  | "reps_tempo"
  | "tempo_inclinacao"
  | "corrida"
  | "cadencia"
  | "observacoes";

export type BuilderSet = {
  id: string;
  tipo: SetType;
  serie_rep?: string;
  carga?: string;
  tempo_seg?: string;
  intervalo_seg?: string;
  inclinacao_pct?: string;
  distancia?: string;
  ritmo?: string;
  cadencia?: string;
  obs?: string;
};

export type BuilderExercise = {
  tempId: string;
  exercise_id?: string | null;
  nome_livre?: string | null;
  ordem: number;
  reps?: string | null;
  series?: number | null;
  pct_1rm?: number | null;
  carga_kg?: number | null;
  descanso_seg?: number | null;
  lado?: string | null;
  observacoes?: string | null;
  /** slot dentro do bloco (usado em preparação de movimento) */
  slot?: "mobilidade" | "aquecimento" | null;
  /** rótulo de combinação (bi-set/tri-set): "A", "B", ... ; null = individual */
  grupo?: string | null;
  /** séries tipadas (editor avançado); ausente ⇒ usa reps/series legados */
  sets?: BuilderSet[];
};

export type BuilderBlock = {
  tempId: string;
  id?: string;
  formato: BlockFormat;
  titulo?: string | null;
  duracao_min?: number | null;
  ordem: number;
  config: Record<string, any>;
  exercises: BuilderExercise[];
};

type State = {
  titulo: string;
  numero_dia: number;
  data: string | null;
  blocks: BuilderBlock[];
  setMeta: (m: Partial<Pick<State, "titulo" | "numero_dia" | "data">>) => void;
  addBlock: (
    formato: BlockFormat,
    extras?: { titulo?: string | null; config?: Record<string, any> }
  ) => void;
  removeBlock: (tempId: string) => void;
  updateBlock: (tempId: string, patch: Partial<BuilderBlock>) => void;
  reorderBlocks: (from: number, to: number) => void;
  addExercise: (blockTempId: string, ex: Partial<BuilderExercise>) => void;
  updateExercise: (
    blockTempId: string,
    exTempId: string,
    patch: Partial<BuilderExercise>
  ) => void;
  removeExercise: (blockTempId: string, exTempId: string) => void;
  reorderExercises: (blockTempId: string, activeTempId: string, overTempId: string) => void;
  addSet: (blockTempId: string, exTempId: string, set?: Partial<BuilderSet>) => void;
  updateSet: (
    blockTempId: string,
    exTempId: string,
    setId: string,
    patch: Partial<BuilderSet>
  ) => void;
  removeSet: (blockTempId: string, exTempId: string, setId: string) => void;
  replicateLastSet: (blockTempId: string, exTempId: string) => void;
  setExerciseSets: (blockTempId: string, exTempId: string, sets: BuilderSet[]) => void;
  hydrate: (data: {
    titulo: string;
    numero_dia: number;
    data: string | null;
    blocks: BuilderBlock[];
  }) => void;
  reset: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

function mapExerciseSets(
  s: State,
  blockTempId: string,
  exTempId: string,
  fn: (sets: BuilderSet[]) => BuilderSet[]
): Partial<State> {
  return {
    blocks: s.blocks.map((b) =>
      b.tempId === blockTempId
        ? {
            ...b,
            exercises: b.exercises.map((e) =>
              e.tempId === exTempId ? { ...e, sets: fn(e.sets ?? []) } : e
            ),
          }
        : b
    ),
  };
}

const DEFAULT_CONFIG: Record<BlockFormat, Record<string, any>> = {
  mobilidade: { rounds: 4, round_min: 5, modo_execucao: "circuito" },
  e2mom: { rounds: 8, intervalo_min: 2, rest_after_min: 3, modo_execucao: "circuito" },
  amrap: { duracao_min: 12, modo_execucao: "circuito" },
  emom: { rounds: 10, intervalo_min: 1, modo_execucao: "circuito" },
  circuito: { rounds: 3, series: 3, reps: "12", descanso_seg: 60, modo_execucao: "circuito" },
  kb_timed_sets: {
    aquecimento: [{ sets: 2, work_min: 2, rest_min: 2 }],
    tiro: [{ sets: 1, work_min: 2, rest_min: 2 }],
  },
  forca_tecnica_pct: {
    passos: [
      { pct: 50, sets: 3, reps: 6 },
      { pct: 60, sets: 2, reps: 5 },
      { pct: 70, sets: 1, reps: 4 },
    ],
  },
  metcon: { series: 3, reps: "10", descanso_seg: 60, modo_execucao: "circuito" },
  bodybuilding_sets: { series: 4, reps: "8-12", descanso_seg: 60, modo_execucao: "series_fixas" },
  finalizador: { series: 3, reps: "15", descanso_seg: 45, modo_execucao: "circuito" },
  livre: { instrucoes: "" },
};

export const useBuilder = create<State>((set) => ({
  titulo: "",
  numero_dia: 1,
  data: null,
  blocks: [],
  setMeta: (m) => set(m),
  addBlock: (formato, extras) =>
    set((s) => ({
      blocks: [
        ...s.blocks,
        {
          tempId: uid(),
          formato,
          ordem: s.blocks.length,
          titulo: extras?.titulo ?? null,
          config: { ...DEFAULT_CONFIG[formato], ...(extras?.config ?? {}) },
          exercises: [],
        },
      ],
    })),
  removeBlock: (tempId) =>
    set((s) => ({
      blocks: s.blocks
        .filter((b) => b.tempId !== tempId)
        .map((b, i) => ({ ...b, ordem: i })),
    })),
  updateBlock: (tempId, patch) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.tempId === tempId ? { ...b, ...patch } : b)),
    })),
  reorderBlocks: (from, to) =>
    set((s) => {
      const next = [...s.blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { blocks: next.map((b, i) => ({ ...b, ordem: i })) };
    }),
  addExercise: (blockTempId, ex) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.tempId === blockTempId
          ? {
              ...b,
              exercises: [
                ...b.exercises,
                {
                  tempId: uid(),
                  ordem: b.exercises.length,
                  reps: b.formato === "amrap" ? "" : "10",
                  ...ex,
                },
              ],
            }
          : b
      ),
    })),
  updateExercise: (blockTempId, exTempId, patch) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.tempId === blockTempId
          ? {
              ...b,
              exercises: b.exercises.map((e) =>
                e.tempId === exTempId ? { ...e, ...patch } : e
              ),
            }
          : b
      ),
    })),
  removeExercise: (blockTempId, exTempId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.tempId === blockTempId
          ? {
              ...b,
              exercises: b.exercises
                .filter((e) => e.tempId !== exTempId)
                .map((e, i) => ({ ...e, ordem: i })),
            }
          : b
      ),
    })),
  reorderExercises: (blockTempId, activeTempId, overTempId) =>
    set((s) => ({
      blocks: s.blocks.map((b) => {
        if (b.tempId !== blockTempId) return b;
        const list = [...b.exercises];
        const from = list.findIndex((e) => e.tempId === activeTempId);
        const to = list.findIndex((e) => e.tempId === overTempId);
        if (from < 0 || to < 0 || from === to) return b;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return { ...b, exercises: list.map((e, i) => ({ ...e, ordem: i })) };
      }),
    })),
  addSet: (blockTempId, exTempId, input) =>
    set((s) =>
      mapExerciseSets(s, blockTempId, exTempId, (sets) => [
        ...sets,
        {
          id: uid(),
          tipo: input?.tipo ?? sets.at(-1)?.tipo ?? "reps_carga",
          serie_rep: input?.serie_rep ?? "",
          carga: input?.carga ?? "",
          intervalo_seg: input?.intervalo_seg ?? "",
          ...input,
        },
      ])
    ),
  updateSet: (blockTempId, exTempId, setId, patch) =>
    set((s) =>
      mapExerciseSets(s, blockTempId, exTempId, (sets) =>
        sets.map((x) => (x.id === setId ? { ...x, ...patch } : x))
      )
    ),
  removeSet: (blockTempId, exTempId, setId) =>
    set((s) =>
      mapExerciseSets(s, blockTempId, exTempId, (sets) =>
        sets.filter((x) => x.id !== setId)
      )
    ),
  replicateLastSet: (blockTempId, exTempId) =>
    set((s) =>
      mapExerciseSets(s, blockTempId, exTempId, (sets) => {
        const last = sets.at(-1);
        if (!last) return sets;
        return [...sets, { ...last, id: uid() }];
      })
    ),
  setExerciseSets: (blockTempId, exTempId, sets) =>
    set((s) => mapExerciseSets(s, blockTempId, exTempId, () => sets)),
  hydrate: (data) =>
    set({
      titulo: data.titulo,
      numero_dia: data.numero_dia,
      data: data.data,
      blocks: data.blocks,
    }),
  reset: () => set({ titulo: "", numero_dia: 1, data: null, blocks: [] }),
}));