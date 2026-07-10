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
- **Persistence**: Store spin results and order per meeting
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

1. **Phase 1**: Database schema + user auth
2. **Phase 2**: Chapters & invitations
3. **Phase 3**: Themes management
4. **Phase 4**: Meetings & topics
5. **Phase 5**: Custom wheel (D3.js)
6. **Phase 6**: Force-directed graph (library TBD)
7. **Phase 7**: Polish, testing, refinement

---

## Current Status

- Schema designed
- Project setup started
- Ready to begin Phase 1 implementation

---

## Technology Stack

### Frontend
- Framework: React
- Language: TypeScript
- Build Tool: (To be determined)

### Backend
- Runtime/Framework: (To be determined - Node.js, Supabase Functions, or other)
- Language: TypeScript
- Database: PostgreSQL (via Supabase)
- Authentication: (To be determined)

### Infrastructure
- Hosting: Supabase (handles Postgres, Auth, Realtime, Storage)

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

## Known Constraints & Considerations

- Personal learning project—focus on understanding backend over speed
- Supabase provides managed PostgreSQL, so no infrastructure setup needed
- Custom wheel takes precedence over standard libraries (build with D3.js for consistency)
- Real-time features deferred (no live RSVP updates or meeting chat—use Zoom for that)
- Graph visualization deferred to Phase 6; library choice TBD
- User can invite by email; invitation acceptance flow implemented

---

## Next Steps

Ready to proceed with implementation:
1. Create the database schema with Prisma
2. Set up the Express backend with Supabase
3. Begin Phase 1 (Auth + User Profiles)
4. Build out Chapters/Invitations (Phase 2)
