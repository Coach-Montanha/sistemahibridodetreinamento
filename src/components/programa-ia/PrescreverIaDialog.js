import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Info, ListOrdered, Loader2, Sparkles, Timer, Weight, Plus, Minus, } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { prescribeTrainingWithAi } from "@/lib/prescricao-ia.functions";
import { useSetTypeRegistry } from "@/lib/set-type-registry";
import { useFormatRegistry } from "@/lib/format-registry";
import { METHODOLOGY_LABEL } from "@/lib/methodology";
const PLACEHOLDER = `Ex.: Próxima fase focada em força máxima, mantendo a divisão A/B anterior mas reduzindo as repetições para 4-6 e aumentando o descanso.
Priorizar exercícios básicos; manter o agachamento e o supino como primeiros movimentos da sessão.`;
function isPrescricaoHibrido(value) {
    return Boolean(value && Array.isArray(value.sessoes));
}
const EXEMPLOS = [
    {
        chip: "Hipertrofia 4x/semana",
        texto: "Divisão A/B/C/D para hipertrofia, 4 treinos por semana. 4x8-12 nos compostos e 3x12 nos isoladores, 90s de descanso.",
    },
    {
        chip: "Full body 3x/semana",
        texto: "Full body 3 vezes por semana, 5 a 6 exercícios por treino, 3x10, 60s de descanso, foco em barra e halteres.",
    },
    {
        chip: "Foco em membros inferiores",
        texto: "Divisão de 3 treinos com ênfase em membros inferiores (2 de perna e 1 de superiores), 4x8, 120s de descanso nos compostos.",
    },
];
const LIMITACOES = [
    "Exclusivo da modalidade Musculação.",
    "A IA monta a prescrição com exercícios sugeridos de musculação.",
    "Suporta exercícios individuais e combinados (bi-set, tri-set).",
    "Até 4.000 caracteres por prompt.",
    "A IA gera uma prévia — nada é salvo até você confirmar.",
    "Os treinos entram na última semana da rotina, seguindo a numeração de dias existente.",
    "Cargas e observações são sugestões: revise antes de publicar.",
];
const COMBINACAO_LABEL = {
    biset: "Bi-set",
    triset: "Tri-set",
    superset: "Superset",
};
/** "4x10" -> { series: 4, reps: "10" } */
function parseSetsReps(v) {
    const m = v.match(/^\s*(\d+)\s*[xX×]\s*(.+)$/);
    if (m)
        return { series: Number(m[1]), reps: m[2].trim() };
    const t = v.trim();
    return { series: null, reps: t.length ? t : null };
}
/** Classifica o texto de "load" da IA: kg, %1RM, ou texto livre (ritmo/pace/outro). */
function classificarCarga(v) {
    const raw = v.trim();
    if (!raw)
        return null;
    // Ritmo de corrida: "4:30/km", "4:30 min/km", "Ritmo T (limiar)" — nunca é peso.
    if (/:\d{2}/.test(raw) || /\/\s*km/i.test(raw) || /ritmo/i.test(raw)) {
        return { tipo: "texto", valor: raw };
    }
    // Percentual de 1RM: "80% 1RM", "80%"
    const pct = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (pct) {
        const n = Number(pct[1].replace(",", "."));
        return Number.isFinite(n) ? { tipo: "pct_1rm", valor: n } : { tipo: "texto", valor: raw };
    }
    // Peso em kg: "60kg", "2x24kg", "100 kg"
    const kg = raw.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
    if (kg) {
        const n = Number(kg[1].replace(",", "."));
        return Number.isFinite(n) ? { tipo: "kg", valor: n } : { tipo: "texto", valor: raw };
    }
    // Número solto sem unidade (ex.: "60") — assume kg por compatibilidade com o comportamento atual.
    const solto = raw.match(/^(\d+(?:[.,]\d+)?)$/);
    if (solto) {
        const n = Number(solto[1].replace(",", "."));
        return Number.isFinite(n) ? { tipo: "kg", valor: n } : { tipo: "texto", valor: raw };
    }
    return { tipo: "texto", valor: raw };
}
function juntarObs(...partes) {
    const s = partes.filter((p) => p && p.trim().length > 0).join(" · ");
    return s.length ? s : null;
}
/**
 * Converte os grupos da IA ("A1"/"A2") no mapa `grupos` por ordem que o
 * construtor de sessão já lê do config do bloco.
 */
function gruposDoDia(dia) {
    const grupos = {};
    dia.exercises.forEach((e, i) => {
        if (e.group_type !== "individual" && e.group) {
            grupos[String(i + 1)] = e.group.charAt(0).toUpperCase();
        }
    });
    return Object.keys(grupos).length ? { grupos } : {};
}
const DiaCard = memo(function DiaCard({ dia, index }) {
    return (<article className="rounded-xl border border-border/70 bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold tracking-tight">
          {dia.name || `Treino ${index + 1}`}
        </h4>
        {dia.day_label && (<Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {dia.day_label}
          </Badge>)}
      </header>
      {dia.description && (<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {dia.description}
        </p>)}
      <ul className="mt-3 space-y-2">
        {dia.exercises.map((e, i) => (<li key={`${e.name}-${i}`} className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {e.name}
                {e.group_type !== "individual" && e.group && (<Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] uppercase tracking-wide text-primary">
                    {COMBINACAO_LABEL[e.group_type] ?? "Combinado"} · {e.group}
                  </Badge>)}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {e.sets_reps && (<span className="inline-flex items-center gap-1">
                    <ListOrdered className="h-3 w-3"/>
                    {e.sets_reps}
                  </span>)}
                {e.load && (<span className="inline-flex items-center gap-1">
                    <Weight className="h-3 w-3"/>
                    {e.load}
                  </span>)}
                {e.rest_seconds != null && (<span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3"/>
                    {e.rest_seconds}s
                  </span>)}
              </span>
            </div>
            {e.observations && (<p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                {e.observations}
              </p>)}
          </li>))}
      </ul>
    </article>);
});
const HibridoPreview = memo(function HibridoPreview({ prescricao, template, }) {
    const labels = new Map(template.map((b) => [b.chave, b.titulo || b.formato]));
    return (<div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-bold tracking-tight">
          Sessões Geradas ({prescricao.sessoes.length})
        </h5>
        <Badge variant="outline" className="text-[10px] uppercase">
          Modo: Híbrido por molde
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {prescricao.sessoes.map((sessao, i) => (<article key={i} className="rounded-xl border border-border/70 bg-card p-4">
            <h4 className="text-sm font-semibold">Sessão {i + 1}</h4>
            <div className="mt-3 space-y-2">
              {sessao.blocos.map((bloco) => (<div key={bloco.chave} className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2">
                  <p className="text-xs font-semibold text-primary">
                    {labels.get(bloco.chave) ?? bloco.chave}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bloco.exerciciosIds.length} exercício(s) vinculado(s) por ID real.
                  </p>
                  <p className="mt-1 break-all text-[10px] text-muted-foreground/80">
                    {bloco.exerciciosIds.join(", ") || "Nenhum ID selecionado"}
                  </p>
                </div>))}
            </div>
          </article>))}
      </div>
    </div>);
});
async function salvarPrescricaoHibrida(args) {
    const { programaId, diasPorSemana, prescricao, template } = args;
    if (template.length === 0) {
        throw new Error("O molde da continuação está vazio. Feche e abra o programa novamente.");
    }
    const { data: semanasExistentes, error: we } = await supabase
        .from("program_weeks")
        .select("numero_semana")
        .eq("program_id", programaId)
        .order("numero_semana", { ascending: false })
        .limit(1);
    if (we)
        throw we;
    const ultimaSemana = semanasExistentes?.[0]?.numero_semana ?? 0;
    const weekMap = new Map();
    const dias = Math.max(1, diasPorSemana);
    for (const [index, sessao] of prescricao.sessoes.entries()) {
        const semanaNumero = ultimaSemana + Math.floor(index / dias) + 1;
        if (!weekMap.has(semanaNumero)) {
            const { data: semanaExistente, error: se } = await supabase
                .from("program_weeks")
                .select("id")
                .eq("program_id", programaId)
                .eq("numero_semana", semanaNumero)
                .maybeSingle();
            if (se)
                throw se;
            if (semanaExistente) {
                weekMap.set(semanaNumero, semanaExistente.id);
            }
            else {
                const { data: novaSemana, error: ne } = await supabase
                    .from("program_weeks")
                    .insert({ program_id: programaId, numero_semana: semanaNumero })
                    .select("id")
                    .single();
                if (ne || !novaSemana)
                    throw ne ?? new Error("Falha ao criar semana da continuação");
                weekMap.set(semanaNumero, novaSemana.id);
            }
        }
        const weekId = weekMap.get(semanaNumero);
        const { data: ultimaSessao, error: le } = await supabase
            .from("sessions")
            .select("numero_dia")
            .eq("program_week_id", weekId)
            .order("numero_dia", { ascending: false })
            .limit(1);
        if (le)
            throw le;
        const numeroDia = (ultimaSessao?.[0]?.numero_dia ?? 0) + 1;
        const { data: sessaoRow, error: sessaoError } = await supabase
            .from("sessions")
            .insert({
            program_week_id: weekId,
            numero_dia: numeroDia,
            titulo: `Sessão ${index + 1}`,
            status: "rascunho",
        })
            .select("id")
            .single();
        if (sessaoError || !sessaoRow)
            throw sessaoError ?? new Error("Falha ao criar sessão");
        for (const [ordem, blocoTemplate] of template.entries()) {
            const blocoResultado = sessao.blocos.find((b) => b.chave === blocoTemplate.chave);
            const ids = blocoResultado?.exerciciosIds ?? [];
            if (ids.length === 0)
                continue;
            const { data: blocoRow, error: blocoError } = await supabase
                .from("session_blocks")
                .insert({
                session_id: sessaoRow.id,
                ordem: ordem + 1,
                formato: blocoTemplate.formato,
                titulo: blocoTemplate.titulo ?? null,
                duracao_min: blocoTemplate.duracaoMin,
                config: {
                    chave: blocoTemplate.chave,
                    modo_execucao: blocoTemplate.modoExecucao,
                    descanso_apos_seg: blocoTemplate.descansoAposSeg,
                },
            })
                .select("id")
                .single();
            if (blocoError || !blocoRow)
                throw blocoError ?? new Error("Falha ao criar bloco");
            const rows = ids.map((exerciseId, exerciseIndex) => ({
                session_block_id: blocoRow.id,
                exercise_id: exerciseId,
                nome_livre: null,
                ordem: exerciseIndex + 1,
                series: blocoTemplate.seriesMin,
                reps: blocoTemplate.repsPorExercicio == null ? null : String(blocoTemplate.repsPorExercicio),
                pct_1rm: blocoTemplate.percentual1rm ?? null,
                descanso_seg: blocoTemplate.descansoEntreSeriesSeg ?? null,
            }));
            const { error: exerciseError } = await supabase
                .from("session_block_exercises")
                .insert(rows);
            if (exerciseError)
                throw exerciseError;
        }
    }
    return prescricao.sessoes.length;
}
export function PrescreverIaDialog({ programa, escopo: escopoInicial, kb: kbInicial, wl: wlInicial, tf: tfInicial, co: coInicial, onOpenChange, }) {
    const qc = useQueryClient();
    const gerar = useServerFn(prescribeTrainingWithAi);
    const [prompt, setPrompt] = useState("");
    const [metodologia, setMetodologia] = useState(programa?.metodologia || "musculacao");
    const [escola, setEscola] = useState("auto");
    const [semanas, setSemanas] = useState(escopoInicial?.semanas || 1);
    const [diasPorSemana, setDiasPorSemana] = useState(escopoInicial?.diasPorSemana || 3);
    const [historicoSessoes, setHistoricoSessoes] = useState(6);
    const [cooldownSessoes, setCooldownSessoes] = useState(3);
    const [previa, setPrevia] = useState(null);
    const [progresso, setProgresso] = useState([]);
    const { presets: setTypes } = useSetTypeRegistry();
    const { presets: customFormats } = useFormatRegistry();
    const [moldeSelecionado, setMoldeSelecionado] = useState("auto");
    const isHibrido = metodologia === "hibrido" || metodologia === "kettlebell_fitness";
    // Efeito para carregar as regras persistidas do programa E preferências globais
    useEffect(() => {
        async function carregarConfiguracoes() {
            if (!programa?.id)
                return;
            // 1. Carregar preferências da modalidade (Geração Automática)
            const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
            if (coach && isHibrido) {
                const { data: pref } = await supabase
                    .from("generator_preferences")
                    .select("blocos")
                    .eq("coach_id", coach.id)
                    .eq("metodologia", metodologia)
                    .maybeSingle();
                // Se o coach configurou blocos e não temos um template manual no escopo, podemos sugerir
                // mas o payload de "Continuar Progressão" já vem com o histórico injetado no escopoInicial.
                // A IA no servidor agora já faz o merge se vier vazio.
            }
            // 2. Carregar regras específicas do programa
            const { data, error } = await supabase
                .from("programs")
                .select("regras_progressao")
                .eq("id", programa.id)
                .maybeSingle();
            if (data?.regras_progressao) {
                const r = data.regras_progressao;
                if (r.metodologia)
                    setMetodologia(r.metodologia);
                if (r.escola)
                    setEscola(r.escola);
                if (r.dias_por_semana)
                    setDiasPorSemana(r.dias_por_semana);
                if (r.semanas)
                    setSemanas(r.semanas);
                if (r.historico_sessoes !== undefined)
                    setHistoricoSessoes(r.historico_sessoes);
                if (r.cooldown_sessoes !== undefined)
                    setCooldownSessoes(r.cooldown_sessoes);
                if (r.prompt)
                    setPrompt(r.prompt);
            }
        }
        carregarConfiguracoes();
    }, [programa?.id, metodologia, isHibrido]);
    // Moldes únicos extraídos do histórico
    const moldesHistoricos = useMemo(() => {
        if (!escopoInicial?.hibrido?.historicoSessoes)
            return [];
        // Agrupa por número do dia (Segunda=1, Terça=2, etc) e pega a ÚLTIMA ocorrência estrutural de cada dia
        const porDia = new Map();
        escopoInicial.hibrido.historicoSessoes.forEach((s) => {
            porDia.set(s.numero_dia, s);
        });
        return Array.from(porDia.values()).sort((a, b) => (a.numero_dia ?? 0) - (b.numero_dia ?? 0));
    }, [escopoInicial?.hibrido?.historicoSessoes]);
    // Constrói um payload estável sem mutar `escopoInicial.hibrido`.
    // A continuação precisa sempre enviar um molde real para o servidor.
    const hibridoPayload = useMemo(() => {
        const base = escopoInicial?.hibrido;
        if (!base)
            return null;
        let template = base.sessaoTemplate;
        if (moldeSelecionado !== "auto") {
            const molde = moldesHistoricos.find((m) => String(m.id) === moldeSelecionado);
            if (molde?.blocks) {
                template = molde.blocks;
            }
        }
        return {
            ...base,
            sessaoTemplate: template ?? [],
        };
    }, [escopoInicial?.hibrido, moldeSelecionado, moldesHistoricos]);
    // Mapeamento de escolas por metodologia
    const ESCOLAS_DISPONIVEIS = useMemo(() => ({
        musculacao: [
            { value: "auto", label: "Automático (IA decide)" },
            { value: "bro_split", label: "Bro-Split (Bodybuilding Clássico)" },
            { value: "upper_lower", label: "Upper/Lower" },
            { value: "ppl", label: "PPL (Push/Pull/Legs)" },
            { value: "full_body", label: "Full Body" },
            { value: "heavy_duty", label: "Heavy Duty / HIT" },
        ],
        treinamento_funcional: [
            { value: "auto", label: "Automático (IA decide)" },
            { value: "exos", label: "EXOS / Core Performance" },
            { value: "crossfit", label: "CrossFit" },
            { value: "boyle", label: "Joint-by-Joint (Boyle)" },
            { value: "fms_sfma", label: "FMS/SFMA" },
            { value: "dns", label: "DNS (Praga)" },
            { value: "original_strength", label: "Original Strength" },
        ],
        levantamento_peso: [
            { value: "auto", label: "Automático (IA decide)" },
            { value: "bulgara", label: "Búlgara" },
            { value: "russa_classica", label: "Russa Clássica" },
            { value: "chinesa", label: "Chinesa" },
            { value: "cubana", label: "Cubana" },
            { value: "colombiana", label: "Colombiana" },
            { value: "pendlay", label: "Takano / Pendlay" },
        ],
        kettlebell_sport: [
            { value: "auto", label: "Automático (IA decide)" },
            { value: "fedorenko", label: "Fedorenko / WKC" },
            { value: "rudnev", label: "Rudnev" },
            { value: "vorotyntsev", label: "Vorotyntsev" },
            { value: "denisov", label: "Denisov" },
            { value: "vasilev", label: "Vasilev" },
            { value: "gomonov", label: "Gomonov" },
        ],
        corrida: [
            { value: "auto", label: "Automático (IA decide)" },
            { value: "daniels", label: "Daniels / VDOT" },
            { value: "lydiard", label: "Lydiard (Base)" },
            { value: "canova", label: "Canova (Elite)" },
            { value: "hansons", label: "Hansons" },
            { value: "pfitzinger", label: "Pfitzinger" },
            { value: "horwill", label: "Horwill" },
            { value: "koop", label: "Koop (Ultra)" },
        ],
        hibrido: [
            { value: "auto", label: "Híbrido Clássico" },
            { value: "performance", label: "Híbrido Performance" },
            { value: "saude", label: "Híbrido Saúde/Longevidade" },
        ],
        kettlebell_fitness: [
            { value: "auto", label: "KB Fitness Padrão" },
            { value: "fluxo", label: "KB Flows / Complexos" },
        ],
    }), []);
    // Resetar escola ao mudar metodologia
    useEffect(() => {
        // Para Híbrido e KB Fitness, o seletor é importante, então deixamos o valor atual se for compatível
        const disponiveis = ESCOLAS_DISPONIVEIS[metodologia] || [];
        const aindaValido = disponiveis.some(e => e.value === escola);
        if (!aindaValido) {
            setEscola("auto");
        }
    }, [metodologia, escola, ESCOLAS_DISPONIVEIS]);
    const limpar = useCallback(() => {
        setPrompt("");
        setPrevia(null);
    }, []);
    const gerarMut = useMutation({
        mutationFn: async () => {
            if (!programa)
                throw new Error("Programa não selecionado");
            setProgresso(["Salvando perfil e analisando histórico..."]);
            // Salva o perfil no programa para persistência
            await supabase.from("programs").update({
                regras_progressao: {
                    metodologia,
                    escola,
                    dias_por_semana: diasPorSemana,
                    semanas,
                    historico_sessoes: historicoSessoes,
                    cooldown_sessoes: cooldownSessoes,
                    prompt: prompt.trim()
                }
            }).eq("id", programa.id);
            const totalSessoes = semanas * diasPorSemana;
            setProgresso(prev => [...prev, `Projetando periodização para ${semanas} semana(s) (${totalSessoes} treinos)...`]);
            try {
                const res = await gerar({
                    data: {
                        programId: programa.id,
                        prompt: prompt.trim(),
                        diasPorSemana: diasPorSemana,
                        escopoLabel: `${semanas} semanas`,
                        metodologiaOverride: metodologia,
                        escolaOverride: escola,
                        historicoSessoes: historicoSessoes,
                        cooldownSessoes: cooldownSessoes,
                        semanasNovas: semanas,
                        kb: kbInicial ?? null,
                        wl: wlInicial ?? null,
                        tf: tfInicial ?? null,
                        co: coInicial ?? null,
                        hibrido: (metodologia === "hibrido" || metodologia === "kettlebell_fitness")
                            ? {
                                ...(hibridoPayload || {}),
                                sessaoTemplate: hibridoPayload?.sessaoTemplate ?? [],
                                modalidade: metodologia,
                                tituloPrograma: programa.titulo ?? "Continuar Progressão",
                                numeroSessoes: totalSessoes,
                                diasPorSemana: diasPorSemana,
                                dataInicio: escopoInicial?.dataInicio ?? new Date().toISOString().slice(0, 10),
                                escola: escola !== "auto" ? escola : null,
                                set_types: setTypes.map(t => ({ id: t.id, label: t.label })),
                                custom_formats: customFormats.map(f => ({
                                    id: f.id,
                                    label: f.label,
                                    base: f.base,
                                    set_type_id: f.set_type_id,
                                    field_labels: f.field_labels
                                }))
                            }
                            : null,
                    },
                });
                setProgresso(prev => [...prev, "Gerando relatório de evolução...", "Finalizando prescrição em bloco!"]);
                return res;
            }
            catch (e) {
                setProgresso([]);
                console.error("Erro na geração de IA:", e);
                // Não re-lançamos o erro para não derrubar a rota (ErrorBoundary)
                // O onError da mutation tratará a exibição do toast amigável
                throw e;
            }
        },
        onSuccess: (res) => {
            // Normalização do contrato de dados Híbrido (sessoes -> days)
            if (res && res.sessoes && !res.days) {
                res.days = res.sessoes.map((s, idx) => {
                    // Busca week_number da resposta da IA se disponível, senão infere do índice
                    const week_number = res.week_numbers?.[idx] || Math.floor(idx / (diasPorSemana || 1)) + 1;
                    return {
                        name: `Sessão ${idx + 1}`,
                        week_number,
                        exercises: s.blocos.flatMap((b) => {
                            const ids = Array.isArray(b.exerciciosIds) ? b.exerciciosIds : (Array.isArray(b.exercicios_ids) ? b.exercicios_ids : []);
                            return ids.map((id) => ({
                                id,
                                name: "Exercício Selecionado",
                                group_type: "individual",
                                group: ""
                            }));
                        })
                    };
                });
            }
            setPrevia(res);
            setTimeout(() => setProgresso([]), 1000);
        },
        onError: (e) => {
            setProgresso([]);
            let msg = "Não foi possível gerar a prescrição.";
            const errorStr = String(e.message || e);
            if (errorStr.includes("POOL_VAZIO")) {
                msg = "O pool de exercícios da biblioteca não atende aos filtros de equipamento/metodologia do molde.";
            }
            else if (errorStr.includes("AI_GATEWAY_ERROR")) {
                msg = "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes.";
            }
            else if (errorStr.includes("AI_EMPTY_CONTENT") || errorStr.includes("AI_INVALID_JSON")) {
                msg = "A IA retornou uma resposta inválida. Tente gerar novamente.";
            }
            else if (errorStr.includes("AI_SCHEMA_MISMATCH")) {
                msg = "A estrutura do treino gerado pela IA é incompatível com o molde.";
            }
            else if (errorStr.includes("Server function info not found")) {
                // Fluxo de recuperação automática para version skew de Server Function
                const lastReload = window.sessionStorage.getItem("sf_recovery_reload");
                const now = Date.now();
                // Se já recarregou nos últimos 30 segundos, não entra em loop
                if (!lastReload || now - parseInt(lastReload) > 30000) {
                    window.sessionStorage.setItem("sf_recovery_reload", now.toString());
                    toast.info("Atualizando aplicação...", {
                        description: "Detectamos uma nova versão. Suas alterações foram preservadas localmente e a página será recarregada."
                    });
                    // Aguarda um pouco para o toast ser lido e recarrega
                    setTimeout(() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("v", now.toString()); // cache bust
                        window.location.href = url.toString();
                    }, 1500);
                    return;
                }
                msg = "A aplicação precisa ser atualizada. Por favor, feche esta aba e abra novamente ou limpe o cache do navegador.";
            }
            else if (errorStr.includes("400") || errorStr.includes("token")) {
                msg = "Histórico muito longo. Tente reduzir o número de semanas ou o histórico analisado.";
            }
            toast.error("Falha na Prescrição", {
                description: msg,
            });
        }
    });
    const salvarMut = useMutation({
        mutationFn: async () => {
            if (!programa || !previa)
                throw new Error("Nada para salvar");
            const isHibridoPreview = isHibrido && isPrescricaoHibrido(previa);
            if (isHibridoPreview) {
                await salvarPrescricaoHibrida({
                    programaId: programa.id,
                    diasPorSemana,
                    prescricao: previa,
                    template: hibridoPayload?.sessaoTemplate ?? [],
                });
            }
            if (isHibridoPreview) {
                // O retorno Híbrido já foi persistido por blocos e IDs reais.
            }
            else {
                // Semana inicial: a última existente + 1, ou 1.
                const { data: semanasExistentes, error: we } = await supabase
                    .from("program_weeks")
                    .select("numero_semana")
                    .eq("program_id", programa.id)
                    .order("numero_semana", { ascending: false })
                    .limit(1);
                if (we)
                    throw we;
                const ultimaSemanaReal = semanasExistentes?.[0]?.numero_semana ?? 0;
                // Mapeia semanas do JSON para IDs no banco
                const weekMap = new Map();
                const diasPrevia = previa.days;
                for (const dia of diasPrevia) {
                    // Se a IA não mandou week_number, assume que tudo vai pra próxima semana
                    const weekOffset = dia.week_number || 1;
                    const targetWeekNum = ultimaSemanaReal + weekOffset;
                    if (!weekMap.has(targetWeekNum)) {
                        // Busca se já existe essa semana (caso a IA esteja preenchendo algo existente)
                        const { data: existente } = await supabase
                            .from("program_weeks")
                            .select("id")
                            .eq("program_id", programa.id)
                            .eq("numero_semana", targetWeekNum)
                            .maybeSingle();
                        if (existente) {
                            weekMap.set(targetWeekNum, existente.id);
                        }
                        else {
                            const { data: nova, error } = await supabase
                                .from("program_weeks")
                                .insert({ program_id: programa.id, numero_semana: targetWeekNum })
                                .select("id")
                                .single();
                            if (error)
                                throw error;
                            weekMap.set(targetWeekNum, nova.id);
                        }
                    }
                    const weekId = weekMap.get(targetWeekNum);
                    // Descobre o próximo dia dentro desta semana específica
                    const { data: ultimas, error: se } = await supabase
                        .from("sessions")
                        .select("numero_dia")
                        .eq("program_week_id", weekId)
                        .order("numero_dia", { ascending: false })
                        .limit(1);
                    if (se)
                        throw se;
                    const proximoDia = (ultimas?.[0]?.numero_dia ?? 0) + 1;
                    const { data: sess, error: ie } = await supabase
                        .from("sessions")
                        .insert({
                        program_week_id: weekId,
                        numero_dia: proximoDia,
                        titulo: dia.name || `Treino ${proximoDia}`,
                        status: "rascunho",
                    })
                        .select("id")
                        .single();
                    if (ie)
                        throw ie;
                    const { data: bloco, error: be } = await supabase
                        .from("session_blocks")
                        .insert({
                        session_id: sess.id,
                        ordem: 1,
                        formato: metodologia === "kettlebell_sport"
                            ? "kb_timed_sets"
                            : metodologia === "levantamento_peso"
                                ? "forca_tecnica_pct"
                                : metodologia === "corrida"
                                    ? "livre"
                                    : metodologia === "treinamento_funcional"
                                        ? "circuito"
                                        : "bodybuilding_sets",
                        titulo: dia.day_label || dia.description || "Bloco principal",
                        config: gruposDoDia(dia),
                    })
                        .select("id")
                        .single();
                    if (be)
                        throw be;
                    if (dia.exercises.length) {
                        const rows = dia.exercises.map((e, i) => {
                            const { series, reps } = parseSetsReps(e.sets_reps);
                            const cls = e.load ? classificarCarga(e.load) : null;
                            return {
                                session_block_id: bloco.id,
                                nome_livre: e.name,
                                ordem: i + 1,
                                series,
                                reps,
                                carga_kg: cls?.tipo === "kg" ? cls.valor : null,
                                pct_1rm: cls?.tipo === "pct_1rm" ? cls.valor : null,
                                descanso_seg: e.rest_seconds,
                                observacoes: juntarObs(e.observations, cls?.tipo === "texto" ? `Carga: ${cls.valor}` : null),
                            };
                        });
                        const { error: xe } = await supabase.from("session_block_exercises").insert(rows);
                        if (xe)
                            throw xe;
                    }
                }
            }
            // Proveniência: guarda prompt + timestamp sem criar coluna nova.
            const { data: prog } = await supabase
                .from("programs")
                .select("regras_progressao")
                .eq("id", programa.id)
                .maybeSingle();
            const regras = prog?.regras_progressao && typeof prog.regras_progressao === "object"
                ? prog.regras_progressao
                : {};
            await supabase
                .from("programs")
                .update({
                regras_progressao: {
                    ...regras,
                    ai: {
                        ai_prompt: prompt.trim(),
                        ai_generated_at: new Date().toISOString(),
                        notes: previa.notes || null,
                        escola_metodologica: escola !== "auto" ? escola : null,
                    },
                },
            })
                .eq("id", programa.id);
            return isHibridoPreview
                ? previa.sessoes.length
                : previa.days.length;
        },
        onSuccess: (n) => {
            toast.success(`${n} treino(s) adicionado(s) à rotina`);
            qc.invalidateQueries({ queryKey: ["programas"] });
            limpar();
            onOpenChange(false);
        },
        onError: (e) => toast.error(e?.message ?? "Falha ao adicionar os treinos"),
    });
    const podeGerar = useMemo(() => !gerarMut.isPending, [gerarMut.isPending]);
    return (<Dialog open={!!programa} onOpenChange={(o) => {
            if (!o)
                limpar();
            onOpenChange(o);
        }}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4"/>
            </span>
            Prescrever com IA
            <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wide">
              {METHODOLOGY_LABEL[metodologia] || metodologia} - {escola === "auto" ? "IA" : escola}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {programa?.titulo
            ? `Gerando para "${programa.titulo}".`
            : "Gere uma prescrição estruturada."}{" "}
            Motor de IA (Variação): a IA analisa o histórico e as limitações do aluno para evoluir a periodização.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
            { label: "Rotina alvo", value: programa?.titulo ?? "—" },
            { label: "Escola Metodológica", value: escola === "auto" ? "Automático" : (ESCOLAS_DISPONIVEIS[metodologia]?.find(e => e.value === escola)?.label ?? escola) },
            {
                label: "Duração",
                value: `${semanas} semana(s)`,
            },
            {
                label: "Dias/semana",
                value: `${diasPorSemana}`,
            },
        ].map((k) => (<div key={k.label} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {k.label}
                </p>
                <p title={k.value} className="mt-0.5 truncate text-sm font-medium tabular-nums">
                  {k.value}
                </p>
              </div>))}
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
            {(metodologia === "hibrido" || metodologia === "kettlebell_fitness") && moldesHistoricos.length > 0 && (<div className="col-span-full space-y-2 border-b border-border/40 pb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Recuperação de Estrutura (Molde)
                </label>
                <Select value={moldeSelecionado} onValueChange={setMoldeSelecionado} disabled={gerarMut.isPending}>
                  <SelectTrigger className="h-9 bg-background border-primary/30">
                    <SelectValue placeholder="Escolha qual estrutura repetir..."/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      {escopoInicial?.hibrido?.sessaoTemplate?.length ? "Manter molde atual" : "Selecionar molde histórico..."}
                    </SelectItem>
                    {moldesHistoricos.map((m) => (<SelectItem key={m.id} value={m.id}>
                        {m.titulo} ({m.blocks.length} blocos)
                      </SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">
                  * A IA usará esta estrutura para prescrever novos exercícios.
                </p>
              </div>)}

            <div className="col-span-full space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Base Técnica (Motor)
                  </label>
                  <Select value={metodologia} onValueChange={setMetodologia} disabled={gerarMut.isPending}>
                    <SelectTrigger className="h-9 border-primary/20 bg-background/50">
                      <SelectValue placeholder="Selecione a modalidade"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="musculacao">Musculação</SelectItem>
                      <SelectItem value="hibrido">Treinamento Híbrido</SelectItem>
                      <SelectItem value="kettlebell_fitness">Kettlebell Fitness</SelectItem>
                      <SelectItem value="kettlebell_sport">Kettlebell Sport</SelectItem>
                      <SelectItem value="levantamento_peso">LPO</SelectItem>
                      <SelectItem value="treinamento_funcional">Funcional</SelectItem>
                      <SelectItem value="corrida">Corrida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Escola Metodológica
                  </label>
                  <Select value={escola} onValueChange={setEscola} disabled={gerarMut.isPending}>
                    <SelectTrigger className="h-9 border-primary/20 bg-background/50">
                      <SelectValue placeholder="Padrão do Sistema"/>
                    </SelectTrigger>
                    <SelectContent>
                      {(ESCOLAS_DISPONIVEIS[metodologia] || [{ value: "auto", label: "Automático" }]).map((e) => (<SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Semanas (Volume)
                  </label>
                  <div className="flex h-9 items-center justify-between rounded-md border bg-background px-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSemanas(Math.max(1, semanas - 1))} disabled={gerarMut.isPending || semanas <= 1}>
                      <Minus className="h-3 w-3"/>
                    </Button>
                    <span className="text-sm font-medium tabular-nums">{semanas}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSemanas(Math.min(12, semanas + 1))} disabled={gerarMut.isPending || semanas >= 12}>
                      <Plus className="h-3 w-3"/>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Frequência (Dias/Sem)
                  </label>
                  <div className="flex h-9 items-center justify-between rounded-md border bg-background px-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDiasPorSemana(Math.max(1, diasPorSemana - 1))} disabled={gerarMut.isPending || diasPorSemana <= 1}>
                      <Minus className="h-3 w-3"/>
                    </Button>
                    <span className="text-sm font-medium tabular-nums">{diasPorSemana}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDiasPorSemana(Math.min(7, diasPorSemana + 1))} disabled={gerarMut.isPending || diasPorSemana >= 7}>
                      <Plus className="h-3 w-3"/>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Histórico considerado (sessões)
                </label>
                <div className="flex h-9 items-center justify-between rounded-md border bg-background px-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoricoSessoes(Math.max(0, historicoSessoes - 1))} disabled={gerarMut.isPending || historicoSessoes <= 0}>
                    <Minus className="h-3 w-3"/>
                  </Button>
                  <span className="text-sm font-medium tabular-nums">
                    {historicoSessoes === 0 ? "Sem histórico" : historicoSessoes}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoricoSessoes(Math.min(12, historicoSessoes + 1))} disabled={gerarMut.isPending || historicoSessoes >= 12}>
                    <Plus className="h-3 w-3"/>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Reduza se aparecer o aviso de histórico muito longo.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Bloqueio de repetição (Cooldown)
                </label>
                <div className="flex h-9 items-center justify-between rounded-md border bg-background px-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCooldownSessoes(Math.max(0, cooldownSessoes - 1))} disabled={gerarMut.isPending || cooldownSessoes <= 0}>
                    <Minus className="h-3 w-3"/>
                  </Button>
                  <span className="text-sm font-medium tabular-nums">
                    {cooldownSessoes === 0 ? "Sem bloqueio" : `${cooldownSessoes} sessões`}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCooldownSessoes(Math.min(10, cooldownSessoes + 1))} disabled={gerarMut.isPending || cooldownSessoes >= 10}>
                    <Plus className="h-3 w-3"/>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Evita repetir exercícios usados nas últimas N sessões.
                </p>
              </div>
            </div>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-left text-xs font-medium transition-colors duration-200 hover:bg-muted/40">
              <Info className="h-3.5 w-3.5 text-primary"/>
              Como usar e limitações
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"/>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 px-3 pb-1 pt-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Descreva: divisão dos dias (A/B/C…), frequência semanal, objetivo,
                séries e repetições, descanso e equipamentos preferidos.
              </p>
              <ul className="space-y-1">
                {LIMITACOES.map((l) => (<li key={l} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <span aria-hidden className="text-primary">
                      •
                    </span>
                    {l}
                  </li>))}
              </ul>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <label htmlFor="prompt-ia" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Instruções
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXEMPLOS.map((ex) => (<Button key={ex.chip} type="button" size="sm" variant="outline" disabled={gerarMut.isPending || salvarMut.isPending} onClick={() => setPrompt(ex.texto)} className="h-7 rounded-full px-3 text-[11px] font-medium">
                  {ex.chip}
                </Button>))}
            </div>
            <Textarea id="prompt-ia" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={PLACEHOLDER} rows={6} maxLength={4000} disabled={gerarMut.isPending || salvarMut.isPending} className="resize-y text-sm leading-relaxed transition-colors duration-200"/>
            <div className="flex justify-end text-[11px] tabular-nums text-muted-foreground">
              {prompt.trim().length}/4000
            </div>
            <Button onClick={() => gerarMut.mutate()} disabled={!podeGerar} className="w-full gap-2 transition-all duration-200 sm:w-auto">
              {gerarMut.isPending ? (<>
                  <Loader2 className="h-4 w-4 animate-spin"/>
                  Gerando {semanas} semana(s)...
                </>) : (<>
                  <Sparkles className="h-4 w-4"/>
                  Gerar periodização ({semanas} sem)
                </>)}
            </Button>
          </div>

          {gerarMut.isPending && progresso.length > 0 && (<div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Loader2 className="h-3 w-3 animate-spin"/>
                  Processando evolução...
                </div>
                <div className="space-y-1">
                  {progresso.map((p, i) => (<div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground animate-in fade-in slide-in-from-left-1">
                      <div className="h-1 w-1 rounded-full bg-primary/40"/>
                      {p}
                    </div>))}
                </div>
              </div>
            </div>)}

          {previa ? (<div className="space-y-4">
              {previa.notes && (<div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h5 className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                    <Sparkles className="h-4 w-4"/>
                    Estratégia de Periodização do Bloco
                  </h5>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {previa.notes}
                  </p>
                </div>)}

              {isPrescricaoHibrido(previa) ? (<HibridoPreview prescricao={previa} template={hibridoPayload?.sessaoTemplate ?? []}/>) : (<div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold tracking-tight">
                      Sessões Geradas ({previa.days.length})
                    </h5>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Modo: Evolução em Bloco
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {previa.days.map((dia, i) => (<DiaCard key={i} dia={dia} index={i}/>))}
                  </div>
                </div>)}
            </div>) : (!gerarMut.isPending && (<div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma prescrição gerada ainda.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Descreva a divisão desejada e clique em “Gerar periodização em bloco”.
                </p>
              </div>))}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={() => {
            limpar();
            onOpenChange(false);
        }} disabled={salvarMut.isPending} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={() => salvarMut.mutate()} disabled={!previa || salvarMut.isPending} className="w-full gap-2 sm:w-auto">
            {salvarMut.isPending && <Loader2 className="h-4 w-4 animate-spin"/>}
            {salvarMut.isPending ? "Adicionando..." : "Adicionar treinos à rotina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
export default PrescreverIaDialog;
