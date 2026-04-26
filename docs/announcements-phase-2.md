# AIS OneSpot Announcements Guide

## Goal

Provide a reliable announcements system where staff can manage updates and public users can browse active school announcements.

## Core Rules

- Public users can see announcements where:
  - `status = published`
  - `visibility = public`
  - date window is currently active
- Staff users can create, edit, publish, archive, and delete announcements.
- Staff-only announcements use `visibility = staff`.

## Categories

- `general`
- `students`
- `staff`
- `urgent`

## Status

- `draft`
- `scheduled`
- `published`
- `archived`

## Priority

- `normal`
- `high`
- `urgent`

## Staff Workflow

1. Sign in from the admin page.
2. Create or edit an announcement.
3. Set category, visibility, priority, and timing.
4. Save draft or publish.
5. Archive or delete when no longer needed.

## Public Workflow

1. Open the announcements page.
2. Browse active public announcements.
3. Filter by category as needed.

## Validation

- Title is required.
- Body is required.
- Publish date must be before expiry date when both are set.

## API Shape

- Public:
  - `GET /api/announcements?category=general`
- Staff:
  - `GET /api/admin/announcements`
  - `POST /api/admin/announcements`
  - `PATCH /api/admin/announcements/:id`
  - `POST /api/admin/announcements/:id/publish`
  - `POST /api/admin/announcements/:id/archive`
  - `DELETE /api/admin/announcements/:id`
