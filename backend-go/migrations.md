# Database Migrations

Migration files live in `backend-go/migrations/` and must also be copied to `supabase/migrations/` to be picked up by the Supabase CLI.

## Local

Requires Docker and the Supabase CLI (`brew install supabase/tap/supabase`).

### Using npm scripts (recommended)

```bash
# Apply all migrations (wipes and recreates local DB)
# This also copies all migrations from backend-go/migrations/ to supabase/migrations/
npm run migrate-dev
```

### Manual CLI commands

```bash
# Start local Supabase (first time or after Docker restart)
supabase start

# Apply all migrations (wipes and recreates local DB)
supabase db reset
```

The local connection string is printed by `supabase start`. Put it in `backend-go/.env` as `DATABASE_URL`.

## Adding a new migration

1. Create a new file in `backend-go/migrations/` — name it sequentially: `002_add_invitations.sql`
2. Copy it to `supabase/migrations/`
3. Run `supabase db reset` to apply locally

## Production (Supabase)

Never run migrations directly against production. Use the Supabase dashboard or the linked CLI.

### Using npm scripts (recommended)

```bash
# Push migrations to production
# This also copies all migrations from backend-go/migrations/ to supabase/migrations/
npm run migrate-prod
```

### Manual CLI commands

```bash
# Link CLI to your production project (one-time setup)
supabase link --project-ref <your-project-ref>

# Push migrations to production
supabase db push
```

`db push` runs only migrations that haven't been applied yet — it will not wipe data.
