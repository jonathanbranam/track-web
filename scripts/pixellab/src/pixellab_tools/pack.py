"""Pack approved assets of one subject into a sheet PNG + Aseprite JSON.

Design: openspec/changes/game-asset-pipeline/design.md D6;
spec: specs/game-asset-pipeline/spec.md "Pack approved assets into a sheet".

Frames are ordered rotations first, then animations sorted by id, placed in
a grid of at most 16 columns with no padding. The JSON is Aseprite's "hash"
format: ``frames`` keyed by stringified index ("0".."N-1", confirmed against
Phaser's `AnimationManager.createFromAseprite`, design D6 step 5), and
``meta.frameTags`` naming ``<anim>-<dir>`` / ``rot-<dir>`` ranges.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image

from . import config, manifest as manifest_mod, naming

MAX_COLUMNS = 16
PACKABLE_STATUSES = {"approved", "packed"}


class PackError(RuntimeError):
    pass


@dataclass
class Frame:
    image: Image.Image
    tag: str | None
    duration: int
    sort_key: tuple


def _cell_size(entry: dict[str, Any], abs_path: Path) -> tuple[int, int]:
    layout = entry.get("layout")
    if layout and layout.get("cell"):
        c = layout["cell"]
        return int(c[0]), int(c[1])
    with Image.open(abs_path) as img:
        return img.size


def _frames_from_png_entry(game_dir: Path, entry: dict[str, Any], sort_index: int) -> list[Frame]:
    abs_path = game_dir / entry["file"]
    kind = entry["kind"]
    if kind not in ("rotations", "animation", "sprite"):
        return []
    img = Image.open(abs_path).convert("RGBA")
    cw, ch = _cell_size(entry, abs_path)
    duration = int(entry.get("fps") or 100)

    if kind == "rotations":
        layout = entry.get("layout") or {}
        dirs = layout.get("dirs") or list(naming.DIRECTIONS)
        cols = layout.get("cols") or len(dirs)
        frames = []
        for i, d in enumerate(dirs):
            col, row = i % cols, i // cols
            cell = img.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            frames.append(Frame(cell, f"rot-{d}", duration, (0, sort_index, i)))
        return frames

    if kind == "animation":
        layout = entry.get("layout") or {}
        cols = layout.get("cols") or layout.get("frames") or 1
        n = int(layout.get("frames") or 1)
        tag = f"{entry.get('anim')}-{entry.get('dir')}"
        frames = []
        for i in range(n):
            col, row = i % cols, i // cols
            cell = img.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            frames.append(Frame(cell, tag, duration, (1, entry["id"], i)))
        return frames

    # sprite: a single still, tagged by its direction (or its id if no dir).
    tag = entry.get("dir") or entry["id"]
    return [Frame(img, tag, duration, (2, entry["id"], 0))]


def _export_aseprite_frames(aseprite_bin: str, abs_path: Path, tmp_dir: Path, entry_id: str) -> list[Frame]:
    data_path = tmp_dir / f"{entry_id}.json"
    pattern = str(tmp_dir / f"{entry_id}-{{frame}}.png")
    try:
        subprocess.run(
            [aseprite_bin, "-b", str(abs_path), "--data", str(data_path),
             "--format", "json-array", "--list-tags", "--save-as", pattern],
            capture_output=True, text=True, timeout=60,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PackError(f"could not run Aseprite for {abs_path}: {exc}") from exc

    frame_files = sorted(
        tmp_dir.glob(f"{entry_id}-*.png"),
        key=lambda p: int(p.stem.rsplit("-", 1)[-1]),
    )
    if not frame_files:
        raise PackError(f"Aseprite produced no frames for {abs_path} (see design Risks)")

    tag_ranges: list[tuple[str, int, int]] = []
    if data_path.exists():
        try:
            meta = json.loads(data_path.read_text()).get("meta", {})
            for tag in meta.get("frameTags", []):
                tag_ranges.append((tag["name"], int(tag["from"]), int(tag["to"])))
        except (json.JSONDecodeError, KeyError, ValueError):
            pass

    def tag_for(i: int) -> str | None:
        for name, frm, to in tag_ranges:
            if frm <= i <= to:
                return name
        return None

    frames = []
    for i, p in enumerate(frame_files):
        img = Image.open(p).convert("RGBA")
        frames.append(Frame(img, tag_for(i), 100, (3, entry_id, i)))
    return frames


def collect_frames(
    game_dir: Path,
    m: manifest_mod.Manifest,
    subject: str,
    env: dict[str, str] | None = None,
    tmp_dir: Path | None = None,
) -> list[Frame]:
    entries = [e for e in m.assets if e.get("subject") == subject and e.get("status") in PACKABLE_STATUSES]
    if not entries:
        raise PackError(f"no approved/packed assets for subject {subject!r}")

    frames: list[Frame] = []
    aseprite_bin = None
    for i, entry in enumerate(entries):
        kind = entry.get("kind")
        if kind == "source":
            file_rel = entry.get("file", "")
            if not file_rel.endswith(".aseprite"):
                continue
            if aseprite_bin is None:
                aseprite_bin = config.get_aseprite_bin(env)
            if tmp_dir is None:
                raise PackError("internal error: tmp_dir required for Aseprite sources")
            frames.extend(_export_aseprite_frames(aseprite_bin, game_dir / file_rel, tmp_dir, entry["id"]))
        else:
            frames.extend(_frames_from_png_entry(game_dir, entry, i))

    if not frames:
        raise PackError(f"no packable frames found for subject {subject!r}")

    sizes = {f.image.size for f in frames}
    if len(sizes) > 1:
        raise PackError(f"mixed cell sizes for subject {subject!r}: {sorted(sizes)}")

    frames.sort(key=lambda f: f.sort_key)
    return frames


def build_sheet(frames: list[Frame]) -> tuple[Image.Image, list[dict[str, Any]]]:
    cw, ch = frames[0].image.size
    n = len(frames)
    cols = min(MAX_COLUMNS, n)
    rows = -(-n // cols)
    sheet = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    frame_meta = []
    for i, f in enumerate(frames):
        col, row = i % cols, i // cols
        x, y = col * cw, row * ch
        sheet.paste(f.image, (x, y))
        frame_meta.append({
            "frame": {"x": x, "y": y, "w": cw, "h": ch},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": cw, "h": ch},
            "sourceSize": {"w": cw, "h": ch},
            "duration": f.duration,
        })
    return sheet, frame_meta


def build_frame_tags(frames: list[Frame]) -> list[dict[str, Any]]:
    tags: list[dict[str, Any]] = []
    i = 0
    n = len(frames)
    while i < n:
        tag = frames[i].tag
        if tag is None:
            i += 1
            continue
        j = i
        while j + 1 < n and frames[j + 1].tag == tag:
            j += 1
        tags.append({"name": tag, "from": i, "to": j, "direction": "forward"})
        i = j + 1
    return tags


def pack(
    game_dir: Path,
    m: manifest_mod.Manifest,
    subject: str,
    env: dict[str, str] | None = None,
) -> tuple[Path, Path]:
    """Pack *subject*'s approved/packed assets. Returns (png_path, json_path).

    Nothing is written if it fails.
    """
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        frames = collect_frames(game_dir, m, subject, env=env, tmp_dir=Path(tmp))

    sheet, frame_meta = build_sheet(frames)
    tags = build_frame_tags(frames)

    dist_dir = game_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    png_path = dist_dir / f"{subject}.png"
    json_path = dist_dir / f"{subject}.json"

    sheet.save(png_path)

    frames_obj = {str(i): meta for i, meta in enumerate(frame_meta)}
    data = {
        "frames": frames_obj,
        "meta": {
            "image": png_path.name,
            "size": {"w": sheet.width, "h": sheet.height},
            "format": "RGBA8888",
            "scale": "1",
            "frameTags": tags,
        },
    }
    json_path.write_text(json.dumps(data, indent=1))

    for entry in m.assets:
        if entry.get("subject") == subject and entry.get("status") in PACKABLE_STATUSES:
            if entry["status"] != "packed":
                m.mark(entry["id"], "packed", force=True)
    m.save()

    return png_path, json_path
