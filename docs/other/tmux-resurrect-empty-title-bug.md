# tmux-resurrect: empty pane title corrupts saved working directory → panes restore to $HOME

## Symptom

After using Claude Code (or any program that leaves a pane with no title) in a
tmux pane, then exiting and later restoring via `tmux-resurrect`
(`prefix + Ctrl-r` after a `tmux kill-server` or reboot), that pane comes back
in `$HOME` instead of the directory it was actually in.

## Root cause

`tmux-resurrect`'s `scripts/save.sh` builds one tab-separated line per pane by
querying tmux, then **re-parses that same line itself**:

```bash
# save.sh, dump_panes()
dump_panes_raw |
    while IFS=$d read line_type session_name window_number window_active window_flags \
                    pane_index pane_title dir pane_active pane_command pane_pid history_size; do
        ...
```

where `d=$'\t'`.

The bug: **tab is one of bash's "IFS whitespace" characters** (space, tab,
newline). Even when `IFS` is explicitly set to just `$'\t'`, bash's `read`
still collapses *runs* of IFS-whitespace and ignores leading/trailing empty
fields, instead of treating each tab as a strict single-character delimiter.

So whenever a pane's `#{pane_title}` is **empty**, the two adjacent tabs
around it collapse, and every field after it silently shifts left by one:

```
expected: ... pane_index  pane_title  dir                          pane_active  pane_command ...
actual:   ... pane_index  <dir value> <pane_active value>           <pane_command value> ...
```

i.e. `pane_title` ends up holding what should have been `dir`, `dir` ends up
holding what should have been `pane_active` (a bare `"0"` or `"1"`), etc.

`save.sh` already knew about this failure mode — it guards two *other*
optional-empty fields against it by prefixing them with a literal `:` in the
tmux format string so they're never truly empty on the wire:

```bash
format+=":#{window_flags}"      # guarded
format+=":#{pane_current_path}" # guarded (this is `dir`)
format+="#{pane_title}"         # NOT guarded ← the bug
```

`restore.sh` strips that `:` guard back off with `remove_first_char` before
using the value. Because `pane_title` was never guarded, an empty title
produces the corrupted `dir` shown above. When `restore.sh` then does:

```bash
dir="$(remove_first_char "$dir")"
```

on a `dir` that's actually a stray `"0"` or `"1"` (stolen from
`pane_active`), stripping its first (only) character leaves `dir=""`. That
empty string gets passed to `tmux new-session/new-window/split-window -c ""`,
and tmux falls back to the default directory — `$HOME` — for that pane.

The corruption is also **self-perpetuating**: `restore.sh` blindly does
`tmux select-pane -T "$pane_title"` with whatever (possibly garbage) value it
parsed, so a pane hit by this bug once can have its *live* title permanently
overwritten with a stray directory-path string, which then shows up in every
future save too.

### Why it correlates with Claude Code specifically

Claude Code continuously overwrites the tmux pane title via escape sequences
while it's the foreground program (a documented, currently-open upstream
issue: [anthropics/claude-code#31107](https://github.com/anthropics/claude-code/issues/31107),
no option to disable it). Panes it has run in reliably end up with an empty
title once it exits (whether from actively clearing it or simply never
restoring a prior title), which is exactly the trigger condition above. Plain
shell/`vim` panes that already have a non-empty title (e.g. set by shell
integration) don't hit it.

## Verification

Confirmed live by re-implementing `dump_panes()`'s exact `read` against a
synthetic line with an empty title field — the shift reproduces exactly.
Also confirmed against a real environment: a pane that had run Claude Code
and been exited had a genuinely empty live `#{pane_title}`, and running the
real (unpatched) `save.sh` against it produced the exact corrupted-field
output predicted above. After the fix below, the same pane saves with
correctly aligned fields.

## The fix

Two lines. Apply the same `:`-guard convention already used for `dir` and
`window_flags` to `pane_title` as well, and strip it back off on restore.

**`scripts/save.sh`** (in `pane_format()`):

```diff
 	format+="#{pane_index}"
 	format+="${delimiter}"
-	format+="#{pane_title}"
+	format+=":#{pane_title}"
 	format+="${delimiter}"
 	format+=":#{pane_current_path}"
```

**`scripts/restore.sh`** (in `restore_pane()`):

```diff
 	while IFS=$d read line_type session_name window_number window_active window_flags pane_index pane_title dir pane_active pane_command pane_full_command; do
+		pane_title="$(remove_first_char "$pane_title")"
 		dir="$(remove_first_char "$dir")"
 		pane_full_command="$(remove_first_char "$pane_full_command")"
```

That's the whole fix — it makes `pane_title` behave exactly like `dir` and
`window_flags` already do: guaranteed non-empty on the wire, guard character
stripped on the way back out.

## Upstream status (as of 2026-08-15)

This is a real, independently-discovered bug in
[tmux-plugins/tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect),
not specific to this machine. Two open PRs already fix it with this exact
change:

- [#581](https://github.com/tmux-plugins/tmux-resurrect/pull/581) —
  chirayuk, 2026-07-15. More complete: also adds regression tests and Docker
  test infra; credits an earlier PR #570 by @mtkozlowski for the original
  approach.
- [#583](https://github.com/tmux-plugins/tmux-resurrect/pull/583) —
  josh-stephens, 2026-08-01. Same core fix, no tests.

Both are unmerged, unreviewed. Updating to the latest upstream `master`
(6 commits ahead of a plugin last synced Oct 2022) does **not** include this
fix — it's still open.

## Applying this on another machine

```bash
cd ~/.tmux/plugins/tmux-resurrect
git status   # make sure there's nothing local to lose
```

Then either:

- **Manual patch** (no dependency on the PR staying open): make the two edits
  above by hand in `scripts/save.sh` and `scripts/restore.sh`.
- **Pull the PR branch directly**:
  ```bash
  git fetch origin pull/581/head:pr-581
  git diff master pr-581 -- scripts/save.sh scripts/restore.sh
  # review, then apply just those two files' changes, or merge the branch
  ```

No version bump or config change needed elsewhere — this only affects the
tab-separated save/restore format's internal parsing, not its on-disk
structure in a way that breaks old save files (old saves without a garbage
title still parse fine one field at a time; the fix only changes how a
newly-empty title round-trips going forward).
