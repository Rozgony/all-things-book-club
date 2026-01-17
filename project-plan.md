
---

## Implementation Sequence

1. **Sprint 1**: Database schema + user auth
2. **Sprint 2**: Chapters & invitations
3. **Sprint 3**: Themes management
4. **Sprint 4**: Meetings & topics
5. **Sprint 5**: Custom wheel (D3.js)
6. **Sprint 6**: Force-directed graph (TBD library)
7. **Sprint 7**: Polish, testing, refinement

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

## Outstanding Decisions (To Be Clarified)

### Wheel Rendering
- [ ] Use Canvas or SVG for wheel?
- [ ] Show selected person's name/avatar in center when spinning?
- [ ] Persist spin history/order per meeting?

### Invitations & Users
- [ ] Can you only invite existing users, or allow signup via invitation email?
- [ ] Where do users see pending invitations they've received?
- [ ] Who can invite: any chapter member or just creators/admins?

### Data Visibility
- [ ] When viewing past meeting topics, show: title + themes only, OR also who suggested it + discussion notes?

### Graph Visualization (Phase 6)
- [ ] Should graph show users as nodes, or focus on topics/themes/meetings?
- [ ] Specific D3.js structure/layout preferences?

---

## Known Constraints & Considerations

- Personal learning project—focus on understanding backend over speed
- Supabase provides managed PostgreSQL, so no infrastructure setup needed
- Custom wheel takes precedence over standard libraries (build with D3.js for consistency)
- Real-time features deferred (no live RSVP updates or meeting chat—use Zoom for that)
- Graph visualization deferred to Phase 6; library choice TBD
- User can invite by email, but invitation acceptance flow details TBD