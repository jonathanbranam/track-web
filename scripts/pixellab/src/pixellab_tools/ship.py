"""Ship packed sheets to a per-game configured destination.

Design: openspec/changes/game-asset-pipeline/design.md (Ship, referenced from
D9's ship config); spec: specs/game-asset-pipeline/spec.md
"Ship to a configured destination".
"""

from __future__ import annotations

import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config, manifest as manifest_mod


class ShipError(RuntimeError):
    def __init__(self, errors: list[str] | str):
        self.errors = [errors] if isinstance(errors, str) else errors
        super().__init__("; ".join(self.errors))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_destination(dest_str: str, env: dict[str, str] | None = None) -> Path:
    """Resolve a ship destination: absolute, repo-relative, or ${VAR}-expanded."""
    target = os.environ if env is None else env
    expanded = os.path.expandvars(dest_str) if env is None else _expandvars(dest_str, target)
    p = Path(expanded)
    if p.is_absolute():
        return p
    return config.find_repo_root() / p


def _expandvars(s: str, env: dict[str, str]) -> str:
    import re

    def repl(m: "re.Match[str]") -> str:
        name = m.group(1) or m.group(2)
        return env.get(name, m.group(0))

    return re.sub(r"\$\{(\w+)\}|\$(\w+)", repl, s)


def packed_subjects(m: manifest_mod.Manifest) -> list[str]:
    return sorted({e["subject"] for e in m.assets if e.get("status") == "packed"})


def _validate(game_dir: Path, m: manifest_mod.Manifest, subjects: list[str]) -> list[str]:
    errors = []
    for subject in subjects:
        pending = [e["id"] for e in m.assets if e.get("subject") == subject and e.get("status") == "approved"]
        if pending:
            errors.append(
                f"{subject!r} has unpacked approved changes ({', '.join(pending)}); run `assets pack` first"
            )
        png_path = game_dir / "dist" / f"{subject}.png"
        json_path = game_dir / "dist" / f"{subject}.json"
        if not png_path.is_file() or not json_path.is_file():
            errors.append(f"{subject!r} has no packed sheet in dist/ (run `assets pack` first)")
    return errors


def ship(
    game_dir: Path,
    m: manifest_mod.Manifest,
    subjects: list[str] | None = None,
    dry_run: bool = False,
    env: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    game = m.data.get("game", game_dir.name)
    ship_cfg = m.config.get("ship") or {}
    dest_str = ship_cfg.get("dest")
    if not dest_str:
        raise ShipError(
            f"No ship destination configured for {game!r}. Set config.ship.dest in {m.path}"
        )
    dest_dir = resolve_destination(dest_str, env)

    targets = subjects if subjects else packed_subjects(m)
    if not targets:
        raise ShipError(f"No packed subjects to ship for {game!r}")

    errors = _validate(game_dir, m, targets)
    if errors:
        raise ShipError(errors)

    results: list[dict[str, Any]] = []
    for subject in targets:
        png_path = game_dir / "dist" / f"{subject}.png"
        json_path = game_dir / "dist" / f"{subject}.json"
        sha256 = hashlib.sha256(png_path.read_bytes()).hexdigest()
        result = {"subject": subject, "dest": str(dest_dir), "sha256": sha256}
        results.append(result)
        if dry_run:
            continue

        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(png_path, dest_dir / png_path.name)
        shutil.copy2(json_path, dest_dir / json_path.name)

        at = _now()
        for entry in m.assets:
            if entry.get("subject") == subject and entry.get("status") == "packed":
                entry["ship"] = {"dest": str(dest_dir), "sha256": sha256, "at": at}
                m.mark(entry["id"], "shipped", force=True)

    if not dry_run:
        m.save()
    return results
