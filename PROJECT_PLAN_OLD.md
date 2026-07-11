# All Things Book Club - Project Plan

Website for hosting the "All Things Book Club" monthly online meetings.

---

## Project Overview

- **Project Name:** all-things-book-club
- **Purpose:** Website for hosting monthly online book club meetings
- **Project Type:** Personal learning project
- **Learning Focus:** Backend development (PostgreSQL, Node.js/backend framework, database design, APIs)

---

## Key Decisions (Resolved)

### Wheel Specifications
- **Spin order**: Random (not sequential)
- **Display**: No person name/avatar shown in center when spinning
- **Persistence**: The only thing to store is what has been selected so far in a meeting. So if the page is re-freshed mid-meeting or another user in the group looks at the spinner on their own, they will see the same progress.
- **Behavior**: Once a topic is selected, it will appear in a modal on the screen.  The user can then skip it or remove it once it is discussed. 
- **Rendering**: Canvas or SVG (TBD based on D3.js capabilities)

### Invitations & Membership
- **Invite scope**: Any chapter member can invite anyone by email
- **New users**: Can invite by email even if they don't have an account yet (they get signup link)
- **Chapters view**: Users see active chapters + pending invitations in one place
- **Invitation flow**: Email search → send invite → pending → accept/reject → member

### Data Visibility: Past Meeting Topics
- Show: **title, themes, who suggested it, and notes** (comprehensive view)

### Force-Directed Graph (Phase 6)
- **No user nodes**—graph only shows relationships between:
  - Topics (as nodes)
  - Themes (as nodes)
  - Meetings (as nodes)
  - Connections: topics to themes, topics to meetings, etc.
- Simpler graph focused on discussion content, not people

---

## Implementation Sequence

1. **Phase 1**: Database schema + user auth ✅
   - Schema migrated to Supabase
   - Express + TypeScript backend scaffolded
   - Supabase Auth JWT validation middleware
   - User auto-create on first login
   - User profile endpoints (GET/PATCH /api/users/me)
   - Auth verify endpoint for testing (POST /api/auth/verify)
2. **Phase 1.5**: Tests ✅
   - Vitest + Supertest configured
   - Auth middleware tests (valid/invalid tokens, user creation)
   - Auth route tests (verify endpoint)
   - User service tests (get/update user)
   - User route tests (profile get/update)
3. **Phase 2**: Chapters & invitations
4. **Phase 3**: Themes management
5. **Phase 4**: Meetings & topics
6. **Phase 5**: Custom wheel (D3.js)
7. **Phase 6**: Force-directed graph (library TBD)
8. **Phase 7**: Polish, testing, refinement, GDPR compliance endpoints

---

## Current Status

**Phase 1 & 1.5 Complete** ✅
- Database schema designed and migrated
- Express + TypeScript backend fully scaffolded
- Auth flow wired (Supabase JWT validation, user auto-create)
- User profile API endpoints functional
- Comprehensive test suite for auth and user operations
- Monorepo structure in place (`backend/`, `frontend/`, `prisma/` shared)
- Node 24 pinned via `.nvmrc`

**Ready for Phase 2**: Chapters and invitations backend

---

## Backend Tech Stack

- **Runtime**: Node.js 24 (pinned via `.nvmrc`)
- **Framework**: Express 5.2.1
- **Language**: TypeScript
- **ORM**: Prisma 5.9.0
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth (JWT-based)
- **Testing**: Vitest + Supertest
- **Dev Tools**: tsx (TypeScript execution)

---

## Code Style & Conventions

### Naming Conventions
- (To be defined as patterns emerge)

### File Organization
- (To be defined)

### Folder Structure
- (To be defined)

---

## Testing Framework & Approach

- **Testing Framework**: Vitest (unit tests), React Testing Library (component tests)
- **API Tests**: Supertest or similar
- **Test Location**: `__tests__` folder colocated with source
- **Coverage Goals**: Comprehensive coverage for critical paths and business logic

---

## Development Workflow

- **Branch Strategy**: (To be defined)
- **Commit Message Style**: (To be defined)
- **Code Review Process**: (To be defined)

---

## Project-Specific Patterns

(To be documented as patterns emerge during development)

---

### Multi-Site / Shared Login
- **Approach**: Single Supabase project for all future related sites
- User model is kept lean (profile data only) so it's universal across apps
- When a second site is ready: configure additional redirect URLs in Supabase dashboard — no schema changes needed

---

## Known Constraints & Considerations

- Personal learning project—focus on understanding backend over speed
- Supabase provides managed PostgreSQL, so no infrastructure setup needed
- Custom wheel takes precedence over standard libraries (build with D3.js for consistency)
- Real-time features deferred (no live RSVP updates or meeting chat—use Zoom for that)
- Graph visualization deferred to Phase 6; library choice TBD
- User can invite by email; invitation acceptance flow implemented
- GDPR: TLS + Supabase at-rest encryption satisfies security requirement. `DELETE /api/users/me` (right to erasure) and `GET /api/users/me/export` (data portability) deferred to Phase 7 — schema cascade deletes already support erasure. Sign Supabase DPA in dashboard before launch.

---

## Next Steps

**Phase 2 — Chapters & Invitations**
1. Chapter creation and membership management endpoints
2. Chapter invitation workflow (email-based, expiring)
3. Tests for chapter and invitation flows
4. Explore and refine chapter query patterns (which chapters does a user belong to, pending invitations, etc.)
