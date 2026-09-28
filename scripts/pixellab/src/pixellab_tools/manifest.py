"""The per-game manifest.yaml: load/save, entries, status transitions.

Design: openspec/changes/game-asset-pipeline/design.md D4;
spec: specs/game-asset-pipeline/spec.md "Single manifest per game",
"Status lifecycle", "Asset workspace outside the repository".

Loaded and saved with ``ruamel.yaml`` in round-trip mode, so hand-written
comments, key order, and fields this tool doesn't know about survive a
rewrite.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap, CommentedSeq

STANDARD_SUBDIRS = ("inbox", "work", "reference", "review", "dist")

# D3 transition table: from-status -> allowed next statuses.
TRANSITIONS: dict[str, set[str]] = {
    "unreviewed": {"candidate", "in-review", "approved", "rejected", "reference"},
    "candidate": {"in-review", "approved", "rejected", "reference"},
    "in-review": {"approved", "rejected", "reference"},
    "approved": {"packed", "in-review"},
    "packed": {"shipped", "in-review"},
    "shipped": {"in-review"},
    "reference": {"in-review"},
}

ALL_STATUSES = (
    "unreviewed", "candidate", "in-review", "approved", "packed", "shipped", "rejected", "reference",
)
REVIEW_WAITING_STATUSES = ("unreviewed", "candidate", "in-review")


def initial_status(kind: str | None) -> str:
    """The status a newly registered entry should start at (D2): ``reference``
    for ``kind: reference``, ``unreviewed`` for everything else.
    """
    return "reference" if kind == "reference" else "unreviewed"


def _migrate_named_statuses(assets: Iterable[CommentedMap]) -> bool:
    """D1: rewrite any lingering ``named`` status (and history lines) left
    from before the unreviewed/reference rename. Returns whether anything
    changed.
    """
    changed = False
    for entry in assets:
        if entry.get("status") == "named":
            new_status = initial_status(entry.get("kind"))
            entry["status"] = new_status
            changed = True
            if new_status == "reference":
                history = entry.get("history")
                if history is None:
                    history = CommentedSeq()
                    entry["history"] = history
                line = CommentedMap()
                line["at"] = _now_iso()
                line["to"] = "reference"
                line["note"] = "migrated from named"
                history.append(line)
        history = entry.get("history")
        if history:
            for line in history:
                if line.get("to") == "named":
                    line["to"] = "unreviewed"
                    changed = True
    return changed


class ManifestError(RuntimeError):
    pass


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _yaml() -> YAML:
    y = YAML()
    y.preserve_quotes = True
    y.width = 100000
    y.indent(mapping=2, sequence=2, offset=0)
    return y


def manifest_path(game_dir: Path) -> Path:
    return Path(game_dir) / "manifest.yaml"


def ensure_workspace(assets_root: Path, game: str) -> Path:
    """Create the standard subfolders and an empty manifest for *game* if
    they don't already exist. Returns the game directory.
    """
    game_dir = Path(assets_root) / game
    for sub in STANDARD_SUBDIRS:
        (game_dir / sub).mkdir(parents=True, exist_ok=True)
    path = manifest_path(game_dir)
    if not path.exists():
        data = CommentedMap()
        data["version"] = 1
        data["game"] = game
        data["config"] = CommentedMap()
        data["assets"] = CommentedSeq()
        with path.open("w") as fh:
            _yaml().dump(data, fh)
    return game_dir


def list_games(assets_root: Path) -> list[str]:
    root = Path(assets_root)
    if not root.is_dir():
        return []
    return sorted(
        p.name for p in root.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    )


class Manifest:
    def __init__(self, game_dir: Path):
        self.game_dir = Path(game_dir)
        self.path = manifest_path(self.game_dir)
        self._yaml = _yaml()
        self.data = self._load()

    def _load(self) -> CommentedMap:
        if self.path.exists():
            with self.path.open() as fh:
                data = self._yaml.load(fh)
        else:
            data = None
        if data is None:
            data = CommentedMap()
        if "version" not in data:
            data["version"] = 1
        if "game" not in data:
            data["game"] = self.game_dir.name
        if "config" not in data or data["config"] is None:
            data["config"] = CommentedMap()
        if "assets" not in data or data["assets"] is None:
            data["assets"] = CommentedSeq()
        if _migrate_named_statuses(data["assets"]):
            # D1: migrate-on-load. Write back immediately so this is a
            # one-time rewrite; ``self.data`` must be set first since
            # ``save`` reads it.
            self.data = data
            self.save()
        return data

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w") as fh:
            self._yaml.dump(self.data, fh)

    @property
    def assets(self) -> CommentedSeq:
        return self.data["assets"]

    @property
    def config(self) -> CommentedMap:
        return self.data["config"]

    def find(self, asset_id: str) -> CommentedMap | None:
        for entry in self.assets:
            if entry.get("id") == asset_id:
                return entry
        return None

    def add(self, entry: dict[str, Any]) -> None:
        """Register a new entry. Raises :class:`ManifestError` (without
        modifying anything) if its id already exists.
        """
        asset_id = entry.get("id")
        existing = self.find(asset_id) if asset_id else None
        if existing is not None:
            raise ManifestError(f"Duplicate asset id {asset_id!r} (already registered)")
        # D2: fill in a missing status, and normalise a lingering "named"
        # the same way D1 migrates one on load (so an old adopt plan that
        # still says ``named`` still works).
        status = entry.get("status")
        if status is None or status == "named":
            entry["status"] = initial_status(entry.get("kind"))
        self.assets.append(entry)

    def mark(self, asset_id: str, status: str, note: str | None = None, force: bool = False) -> CommentedMap:
        entry = self.find(asset_id)
        if entry is None:
            raise ManifestError(f"No such asset in this game: {asset_id!r}")
        current = entry.get("status")
        allowed = TRANSITIONS.get(current, set())
        if not force and status not in allowed:
            allowed_desc = ", ".join(sorted(allowed)) or "(none)"
            raise ManifestError(
                f"Illegal transition for {asset_id!r}: {current!r} -> {status!r} "
                f"(allowed from {current!r}: {allowed_desc}; pass --force to override)"
            )
        entry["status"] = status
        history = entry.get("history")
        if history is None:
            history = CommentedSeq()
            entry["history"] = history
        line = CommentedMap()
        line["at"] = _now_iso()
        line["to"] = status
        if note:
            line["note"] = note
        history.append(line)
        if note is not None:
            review = entry.get("review")
            if review is None:
                review = CommentedMap()
                entry["review"] = review
            review["note"] = note
            review["at"] = line["at"]
        return entry

    def by_status(self, status: str) -> list[CommentedMap]:
        return [e for e in self.assets if e.get("status") == status]

    def by_subject(self) -> dict[str, list[CommentedMap]]:
        grouped: dict[str, list[CommentedMap]] = {}
        for entry in self.assets:
            grouped.setdefault(entry.get("subject", "?"), []).append(entry)
        return grouped

    def status_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for entry in self.assets:
            status = entry.get("status", "unknown")
            counts[status] = counts.get(status, 0) + 1
        return counts

    def waiting_for_review(self) -> list[CommentedMap]:
        return [e for e in self.assets if e.get("status") in REVIEW_WAITING_STATUSES]

    def existing_filenames(self) -> set[str]:
        names = set()
        for entry in self.assets:
            f = entry.get("file")
            if f:
                names.add(Path(f).name)
        return names
