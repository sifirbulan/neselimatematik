alter table public.nesevren_learning_data
  add column if not exists coach_data jsonb;

create table if not exists public.nesevren_family_invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null default 'Öğrenci',
  code text not null unique,
  active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.nesevren_family_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null default 'Öğrenci',
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,parent_id)
);

create index if not exists nesevren_family_links_parent_idx
  on public.nesevren_family_links(parent_id,status);
create index if not exists nesevren_family_links_student_idx
  on public.nesevren_family_links(student_id,status);
create index if not exists nesevren_family_invites_code_idx
  on public.nesevren_family_invites(code,active);

alter table public.nesevren_family_invites enable row level security;
alter table public.nesevren_family_links enable row level security;

drop policy if exists "Students manage own family invites" on public.nesevren_family_invites;
create policy "Students manage own family invites"
on public.nesevren_family_invites
for all
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

drop policy if exists "Family participants read links" on public.nesevren_family_links;
create policy "Family participants read links"
on public.nesevren_family_links
for select
to authenticated
using (auth.uid() = student_id or auth.uid() = parent_id);

drop policy if exists "Family participants revoke links" on public.nesevren_family_links;
create policy "Family participants revoke links"
on public.nesevren_family_links
for update
to authenticated
using (auth.uid() = student_id or auth.uid() = parent_id)
with check (auth.uid() = student_id or auth.uid() = parent_id);

drop policy if exists "Parents read linked student learning data" on public.nesevren_learning_data;
create policy "Parents read linked student learning data"
on public.nesevren_learning_data
for select
to authenticated
using (
  exists (
    select 1
    from public.nesevren_family_links link
    where link.student_id = nesevren_learning_data.user_id
      and link.parent_id = auth.uid()
      and link.status = 'active'
  )
);

create or replace function public.nesevren_claim_family_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.nesevren_family_invites%rowtype;
  v_parent uuid := auth.uid();
begin
  if v_parent is null then
    raise exception 'Oturum açmanız gerekiyor.';
  end if;

  select * into v_invite
  from public.nesevren_family_invites
  where code = upper(trim(p_code))
    and active = true
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Bağlantı kodu geçersiz veya süresi dolmuş.';
  end if;

  if v_invite.student_id = v_parent then
    raise exception 'Kendi hesabınızı veli olarak bağlayamazsınız.';
  end if;

  insert into public.nesevren_family_links(student_id,parent_id,student_name,status,updated_at)
  values (v_invite.student_id,v_parent,v_invite.student_name,'active',now())
  on conflict (student_id,parent_id)
  do update set student_name=excluded.student_name,status='active',updated_at=now();

  update public.nesevren_family_invites
  set active=false
  where id=v_invite.id;

  return v_invite.student_id;
end;
$$;

revoke all on table public.nesevren_family_invites from anon;
revoke all on table public.nesevren_family_links from anon;
grant select, insert on table public.nesevren_family_invites to authenticated;
grant update(active) on table public.nesevren_family_invites to authenticated;
grant select on table public.nesevren_family_links to authenticated;
grant update(status,updated_at) on table public.nesevren_family_links to authenticated;

revoke all on function public.nesevren_claim_family_code(text) from public;
grant execute on function public.nesevren_claim_family_code(text) to authenticated;

comment on table public.nesevren_family_links is 'Öğrenci onayıyla veli hesabına yalnızca okuma amaçlı eğitim özeti erişimi verir.';
