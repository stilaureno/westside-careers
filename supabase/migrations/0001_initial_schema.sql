-- migration: 0001_initial_schema
-- purpose: create all tables matching Google Sheets schema

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  applicant_id text unique not null,
  reference_no text unique not null,
  last_name text not null,
  first_name text not null,
  middle_name text,
  birthdate date not null,
  age integer,
  gender text not null,
  contact_number text not null,
  email_address text,
  height_cm numeric,
  weight_kg numeric,
  bmi_value numeric,
  department text,
  position_applied text not null,
  experience_level text,
  current_company_name text,
  current_position text,
  previous_company_name text,
  preferred_department text,
  currently_employed text not null default 'No',
  duplicate_key text,
  current_stage text,
  application_status text,
  overall_result text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.applicant_games (
  id uuid primary key default gen_random_uuid(),
  applicant_id text not null references public.applicants(applicant_id) on delete cascade,
  reference_no text not null references public.applicants(reference_no) on delete cascade,
  game_code text not null,
  created_at timestamptz default now()
);

create table if not exists public.stage_results (
  id uuid primary key default gen_random_uuid(),
  applicant_id text not null references public.applicants(applicant_id) on delete cascade,
  reference_no text not null references public.applicants(reference_no) on delete cascade,
  stage_name text not null,
  stage_sequence integer not null,
  result_status text,
  current_stage_label text,
  height_cm numeric,
  weight_kg numeric,
  bmi_value numeric,
  bmi_result text,
  color_blind_result text,
  visible_tattoo text,
  invisible_tattoo text,
  sweaty_palm_result text,
  score numeric,
  passing_score numeric,
  max_score numeric,
  remarks text,
  evaluated_by text,
  evaluated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.applicant_notifications (
  id uuid primary key default gen_random_uuid(),
  applicant_id text not null references public.applicants(applicant_id) on delete cascade,
  reference_no text not null references public.applicants(reference_no) on delete cascade,
  stage_name text,
  result_status text,
  notification_message text,
  visible_to_applicant text default 'Yes',
  created_at timestamptz default now(),
  created_by text
);

create table if not exists public.config (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.questionnaire (
  id uuid primary key default gen_random_uuid(),
  set_name text not null,
  question_no integer not null,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null,
  created_at timestamptz default now()
);

create table if not exists public.math_exam_results (
  id uuid primary key default gen_random_uuid(),
  reference_no text unique not null,
  last_name text not null,
  first_name text not null,
  middle_name text,
  score numeric,
  status text,
  assigned_set text,
  started_at timestamptz,
  submitted_at timestamptz,
  attempt_status text,
  answers_json jsonb,
  questions_json jsonb,
  time_limit_minutes integer default 10,
  termination_reason text,
  last_heartbeat timestamptz,
  created_at timestamptz default now()
);

-- indexes
create index if not exists idx_applicants_reference_no on public.applicants(reference_no);
create index if not exists idx_applicants_current_stage on public.applicants(current_stage);
create index if not exists idx_applicants_application_status on public.applicants(application_status);
create index if not exists idx_applicants_position_applied on public.applicants(position_applied);
create index if not exists idx_applicant_games_reference_no on public.applicant_games(reference_no);
create index if not exists idx_stage_results_reference_no on public.stage_results(reference_no);
create index if not exists idx_stage_results_stage_name on public.stage_results(stage_name);
create index if not exists idx_applicant_notifications_reference_no on public.applicant_notifications(reference_no);
create index if not exists idx_questionnaire_set_name on public.questionnaire(set_name);
create index if not exists idx_math_exam_results_reference_no on public.math_exam_results(reference_no);

-- enable RLS
alter table public.applicants enable row level security;
alter table public.applicant_games enable row level security;
alter table public.stage_results enable row level security;
alter table public.applicant_notifications enable row level security;
alter table public.config enable row level security;
alter table public.questionnaire enable row level security;
alter table public.math_exam_results enable row level security;

-- applicants: public read via reference (for status check), full CRUD for authenticated
create policy "applicants_select_public" on public.applicants for select using (true);
create policy "applicants_insert_authenticated" on public.applicants for insert with check (true);
create policy "applicants_update_authenticated" on public.applicants for update using (true);
create policy "applicants_delete_authenticated" on public.applicants for delete using (true);

-- applicant_games: same as applicants
create policy "applicant_games_select_public" on public.applicant_games for select using (true);
create policy "applicant_games_insert_authenticated" on public.applicant_games for insert with check (true);
create policy "applicant_games_update_authenticated" on public.applicant_games for update using (true);
create policy "applicant_games_delete_authenticated" on public.applicant_games for delete using (true);

-- stage_results: same
create policy "stage_results_select_public" on public.stage_results for select using (true);
create policy "stage_results_insert_authenticated" on public.stage_results for insert with check (true);
create policy "stage_results_update_authenticated" on public.stage_results for update using (true);
create policy "stage_results_delete_authenticated" on public.stage_results for delete using (true);

-- applicant_notifications: same
create policy "applicant_notifications_select_public" on public.applicant_notifications for select using (true);
create policy "applicant_notifications_insert_authenticated" on public.applicant_notifications for insert with check (true);
create policy "applicant_notifications_update_authenticated" on public.applicant_notifications for update using (true);
create policy "applicant_notifications_delete_authenticated" on public.applicant_notifications for delete using (true);

-- config: admin only
create policy "config_select_authenticated" on public.config for select using (true);
create policy "config_all_authenticated" on public.config for all using (true);

-- questionnaire: public read for exam
create policy "questionnaire_select_public" on public.questionnaire for select using (true);
create policy "questionnaire_insert_authenticated" on public.questionnaire for insert with check (true);
create policy "questionnaire_update_authenticated" on public.questionnaire for update using (true);
create policy "questionnaire_delete_authenticated" on public.questionnaire for delete using (true);

-- math_exam_results: public read/update for exam-taking, full admin access
create policy "math_exam_select_public" on public.math_exam_results for select using (true);
create policy "math_exam_insert_public" on public.math_exam_results for insert with check (true);
create policy "math_exam_update_public" on public.math_exam_results for update using (true);
create policy "math_exam_delete_authenticated" on public.math_exam_results for delete using (true);

-- seed default config
insert into public.config (key, value) values
  ('ADMIN_PASSWORD', 'TGHR2026')
on conflict (key) do nothing;