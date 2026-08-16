# Public Data Model

Future additive layer — no changes to the private schema.

## Public Layer

```sql
-- Global discovery table. Server can read/index/search this freely.
-- chapter_id is NULL for anonymous contributions, set for opted-in public chapters.
public_topics (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  themes            TEXT[],                   -- plaintext theme names
  discussion_count  INT DEFAULT 1,
  chapter_id        TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title)                               -- deduplicate; write is upsert + increment
)
```

**Dual-write rule** (enforced in Go service layer, not DB):
- Topic added to a `public` chapter → upsert `public_topics` with `chapter_id` set
- Topic added to a `private` chapter → optionally upsert `public_topics` with `chapter_id = NULL`
- Chapter toggles public → private → nullify `chapter_id` on all `public_topics` rows

**Ghost Mode interaction:** when Ghost Mode activates (item 7), existing `public_topics` rows with this chapter's `chapter_id` must also be nullified or deleted before the chapter auto-deletes.