alter table if exists public.nesevren_learning_data
  add column if not exists performance jsonb not null default '[]'::jsonb;
