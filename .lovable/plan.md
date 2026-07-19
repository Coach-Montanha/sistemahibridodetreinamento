# Coach Montanha — Sistema Híbrido de Treinamento

Plataforma web multi-tenant para prescrição de treinos. Esta 1ª entrega cobre backend + autenticação por papel + construtor de sessão. Interface em pt-BR, tema grafite + laranja esportivo (#0F1115 / #1C1F26 / #F26B1F / #F5F5F4).

## Escopo desta entrega
1. **Backend (Lovable Cloud)** — aplico o `schema-supabase.sql` como migração, com RLS, buckets `exercise-media` e `exports`, e função `has_role`.
2. **Autenticação por papel** — login coach/aluno, "lembrar de mim", primeira troca de senha do aluno, rotas protegidas.
3. **Shell do app** — layout com sidebar, tema grafite/laranja, tipografia esportiva.
4. **Construtor de Sessão** — editor por blocos com drag-and-drop e 4 formatos: Preparação de Movimento, E2MOM/AMRAP, Força/Técnica %1RM, AQ/TR Kettlebell Sport. Salva rascunho e publica.
5. **Banco de Exercícios (mínimo viável para o construtor)** — busca + criação rápida com upload de mídia, para poder popular blocos. CRUD completo virá junto (é dependência natural).

Ficam para entregas seguintes: dashboard com métricas, gerador automático, calendário, exportação PDF/Excel, portal do aluno, gestão de atribuições, IA de ingestão.

## O que preciso de você antes de eu começar
- **Cole o conteúdo do `schema-supabase.sql`** aqui no chat (ou anexe o arquivo). Vou ativar o Lovable Cloud e converter em migrações, mantendo nomes de tabelas e RLS. Sem isso não consigo garantir compatibilidade com o schema que você já desenhou.
- Confirmação: primeiro coach cadastrado = super admin (você).

## Estrutura técnica

**Rotas**
```
/                       redirect por papel
/auth                   login + recuperação
/auth/primeiro-acesso   troca de senha do aluno
/app/                   layout coach (sidebar)
  /app/dashboard        placeholder nesta entrega
  /app/exercicios       lista + CRUD
  /app/sessoes/nova     construtor de sessão
  /app/sessoes/$id      editar sessão
/aluno/                 layout aluno (mínimo nesta entrega)
```

**Papéis / RLS**
- Tabela `user_roles` com enum `app_role` (`super_admin`, `coach`, `assistente`, `aluno`) e função `has_role` (security definer). Layout `_authenticated` gate + `beforeLoad` para separar `/app` (coach) de `/aluno`.
- Coach só enxerga dados do próprio `coach_id`; aluno só vê `assignments` liberados. Políticas do schema entregue são respeitadas — não desativo RLS.

**Construtor de Sessão**
- Estado local com Zustand; salva via `createServerFn` autenticado.
- Blocos renderizados por `<BlockEditor format={...}>` que despacha para 4 subcomponentes de formulário, um por formato.
- Drag-and-drop com `@dnd-kit/core`.
- Formato %1RM calcula kg automaticamente quando o aluno-alvo tem 1RM cadastrado (campo opcional na sessão).
- Busca de exercícios inline (Command palette) com preview de mídia.

**Design system**
Tokens em `src/styles.css` (oklch): background grafite, superfícies elevadas, acento laranja Coach Montanha, tipografia display + sans esportiva. Componentes shadcn recustomizados (sem paleta padrão).

**Stack**
TanStack Start já configurado, TanStack Query para reads, Lovable Cloud (Supabase gerenciado), `@dnd-kit`, `zod` para validação, `react-hook-form` nos formulários de bloco.

## Fluxo de trabalho depois do "Implementar"
1. Você cola o SQL → ativo o Cloud e aplico migrações.
2. Crio design tokens + shell + auth por papel.
3. Construtor de sessão + banco de exercícios mínimo.
4. Você cria seu login coach, testa criar exercícios e montar uma sessão nos 4 formatos.
5. Passamos para dashboard, gerador automático e exportação na próxima rodada.

Confirma e cola o `schema-supabase.sql` para eu começar?