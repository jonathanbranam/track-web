"""Build/parse the asset naming convention.

Spec: specs/game-asset-pipeline/spec.md "Naming convention". Forms:

- still, one direction: ``<subject>-<dir>-<cell>[-<label>].png``
- rotation set: ``<subject>-rot<4|8>-<cell>[-<label>].png``
- animation: ``<subject>-<anim>-<dir>-<cell>-<n>f[-<label>].png``
- candidate/variation grid: ``<subject>-variations-<cols>x<rows>-<cell>[-<label>].png``
- other kinds: ``<subject>-<kind>[-<desc>][-<label>].<ext>``

``<dir>`` is one of ``s se e ne n nw w sw`` (PixelLab's direction order:
south, south-east, east, north-east, north, north-west, west, south-west).
"""

from __future__ import annotations

import re
from typing import Any

DIRECTIONS: list[str] = ["s", "se", "e", "ne", "n", "nw", "w", "sw"]

DIRECTION_TO_FULL = {
    "s": "south", "se": "south-east", "e": "east", "ne": "north-east",
    "n": "north", "nw": "north-west", "w": "west", "sw": "south-west",
}
FULL_TO_DIRECTION = {v: k for k, v in DIRECTION_TO_FULL.items()}

_DIR_ALT = "|".join(sorted(DIRECTIONS, key=len, reverse=True))
_LABEL = r"[a-z0-9]+(?:-[a-z0-9]+)*"
_CELL = r"\d+(?:x\d+)?"


class NamingError(ValueError):
    pass


def format_cell(cell: int | tuple[int, int] | str) -> str:
    if isinstance(cell, str):
        return cell
    if isinstance(cell, (tuple, list)):
        w, h = cell
        return str(w) if w == h else f"{w}x{h}"
    return str(cell)


def _join(parts: list[str], label: str | None, ext: str) -> str:
    if label:
        parts = [*parts, label]
    return "-".join(parts) + "." + ext


def build_sprite(subject: str, dir: str, cell: Any, label: str | None = None, ext: str = "png") -> str:
    if dir not in DIRECTIONS:
        raise NamingError(f"Unknown direction code: {dir!r}")
    return _join([subject, dir, format_cell(cell)], label, ext)


def build_rotations(subject: str, rot: int, cell: Any, label: str | None = None, ext: str = "png") -> str:
    if rot not in (4, 8):
        raise NamingError(f"Rotation count must be 4 or 8, got {rot!r}")
    return _join([subject, f"rot{rot}", format_cell(cell)], label, ext)


def build_animation(
    subject: str, anim: str, dir: str, cell: Any, frames: int,
    label: str | None = None, ext: str = "png",
) -> str:
    if dir not in DIRECTIONS:
        raise NamingError(f"Unknown direction code: {dir!r}")
    return _join([subject, anim, dir, format_cell(cell), f"{frames}f"], label, ext)


def build_variations(
    subject: str, cols: int, rows: int, cell: Any,
    label: str | None = None, ext: str = "png",
) -> str:
    return _join([subject, "variations", f"{cols}x{rows}", format_cell(cell)], label, ext)


def build_other(
    subject: str, kind: str, desc: str | None = None,
    label: str | None = None, ext: str = "png",
) -> str:
    parts = [subject, kind]
    if desc:
        parts.append(desc)
    return _join(parts, label, ext)


def build_name(entry: dict[str, Any]) -> str:
    """Build a filename from a manifest-entry-shaped dict."""
    kind = entry["kind"]
    subject = entry["subject"]
    label = entry.get("label")
    ext = entry.get("ext", "png")
    if kind == "sprite":
        return build_sprite(subject, entry["dir"], entry["cell"], label, ext)
    if kind == "rotations":
        return build_rotations(subject, entry["rot"], entry["cell"], label, ext)
    if kind == "animation":
        return build_animation(subject, entry["anim"], entry["dir"], entry["cell"], entry["frames"], label, ext)
    if kind == "variations":
        return build_variations(subject, entry["cols"], entry["rows"], entry["cell"], label, ext)
    return build_other(subject, kind, entry.get("desc"), label, ext)


def with_collision_label(name: str, existing: set[str]) -> str:
    """If *name* is already taken, append ``-v2``, ``-v3``, … before the ext."""
    if name not in existing:
        return name
    if "." in name:
        stem, ext = name.rsplit(".", 1)
    else:
        stem, ext = name, ""
    n = 2
    while True:
        candidate = f"{stem}-v{n}.{ext}" if ext else f"{stem}-v{n}"
        if candidate not in existing:
            return candidate
        n += 1


# --- Parsing -----------------------------------------------------------

_ROT_RE = re.compile(rf"^rot(?P<rot>4|8)-(?P<cell>{_CELL})(?:-(?P<label>{_LABEL}))?$")
_ANIM_RE = re.compile(
    rf"^(?P<anim>[a-z0-9]+(?:-[a-z0-9]+)*)-(?P<dir>{_DIR_ALT})-(?P<cell>{_CELL})-(?P<frames>\d+)f"
    rf"(?:-(?P<label>{_LABEL}))?$"
)
_VAR_RE = re.compile(rf"^variations-(?P<cols>\d+)x(?P<rows>\d+)-(?P<cell>{_CELL})(?:-(?P<label>{_LABEL}))?$")
_SPRITE_RE = re.compile(rf"^(?P<dir>{_DIR_ALT})-(?P<cell>{_CELL})(?:-(?P<label>{_LABEL}))?$")

# "Other kinds" (spec bullet 5) cover everything not already handled by the
# four explicit forms above: sheet, tileset, background, ui, source,
# reference. Restricting to this vocabulary (rather than any [a-z0-9]+) is
# what lets the checker actually flag prompt-fragment web downloads, which
# would otherwise match a permissive "<subject>-<word>" pattern.
OTHER_KINDS = {"sheet", "tileset", "background", "ui", "source", "reference"}
_OTHER_KIND_ALT = "|".join(sorted(OTHER_KINDS, key=len, reverse=True))
_OTHER_RE = re.compile(rf"^(?P<kind>{_OTHER_KIND_ALT})(?:-(?P<rest>[a-z0-9-]+))?$")

# Whole-filename forms (subject unbound/greedy) — used only for conformance
# checking, where we don't need to recover the exact field split.
_WHOLE_FORMS = [
    ("rotations", re.compile(rf"^(?P<subject>[a-z0-9]+(?:-[a-z0-9]+)*)-rot(?P<rot>4|8)-{_CELL}(?:-{_LABEL})?\.\w+$")),
    (
        "animation",
        re.compile(
            rf"^(?P<subject>[a-z0-9]+(?:-[a-z0-9]+)*)-[a-z0-9]+(?:-[a-z0-9]+)*-(?:{_DIR_ALT})-{_CELL}-\d+f(?:-{_LABEL})?\.\w+$"
        ),
    ),
    ("variations", re.compile(rf"^(?P<subject>[a-z0-9]+(?:-[a-z0-9]+)*)-variations-\d+x\d+-{_CELL}(?:-{_LABEL})?\.\w+$")),
    ("sprite", re.compile(rf"^(?P<subject>[a-z0-9]+(?:-[a-z0-9]+)*)-(?:{_DIR_ALT})-{_CELL}(?:-{_LABEL})?\.\w+$")),
]

_OTHER_WHOLE_RE = re.compile(
    rf"^(?P<subject>[a-z0-9]+(?:-[a-z0-9]+)*)-(?:{_OTHER_KIND_ALT})(?:-[a-z0-9-]+)?\.\w+$"
)


def parse_name(filename: str, subject: str | None = None) -> dict[str, Any] | None:
    """Parse *filename* into its naming-convention fields.

    Without *subject*, parsing is ambiguous whenever the subject itself
    contains hyphens (``mochi-bunny``); pass the known subject (as `ingest`
    and the manifest always do) to parse exactly. Returns ``None`` if the
    name does not match any recognised form.
    """
    if "." not in filename:
        return None
    stem, ext = filename.rsplit(".", 1)

    if subject is not None:
        prefix = subject + "-"
        if not stem.startswith(prefix):
            return None
        remainder = stem[len(prefix):]
        for kind, regex in (
            ("rotations", _ROT_RE),
            ("animation", _ANIM_RE),
            ("variations", _VAR_RE),
            ("sprite", _SPRITE_RE),
        ):
            m = regex.match(remainder)
            if m:
                fields = m.groupdict()
                fields["kind"] = kind
                fields["subject"] = subject
                fields["ext"] = ext
                if fields.get("rot"):
                    fields["rot"] = int(fields["rot"])
                if fields.get("frames"):
                    fields["frames"] = int(fields["frames"])
                if fields.get("cols"):
                    fields["cols"] = int(fields["cols"])
                    fields["rows"] = int(fields["rows"])
                return fields
        m = _OTHER_RE.match(remainder)
        if m:
            rest = m.group("rest")
            label = None
            desc = rest
            if rest:
                tail_parts = rest.split("-")
                if len(tail_parts) > 1 and re.fullmatch(_LABEL, tail_parts[-1]):
                    # Heuristic: last token may be a label; kept as part of
                    # desc too since the two aren't distinguishable in
                    # general — callers with more context should not rely
                    # on this split for `other`.
                    label = tail_parts[-1]
                    desc = "-".join(tail_parts[:-1]) or None
            return {
                "kind": "other",
                "subject": subject,
                "ext": ext,
                "other_kind": m.group("kind"),
                "desc": desc,
                "label": label,
            }
        return None

    # No hint: best-effort whole-filename match, subject recovered greedily.
    for kind, regex in _WHOLE_FORMS:
        m = regex.match(filename)
        if m:
            return {"kind": kind, "subject": m.group("subject")}
    m = _OTHER_WHOLE_RE.match(filename)
    if m:
        return {"kind": "other", "subject": m.group("subject")}
    return None


def is_conforming(filename: str) -> bool:
    """True if *filename* matches any recognised naming-convention form."""
    return parse_name(filename) is not None


def check_names(filenames: list[str]) -> list[str]:
    """Return the subset of *filenames* that do not conform."""
    return [f for f in filenames if not is_conforming(f)]
