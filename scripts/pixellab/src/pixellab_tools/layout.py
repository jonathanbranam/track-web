"""Grid layout detection for a generated/downloaded PNG.

Design: openspec/changes/game-asset-pipeline/design.md D5.

Given a PNG and a cell size, the image is split into a grid of cells and
each cell is marked empty if every pixel has alpha 0. The first matching
rule wins:

1. 3x3 grid, cells 0-7 filled, cell 8 empty -> ``rotations`` (PixelLab order).
2. 8x8 grid, all 64 cells filled -> ``variations``.
3. A single cell (1x1 grid) -> ``sprite``.
4. Otherwise, filled cells contiguous from index 0 -> ``animation``, with
   ``frames`` = the filled count.

Anything else is ``unknown``. The cell size can be guessed by trying 32,
16, 48, 64 (in that order), preferring the size where rule 1 or 2 holds.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image

from . import naming

GUESS_SIZES = (32, 16, 48, 64)


def _normalize_cell(cell: int | tuple[int, int]) -> tuple[int, int]:
    if isinstance(cell, (tuple, list)):
        return int(cell[0]), int(cell[1])
    return int(cell), int(cell)


def _grid_dims(image_size: tuple[int, int], cell: tuple[int, int]) -> tuple[int, int] | None:
    w, h = image_size
    cw, ch = cell
    if cw <= 0 or ch <= 0 or w % cw != 0 or h % ch != 0:
        return None
    return w // cw, h // ch


def _cell_filled(image: Image.Image, col: int, row: int, cw: int, ch: int) -> bool:
    box = (col * cw, row * ch, (col + 1) * cw, (row + 1) * ch)
    region = image.crop(box)
    if region.mode != "RGBA":
        # No alpha channel at all: treat every cell as filled (opaque source).
        return True
    alpha = region.getchannel("A")
    _lo, hi = alpha.getextrema()
    return hi > 0


def _load(image: Image.Image | str | Path) -> Image.Image:
    if isinstance(image, Image.Image):
        return image
    return Image.open(image)


def _analyze_with_cell(image: Image.Image, cell: tuple[int, int]) -> dict[str, Any]:
    dims = _grid_dims(image.size, cell)
    if dims is None:
        return {"kind": "unknown", "cell": cell}
    cols, rows = dims
    total = cols * rows
    filled = [_cell_filled(image, c, r, cell[0], cell[1]) for r in range(rows) for c in range(cols)]

    if cols == 3 and rows == 3 and filled[:8] == [True] * 8 and filled[8] is False:
        return {
            "kind": "rotations",
            "cell": cell,
            "cols": 3,
            "rows": 3,
            "dirs": list(naming.DIRECTIONS),
        }

    if cols == 8 and rows == 8 and all(filled):
        return {"kind": "variations", "cell": cell, "cols": 8, "rows": 8, "frames": 64}

    if total == 1:
        return {"kind": "sprite", "cell": cell}

    filled_count = sum(filled)
    if filled_count > 0:
        head = filled[:filled_count]
        tail = filled[filled_count:]
        if all(head) and not any(tail):
            return {
                "kind": "animation",
                "cell": cell,
                "cols": cols,
                "rows": rows,
                "frames": filled_count,
            }

    return {"kind": "unknown", "cell": cell, "cols": cols, "rows": rows}


def guess_cell_size(image: Image.Image | str | Path) -> int | None:
    """Try GUESS_SIZES, preferring the size where rule 1 (rotations) or
    rule 2 (variations) holds. Returns ``None`` if none matches.
    """
    img = _load(image)
    for size in GUESS_SIZES:
        result = _analyze_with_cell(img, (size, size))
        if result["kind"] in ("rotations", "variations"):
            return size
    return None


def detect_layout(image: Image.Image | str | Path, cell: int | tuple[int, int] | None = None) -> dict[str, Any]:
    """Detect the grid layout of *image*.

    If *cell* is omitted, the size is guessed via :func:`guess_cell_size`
    (which only succeeds for a rotation or variations grid); otherwise the
    caller's cell size is used directly, which also lets an animation grid
    with a known cell size be detected.
    """
    img = _load(image)
    if cell is not None:
        return _analyze_with_cell(img, _normalize_cell(cell))
    guessed = guess_cell_size(img)
    if guessed is None:
        return {"kind": "unknown"}
    return _analyze_with_cell(img, (guessed, guessed))
