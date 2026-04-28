-- AIS OneSpot staff contacts setup
-- Run this in Supabase SQL editor if your project is already configured.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.staff_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title text not null,
  school_email text,
  created_by uuid references public.staff_profiles(id),
  updated_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_contacts_full_name_not_blank check (char_length(trim(full_name)) > 0),
  constraint staff_contacts_role_title_not_blank check (char_length(trim(role_title)) > 0),
  constraint staff_contacts_school_email_format check (
    school_email is null
    or school_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  )
);

create index if not exists staff_contacts_name_idx
  on public.staff_contacts (lower(full_name));

drop trigger if exists staff_contacts_set_updated_at on public.staff_contacts;
create trigger staff_contacts_set_updated_at
before update on public.staff_contacts
for each row execute function public.set_updated_at();

alter table public.staff_contacts enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.staff_contacts to anon, authenticated;
grant insert, update, delete on public.staff_contacts to authenticated;

drop policy if exists staff_contacts_public_read on public.staff_contacts;
create policy staff_contacts_public_read
on public.staff_contacts
for select
using (true);

drop policy if exists staff_contacts_staff_all on public.staff_contacts;
create policy staff_contacts_staff_all
on public.staff_contacts
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

insert into public.staff_contacts (full_name, role_title, school_email)
select seed.full_name, seed.role_title, seed.school_email
from (
  values
    ('Victoria Alonso', 'LSP Department', null),
    ('Adriana Alpizar', 'Accountant', null),
    ('Kattya Alvarado', 'Administration', null),
    ('Veronica Alvarez', 'Admissions', null),
    ('Laura Arrieta', 'Maintenance', null),
    ('Gina Pindras', 'English Department', null),
    ('Andrea Barrantes', 'Elementary', null),
    ('Gerson Bagnarello', 'P.E. Department', null),
    ('Jorge Bravo', 'Math Department', null),
    ('Julio Bustos', 'History & MUN', null),
    ('Martin Cambronero', 'Maintenance', null),
    ('Pamela Campos', 'ECE Department', null),
    ('Daniel Carranza', 'Maintenance', null),
    ('America Chaves', 'Spanish Department', null),
    ('Natasha Chipembere', 'English Department', null),
    ('Elizabeth Conejo', 'Curriculum COORD', null),
    ('Melania Jenkins', 'Elementary', null),
    ('Rosa Delgado', 'Elementary', null),
    ('Adam Esquivel', 'Art Department', null),
    ('Maria Gonzalez', 'Office', null),
    ('Mariana Gonzalez', 'Counselling', null),
    ('Rocio Gonzalez', 'Elementary Principal', null),
    ('Yessenia Gonzalez', 'Maintenance', null),
    ('Fabian Rodriguez', 'Science Department', null),
    ('Ms. Mercedes McGinnis', 'Elementary', null),
    ('Marcia Solano', 'ECE Department', null),
    ('Cinthya Sotelo', 'Maintenance', null),
    ('Andres Soto', 'Spanish Department', null),
    ('Daniela Valerio', 'Elementary', null),
    ('Dylana Vincenti', 'Administration', null),
    ('Laura Viquez', 'Elementary', null),
    ('Dahyana Zuniga', 'English Department', null),
    ('Jose Granados', 'IT Department', null),
    ('Marco Guevara', 'MS/HS Principal', null),
    ('Elizabeth Hernandez', 'Office', null),
    ('Sofia Ibarra', 'ECE Department', null),
    ('Evelyn Kolitsky', 'Makerspace', null),
    ('Michael Mallozzi', 'Science Department', null),
    ('Gabriela Monge', 'LSP Department', null),
    ('Mileydi Montero', 'Spanish Department', null),
    ('Gabriella Murillo', 'Science Department', null),
    ('Micaela Pittavino', 'English Department', null),
    ('Fiorella Ramirez', 'English Department', null),
    ('Karla Ramirez', 'Nurse', null)
) as seed(full_name, role_title, school_email)
where not exists (
  select 1
  from public.staff_contacts sc
  where sc.full_name = seed.full_name
);
