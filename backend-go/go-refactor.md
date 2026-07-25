### Refactoring Steps
**Set-up** 
- ✅ Go module + project structure (backend-go)
- ✅ Config / env loading (`internal/config`)
- ✅ Database connection pool (`internal/db`)
- ✅ JWT auth middleware (`internal/middleware`)
- ✅ Chi router wired in main.go

**Encryption** 
- ✅ Crypto helpers: AES-256-GCM encrypt/decrypt (`internal/crypto/aes.go`)
- ✅ Crypto helpers: Argon2id key derivation (`internal/crypto/argon2.go`)
- ✅ Crypto helpers: `GenerateID`, `RandomBytes` (`internal/crypto/random.go`)

**Meetings** (service + handler + routes)
- ✅ `GET /api/chapters` — list user's chapters
- ✅ `POST /api/chapters` — create chapter (E2EE)
- ✅ `GET /api/chapters/{id}` — get single chapter
- ✅ `PATCH /api/chapters/{id}` — update chapter
- ✅ `DELETE /api/chapters/{id}` — delete chapter

**ChapterMembers** (service + handler + routes)
- ✅ `POST /api/members`

**Meetings** (service + handler + routes)
- ✅ `POST /api/meetings`
- ✅ `GET /api/meetings/chapter/{id}`
- ✅ `GET /api/meetings/{id}`
- ✅ `PATCH /api/meetings/{id}`
- ✅ `DELETE /api/meetings/{id}`

**Topics** (service + handler + routes)
- ✅ `POST /api/topics`
- ✅ `PATCH /api/topics/{id}`
- ✅ `DELETE /api/topics/{id}`

**Themes** (service + handler + routes)
- ✅ `Get /api/chapters/{id}/themes`
- ✅ `POST /api/chapters/{id}/themes`
- ✅ `POST /api/topics/{id}/themes`
- ✅ `DELETE /api/topics/{id}/themes/{themeId}`

**Users** (service + handler + routes)
- ✅ `GET /api/users/me`
- ✅ `PATCH /api/users/me`
- ✅ `DELETE /api/users/me`

**Auth**
- ⬜ `POST /api/auth/verify`

**Database**
- ⬜ Write SQL migrations for the new E2EE schema (chapters, chapter_members, meetings, topics, etc.)
- ⬜ Run migrations against Supabase

**Cleanup**
- ⬜ Error handler middleware (map `pgx.ErrNoRows` → 404, etc.)
- ⬜ Rename `CreateChapterInput` → `UpdateChapterInput` for PATCH handler
- ⬜ Add .env file for local development

**Learning** 
- ✅ Where and when does the encryption happens

**Deploy**
- ⬜ Set up Railway to run the Go app and deploy it
- ⬜ Delete the Express app code