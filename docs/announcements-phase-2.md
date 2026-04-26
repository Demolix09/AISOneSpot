# AIS OneSpot Announcements: Phase 2 Design

## Goal

Turn the current announcements prototype into a real school-managed system where:

- staff can create, edit, publish, schedule, archive, and delete announcements
- public users can browse public announcements
- public users can filter announcements by category
- staff-only announcements stay visible only to logged-in staff

This phase is focused on announcements only.

## Core product rules

### Public browsing

Public visitors can see announcements that are:

- `published`
- currently active by date
- marked as `public`

Public visitors can filter by:

- `General`
- `Students`
- `Staff`
- `Urgent`

### Staff authoring

Staff can:

- save drafts
- schedule announcements
- publish immediately
- pin important announcements
- expire announcements automatically
- archive old announcements
- delete announcements that should be removed entirely

## Recommended domain model

### Announcement categories

- `general`
- `students`
- `staff`
- `urgent`

### Status

- `draft`
- `scheduled`
- `published`
- `archived`

### Visibility

- `public`
- `staff`

### Priority

- `normal`
- `high`
- `urgent`

## Main user flows

### Staff: create announcement

1. Staff signs in.
2. Staff opens the admin dashboard.
3. Staff clicks `New announcement`.
4. Staff enters:
   - title
   - message body
   - category
   - priority
   - visibility
   - publish time
   - expire time
5. Staff saves draft or publishes.

### Staff: manage announcements

Staff can:

- edit an existing record
- publish a draft
- archive an older post
- delete an announcement permanently

### Public user: browse announcements

1. User opens the announcements page.
2. User sees only currently active `public` announcements.
3. User filters by category.
4. User opens the announcement card for full details.

## Recommended dashboard sections

### 1. Announcement list

Columns:

- title
- category
- visibility
- status
- publish date
- expiry date
- pinned
- author

Actions:

- edit
- publish
- archive
- delete

### 2. New announcement form

Fields:

- title
- body
- category
- priority
- visibility
- publish at
- expire at
- pinned

## Recommended UI behavior

### Public announcements page

- filter chips for `All`, `General`, `Students`, `Staff`, `Urgent`
- pinned announcements float to the top
- urgent announcements have stronger visual treatment
- expired announcements disappear automatically

### Staff dashboard

- default landing view: all announcements
- drafts are easy to resume
- scheduled announcements clearly show future publish time
- archive is separate from drafts
- delete requires confirmation

## Sorting rules

### Public feed

Sort by:

1. pinned first
2. urgent within pinned and non-pinned
3. newest `published_at`

### Staff list

Default sort:

1. drafts first
2. scheduled
3. published
4. archived
5. newest updated item first in each section

## Validation rules

- title is required
- body is required
- category is required
- visibility is required
- status is required
- publish time must be before expire time when both are present
- archived announcements are read-only unless restored

## MVP API shape

### Public

- `GET /api/announcements?category=general`
- returns published, active, public announcements only

### Staff

- `GET /api/admin/announcements`
- `POST /api/admin/announcements`
- `PATCH /api/admin/announcements/:id`
- `POST /api/admin/announcements/:id/publish`
- `POST /api/admin/announcements/:id/archive`
- `DELETE /api/admin/announcements/:id`

## Recommended implementation order

### Backend first

1. auth for staff
2. announcements table
3. row level security
4. public read query
5. staff CRUD endpoints

### UI second

1. staff login
2. admin list page
3. new/edit announcement form
4. public announcements page wired to live data
5. category filters

## Notes for later phases

- attachments can be added later
- read receipts can be added later
- email or push notifications can be added later

## Recommended decision for this project

For phase 2, the clearest first version is:

- public browsing only for `public` announcements
- staff-only notices use `visibility = staff`
- category filters stay public-facing
- staff dashboard handles the full create, edit, publish, archive, and delete flow
