# AGENTS.md

## Project Overview

AIS OneSpot is a static multi-page school site with a Supabase-backed announcements system.

Key goals:

- staff can sign in and manage announcements
- public users can browse published announcements
- announcements can be filtered by category on the public page

## Tech Stack

- Static HTML/CSS/JS
- Supabase JS client loaded by CDN
- Supabase Postgres + Auth + RLS

No framework build step is required for current pages.

## Important Paths

- Public announcements page: `events-update/index.html`
- Public announcements logic: `events-update/events.js`
- Staff auth page: `auth/index.html`
- Staff auth logic: `auth/auth.js`
- Staff admin page: `admin/index.html`
- Staff admin logic: `admin/admin.js`
- Shared announcements API: `announcements.js`
- Supabase config (local): `supabase-config.js`
- Supabase SQL schema: `db/announcements_schema.sql`
- Product design notes: `docs/announcements-phase-2.md` (announcements guide)

## Data Model Notes

The `announcements` table currently uses:

- categories: `general`, `students`, `staff`, `urgent`
- status: `draft`, `scheduled`, `published`, `archived`
- visibility: `public`, `staff`
- priority: `normal`, `high`, `urgent`

`author_name` is stored directly on each announcement row.

## Supabase Setup Checklist

1. Create a Supabase project.
2. Run `db/announcements_schema.sql` in the SQL editor.
3. Edit `supabase-config.js` with your project URL and anon key.
4. Create staff users in Supabase Auth.
5. Insert a matching row in `public.staff_profiles` for each staff user:
   - `id` must match `auth.users.id`
   - set `is_active = true`

Without a matching `staff_profiles` row, staff users will fail RLS checks for admin actions.

## Runtime Expectations

- Public page queries `public_announcements_feed`.
- Admin page requires staff sign-in and active staff profile.
- Scheduled announcements are promoted to published state when staff/admin views trigger hydration.

## Guardrails For Future Changes

- Keep `announcements.js` as the single data access layer.
- Preserve RLS compatibility when editing insert/update payloads.
- Avoid storing secrets directly in committed files.
- Prefer incremental schema changes over table rewrites.
- Keep UI categories aligned with enum values in SQL.
