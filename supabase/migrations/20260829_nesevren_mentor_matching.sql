create table if not exists public.nesevren_mentor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  support_types text[] not null default '{}',
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  modes text[] not null default '{Online}',
  city text,
  bio text,
  experience_years integer not null default 0 check (experience_years between 0 and 60),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.nesevren_mentor_approvals (
  user_id uuid primary key references public.nesevren_mentor_profiles(user_id) on delete cascade,
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

create table if not exists public.nesevren_mentor_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid references public.nesevren_mentor_profiles(user_id) on delete set null,
  requester_name text not null default 'Öğrenci',
  support_type text not null check (support_type in ('Branş Öğretmeni','Akademik Koç','Mentor')),
  subject text not null,
  level text not null,
  mode text not null check (mode in ('Online','Yüz yüze')),
  city text,
  preferred_time text,
  note text,
  status text not null default 'waiting_pool' check (status in ('waiting_pool','matched','accepted','completed','declined','cancelled')),
  mentor_message text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nesevren_mentor_requests_requester_idx on public.nesevren_mentor_requests(requester_id, created_at desc);
create index if not exists nesevren_mentor_requests_mentor_idx on public.nesevren_mentor_requests(mentor_id, created_at desc);

create or replace function public.nesevren_prepare_mentor_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.nesevren_mentor_approvals(user_id, approved)
  values (new.user_id, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists nesevren_mentor_profile_approval_trigger on public.nesevren_mentor_profiles;
create trigger nesevren_mentor_profile_approval_trigger
after insert on public.nesevren_mentor_profiles
for each row execute function public.nesevren_prepare_mentor_approval();

alter table public.nesevren_mentor_profiles enable row level security;
alter table public.nesevren_mentor_approvals enable row level security;
alter table public.nesevren_mentor_requests enable row level security;

drop policy if exists "Mentors manage own profile" on public.nesevren_mentor_profiles;
create policy "Mentors manage own profile"
on public.nesevren_mentor_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read approved mentor profiles" on public.nesevren_mentor_profiles;
create policy "Users can read approved mentor profiles"
on public.nesevren_mentor_profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.nesevren_mentor_approvals a
    where a.user_id = nesevren_mentor_profiles.user_id and a.approved = true
  )
);

drop policy if exists "Authenticated can read mentor approvals" on public.nesevren_mentor_approvals;
create policy "Authenticated can read mentor approvals"
on public.nesevren_mentor_approvals
for select
to authenticated
using (true);

drop policy if exists "Users create own mentor requests" on public.nesevren_mentor_requests;
create policy "Users create own mentor requests"
on public.nesevren_mentor_requests
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and (
    mentor_id is null
    or exists (
      select 1 from public.nesevren_mentor_approvals a
      where a.user_id = mentor_id and a.approved = true
    )
  )
);

drop policy if exists "Participants read mentor requests" on public.nesevren_mentor_requests;
create policy "Participants read mentor requests"
on public.nesevren_mentor_requests
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = mentor_id);

drop policy if exists "Participants update mentor request status" on public.nesevren_mentor_requests;
create policy "Participants update mentor request status"
on public.nesevren_mentor_requests
for update
to authenticated
using (auth.uid() = requester_id or auth.uid() = mentor_id)
with check (auth.uid() = requester_id or auth.uid() = mentor_id);

revoke all on table public.nesevren_mentor_profiles from anon;
revoke all on table public.nesevren_mentor_approvals from anon;
revoke all on table public.nesevren_mentor_requests from anon;

grant select, insert, update on table public.nesevren_mentor_profiles to authenticated;
grant select on table public.nesevren_mentor_approvals to authenticated;
grant select, insert on table public.nesevren_mentor_requests to authenticated;
grant update(status, mentor_message, updated_at) on table public.nesevren_mentor_requests to authenticated;

comment on table public.nesevren_mentor_approvals is 'Eğitmen doğrulaması yalnızca yönetici/service role tarafından değiştirilmelidir.';
