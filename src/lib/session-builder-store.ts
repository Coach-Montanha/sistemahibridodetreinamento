import { create } from "zustand";
import type { BlockFormat } from "./methodology";

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
  hydrate: (data: {
    titulo: string;
    numero_dia: number;
    data: string | null;
    blocks: BuilderBlock[];
  }) => void;
  reset: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_CONFIG: Record<BlockFormat, Record<string, any>> = {
  preparacao_movimento: { rounds: 4, round_min: 5, modo_execucao: "circuito" },
  e2mom: { rounds: 8, intervalo_min: 2, rest_after_min: 3, modo_execucao: "circuito" },
  amrap: { duracao_min: 12, modo_execucao: "circuito" },
  emom: { rounds: 10, intervalo_min: 1, modo_execucao: "circuito" },
  circuito: { rounds: 3, modo_execucao: "circuito" },
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
  metcon: {},
  bodybuilding_sets: { series: 4, reps: "8-12", descanso_seg: 60, modo_execucao: "series_fixas" },
  finalizador: {},
  livre: {},
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
  hydrate: (data) =>
    set({
      titulo: data.titulo,
      numero_dia: data.numero_dia,
      data: data.data,
      blocks: data.blocks,
    }),
  reset: () => set({ titulo: "", numero_dia: 1, data: null, blocks: [] }),
}));