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
- **Runtime**: Go
- **Framework**: chi (HTTP router)
- **Language**: Go
- **Database**: PostgreSQL (via Supabase), raw SQL with pgx/v5
- **Auth**: Supabase Auth (JWT-based)
- **Migrations**: Plain `.sql` files in `backend-go/migrations/`, synced to `supabase/migrations/`

### Frontend
- **Framework**: React
- **Language**: TypeScript
- **Build Tool**: Vite
- **Hosting**: Vercel
- **E2EE**: Web Crypto API (AES-256-GCM) — all sensitive content encrypted client-side before sending to the server

### Infrastructure
- **Backend Hosting**: Railway
- **Database**: Supabase (managed PostgreSQL)
- **Auth**: Supabase Auth

---

## Code Style & Conventions

### Backend (Go)
- Services: methods on a struct with `*pgxpool.Pool`, named `<Resource>Service`
- Routes: `handle<Action>` handlers in `internal/routes/`, decode JSON body → call service → encode response
- Error handling: `handleError(w, err)` with typed errors from `internal/routes/errors.go`
- Migrations: plain `.sql` files in `backend-go/migrations/` — copy to `supabase/migrations/` via `migrate-dev`/`migrate-prod` scripts

### Frontend (TypeScript/React)
- API layer in `src/api/` — one file per resource, async functions returning typed models
- E2EE: encrypt before sending, decrypt after receiving; server never sees plaintext sensitive data
- Encrypted fields use `encryptedBlob` (base64) + `nonce` (base64); decrypted fields populated client-side
- Chapter key stored in memory via `src/lib/keyStore.ts`; derived from user password via PBKDF2

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

---

## Workspace Structure
- `backend-go/` — Go backend (chi router, pgx, services/routes/middleware layers)
- `frontend/` — React + TypeScript + Vite frontend
- `supabase/migrations/` — canonical SQL migrations (synced from `backend-go/migrations/`)
- No `backend/` directory — the old Node.js/Express backend has been removed