# All Things Book Club - Updated Project Plan

## Summary of Clarifications

### Wheel Specifications
- **Spin order**: Random (not sequential)
- **Display**: No person name/avatar shown in center when spinning
- **Persistence**: Store spin results and order per meeting

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

## Updated Key Decisions

1. **Custom Wheel**: D3.js-based, random spin order, visual-only (no center display)
2. **Invitations**: Email-based, any chapter member can invite, works with existing/new users
3. **Chapters Dashboard**: Single view showing active + pending invitations
4. **Graph**: Content-focused (topics/themes/meetings), no users visible
5. **Topic History**: Comprehensive view including creator and notes

---

## Next Steps

Ready to proceed with implementation? I can:
1. Create the database schema with Prisma
2. Set up the Express backend with Supabase
3. Begin Phase 1 (Auth + User Profiles)
4. Build out Chapters/Invitations (Phase 2)

What would you like to start with?
