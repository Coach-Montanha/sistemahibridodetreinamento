-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ENUMS
create type methodology_key as enum ('hibrido','kettlebell_sport','kettlebell_fitness','levantamento_peso','musculacao');
create type block_format as enum ('preparacao_movimento','forca_tecnica_pct','emom','e2mom','amrap','circuito','kb_timed_sets','metcon','bodybuilding_sets','finalizador','livre');
create type session_status as enum ('rascunho','publicada','arquivada');
create type export_format as enum ('pdf','xlsx','docx');
create type media_kind as enum ('video','imagem','gif');
create type user_role as enum ('super_admin','coach','assistente','aluno');
create type coach_plan as enum ('trial','individual','studio','revenda');
create type student_access_status as enum ('convidado','ativo','inativo','expirado');

-- COACHES
create table public.coaches (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  email text not null unique,
  plano coach_plan not null default 'trial',
  logo_url text,
  cor_primaria text default '#F26B1F',
  cor_secundaria text default '#0F1115',
  rodape_export text,
  external_studio_ref text,
  criado_em timestamptz not null default now(),
  ativo boolean not null default true
);
grant select, insert, update, delete on public.coaches to authenticated;
grant all on public.coaches to service_role;
alter table public.coaches enable row level security;

create table public.coach_members (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null default 'assistente',
  criado_em timestamptz not null default now(),
  unique (coach_id, auth_user_id)
);
grant select, insert, update, delete on public.coach_members to authenticated;
grant all on public.coach_members to service_role;
alter table public.coach_members enable row level security;

-- STUDENTS
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  email text not null,
  telefone text,
  status student_access_status not null default 'convidado',
  senha_temporaria boolean not null default true,
  origem text,
  observacoes text,
  criado_em timestamptz not null default now(),
  unique (coach_id, email)
);
grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;

create table public.student_groups (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  nome text not null
);
grant select, insert, update, delete on public.student_groups to authenticated;
grant all on public.student_groups to service_role;
alter table public.student_groups enable row level security;

create table public.student_group_members (
  group_id uuid not null references public.student_groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (group_id, student_id)
);
grant select, insert, update, delete on public.student_group_members to authenticated;
grant all on public.student_group_members to service_role;
alter table public.student_group_members enable row level security;

-- EXERCISES
create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid references public.coaches(id) on delete cascade,
  nome_pt text not null,
  nome_en text,
  metodologias methodology_key[] not null default '{}',
  padrao_movimento text,
  grupos_musculares text[],
  equipamento text[],
  unilateral boolean not null default false,
  variante_lado text,
  nivel text default 'intermediario',
  instrucoes text,
  observacoes_tecnicas text,
  criado_por_ia boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index idx_exercises_metodologias on public.exercises using gin (metodologias);
create index idx_exercises_nome_pt on public.exercises using gin (to_tsvector('portuguese', nome_pt));
grant select, insert, update, delete on public.exercises to authenticated;
grant all on public.exercises to service_role;
alter table public.exercises enable row level security;

create table public.exercise_media (
  id uuid primary key default uuid_generate_v4(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  tipo media_kind not null,
  storage_path text not null,
  url_publica text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.exercise_media to authenticated;
grant all on public.exercise_media to service_role;
alter table public.exercise_media enable row level security;

-- BLOCK TEMPLATES
create table public.block_templates (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid references public.coaches(id) on delete cascade,
  metodologia methodology_key not null,
  formato block_format not null,
  nome text not null,
  duracao_min int,
  config jsonb not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.block_templates to authenticated;
grant all on public.block_templates to service_role;
alter table public.block_templates enable row level security;

-- PROGRAMS
create table public.programs (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  metodologia methodology_key not null,
  titulo text not null,
  descricao text,
  data_inicio date not null,
  duracao_semanas int not null default 4,
  regras_progressao jsonb default '{}',
  status session_status not null default 'rascunho',
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.programs to authenticated;
grant all on public.programs to service_role;
alter table public.programs enable row level security;

create table public.program_weeks (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  numero_semana int not null,
  rotulo text,
  data_inicio date,
  observacoes text,
  eh_semana_especial boolean not null default false,
  unique (program_id, numero_semana)
);
grant select, insert, update, delete on public.program_weeks to authenticated;
grant all on public.program_weeks to service_role;
alter table public.program_weeks enable row level security;

-- SESSIONS
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  program_week_id uuid not null references public.program_weeks(id) on delete cascade,
  numero_dia int not null,
  data date,
  titulo text,
  status session_status not null default 'rascunho',
  gerada_automaticamente boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
alter table public.sessions enable row level security;

create table public.session_blocks (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  block_template_id uuid references public.block_templates(id) on delete set null,
  ordem int not null,
  formato block_format not null,
  titulo text,
  duracao_min int,
  config jsonb default '{}',
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.session_blocks to authenticated;
grant all on public.session_blocks to service_role;
alter table public.session_blocks enable row level security;

create table public.session_block_exercises (
  id uuid primary key default uuid_generate_v4(),
  session_block_id uuid not null references public.session_blocks(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  nome_livre text,
  ordem int not null,
  reps text,
  series int,
  pct_1rm numeric(5,2),
  carga_kg numeric(6,2),
  descanso_seg int,
  lado text,
  observacoes text
);
grant select, insert, update, delete on public.session_block_exercises to authenticated;
grant all on public.session_block_exercises to service_role;
alter table public.session_block_exercises enable row level security;

-- ASSIGNMENTS
create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  program_week_id uuid references public.program_weeks(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  group_id uuid references public.student_groups(id) on delete cascade,
  liberado_em timestamptz default now(),
  expira_em timestamptz,
  check (student_id is not null or group_id is not null),
  check ((program_id is not null)::int + (program_week_id is not null)::int + (session_id is not null)::int = 1)
);
grant select, insert, update, delete on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;

create table public.session_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  concluida boolean not null default false,
  feedback text,
  rpe int check (rpe between 1 and 10),
  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (session_id, student_id)
);
grant select, insert, update, delete on public.session_logs to authenticated;
grant all on public.session_logs to service_role;
alter table public.session_logs enable row level security;

-- EXPORTS
create table public.export_templates (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  nome text not null,
  formato export_format not null,
  layout_config jsonb default '{}',
  padrao boolean not null default false,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.export_templates to authenticated;
grant all on public.export_templates to service_role;
alter table public.export_templates enable row level security;

create table public.export_jobs (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  export_template_id uuid references public.export_templates(id),
  escopo text not null check (escopo in ('sessao','semana','mes','ano','programa')),
  program_id uuid references public.programs(id),
  program_week_id uuid references public.program_weeks(id),
  session_id uuid references public.sessions(id),
  formato export_format not null,
  storage_path text,
  status text not null default 'processando' check (status in ('processando','concluido','erro')),
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.export_jobs to authenticated;
grant all on public.export_jobs to service_role;
alter table public.export_jobs enable row level security;

create table public.ai_ingestion_jobs (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  metodologia methodology_key,
  arquivo_origem text,
  status text not null default 'pendente' check (status in ('pendente','processando','concluido','erro')),
  resultado jsonb,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.ai_ingestion_jobs to authenticated;
grant all on public.ai_ingestion_jobs to service_role;
alter table public.ai_ingestion_jobs enable row level security;

-- HELPERS (security definer)
create or replace function public.auth_coach_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from public.coaches where auth_user_id = auth.uid()),
    (select coach_id from public.coach_members where auth_user_id = auth.uid() limit 1)
  );
$$;

create or replace function public.auth_student_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.students where auth_user_id = auth.uid();
$$;

grant execute on function public.auth_coach_id() to authenticated;
grant execute on function public.auth_student_id() to authenticated;

-- POLICIES
create policy coach_self on public.coaches for all
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy coach_members_scope on public.coach_members for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());

create policy students_coach_scope on public.students for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());
create policy students_self_read on public.students for select
  using (auth_user_id = auth.uid());

create policy student_groups_scope on public.student_groups for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());

create policy student_group_members_scope on public.student_group_members for all
  using (group_id in (select id from public.student_groups where coach_id = public.auth_coach_id()))
  with check (group_id in (select id from public.student_groups where coach_id = public.auth_coach_id()));

create policy exercises_scope on public.exercises for all
  using (coach_id is null or coach_id = public.auth_coach_id())
  with check (coach_id = public.auth_coach_id());

create policy exercise_media_scope on public.exercise_media for all
  using (exercise_id in (select id from public.exercises where coach_id is null or coach_id = public.auth_coach_id()))
  with check (exercise_id in (select id from public.exercises where coach_id = public.auth_coach_id()));

create policy block_templates_scope on public.block_templates for all
  using (coach_id is null or coach_id = public.auth_coach_id())
  with check (coach_id = public.auth_coach_id());

create policy programs_coach_scope on public.programs for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());

create policy program_weeks_coach_scope on public.program_weeks for all
  using (program_id in (select id from public.programs where coach_id = public.auth_coach_id()))
  with check (program_id in (select id from public.programs where coach_id = public.auth_coach_id()));

create policy sessions_coach_scope on public.sessions for all
  using (program_week_id in (
    select pw.id from public.program_weeks pw
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()))
  with check (program_week_id in (
    select pw.id from public.program_weeks pw
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()));

create policy sessions_student_read on public.sessions for select
  using (id in (
    select session_id from public.assignments where student_id = public.auth_student_id() and session_id is not null
    union
    select s.id from public.sessions s
    join public.assignments a on a.program_week_id = s.program_week_id
    where a.student_id = public.auth_student_id()
    union
    select s.id from public.sessions s
    join public.program_weeks pw on pw.id = s.program_week_id
    join public.assignments a on a.program_id = pw.program_id
    where a.student_id = public.auth_student_id()));

create policy session_blocks_coach_scope on public.session_blocks for all
  using (session_id in (
    select s.id from public.sessions s
    join public.program_weeks pw on pw.id = s.program_week_id
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()))
  with check (session_id in (
    select s.id from public.sessions s
    join public.program_weeks pw on pw.id = s.program_week_id
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()));

create policy session_block_exercises_coach_scope on public.session_block_exercises for all
  using (session_block_id in (
    select sb.id from public.session_blocks sb
    join public.sessions s on s.id = sb.session_id
    join public.program_weeks pw on pw.id = s.program_week_id
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()))
  with check (session_block_id in (
    select sb.id from public.session_blocks sb
    join public.sessions s on s.id = sb.session_id
    join public.program_weeks pw on pw.id = s.program_week_id
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()));

create policy assignments_coach_scope on public.assignments for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());
create policy assignments_student_read on public.assignments for select
  using (student_id = public.auth_student_id());

create policy session_logs_student_own on public.session_logs for all
  using (student_id = public.auth_student_id()) with check (student_id = public.auth_student_id());
create policy session_logs_coach_read on public.session_logs for select
  using (session_id in (
    select s.id from public.sessions s
    join public.program_weeks pw on pw.id = s.program_week_id
    join public.programs p on p.id = pw.program_id
    where p.coach_id = public.auth_coach_id()));

create policy export_templates_scope on public.export_templates for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());
create policy export_jobs_scope on public.export_jobs for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());
create policy ai_ingestion_scope on public.ai_ingestion_jobs for all
  using (coach_id = public.auth_coach_id()) with check (coach_id = public.auth_coach_id());

-- SEED: templates de bloco padrão da plataforma
insert into public.block_templates (metodologia, formato, nome, duracao_min, config) values
('hibrido','preparacao_movimento','Preparação de Movimento',2,'{"alongamento_min":2,"rounds":4,"round_min":5,"exercicios_por_round":2,"reps_padrao":10}'),
('hibrido','e2mom','E2MOM 16min',16,'{"intervalo_min":2,"num_exercicios":3,"reps_padrao":10,"rest_after_min":3}'),
('hibrido','amrap','AMRAP 12min',12,'{"num_exercicios":3,"reps_padrao":10}'),
('hibrido','finalizador','Finalizador',2,'{"tipo":"relaxamento"}'),
('kettlebell_sport','kb_timed_sets','AQ/TR Clássico',12,'{"aquecimento":[{"sets":2,"work_min":2,"rest_min":2}],"tiro":[{"sets":1,"work_min":2,"rest_min":2}]}'),
('kettlebell_fitness','amrap','AMRAP 3min por estação',30,'{"estacoes":5,"work_min":3,"rounds":2}'),
('levantamento_peso','forca_tecnica_pct','Complex com Barra (3 movimentos)',15,'{"passos":[{"pct":50,"sets":3,"reps":6},{"pct":60,"sets":2,"reps":5},{"pct":70,"sets":1,"reps":4}]}'),
('musculacao','bodybuilding_sets','Bloco Hipertrofia Padrão',10,'{"series":4,"reps":"8-12","descanso_seg":60,"metodo":"reto"}');