# All Things Book Club - Project Plan

Website for hosting the "All Things Book Club" monthly online meetings.

---

## Project Overview

- **Project Name:** all-things-book-club
- **Purpose:** Website for hosting monthly online book club meetings
- **Project Type:** Personal learning project
- **Learning Focus:** Full-stack development (backend-first, then UI per feature)

---

## Key Decisions (Resolved)

### Wheel Specifications
- **Spin order**: Random (not sequential)
- **Display**: No person name/avatar shown in center when spinning
- **Persistence**: Store what has been selected so far in a meeting. Refresh-safe and shared across users viewing the same meeting.
- **Behavior**: Selected topic appears in a modal. User can skip it or remove it once discussed.
- **Rendering**: Canvas or SVG (TBD based on D3.js capabilities)

### Invitations & Membership
- **Invite scope**: Any chapter member can invite anyone by email
- **New users**: Can invite by email even if they don't have an account yet (they get signup link)
- **Chapters view**: Users see active chapters + pending invitations in one place
- **Invitation flow**: Email search → send invite → pending → accept/reject → member

### Data Visibility: Past Meeting Topics
- Show: **title, themes, who suggested it, and notes** (comprehensive view)

### Force-Directed Graph
- **No user nodes** — graph only shows relationships between:
  - Topics (as nodes), Themes (as nodes), Meetings (as nodes)
  - Connections: topics to themes, topics to meetings, etc.

---

## Approach: Iterative Vertical Slices

Each slice is a complete feature — **database → API → frontend UI**. Nothing moves to the next slice until the current one works end-to-end in the browser.

The frontend gets scaffolded at Slice 1 and grows with each slice. No big-bang frontend build at the end.

---

## Tech Stack

### Backend
- **Runtime**: Node.js 24
- **Framework**: Express 5.2.1
- **Language**: TypeScript
- **ORM**: Prisma 5.9.0
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth (JWT-based)
- **Testing**: Vitest + Supertest

### Frontend
- 

---

## Code Style & Conventions

- Services: functional exports, direct Prisma calls, no validation (validation in routes)
- Routes: try/catch on every handler, `AppError` for user-facing errors, `next(err)` for middleware
- Tests: Vitest + `vi.mock()` for Prisma/Supabase, Supertest for route integration tests
- `__tests__/` folder colocated with source (`services/`, `routes/`, `middleware/`)

---

## Known Constraints & Considerations

- Personal learning project — understanding over speed
- Supabase provides managed PostgreSQL (no infra setup needed)
- Custom wheel built with D3.js (no third-party wheel libraries)
- Real-time features deferred (no live RSVP or meeting chat — use Zoom)
- GDPR: TLS + Supabase at-rest encryption in place. Erasure/export endpoints deferred to Slice 9. Schema cascade deletes already support erasure.

---

## Multi-Site / Shared Login

- Single Supabase project for all future related sites
- User model is lean (profile data only) — universal across apps
- When a second site is ready: add redirect URLs in Supabase dashboard, no schema changes needed