create table if not exists public.nesevren_learning_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  assessment jsonb,
  error_book jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nesevren_learning_data enable row level security;

drop policy if exists "Users can read own learning data" on public.nesevren_learning_data;
create policy "Users can read own learning data"
on public.nesevren_learning_data
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own learning data" on public.nesevren_learning_data;
create policy "Users can insert own learning data"
on public.nesevren_learning_data
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own learning data" on public.nesevren_learning_data;
create policy "Users can update own learning data"
on public.nesevren_learning_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on table public.nesevren_learning_data from anon;
grant select, insert, update on table public.nesevren_learning_data to authenticated;
