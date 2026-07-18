# Database Migrations Guide

This guide explains how to manage schema changes and deploy them to production.

## Overview

Prisma migrations track changes to your database schema. Each migration is a versioned SQL file that can be replayed on any database to bring it to a specific state.

## Workflow

### 1. Update Your Schema

Edit `schema.prisma` with your changes:

```prisma
model Chapter {
  // ... existing fields
  visibility String[]  // Example: new field
}
```

### 2. Create a Migration (Development)

From the root directory OR `backend/` directory:

```bash
# From root:
npx prisma migrate dev --name describe_your_changes

# OR from backend/:
cd backend && npx prisma migrate dev --name describe_your_changes
```

**What this does:**
- Detects differences between your schema and database
- Creates a new migration file in `prisma/migrations/`
- Applies the migration to your local database
- Updates `prisma/schema.prisma` type definitions

**Example:**
```bash
npx prisma migrate dev --name add_chapter_visibility
```

This creates: `prisma/migrations/20260715123456_add_chapter_visibility/`

### 3. Deploy to Production

In your production environment (from root directory), run:

```bash
npx prisma migrate deploy
```

**What this does:**
- Reads the `_prisma_migrations` table in production
- Applies only migrations that haven't been run yet
- Safe to run repeatedly (idempotent)

**Important:** Always test migrations in a staging environment first.

## Common Commands

Run these from the **root directory** (`all-things-book-club/`):

| Command | Use Case |
|---------|----------|
| `npx prisma migrate dev --name <name>` | Create and apply a migration locally |
| `npx prisma migrate deploy` | Apply pending migrations to production |
| `npx prisma migrate status` | Check which migrations are pending |
| `npx prisma migrate resolve --rolled-back <name>` | Mark a migration as rolled back |
| `npx prisma db push` | Quick sync for development (no migration files) |
| `npx prisma generate` | Regenerate Prisma client types (from backend/) |

## Best Practices

1. **Always create migrations before deploying**
   - Don't use `db push` in production
   - Migrations are version-controlled and repeatable

2. **Use descriptive migration names**
   ```bash
   ✓ add_chapter_visibility
   ✓ create_chapter_invitations_table
   ✗ update
   ```

3. **Test in staging first**
   - Run migrations on a staging database before production
   - Verify application works with new schema

4. **Keep migrations small and focused**
   - One feature per migration
   - Easier to debug if something goes wrong

5. **Environment Variables**
   - Ensure `DATABASE_URL` is set correctly before deploying
   - For Supabase: `postgresql://user:password@host/database?schema=public`
 (run from root directory)
```bash
# Check the status
npx prisma migrate status

# Manually mark as resolved
npx prisma migrate resolve --rolled-back <migration_name>
```

**Need to undo a migration?** (run from root directory)
```bash
# Create a new migration that reverts changes
npx prisma migrate dev --name revert_previous_change
```

**Schema out of sync?** (run from root directory)
```bash
# Reset everything (LOCAL ONLY - will delete data)
npx prisma migrate reset
```

**Prisma types not updating?** (run from backend directory)
```bash
cd backend && rm -rf node_modules/.prisma && npx prisma generate
```bash
# Reset everything (LOCAL ONLY - will delete data)
npx prisma migrate reset
```

## For Supabase Users

When deploying to Supabase:

1. Ensure `DATABASE_URL` points to your Supabase database
2. Apply migrations: `npx prisma migrate deploy`
3. Verify in Supabase dashboard: Database → Schema

The `_prisma_migrations` table tracks applied migrations automatically.


### Do Not Do
`db pull` unless you need to sync from the database
`db push` because that would overwrite the database