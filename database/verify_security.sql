-- NutriDent AI Supabase security verification.
-- Run after database/schema.sql in the Supabase SQL Editor.
-- Expected result: every row should return true/ok-style values.

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('user_profiles', 'food_logs', 'weight_logs', 'assessment_results')
order by tablename;

select
  table_schema,
  table_name,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('user_profiles', 'food_logs', 'weight_logs', 'assessment_results')
  and grantee = 'anon'
order by table_name, privilege_type;
-- Expected: zero rows. Anonymous clients should not read or write user data.

select
  table_schema,
  table_name,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('user_profiles', 'food_logs', 'weight_logs', 'assessment_results')
  and grantee = 'authenticated'
order by table_name, privilege_type;
-- Expected: SELECT, INSERT, UPDATE, DELETE for each table.

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('user_profiles', 'food_logs', 'weight_logs', 'assessment_results')
order by tablename, policyname;
-- Expected: policies use authenticated role and compare (select auth.uid()) to user_id.

select
  indexname,
  tablename,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('user_profiles', 'food_logs', 'weight_logs', 'assessment_results')
order by tablename, indexname;
-- Expected: user_id/date indexes exist for policy and dashboard query performance.
