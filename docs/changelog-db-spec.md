# ChangelogDB — Specification v1.0

A lightweight, Git-friendly, auditable database system built on SQLite with a structured
changelog for undo/redo, multi-user merge, and source-traced data provenance.

---

## 1. Goals and Non-Goals

### Goals

- Single-user interactive performance via SQLite
- Full audit trail of every data and schema change
- Selective rollback by operation, source type, time range, or user
- Multi-user merge via per-user changelog export, without Git file conflicts
- Cross-language reimplementability (Node.js and Python as primary targets)
- Git-friendly canonical exports that produce stable, meaningful diffs

### Non-Goals

- General-purpose distributed sync (no CRDT, no real-time replication)
- Large datasets (design assumes entire DB fits comfortably in memory)
- Concurrent writes from multiple processes to the same SQLite file
- Conflict-free automatic merge of all cases (conflicts are surfaced, not hidden)

---

## 2. Concepts

### 2.1 The Live Database

A standard SQLite `.db` file. All reads and writes during normal operation go through
this file. The application interacts with it using standard SQL. The SQLite file is
**not** committed to Git directly — only the canonical export is.

### 2.2 The `_changelog` Table

Every mutation to user data — inserts, updates, deletes, and schema changes — is
recorded as a row in `_changelog` before being applied to the target table. This table
lives inside the same SQLite file as the user data.

The changelog is the source of truth for history, undo/redo, and multi-user merge. The
user data tables are a materialized view of the changelog.

### 2.3 The Canonical Export

On sync (typically before a Git commit), the system exports two files:

- `db/snapshot.jsonl` — all user data tables, one JSON object per line, in a
  deterministic order (tables alphabetically, rows by primary key ascending)
- `changelogs/<user>.jsonl` — the `_changelog` table rows for this user, exported
  in `seq` order

The SQLite file itself is gitignored. The two JSONL exports are committed.

### 2.4 Source Types

Every changelog entry has a `source` field that classifies the origin of the change.
Source type determines merge policy and rollback behavior.

| Source | Description | Merge policy |
|---|---|---|
| `ui` | User-initiated change via application UI | Flag conflicts |
| `import_authoritative` | Data from a canonical external provider | Always apply, never flag |
| `import_patch` | Data from an external source, non-authoritative | Apply unless a `ui` change touched this record since |
| `derived` | Computed or generated from other records | Safe to discard and re-derive on conflict |
| `schema` | DDL changes (ALTER TABLE, CREATE TABLE, etc.) | Apply first, before all data changes |
| `script` | Bulk programmatic changes (migrations, backfills) | Flag conflicts |

Applications may define additional source types. Unknown source types are treated as `ui`
during merge.

### 2.5 Record IDs

Records should use one of:

- **ULID** — preferred for new records with no natural key. 26-character, URL-safe,
  lexicographically sortable by creation time. Format: `01ARZ3NDEKTSV4RRFFQ69G5FAV`
- **Natural key** — use directly as primary key when a stable external identifier exists
  (e.g. a ticker symbol, username, provider ID)

Auto-increment integers are not used for primary keys, as they are not stable across
independent database instances.

---

## 3. Data Structures

### 3.1 `_changelog` Table Schema

```sql
CREATE TABLE _changelog (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  ulid       TEXT    NOT NULL UNIQUE,
  user       TEXT    NOT NULL,
  ts         TEXT    NOT NULL,  -- ISO 8601, e.g. "2026-04-25T14:32:00.000Z"
  source     TEXT    NOT NULL,  -- see Source Types above
  reason     TEXT,              -- human-readable annotation, optional
  op         TEXT    NOT NULL,  -- INSERT | UPDATE | DELETE | ALTER
  table_name TEXT    NOT NULL,
  record_id  TEXT,              -- NULL for schema ops
  before     TEXT,              -- JSON object, NULL for INSERT
  after      TEXT,              -- JSON object, NULL for DELETE
  meta       TEXT               -- JSON object, optional unstructured metadata
);
```

Notes:

- `seq` is local to this database instance and must not be used for cross-user ordering
- `ulid` is globally unique and is the stable identifier for a changelog entry
- `before` and `after` store only the fields relevant to the operation, not the full row,
  except for INSERT (after = full row) and DELETE (before = full row)
- For `ALTER` operations, `before` and `after` contain the schema description (see 3.3)

### 3.2 Changelog Entry — JSON Representation

When exported to JSONL or passed through the API, each entry is serialized as:

```json
{
  "seq": 47,
  "ulid": "01JRZX3NDEKTSV4RRFFQ69G5FAV",
  "user": "jonathan",
  "ts": "2026-04-25T14:32:00.000Z",
  "source": "ui",
  "reason": "Updated task priority after client call",
  "op": "UPDATE",
  "table_name": "tasks",
  "record_id": "01ARZ3NDEKTSV4RRFFQ69G5FAA",
  "before": { "priority": 2, "status": "open" },
  "after":  { "priority": 1, "status": "open" },
  "meta": null
}
```

### 3.3 Schema Change Entry

For `ALTER` operations, `record_id` is null, and `before`/`after` describe the schema:

```json
{
  "ulid": "01JRZX4ABCDEFG1234567890AB",
  "user": "jonathan",
  "ts": "2026-04-25T09:00:00.000Z",
  "source": "schema",
  "reason": "Add due_date column to tasks",
  "op": "ALTER",
  "table_name": "tasks",
  "record_id": null,
  "before": { "columns": ["id", "title", "priority", "status"] },
  "after":  { "columns": ["id", "title", "priority", "status", "due_date"],
              "sql": "ALTER TABLE tasks ADD COLUMN due_date TEXT" },
  "meta": null
}
```

### 3.4 Snapshot JSONL Format

`db/snapshot.jsonl` contains one JSON object per line. The first line is a header:

```json
{"_type": "snapshot_header", "exported_at": "2026-04-25T15:00:00.000Z", "schema_version": 3}
```

Subsequent lines are data rows, grouped by table in alphabetical order, rows sorted by
primary key ascending:

```json
{"_table": "projects", "id": "01ARZ...", "name": "Alpha", "created_at": "..."}
{"_table": "projects", "id": "01BRZ...", "name": "Beta",  "created_at": "..."}
{"_table": "tasks",    "id": "01CRZ...", "title": "Fix bug", "priority": 1}
```

### 3.5 High-Water Mark File

`changelogs/.watermarks.json` records the last successfully merged seq per user. This
file is committed to Git.

```json
{
  "jonathan": { "last_seq": 47, "last_ulid": "01JRZX3NDEKTSV4RRFFQ69G5FAV" },
  "coworker":  { "last_seq": 23, "last_ulid": "01JRZY5ABCDEFG1234567890CD" }
}
```

---

## 4. Core Engine Behaviors

### 4.1 Applying a Change

All mutations to user data must go through the changelog engine, not via direct SQL.
The engine must:

1. Generate a ULID for the entry
2. Capture the current state of affected fields as `before` (SELECT before write)
3. Execute the SQL mutation against the user table
4. Insert the changelog row into `_changelog`
5. Both steps 3 and 4 must occur inside a single SQLite transaction

If the transaction fails, neither the user table nor `_changelog` is modified.

### 4.2 Undo and Redo

Undo reverses a specific changelog entry by applying the inverse operation:

- `INSERT` → `DELETE` the inserted row
- `DELETE` → `INSERT` the `before` state
- `UPDATE` → `UPDATE` the row back to `before` values
- `ALTER` → apply the reverse SQL (e.g. DROP COLUMN — see limitations)

The undo itself is recorded as a new changelog entry with `op: "UNDO"`, referencing the
original entry's ULID in `meta.undoes`. This preserves full history — nothing is ever
deleted from `_changelog`.

Redo re-applies an undone entry, recorded as `op: "REDO"` with `meta.redoes`.

Undo of a schema change is best-effort. The engine must warn if a column drop cannot be
reversed (SQLite does not support DROP COLUMN in all versions).

### 4.3 Conflict Detection

A conflict occurs when:

- An entry's `before` state does not match the current state of the target record at the
  time of application

Conflict check algorithm:

```
for each field in entry.before:
  if current_row[field] != entry.before[field]:
    → CONFLICT
```

If `before` is null (INSERT), a conflict occurs if a row with the same primary key
already exists.

If `before` is a DELETE and the record no longer exists, this is a no-op (not a
conflict) unless another change has modified the record since.

### 4.4 Rollback by Predicate

The engine supports bulk rollback of entries matching a predicate. Supported predicates:

- `source = <value>` — all entries of a source type
- `user = <value>` — all entries by a user
- `ts_between(start, end)` — all entries in a time range
- `seq_between(start, end)` — all entries in a seq range
- Any combination of the above (AND semantics)

Rollback applies undos in **reverse seq order**. Each undo is conflict-checked before
application. Entries that conflict are collected into a report and skipped unless
`--force-skip-conflicts` is passed.

---

## 5. Multi-User Merge

### 5.1 Directory Layout

```
project/
  db/
    snapshot.jsonl        # canonical export, committed to Git
  changelogs/
    jonathan.jsonl        # jonathan's exported changelog
    coworker.jsonl        # coworker's exported changelog
    .watermarks.json      # high-water marks per user
  .gitignore              # ignores *.db
```

### 5.2 Sync Export (before Git commit)

Each user runs `db sync` before committing. This:

1. Exports new `_changelog` rows (since last watermark) to their JSONL file (append)
2. Exports the full snapshot to `db/snapshot.jsonl`
3. Updates `.watermarks.json` with their new high-water mark

### 5.3 Merge Algorithm

Run `db merge` after pulling the other user's changelog. Steps:

**Step 1 — Collect new entries**

For each user changelog, read entries with `ulid > last_known_ulid` (using the watermarks
file). Skip entries already present in local `_changelog` by ULID.

**Step 2 — Separate schema from data**

```
schema_entries = entries where source == "schema"
data_entries   = entries where source != "schema"
```

**Step 3 — Apply schema entries first**

Apply schema entries in `ts` order. Schema entries from different users should not
conflict if coordinated (see Section 7 on schema conventions). If two schema entries
touch the same table, flag for manual review.

**Step 4 — Apply data entries**

Sort data entries by source priority, then by `ts`:

1. `import_authoritative` — apply unconditionally, no conflict check
2. All other sources — apply with conflict check, per Section 4.3

For `ui` vs `ui` conflicts on the same cell: flag in merge report, do not apply.

**Step 5 — Emit merge report**

```
MERGE REPORT — 2026-04-25
  Applied:    34 entries
  Skipped (no-op): 2 entries
  Conflicts:  3 entries

  CONFLICTS:
    [01JRZX...] coworker UPDATE tasks/task_42 field:priority
      before: 2  their_after: 1  current: 3
      → Run: db merge resolve 01JRZX... --ours | --theirs

    [01JRZY...] coworker UPDATE tasks/task_17 — record deleted locally
      → Run: db merge resolve 01JRZY... --apply | --skip
```

**Step 6 — Update watermarks**

On successful merge (zero unresolved conflicts), update `.watermarks.json`.

### 5.4 Conflict Resolution

```
db merge resolve <ulid> --ours       # keep local value, mark resolved
db merge resolve <ulid> --theirs     # apply incoming value, mark resolved
db merge resolve <ulid> --skip       # discard incoming change permanently
db merge resolve --all --theirs      # bulk resolve all conflicts to incoming
```

Each resolution is recorded as a `_changelog` entry with `op: "MERGE_RESOLVE"`.

---

## 6. CLI Specification

All subcommands operate on the database in the current directory (or `--db <path>`).

### 6.1 Command Summary

```
db init [--user <name>]
db apply <file.jsonl>
db status
db log [--limit N] [--source <type>] [--user <name>] [--since <ts>] [--until <ts>]
db diff [<ulid_or_seq>] [<ulid_or_seq>]
db undo <ulid_or_seq>
db undo --source <type> [--since <ts>] [--until <ts>] [--dry-run]
db redo <ulid_or_seq>
db rollback --source <type> [--since <ts>] [--until <ts>] [--dry-run] [--force-skip-conflicts]
db sync
db merge
db merge resolve <ulid> --ours | --theirs | --skip
db merge resolve --all --ours | --theirs
db export [--output <path>]
db import <snapshot.jsonl>
db verify
```

### 6.2 Command Details

**`db init`**

Initialises a new ChangelogDB in the current directory. Creates the SQLite file,
the `_changelog` table, the `changelogs/` directory, and the `.watermarks.json` file.
Writes a `.gitignore` entry for `*.db`.

Options:
- `--user <name>` — sets the default user for this instance (stored in `db.config.json`)

---

**`db apply <file.jsonl>`**

Applies a JSONL file of changelog entries to the local database. Each line must be a
valid changelog entry object. Entries are applied in file order.

Options:
- `--dry-run` — show what would be applied without writing
- `--source <type>` — override the source field for all entries
- `--on-conflict skip | abort | report` — default: `report`

---

**`db status`**

Shows:
- Number of uncommitted changes (entries since last `db sync`)
- Number of unapplied remote entries (if merge is pending)
- Any unresolved conflicts

---

**`db log`**

Displays changelog entries in reverse seq order (most recent first).

Options:
- `--limit N` — default 20
- `--source <type>` — filter by source
- `--user <name>` — filter by user
- `--since <ts>` / `--until <ts>` — filter by timestamp
- `--table <name>` — filter by table
- `--record <id>` — show full history of one record
- `--format json | pretty` — default: pretty

---

**`db diff [a] [b]`**

Shows the difference between two database states. Arguments are ULID, seq number, or
special refs `HEAD` (latest) and `INITIAL` (empty).

With no arguments: shows all changes since last sync.

Output format:
```
~ tasks / task_42
  priority:  2 → 1
  status:    open (unchanged)
```

---

**`db undo <ulid_or_seq>`**

Reverses a single changelog entry. Performs conflict check. Fails if `--force` not
passed and the current state doesn't match `after` (meaning something changed the
record since this entry was applied).

Options:
- `--force` — apply undo even if conflict detected, recording the discrepancy in meta

---

**`db rollback`**

Bulk undo of entries matching a predicate. Always runs in dry-run mode first and prints
the plan, then prompts for confirmation unless `--yes` is passed.

Options:
- `--source <type>` — required unless `--seq-between` or `--since` is provided
- `--since <ts>` / `--until <ts>` — time range
- `--seq-between <a> <b>` — seq range
- `--user <name>` — restrict to one user's entries
- `--dry-run` — print plan without executing
- `--force-skip-conflicts` — skip conflicting entries and continue
- `--yes` — skip confirmation prompt

---

**`db sync`**

Prepares the repository for Git commit:

1. Appends new local `_changelog` entries to `changelogs/<user>.jsonl`
2. Writes `db/snapshot.jsonl`
3. Updates `.watermarks.json`

---

**`db merge`**

Reads remote user changelogs (any JSONL in `changelogs/` that is not the local user's),
applies new entries per the merge algorithm (Section 5.3), and writes a merge report to
stdout and to `changelogs/.last_merge_report.txt`.

---

**`db export [--output <path>]`**

Writes the snapshot JSONL to the specified path (default: `db/snapshot.jsonl`).
Deterministic output: tables alphabetically, rows by primary key.

---

**`db import <snapshot.jsonl>`**

Rebuilds the SQLite database from a snapshot file. Used to initialise a new clone or
recover from a corrupted local DB. Does not modify `_changelog`.

---

**`db verify`**

Replays the entire `_changelog` against an empty database and compares the result to
the current live database. Reports any discrepancies. Useful for integrity checking.

---

## 7. Schema Change Conventions

Schema changes require coordination between users. Recommended workflow:

1. Discuss schema change on the main branch before branching
2. One user applies the schema change as a `source: "schema"` entry
3. That user runs `db sync` and pushes
4. The other user pulls and runs `db merge` before making further data changes
5. Schema changes should never be made on both branches simultaneously

If a schema conflict is detected during merge, the merge halts and reports it. Manual
resolution requires one user to undo their schema change and re-apply it after merging.

---

## 8. File Layout Reference

```
project/
  db.config.json              # local config (gitignored)
  db/
    data.db                   # SQLite live database (gitignored)
    snapshot.jsonl            # canonical export (committed)
  changelogs/
    jonathan.jsonl            # jonathan's changelog export (committed)
    coworker.jsonl            # coworker's changelog export (committed)
    .watermarks.json          # merge high-water marks (committed)
    .last_merge_report.txt    # last merge report (gitignored or committed)
  .gitignore
```

`db.config.json`:
```json
{
  "user": "jonathan",
  "db_path": "db/data.db"
}
```

---

## 9. Test Suite Specification

### 9.1 Format

Tests use JSON fixture files. Each fixture is a directory with the following structure:

```
tests/fixtures/<test_name>/
  input/
    snapshot.jsonl        # initial database state (may be empty)
    changelog.jsonl       # entries to apply (may be empty)
  operation.json          # the operation to perform
  expected/
    snapshot.jsonl        # expected database state after operation
    changelog.jsonl       # expected _changelog state after operation
    report.json           # expected report output (for merge/rollback)
    error.json            # expected error (if operation should fail)
```

`operation.json` specifies a single CLI command:
```json
{
  "command": "db rollback",
  "args": { "source": "import_patch", "dry_run": false }
}
```

### 9.2 Required Fixtures

#### Engine — Apply

| Fixture | Description |
|---|---|
| `apply_insert_basic` | Insert a new record, verify _changelog entry |
| `apply_update_basic` | Update fields on an existing record |
| `apply_delete_basic` | Delete a record |
| `apply_insert_natural_key` | Insert with a natural string key |
| `apply_schema_alter` | Add a column via ALTER |
| `apply_with_reason` | Entry with a reason string |
| `apply_with_meta` | Entry with a meta JSON object |
| `apply_conflict_insert_dupe` | INSERT where record already exists → error |
| `apply_transaction_atomicity` | Simulate mid-apply failure, verify no partial write |

#### Engine — Undo / Redo

| Fixture | Description |
|---|---|
| `undo_insert` | Undo an INSERT, verify record removed |
| `undo_update` | Undo an UPDATE, verify before state restored |
| `undo_delete` | Undo a DELETE, verify record restored |
| `undo_conflict` | Undo where current state diverges from after → error |
| `undo_conflict_force` | Same with --force, verify undo recorded with conflict meta |
| `redo_after_undo` | Undo then redo, verify final state matches original |
| `undo_records_entry` | Verify undo itself appears as UNDO entry in _changelog |

#### Engine — Rollback

| Fixture | Description |
|---|---|
| `rollback_by_source` | Rollback all entries of a source type |
| `rollback_by_time_range` | Rollback entries within a timestamp range |
| `rollback_by_user` | Rollback entries by a specific user |
| `rollback_dry_run` | Dry run produces correct plan, no DB changes |
| `rollback_with_conflicts` | Some entries conflict, rest apply, report emitted |
| `rollback_force_skip` | --force-skip-conflicts continues past conflicts |
| `rollback_empty_predicate` | No matching entries → no-op, no error |

#### Merge

| Fixture | Description |
|---|---|
| `merge_clean_no_overlap` | Two users change different records → all applied |
| `merge_clean_different_fields` | Two users change same record, different fields → merged |
| `merge_conflict_same_field` | Two users change same field → flagged in report |
| `merge_conflict_delete_update` | One user deletes, other updates same record → flagged |
| `merge_authoritative_wins` | import_authoritative overrides ui change without flag |
| `merge_schema_first` | Schema entries applied before data entries regardless of ts |
| `merge_schema_conflict` | Both users alter same table → halts, report emitted |
| `merge_resolve_ours` | Resolve conflict with --ours, verify local value kept |
| `merge_resolve_theirs` | Resolve conflict with --theirs, verify incoming applied |
| `merge_resolve_skip` | Resolve with --skip, verify entry never applied |
| `merge_watermark_update` | Watermarks updated correctly after clean merge |
| `merge_idempotent` | Running merge twice produces same result |

#### Export / Import

| Fixture | Description |
|---|---|
| `export_deterministic_order` | Same DB exported twice produces identical JSONL |
| `export_empty_db` | Export of empty database produces valid header-only JSONL |
| `import_from_snapshot` | Import snapshot, verify SQLite matches |
| `import_then_export` | Import then export produces identical JSONL |

#### Verify

| Fixture | Description |
|---|---|
| `verify_clean` | Replay matches live DB → no errors |
| `verify_drift` | Live DB modified outside changelog → discrepancy reported |

### 9.3 Test Runner Requirements

Implementations must provide a test runner that:

1. Iterates all fixture directories
2. For each fixture: loads `input/snapshot.jsonl` into a fresh in-memory or temp SQLite,
   applies `input/changelog.jsonl`, executes `operation.json`, captures output
3. Compares actual `snapshot.jsonl`, `changelog.jsonl`, and `report.json` to `expected/`
4. For error fixtures: verifies the error type and message match `expected/error.json`
5. Reports pass/fail per fixture with a diff on failure
6. Exit code 0 if all pass, non-zero otherwise

Fixture comparison must be **order-sensitive** for changelog (seq order) and
**order-insensitive per table, order-sensitive by primary key** for snapshot.

---

## 10. Implementation Notes

### Ordering and IDs

- Do not use `seq` as a cross-instance ordering key — it is local only
- Use ULID for cross-instance unique identification of entries
- Timestamps are stored as ISO 8601 strings in UTC with millisecond precision
- ULID generation must use the entry's timestamp as the time component (not wall clock
  at write time if the entry is being replayed)

### SQLite Specifics

- Enable WAL mode: `PRAGMA journal_mode=WAL`
- Enable foreign keys: `PRAGMA foreign_keys=ON`
- All changelog writes use explicit transactions
- `_changelog` should have indexes on: `(user, seq)`, `(source)`, `(table_name, record_id)`, `(ts)`

### JSONL Export Consistency

To ensure stable Git diffs, JSON serialization must:

- Use sorted keys (alphabetically)
- Use no trailing whitespace
- Use Unix line endings
- Serialize null as `null`, not omit the field
- Use compact format (no pretty-printing)

### Language-Specific Notes

**Node.js**: Use the `better-sqlite3` package for synchronous SQLite access. Use the
`ulid` package for ULID generation. The CLI should be implemented with `commander` or
equivalent.

**Python**: Use the stdlib `sqlite3` module. Use the `python-ulid` package. The CLI
should be implemented with `click` or `argparse`.

Both implementations must produce identical fixture outputs to be considered conformant.
