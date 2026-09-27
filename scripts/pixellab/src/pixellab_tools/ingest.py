"""Ingest inbox/ files into work/<subject>/ under convention names.

Spec: specs/game-asset-pipeline/spec.md "Ingest from the inbox";
design: openspec/changes/game-asset-pipeline/design.md D5.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

from . import layout, manifest, naming

_MS_TIMESTAMP_RE = re.compile(r"(\d{13})(?=\.\w+$)")


def decode_ms_timestamp(filename: str) -> str | None:
    m = _MS_TIMESTAMP_RE.search(filename)
    if not m:
        return None
    ms = int(m.group(1))
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class PlannedAsset:
    src: Path
    dest: Path  # relative to game_dir
    entry: dict[str, Any]


@dataclass
class IngestPlan:
    planned: list[PlannedAsset] = field(default_factory=list)
    unresolved: list[tuple[Path, str]] = field(default_factory=list)


def _base_entry(subject: str, kind: str, source: dict[str, Any]) -> dict[str, Any]:
    return {
        "subject": subject,
        "kind": kind,
        "status": "named",
        "tags": [],
        "source": source,
        "review": {"verdict": None, "note": None, "at": None},
        "history": [{"at": _now(), "to": "named", "note": "ingested"}],
    }


def _plan_from_grid(
    f: Path,
    result: dict[str, Any],
    subject: str,
    anim: str | None,
    dir_: str | None,
    label: str | None,
    existing_names: set[str],
) -> tuple[PlannedAsset | None, str | None]:
    kind = result["kind"]
    cell = result["cell"]
    source = {"tool": "pixellab-web", "original": f.name}
    created = decode_ms_timestamp(f.name)
    if created:
        source["created"] = created

    if kind == "rotations":
        filename = naming.build_rotations(subject, 8, cell, label=label)
        entry = _base_entry(subject, kind, source)
        entry["layout"] = {
            "cell": list(cell), "cols": result["cols"], "rows": result["rows"],
            "frames": 8, "order": "row-major", "dirs": result["dirs"],
        }
    elif kind == "variations":
        filename = naming.build_variations(subject, result["cols"], result["rows"], cell, label=label)
        entry = _base_entry(subject, kind, source)
        entry["layout"] = {
            "cell": list(cell), "cols": result["cols"], "rows": result["rows"],
            "frames": result["frames"], "order": "row-major",
        }
    elif kind == "animation":
        if not anim:
            return None, "animation name unknown; pass --anim"
        if not dir_:
            return None, "direction unknown; pass --dir"
        filename = naming.build_animation(subject, anim, dir_, cell, result["frames"], label=label)
        entry = _base_entry(subject, kind, source)
        entry["anim"] = anim
        entry["dir"] = dir_
        entry["layout"] = {
            "cell": list(cell), "cols": result["cols"], "rows": result["rows"],
            "frames": result["frames"], "order": "row-major",
        }
    elif kind == "sprite":
        if not dir_:
            return None, "direction unknown; pass --dir"
        filename = naming.build_sprite(subject, dir_, cell, label=label)
        entry = _base_entry(subject, kind, source)
        entry["dir"] = dir_
    else:
        return None, "layout not recognised (rotation/variations/animation/sprite); pass --cell?"

    final_name = naming.with_collision_label(filename, existing_names)
    dest = Path("work") / subject / final_name
    return PlannedAsset(src=f, dest=dest, entry=entry), None


def _plan_from_convention_name(f: Path, existing_names: set[str]) -> PlannedAsset | None:
    blind = naming.parse_name(f.name)
    if blind is None or blind.get("subject") is None:
        return None
    subject = blind["subject"]
    hinted = naming.parse_name(f.name, subject=subject)
    if hinted is None:
        return None

    kind = hinted["kind"]
    source = {"tool": "third-party", "original": f.name}
    entry = _base_entry(subject, kind, source)
    if hinted.get("label"):
        pass  # label lives only in the filename, not as a separate manifest field
    if kind == "sprite":
        entry["dir"] = hinted["dir"]
    elif kind == "rotations":
        entry["layout"] = {"cell": [hinted["cell"]], "dirs": list(naming.DIRECTIONS)}
    elif kind == "animation":
        entry["anim"] = hinted["anim"]
        entry["dir"] = hinted["dir"]
        entry["layout"] = {"cell": [hinted["cell"]], "frames": hinted["frames"], "order": "row-major"}
    elif kind == "variations":
        entry["layout"] = {
            "cell": [hinted["cell"]], "cols": hinted["cols"], "rows": hinted["rows"], "order": "row-major",
        }

    final_name = naming.with_collision_label(f.name, existing_names)
    dest = Path("work") / subject / final_name
    return PlannedAsset(src=f, dest=dest, entry=entry)


def _is_pixellab_export_json(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    if isinstance(data, dict) and "spritesheet" in data:
        return data
    return None


def _plan_from_export(
    png_path: Path,
    json_path: Path,
    data: dict[str, Any],
    subject: str | None,
    existing_names: set[str],
) -> tuple[list[PlannedAsset], list[tuple[Path, str]]]:
    if not subject:
        return [], [(png_path, "subject unknown for PixelLab export; pass --subject")]

    character = data.get("character", {})
    spritesheet = data["spritesheet"]
    cell = spritesheet.get("cell_size", {})
    cw, ch = cell.get("width"), cell.get("height")
    character_id = character.get("id")
    # The library-list endpoint (`GET /characters`) calls this field
    # `state_name`; the spritesheet export's `character` object instead
    # calls the very same thing `name` (verified 2026-09-27 against a real
    # export -- docs/pixellab/api.md's example only showed `name`). Prefer
    # `state_name` when present, since it's the more specific key.
    state_source = character.get("state_name") or character.get("name") or ""
    state_label = re.sub(r"[^a-z0-9]+", "-", state_source.lower()).strip("-") or None

    sheet = Image.open(png_path)
    planned: list[PlannedAsset] = []
    used_names: set[str] = set(existing_names)

    for row in spritesheet.get("rows", []):
        row_index = row["row"]
        frame_count = row["frame_count"]
        box = (0, row_index * ch, frame_count * cw, (row_index + 1) * ch)
        crop = sheet.crop(box)

        source = {
            "tool": "pixellab-export",
            "original": spritesheet.get("path", png_path.name),
            "pixellab": {"character_id": character_id},
        }

        if row.get("type") == "rotations":
            filename = naming.build_rotations(subject, 8, (cw, ch), label=state_label)
            entry = _base_entry(subject, "rotations", source)
            entry["layout"] = {
                "cell": [cw, ch], "cols": frame_count, "rows": 1,
                "frames": frame_count, "order": "row-major",
                "dirs": [naming.FULL_TO_DIRECTION.get(d, d) for d in row.get("directions", [])],
            }
        else:
            anim_kebab = re.sub(r"[^a-z0-9]+", "-", row.get("animation", "anim").lower()).strip("-")
            dir_full = row.get("direction", "south")
            dir_code = naming.FULL_TO_DIRECTION.get(dir_full, "s")
            filename = naming.build_animation(subject, anim_kebab, dir_code, (cw, ch), frame_count, label=state_label)
            entry = _base_entry(subject, "animation", source)
            entry["anim"] = anim_kebab
            entry["dir"] = dir_code
            entry["layout"] = {
                "cell": [cw, ch], "cols": frame_count, "rows": 1,
                "frames": frame_count, "order": "row-major",
            }

        final_name = naming.with_collision_label(filename, used_names)
        used_names.add(final_name)
        dest_path_placeholder = Path("work") / subject / final_name
        entry["_crop"] = crop  # consumed by apply_plan; never written to the manifest
        planned.append(PlannedAsset(src=png_path, dest=dest_path_placeholder, entry=entry))

    return planned, []


def build_plan(
    game_dir: Path,
    m: manifest.Manifest,
    *,
    subject: str | None = None,
    anim: str | None = None,
    dir: str | None = None,
    cell: int | tuple[int, int] | None = None,
    label: str | None = None,
) -> IngestPlan:
    inbox = game_dir / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in inbox.iterdir() if p.is_file() and p.name != ".DS_Store")
    file_set = set(files)
    handled: set[Path] = set()
    plan = IngestPlan()
    existing_names = m.existing_filenames()

    def all_used_names() -> set[str]:
        return existing_names | {a.dest.name for a in plan.planned}

    # 1. PixelLab spritesheet exports: <name>.png + <name>.json
    for f in files:
        if f in handled or f.suffix.lower() != ".png":
            continue
        json_path = f.with_suffix(".json")
        if json_path not in file_set or json_path in handled:
            continue
        data = _is_pixellab_export_json(json_path)
        if data is None:
            continue
        handled.add(f)
        handled.add(json_path)
        sub_planned, sub_unresolved = _plan_from_export(f, json_path, data, subject, all_used_names())
        plan.planned.extend(sub_planned)
        plan.unresolved.extend(sub_unresolved)

    # 2. Files already named per the naming convention.
    for f in files:
        if f in handled:
            continue
        asset = _plan_from_convention_name(f, all_used_names())
        if asset is not None:
            handled.add(f)
            plan.planned.append(asset)

    # 3. Grid detection on whatever's left.
    for f in files:
        if f in handled:
            continue
        if f.suffix.lower() != ".png":
            plan.unresolved.append((f, "not a PNG"))
            continue
        try:
            img = Image.open(f)
        except Exception as exc:  # noqa: BLE001
            plan.unresolved.append((f, f"could not open image: {exc}"))
            continue
        result = layout.detect_layout(img, cell=cell)
        if result["kind"] == "unknown":
            plan.unresolved.append((f, "layout not recognised (rotation/variations/animation/sprite); pass --cell?"))
            continue
        if not subject:
            plan.unresolved.append((f, "subject unknown; pass --subject"))
            continue
        asset, reason = _plan_from_grid(f, result, subject, anim, dir, label, all_used_names())
        if asset is None:
            plan.unresolved.append((f, reason or "could not resolve"))
        else:
            plan.planned.append(asset)

    return plan


def apply_plan(plan: IngestPlan, game_dir: Path, m: manifest.Manifest) -> list[str]:
    """Apply *plan*: move/crop files, register manifest entries.

    Returns the list of newly registered asset ids.
    """
    new_ids: list[str] = []
    for asset in plan.planned:
        dest_path = game_dir / asset.dest
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        entry = dict(asset.entry)
        crop = entry.pop("_crop", None)
        if crop is not None:
            crop.save(dest_path)
        else:
            asset.src.rename(dest_path)
        entry["id"] = dest_path.stem
        entry["file"] = str(asset.dest)
        m.add(entry)
        new_ids.append(entry["id"])

    # Remove export JSON sidecars and source PNGs once every row has been
    # cropped out of them (the sheet itself is not registered).
    consumed_sheets = {a.src for a in plan.planned if "_crop" in a.entry}
    for sheet in consumed_sheets:
        json_path = sheet.with_suffix(".json")
        if json_path.exists():
            json_path.unlink()
        if sheet.exists():
            sheet.unlink()

    if plan.planned:
        m.save()
    return new_ids
