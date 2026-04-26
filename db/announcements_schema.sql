-- AIS OneSpot Phase 2: announcements schema draft
-- Target database: Supabase Postgres

create extension if not exists pgcrypto;

create type announcement_category as enum (
  'general',
  'students',
  'staff',
  'urgent'
);

create type announcement_status as enum (
  'draft',
  'scheduled',
  'published',
  'archived'
);

create type announcement_visibility as enum (
  'public',
  'staff'
);

create type announcement_priority as enum (
  'normal',
  'high',
  'urgent'
);

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  staff_role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_name text not null default 'AIS Staff',
  category announcement_category not null,
  status announcement_status not null default 'draft',
  visibility announcement_visibility not null default 'public',
  priority announcement_priority not null default 'normal',
  pinned boolean not null default false,
  publish_at timestamptz,
  expires_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.staff_profiles(id),
  updated_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_title_not_blank check (char_length(trim(title)) > 0),
  constraint announcements_body_not_blank check (char_length(trim(body)) > 0),
  constraint announcements_publish_before_expiry check (
    publish_at is null
    or expires_at is null
    or publish_at <= expires_at
  )
);

create index if not exists announcements_public_feed_idx
  on public.announcements(status, visibility, category, pinned, published_at desc);

create index if not exists announcements_publish_window_idx
  on public.announcements(publish_at, expires_at);

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create or replace view public.public_announcements_feed as
select
  a.id,
  a.title,
  a.body,
  a.category,
  a.priority,
  a.pinned,
  a.published_at,
  a.expires_at
from public.announcements a
where a.status = 'published'
  and a.visibility = 'public'
  and (a.publish_at is null or a.publish_at <= now())
  and (a.expires_at is null or a.expires_at >= now());

alter table public.staff_profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_attachments enable row level security;

drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read
on public.announcements
for select
using (
  status = 'published'
  and visibility = 'public'
  and (publish_at is null or publish_at <= now())
  and (expires_at is null or expires_at >= now())
);

drop policy if exists announcements_staff_all on public.announcements;
create policy announcements_staff_all
on public.announcements
for all
using (
  exists (
    select 1
    from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.is_active = true
  )
);

drop policy if exists staff_profiles_staff_read on public.staff_profiles;
create policy staff_profiles_staff_read
on public.staff_profiles
for select
using (
  exists (
    select 1
    from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.is_active = true
  )
);

drop policy if exists staff_profiles_self_insert on public.staff_profiles;
create policy staff_profiles_self_insert
on public.staff_profiles
for insert
with check (
  auth.uid() = id
  and is_active = false
);

drop policy if exists staff_profiles_self_update on public.staff_profiles;
create policy staff_profiles_self_update
on public.staff_profiles
for update
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
  and is_active = false
);

drop policy if exists announcement_attachments_staff_all on public.announcement_attachments;
create policy announcement_attachments_staff_all
on public.announcement_attachments
for all
using (
  exists (
    select 1
    from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.is_active = true
  )
);
