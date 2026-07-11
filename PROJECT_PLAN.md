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

## Implementation Sequence

### Slice 0 — Foundation ✅
- Database schema designed and migrated (Supabase/PostgreSQL)
- Express + TypeScript backend scaffolded
- Supabase Auth JWT validation middleware
- Monorepo structure (`backend/`, `frontend/`, `prisma/` shared)
- Node 24 pinned via `.nvmrc`

### Slice 1 — User Profile ✅
**"A user can log in and see their profile"**
- API: `GET /api/users/me`, `PATCH /api/users/me`, `POST /api/auth/verify`
- Frontend: Login page → redirect to Profile page (display + edit name, avatar, timezone)
- Tests: Auth middleware, user service, user routes

### Slice 2 — Chapters (in progress)
**"A user can create a chapter and see it on a Chapters page"**
- API: `POST /api/chapters`, `GET /api/chapters`, `GET /api/chapters/:id`, `PATCH /api/chapters/:id`, `DELETE /api/chapters/:id`
- Frontend: Chapters list page, Chapter detail page, Create chapter form
- Tests: Chapter service, chapter routes

### Slice 3 — Invitations
**"A member can invite someone by email; invitee can accept or reject"**
- API: `POST /api/chapters/:id/invitations`, `GET /api/invitations`, `POST /api/invitations/:id/accept`, `POST /api/invitations/:id/reject`
- Frontend: Invite form on Chapter detail page, Pending invitations banner on Chapters list
- Tests: Invitation routes

### Slice 4 — Member Management
**"An admin can add and remove chapter members"**
- API: `POST /api/chapters/:id/members`, `DELETE /api/chapters/:id/members/:userId`
- Frontend: Member list on Chapter detail page, Add/remove controls (admin only)
- Tests: Member management routes

### Slice 5 — Themes
**"An admin can manage the chapter's theme taxonomy"**
- API: `POST/GET/PATCH/DELETE /api/chapters/:id/themes`
- Frontend: Themes management section on Chapter settings page
- Tests: Theme service + routes

### Slice 6 — Meetings & Topics
**"A chapter can schedule a meeting and add discussion topics"**
- API: `POST/GET /api/chapters/:id/meetings`, `POST/GET /api/meetings/:id/topics`
- Frontend: Meeting list on Chapter page, Meeting detail page with topic list
- Tests: Meeting + topic service and routes

### Slice 7 — Spin Wheel
**"During a meeting, members can spin a wheel to randomly select a topic"**
- API: `GET/PATCH /api/meetings/:id/spin-state`
- Frontend: D3.js canvas/SVG wheel on Meeting page, persisted spin state shared across users
- Tests: Spin state route

### Slice 8 — Force-Directed Graph
**"A chapter can visualize connections between topics, themes, and meetings"**
- API: `GET /api/chapters/:id/graph` (returns nodes + edges)
- Frontend: D3.js force-directed graph on Chapter page (no user nodes)
- Tests: Graph query service

### Slice 9 — Polish & Compliance
- GDPR: `DELETE /api/users/me` (right to erasure), `GET /api/users/me/export` (data portability)
- Sign Supabase DPA in dashboard before launch
- Accessibility audit, error states, loading states
- Final end-to-end tests

---

## Current Status

**Slices 0 & 1 Complete** ✅

**Slice 2 In Progress** 🔄
- `backend/src/services/chapters.service.ts` — complete
- `backend/src/routes/chapters.ts` — POST, GET /, GET /:id complete; remaining routes TODO
- `backend/src/__tests__/routes/chapters.test.ts` — POST and GET tests complete
- `backend/src/__tests__/services/chapters.test.ts` — scaffolded, service tests TODO
- Frontend: not started

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
- TBD — to be decided at Slice 1 frontend work

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