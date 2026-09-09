# Go Study Guide

A self-study map of the Go concepts behind `backend-go/`, in roughly the order they build on each other. Some of these aren't used in this codebase yet — those are flagged as gaps worth learning anyway, with a note on where they'd apply if added. Questions only; look at the code and work out the answers yourself.

---

## 1. Packages, Modules & the `internal/` Convention

**Where:** `backend-go/go.mod`; the `internal/` directory itself; every file's `package` declaration

- What does Go's compiler *enforce* about a package named `internal/`, versus it just being a naming convention? What can and can't import `internal/crypto` from outside this module?
- `main.go` imports `github.com/all-things-book-club/internal/services`. Where does that module path (`github.com/all-things-book-club/...`) actually come from, given this isn't a real published module?

---

## 2. Structs, Fields & JSON Tags

**Where:** every `type X struct { ... }` in `internal/services/*.go`, e.g. `User`, `Chapter`, `ChapterMember`

- Compare `EncryptedBlob []byte` (exported) to a hypothetical lowercase `encryptedBlob []byte`. What single rule in Go decides whether `encoding/json` can see a field at all?
- The JSON tag (`` `json:"encryptedBlob"` ``) controls the *wire* name. What's the actual Go field name allowed to be, and why might they differ (see `UserId` vs `userId` in `ChapterMember`)?
- What does `json:"publicKey,omitempty"`-style tagging do differently from a plain tag — and does this codebase use `omitempty` anywhere? Should it, for fields like `EphemeralPublicKey` that are often `nil`?

---

## 3. Pointers vs. Values

**Where:** `*pgxpool.Pool` fields on every `*Service` struct; `func (s *ChapterService) Create(...) (*Chapter, *ChapterMember, error)`

- Every service method has a pointer receiver (`func (s *ChapterService) ...`), never a value receiver (`func (s ChapterService) ...`). What would break (or just become wasteful) if these were value receivers instead?
- Why do constructors like `NewChapterService` return `*ChapterService` instead of `ChapterService`?
- `GetByID` returns `(*Chapter, error)` — a pointer, not a value. What does a `nil` `*Chapter` combined with a `nil` error mean vs. a `nil` `*Chapter` with a non-nil error? Which one should never happen, and why?

---

## 4. Error Handling: Wrapping & Sentinel Errors

**Where:** `fmt.Errorf("...: %w", err)` throughout `internal/services/*.go`; `ErrInviteExpired`/`ErrInviteNotPending`/`ErrInviteEmailMismatch` in `invites.go`; `internal/routes/errors.go`

- What does the `%w` verb do differently from `%v` when building an error string? What new capability does it unlock for the *caller* of a function?
- `invites.go` defines package-level sentinel errors (`var ErrInviteExpired = errors.New(...)`). How does `routes/invites.go` distinguish which specific sentinel error came back, and what standard-library function makes that comparison work correctly even through layers of `%w` wrapping?
- Why is a sentinel error (`ErrInviteExpired`) a better design here than just checking `err.Error() == "invite expired"`?

---

## 5. `context.Context`

**Where:** every service method's first parameter; `middleware/auth.go`'s `context.WithValue` calls; `UserIDFromContext`/`UserEmailFromContext`

- `context.Context` is threaded through *every* function in this codebase, all the way from the HTTP handler down to the SQL query. What is it actually used for here — is it for cancellation, for carrying request-scoped values, or both? Find an example of each use in this codebase.
- `middleware/auth.go` stores the user ID with `context.WithValue(r.Context(), UserIDKey, claims.Subject)`. Why is `UserIDKey` a custom typed constant (`type contextKey string`) instead of a plain string like `"userID"`? What bug does that prevent?
- What happens to an in-flight database query if the HTTP client disconnects mid-request — does `ctx` help here, and how would you find out?

---

## 6. `defer`, `panic`, and `recover`

**Where:** `defer rows.Close()` / `defer tx.Rollback(ctx)` throughout the services layer; `defer pool.Close()` in `main.go`

- `defer tx.Rollback(ctx)` appears immediately after `tx.Begin(ctx)`, before any error could even occur — and the comment says "no-op if tx.Commit() is called below." Why is it safe (and idiomatic) to unconditionally defer a rollback like this?
- This codebase has **no `panic`/`recover` anywhere**. If a service method panics (e.g. a nil-pointer dereference on a bad input), what happens to that one HTTP request — and does it take down the whole server or just that request? (Research `net/http`'s default behavior here.)
- Would adding a `recover()`-based middleware change that answer? Where would you put it in the middleware chain?

---

## 7. Goroutines & Channels (Concurrency)

**Where:** *not used explicitly anywhere in this codebase yet* — but every incoming HTTP request is already handled on its own goroutine by `net/http` under the hood.

- `main.go` never writes `go func() { ... }()`. Given that, how is this server already handling multiple simultaneous requests concurrently? What spins up the goroutine you never see?
- Look at `internal/routes/invites.go`'s `Create` handler: it calls `h.mailer.SendInviteEmail(...)` synchronously, so the HTTP response doesn't return to the client until the SMTP send finishes. If you moved that call into a `go func() { ... }()` to make the response return instantly, what specific problem would you now have around **error handling** — if the email send fails five seconds after the response was already sent, who finds out?
- A goroutine launched with `go func() {...}()` and no `sync.WaitGroup` or channel to wait on it is sometimes called "fire and forget." What happens to that goroutine if the process exits (e.g. the server shuts down) before it finishes?
- If two goroutines wrote to the exact same in-memory Go map (not a database, just a plain `map[string]int` at the package level) at the same time with no synchronization, what would happen? Try running `go run` with `-race` on a small example to see it directly.
- What's the difference between a **channel** and a **`sync.WaitGroup`** — when would you reach for one over the other? (Hint: one is for *waiting until N things finish*, the other is for *passing values/signals between goroutines*.)

---

## 8. The `sync` Package

**Where:** *not used in this codebase* — `pgxpool.Pool` itself is safe for concurrent use internally, which is part of why you haven't needed `sync` yourself yet.

- Why does `pgxpool.Pool` not need you to wrap it in a `sync.Mutex` yourself, even though many goroutines (one per request) call methods on the same shared `*pgxpool.Pool` at once?
- If you introduced a package-level in-memory cache (e.g. a `map[string]*Chapter]` to avoid re-querying the DB), what would you need to add to make it safe under concurrent requests?

---

## 9. Interfaces & Implicit Satisfaction

**Where:** *not used anywhere in this codebase* — every dependency (`*ChapterService`, `*pgxpool.Pool`, `*mailer.Mailer`) is a concrete pointer type, not an interface.

- Go interfaces are satisfied *implicitly* — a type never declares "I implement `Mailer`." What has to be true about a type's method set for it to satisfy an interface?
- If you wanted to unit-test `routes/invites.go`'s `Create` handler *without* actually sending an email over SMTP, what interface could you extract from `mailer.Mailer` (even just one method, `SendInviteEmail`) to make a fake/mock swappable in for tests?
- Why might a codebase this size have deliberately *avoided* interfaces so far? What's the trade-off between "define an interface for everything up front" and "add one only when you actually need a second implementation"?

---

## 10. Database Access with `pgx`

**Where:** `internal/db/db.go`; every `s.db.Query`/`QueryRow`/`Exec` call; `tx.Begin(ctx)` blocks in `chapters.go`/`invites.go`/`themes.go`

- Every SQL query in this codebase uses `$1`, `$2`, ... placeholders with separate arguments, never string concatenation/`fmt.Sprintf` to build a query. What specific attack does this prevent, and what would a vulnerable version of, say, `GetByEmail` look like?
- What's the difference between `pool.Query` and `pool.QueryRow` — when do you use one over the other, and what happens if `QueryRow`'s query matches zero rows vs. more than one?
- `rows.Next()` / `rows.Scan(...)` / `defer rows.Close()` is a recurring three-part pattern. What actually leaks (and how would you notice it in production) if you forgot the `defer rows.Close()`?
- What is `pgxpool.Pool` a pool *of*, specifically? What would happen to request latency if the pool's max size were set to 1?

---

## 11. HTTP Handlers, Middleware & Routing (`chi`)

**Where:** `main.go`'s router setup; `internal/middleware/auth.go`; every `func (h *XHandler) Y(w http.ResponseWriter, r *http.Request)`

- Every handler has the exact same signature: `(w http.ResponseWriter, r *http.Request)`. What standard-library type is this signature satisfying, and why does that let `chi` treat every handler the same way regardless of which resource it belongs to?
- `middleware/auth.go` wraps the *next* handler in the chain. What does a `chi` middleware function's signature look like, and how does it decide whether to call the next handler at all versus short-circuiting with an error response?
- Why does the public route group (`GET /api/invites/{token}`) have to be registered *outside* the group that applies `requireAuth`, rather than just being excluded some other way?

---

## 12. Testing in Go

**Where:** *no `_test.go` files exist in this codebase yet* — this is a real gap.

- What does Go's tooling require of a file's name and a function's signature for `go test` to pick it up automatically?
- Table-driven tests are the idiomatic Go pattern for testing something like `db.SharesAnyChapter` against many input combinations in one function. What does that pattern look like, structurally?
- Given `internal/services/invites.go`'s `Accept` method touches a real Postgres transaction, what would you need (a test database? an interface to mock the pool?) to unit-test it without hitting a real database?

---

## Suggested Study Order

1. Sections 1–3 (packages, structs, pointers) — read any one service file (e.g. `chapters.go`) top to bottom with these in mind.
2. Sections 4–6 (errors, context, defer/panic) — re-read the same file, this time tracing every `ctx`, every `defer`, every returned `error`.
3. Sections 7–8 (concurrency) — the biggest gap between "what this codebase does" and "what Go is capable of." Write a small throwaway program with `go func()` and channels before touching this codebase again.
4. Section 9 (interfaces) — try extracting one interface from `mailer.Mailer` yourself as an exercise, even if you don't keep the change.
5. Sections 10–11 (DB + HTTP) — read `main.go` end to end; it's the one file that ties routing, middleware, and every service together.
6. Section 12 (testing) — pick the simplest pure function in the codebase (e.g. something in `internal/crypto`) and write its first test.

**Self-check exercise:** pick any one HTTP endpoint (e.g. `POST /api/invites/{token}/accept`) and trace it from `main.go`'s route registration, through the middleware chain, into the handler, into the service, into the SQL, and back — narrating out loud what type each value is at each step and where `ctx` came from.
