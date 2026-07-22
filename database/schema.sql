-- NutriDent AI Supabase schema.
-- Run this in the Supabase SQL Editor, then set the frontend env vars.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  height_cm numeric,
  current_weight_kg numeric,
  goal_weight_kg numeric,
  age numeric,
  gender text,
  updated_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  logged_date date not null,
  meal_category text not null default 'Meal',
  food_name text not null,
  usda_match text,
  source text,
  portion_g numeric,
  calories numeric,
  sugar_g numeric,
  carbs_g numeric,
  fat_g numeric,
  protein_g numeric,
  risk_level text,
  risk_score numeric,
  raw_result jsonb not null default '{}'::jsonb
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  food_name text,
  patient_risk jsonb,
  food_risk jsonb,
  final_advice text,
  raw_result jsonb not null default '{}'::jsonb
);

alter table public.user_profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.assessment_results enable row level security;

revoke all on table public.user_profiles from anon;
revoke all on table public.food_logs from anon;
revoke all on table public.weight_logs from anon;
revoke all on table public.assessment_results from anon;

grant select, insert, update, delete on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.food_logs to authenticated;
grant select, insert, update, delete on table public.weight_logs to authenticated;
grant select, insert, update, delete on table public.assessment_results to authenticated;

create index if not exists user_profiles_user_idx on public.user_profiles(user_id);
create index if not exists food_logs_user_date_idx on public.food_logs(user_id, logged_date desc);
create index if not exists weight_logs_user_date_idx on public.weight_logs(user_id, logged_date desc);
create index if not exists assessment_results_user_created_idx on public.assessment_results(user_id, created_at desc);

drop policy if exists "Users can read their profile" on public.user_profiles;
create policy "Users can read their profile"
on public.user_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their profile" on public.user_profiles;
create policy "Users can insert their profile"
on public.user_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their profile" on public.user_profiles;
create policy "Users can update their profile"
on public.user_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their profile" on public.user_profiles;
create policy "Users can delete their profile"
on public.user_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their food logs" on public.food_logs;
create policy "Users can read their food logs"
on public.food_logs for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their food logs" on public.food_logs;
create policy "Users can insert their food logs"
on public.food_logs for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their food logs" on public.food_logs;
create policy "Users can update their food logs"
on public.food_logs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their food logs" on public.food_logs;
create policy "Users can delete their food logs"
on public.food_logs for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their weight logs" on public.weight_logs;
create policy "Users can read their weight logs"
on public.weight_logs for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their weight logs" on public.weight_logs;
create policy "Users can insert their weight logs"
on public.weight_logs for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their weight logs" on public.weight_logs;
create policy "Users can update their weight logs"
on public.weight_logs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their weight logs" on public.weight_logs;
create policy "Users can delete their weight logs"
on public.weight_logs for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their assessments" on public.assessment_results;
create policy "Users can read their assessments"
on public.assessment_results for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their assessments" on public.assessment_results;
create policy "Users can insert their assessments"
on public.assessment_results for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their assessments" on public.assessment_results;
create policy "Users can delete their assessments"
on public.assessment_results for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their assessments" on public.assessment_results;
create policy "Users can update their assessments"
on public.assessment_results for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
