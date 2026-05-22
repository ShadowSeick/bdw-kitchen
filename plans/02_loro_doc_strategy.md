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

- **`manifest_doc`** — index of all recipes
  - `LoroMap<recipeId, { title: LoroText, rev: LoroCounter }>`
  - Solves discovery: how device B knows recipe X exists without loading it.
  - Provides title for list views without fetching the full recipe doc.
- **`calendar_doc`** — schedule
  - `LoroMap<dateISO, recipeId>`
  - Already implemented.
  - Titles for rendering come from `manifest_doc` (JOIN via `recipes_index`).

### 3. Per-recipe docs
- **`recipe_doc(id)`** — body of one recipe (ingredients, steps, notes).
  - Lazy-loaded for display; **eager-synced on manifest signal** (Policy A — see §5).
  - One LoroDoc instance per recipe.

### 4. Single source of truth per field
- `title` lives **only** in `manifest_doc`. Recipe doc has no `title` field.
- Body (ingredients, steps, notes) lives **only** in `recipe_doc`.
- Avoids denormalization drift across two separate CRDTs that can't be updated atomically.

### 5. Sync policy: Policy A (eager) for now
| Scenario | Action |
|---|---|
| Manifest gains new `recipeId` | Pull full recipe doc immediately |
| Manifest's `rev` for existing recipe advances | Pull delta immediately |
| Loaded recipe gets remote edit | Live subscription applies delta |
| Peer pushes delta for unloaded recipe doc | **Accept and apply** to stored blob; update SQLite projection |

Hybrid (lazy for bulk-imported recipes, eager for hand-created) is a later optimization once social-import scale is real.

### 6. Change detection: `rev` as `LoroCounter`, not wall-clock `updated_at`
- Each recipe's manifest entry has a `LoroCounter rev` incremented on every commit to that recipe's body.
- Compare `manifest_rev` (from synced manifest) vs `local_rev` (last applied locally, stored in SQLite). Divergence → trigger sync of that recipe doc.
- Avoids cross-device clock skew that wall-clock `updated_at` would introduce.
- Loro's own sync protocol handles VV exchange and delta computation once a sync is initiated. The manifest's job is signaling/discovery only — do **not** embed Loro VVs in the manifest.

### 7. Write-through layer
LoroDoc is the conflict-reconciliation layer. SQLite is the queryable view. Every Loro state change must project into SQLite.

- For each **loaded** LoroDoc, subscribe to its update event; in the callback, UPSERT the projected fields into the corresponding SQLite row (via Drizzle).
- `manifest_doc` is always loaded → its subscription is always active → `recipes_index.title` and `recipes_index.manifest_rev` are always fresh.
- When a delta arrives for an unloaded recipe doc, load the doc transiently, apply, project to SQLite, persist new blob.

Two arrows trigger write-through:
1. **Local edit**: UI → mutate LoroDoc → subscription fires → SQLite UPDATE.
2. **Remote sync**: peer delta → apply to LoroDoc → subscription fires → SQLite UPDATE.

## Schema

### LoroDocs
```
manifest_doc       LoroMap<recipeId, { title: LoroText, rev: LoroCounter }>
calendar_doc       LoroMap<dateISO, recipeId>
recipe_doc(id)     LoroMap<{ ingredients, steps, notes, ... }>
```

### SQLite (Drizzle)
```
recipes_index
  id            TEXT PK
  title         TEXT          -- projected from manifest_doc
  manifest_rev  INTEGER       -- latest rev seen in manifest
  local_rev     INTEGER       -- rev of the body we've actually applied
  doc_blob      BLOB          -- serialized recipe_doc snapshot
  has_body      INTEGER       -- 0 until first body sync lands

calendar_view
  date          TEXT PK
  recipe_id     TEXT FK -> recipes_index.id

ingredients
  id            TEXT PK
  name          TEXT
  -- plain table, not a CRDT, separate from recipes for now
```

`manifest_rev > local_rev` ⇒ trigger sync of that recipe doc.

## Deferred / out of scope

- **Peer discovery & transport.** P2P wire layer (Bluetooth / mDNS / WebRTC / relay) is not decided. Loro produces ops; transport is separate. Postponed.
- **Ingredient↔recipe linkage.** Ingredients are a separate plain SQLite table for now. Linking ingredients into recipes (whether as refs in `recipe_doc` or a join table) is a later concern.
- **Tags on manifest.** Manifest stores only `title` and `rev` initially. Tags can be added later.
- **History GC / snapshots.** Per-recipe granularity makes this easier later; no policy needed yet.
- **Hybrid lazy/eager sync.** Stay on Policy A (eager) until social-import scale forces revisit.

## Why this beats the single-blob approach

- Bandwidth: per-recipe deltas instead of whole-corpus diff.
- Storage: small SQLite rows; no monolithic blob to rewrite.
- Startup: load only manifest + calendar; recipes lazy-load.
- Blast radius: corruption is per-recipe.
- Migrations: splitting later would be expensive; doing it now is free.
