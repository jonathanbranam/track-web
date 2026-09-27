"""Adopt existing files into the workspace from a plan file.

Design: openspec/changes/game-asset-pipeline/design.md D8;
spec: specs/game-asset-pipeline/spec.md "Adopt existing files from a plan".

A plan is YAML: ``{"moves": [{"from": ..., "to": ..., "entry": {...}}, ...]}``.
Apply validates the whole plan first (every ``from`` exists, no ``to``
exists, no duplicate/already-registered ids), then moves files, registers
entries, removes any directory left empty by the moves, and writes an undo
record (``<plan>.undo.yaml``) that can restore everything.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

from . import manifest as manifest_mod

# Top-level names that are part of the standing workspace scaffold and are
# never removed by empty-directory cleanup, even when currently empty.
_PROTECTED_TOP_NAMES = {"inbox", "work", "reference", "review", "dist", "_migration", "manifest.yaml"}


class AdoptError(RuntimeError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def _yaml() -> YAML:
    y = YAML()
    y.preserve_quotes = True
    y.width = 100000
    return y


def load_plan(path: Path) -> dict[str, Any]:
    with Path(path).open() as fh:
        data = _yaml().load(fh)
    return data or {"moves": []}


def _write_yaml(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as fh:
        _yaml().dump(data, fh)


def validate_plan(game_dir: Path, plan: dict[str, Any], m: manifest_mod.Manifest) -> list[str]:
    errors: list[str] = []
    moves = plan.get("moves", [])
    seen_ids: set[str] = set()
    seen_to: set[str] = set()
    for mv in moves:
        src = game_dir / mv["from"]
        dst = game_dir / mv["to"]
        if not src.exists():
            errors.append(f"missing source: {mv['from']}")
        if dst.exists():
            errors.append(f"destination already exists: {mv['to']}")
        if mv["to"] in seen_to:
            errors.append(f"duplicate destination in plan: {mv['to']}")
        seen_to.add(mv["to"])

        entry = mv.get("entry") or {}
        asset_id = entry.get("id")
        if not asset_id:
            errors.append(f"missing entry.id for {mv['from']}")
            continue
        if asset_id in seen_ids:
            errors.append(f"duplicate id in plan: {asset_id}")
        seen_ids.add(asset_id)
        if m.find(asset_id) is not None:
            errors.append(f"id already registered in manifest: {asset_id}")
    return errors


def _cleanup_empty_dirs(game_dir: Path) -> list[str]:
    """Remove directories left empty (ignoring .DS_Store) by the moves,
    never touching the standing workspace scaffold. Returns the removed
    directories' paths, relative to *game_dir*, deepest first.
    """
    removed: list[str] = []
    candidates = sorted(
        (p for p in game_dir.rglob("*") if p.is_dir()),
        key=lambda p: len(p.parts),
        reverse=True,
    )
    for d in candidates:
        rel = d.relative_to(game_dir)
        if rel.parts and rel.parts[0] in _PROTECTED_TOP_NAMES:
            continue
        entries = list(d.iterdir())
        junk = [e for e in entries if e.name == ".DS_Store"]
        if len(junk) == len(entries):
            for j in junk:
                j.unlink()
            d.rmdir()
            removed.append(str(rel))
    return removed


def apply_plan(
    game_dir: Path,
    plan_path: Path,
    m: manifest_mod.Manifest,
    dry_run: bool = False,
) -> Path | dict[str, Any]:
    """Apply the plan at *plan_path*. Returns the undo record path, or (on
    ``dry_run``) the validated plan dict without changing anything.
    """
    plan = load_plan(plan_path)
    errors = validate_plan(game_dir, plan, m)
    if errors:
        raise AdoptError(errors)
    if dry_run:
        return plan

    moved: list[tuple[str, str]] = []
    added_ids: list[str] = []
    for mv in plan.get("moves", []):
        src = game_dir / mv["from"]
        dst = game_dir / mv["to"]
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
        moved.append((mv["from"], mv["to"]))

        entry = dict(mv["entry"])
        entry["file"] = mv["to"]
        m.add(entry)
        added_ids.append(entry["id"])

    m.save()
    removed_dirs = _cleanup_empty_dirs(game_dir)

    undo_data = {
        "moves": [{"from": to, "to": frm} for frm, to in reversed(moved)],
        "ids": added_ids,
        "removed_dirs": removed_dirs,
    }
    undo_path = plan_path.with_name(plan_path.stem + ".undo.yaml")
    _write_yaml(undo_path, undo_data)
    return undo_path


def undo(game_dir: Path, undo_path: Path, m: manifest_mod.Manifest) -> None:
    """Reverse a previous :func:`apply_plan`: restore original paths and
    remove the entries it added.
    """
    record = load_plan(undo_path)
    for d in record.get("removed_dirs", []):
        (game_dir / d).mkdir(parents=True, exist_ok=True)
    for mv in record.get("moves", []):
        src = game_dir / mv["from"]
        dst = game_dir / mv["to"]
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
    for asset_id in record.get("ids", []):
        entry = m.find(asset_id)
        if entry is not None:
            m.assets.remove(entry)
    m.save()
