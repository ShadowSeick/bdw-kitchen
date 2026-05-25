# LoroDoc strategy: granularity, sync, projection

## Decisions

### 1. Document granularity: per-recipe, not one big blob
- One LoroDoc per recipe (not a single mega-doc containing all recipes).
- Reasons:
  - SQLite reads/writes the whole BLOB column per access — many small rows are cheaper than one giant row.
  - Splitting a single LoroDoc later is a painful migration (loses op-history continuity, breaks unsynced peers). Decide upfront.
  - CRDT op history grows monotonically per doc; per-recipe lets us snapshot/GC each one independently.
  - P2P sync bandwidth scales with changed doc size — per-recipe = ship only the changed recipe's delta.
  - Smaller blast radius if a single doc gets corrupted.

### 2. Always-loaded coordination docs
Two LoroDocs are always loaded and always synced:

- **`manifest_history` (kind = `'recipe'`)** — index of all recipes
  - `LoroMap<recipeId, { title: string, rev: LoroCounter, status: int }>`
  - Solves discovery: how device B knows recipe X exists without loading it.
  - Provides title and status for list views without fetching the full recipe doc.
  - `title` is a plain string (LWW at field level). LoroText is deferred until concurrent character-level edits become a real concern.
  - `status` is a small int (`0 = active`, `1 = archived`) — soft-delete state must live in the CRDT so archive/restore events sync across peers. App layer resolves to enum.
- **`calendar_history`** — schedule
  - `LoroMap<dateISO, LoroMap<mealName, recipeId[]>>`
  - Already implemented.
  - Titles for rendering come from `manifest_history` (JOIN via `recipe.title`).

### 3. Per-recipe docs
- **`recipe_history(id)`** — body of one recipe (description for now; ingredients, steps, notes later).
  - Lazy-loaded for display; **eager-synced on manifest signal** (Policy A — see §5).
  - One LoroDoc instance per recipe.
  - Storage row exists from the moment the manifest mentions the recipe; `blob` is `NULL` until the doc is actually pulled.

### 4. Single source of truth per field
- `title` and `status` live **only** in `manifest_history`. The recipe doc has no `title` or `status` field.
- Body (description, future: ingredients, steps, notes) lives **only** in `recipe_history`.
- Avoids denormalization drift across two separate CRDTs that can't be updated atomically.

### 5. Sync policy: Policy A (eager) for now
| Scenario | Action |
|---|---|
| Manifest gains new `recipeId` | Insert `recipe` + `recipe_history (blob=NULL)` rows; pull full recipe doc immediately |
| Manifest's `rev` for existing recipe advances | Pull delta immediately |
| Loaded recipe gets remote edit | Live subscription applies delta |
| Peer pushes delta for unloaded recipe doc | **Accept and apply** to stored blob; update SQLite projection |

Hybrid (lazy for bulk-imported recipes, eager for hand-created) is a later optimization once social-import scale is real.

### 6. Change detection: `rev` as `LoroCounter`, not wall-clock `updated_at`
- Each recipe's manifest entry has a `LoroCounter rev` incremented on every commit to that recipe's body.
- Compare `manifest_rev` (from synced manifest) vs `local_rev` (last applied locally). Both live as columns on the `recipe` projection row (`recipe.manifest_rev`, `recipe.local_rev`). Divergence → trigger sync of that recipe doc.
- Storing both on the projection makes "what needs syncing?" a single queryable predicate (`WHERE manifest_rev > local_rev`), which enables batched/background reconciliation later.
- Avoids cross-device clock skew that wall-clock `updated_at` would introduce.
- Loro's own sync protocol handles VV exchange and delta computation once a sync is initiated. The manifest's job is signaling/discovery only — do **not** embed Loro VVs in the manifest.

### 7. Write-through layer
LoroDoc is the conflict-reconciliation layer. SQLite is the queryable view. Every Loro state change must project into SQLite.

- For each **loaded** LoroDoc, subscribe to its update event; in the callback, UPSERT the projected fields into the corresponding SQLite row (via Drizzle).
- `manifest_history` is always loaded → its subscription is always active → `recipe.title`, `recipe.status`, and `recipe.manifest_rev` are always fresh.
- When a delta arrives for an unloaded recipe doc, load the doc transiently, apply, project to SQLite (`recipe.description`, bump `recipe.local_rev`), persist new blob.

Two arrows trigger write-through:
1. **Local edit**: UI → mutate LoroDoc → subscription fires → SQLite UPDATE.
2. **Remote sync**: peer delta → apply to LoroDoc → subscription fires → SQLite UPDATE.

### 8. Naming convention: `{entity}` (projection) + `{entity}_history` (CRDT)
- The SQLite table the UI queries is the canonical entity name (`calendar`, `recipe`).
- The blob table holding Loro's op history is `{entity}_history`.
- Rationale: the projection is the user-facing thing; the history is an engine-specific backing store. If we ever swap CRDT engines (op-based vs doc-based, different library), the `_history` suffix names the concern without leaking the library name into the schema.
- FK direction: projection references history (`recipe.id → recipe_history.id`, `ON DELETE CASCADE`). History is source of truth; the projection is derived. Insert order on creation: history first, projection second.

## Schema

### LoroDocs
```
manifest_history(kind='recipe')   LoroMap<recipeId, { title: string, rev: LoroCounter, status: int }>
calendar_history                  LoroMap<dateISO, LoroMap<mealName, recipeId[]>>
recipe_history(id)                LoroMap<{ description: string }>
```

### SQLite tables (see `src/infra/db/schema.ts` for source-of-truth)
```
-- Histories (CRDT blobs)
calendar_history  (id text PK, blob blob NOT NULL)
manifest_history  (id text PK, kind text NOT NULL, blob blob NOT NULL)   -- multi-row, query WHERE kind='recipe' LIMIT 1; one-per-kind invariant enforced in app layer
recipe_history    (id text PK, blob blob NULL)                                  -- NULL = known via manifest, not yet pulled

-- Projections (UI queries these)
calendar  (id text PK → calendar_history.id, name text NOT NULL)
recipe    (id text PK → recipe_history.id,
           title text NOT NULL,
           description text NULL,
           status int NOT NULL DEFAULT 0,
           manifest_rev int NOT NULL DEFAULT 0,
           local_rev    int NOT NULL DEFAULT 0)
day       (id, calendar_id → calendar.id, name)
meal_slot (day_id, meal_name, recipe_id → recipe.id)
ingridient (id, name)
```

Notes:
- `manifest_history` has no projection counterpart — the manifest is a coordinator, not an entity. Its data projects into columns spread across many `recipe` rows.
- One `manifest_history` table can hold multiple manifest blobs in the future (e.g., `kind='ingridient'`). For now only `kind='recipe'` exists.

## Deferred / out of scope

- **Peer discovery & transport.** P2P wire layer (Bluetooth / mDNS / WebRTC / relay) is not decided. Loro produces ops; transport is separate. Postponed.
- **Ingredient↔recipe linkage.** Ingredients are a separate plain SQLite table for now. Linking ingredients into recipes (whether as refs in `recipe_history` or a join table) is a later concern.
- **Tags on manifest.** Manifest stores only `title`, `rev`, and `status` initially. Tags can be added later.
- **History GC / snapshots.** Per-recipe granularity makes this easier later; no policy needed yet.
- **Hybrid lazy/eager sync.** Stay on Policy A (eager) until social-import scale forces revisit.
- **LoroText on title / description.** Plain strings with field-level LWW for MVP. Upgrade to LoroText if concurrent character-level editing becomes a real use case. Migration = walk every doc once and re-shape.

## Why this beats the single-blob approach

- Bandwidth: per-recipe deltas instead of whole-corpus diff.
- Storage: small SQLite rows; no monolithic blob to rewrite.
- Startup: load only manifest + calendar; recipes lazy-load.
- Blast radius: corruption is per-recipe.
- Migrations: splitting later would be expensive; doing it now is free.
