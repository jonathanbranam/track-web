---
id: specs
severity: must
roles: [manager, worker]
---
Behaviour is specified in `openspec/specs/<capability>/spec.md`. A task that
changes behaviour edits that spec directly, on the worker's branch, with the
code and tests. The branch diff is the spec delta, and the manager's merge is
what makes it current. Keep the `**App**: games` tag on each spec.

Don't use the OpenSpec CLI or its skills, and don't create
`openspec/changes/` directories. `openspec/changes/` is the human's; leave it
alone.

Why: bridle tasks replace OpenSpec's change lifecycle for bridle's work, but
the specs stay the record of how track-web behaves.
