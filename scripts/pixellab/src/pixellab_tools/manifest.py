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

# D4 transition table: from-status -> allowed next statuses.
TRANSITIONS: dict[str, set[str]] = {
    "named": {"candidate", "in-review", "approved", "rejected"},
    "candidate": {"in-review", "approved", "rejected"},
    "in-review": {"approved", "rejected"},
    "approved": {"packed", "in-review"},
    "packed": {"shipped", "in-review"},
    "shipped": {"in-review"},
}

ALL_STATUSES = ("named", "candidate", "in-review", "approved", "packed", "shipped", "rejected")
REVIEW_WAITING_STATUSES = ("named", "candidate", "in-review")


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
