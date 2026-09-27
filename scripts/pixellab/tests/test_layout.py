from __future__ import annotations

import os

import pytest
from PIL import Image

from pixellab_tools import layout


def make_grid(cols, rows, cell, filled_count):
    """A cols x rows grid of `cell`-px cells, the first `filled_count` cells
    (row-major) opaque, the rest transparent.
    """
    cw, ch = cell, cell
    img = Image.new("RGBA", (cw * cols, ch * rows), (0, 0, 0, 0))
    filled = 0
    for row in range(rows):
        for col in range(cols):
            if filled < filled_count:
                box = (col * cw, row * ch, (col + 1) * cw, (row + 1) * ch)
                img.paste((255, 0, 0, 255), box)
            filled += 1
    return img


def test_rotation_3x3_8_filled_last_empty():
    img = make_grid(3, 3, 32, 8)
    result = layout.detect_layout(img, cell=32)
    assert result["kind"] == "rotations"
    assert result["dirs"] == ["s", "se", "e", "ne", "n", "nw", "w", "sw"]


def test_animation_5_frame_3x2():
    img = make_grid(3, 2, 32, 5)
    result = layout.detect_layout(img, cell=32)
    assert result["kind"] == "animation"
    assert result["frames"] == 5
    assert result["cols"] == 3 and result["rows"] == 2


def test_variations_8x8_all_filled():
    img = make_grid(8, 8, 32, 64)
    result = layout.detect_layout(img, cell=32)
    assert result["kind"] == "variations"
    assert result["frames"] == 64


def test_single_sprite():
    img = make_grid(1, 1, 32, 1)
    result = layout.detect_layout(img, cell=32)
    assert result["kind"] == "sprite"


def test_unknown_when_cells_not_contiguous():
    img = make_grid(3, 2, 32, 5)
    # Punch a hole in frame 0 to break contiguity.
    img.paste((0, 0, 0, 0), (0, 0, 32, 32))
    result = layout.detect_layout(img, cell=32)
    assert result["kind"] == "unknown"


def test_unknown_when_cell_does_not_divide_image():
    img = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    result = layout.detect_layout(img, cell=32)
    assert result["kind"] == "unknown"


def test_guess_cell_size_finds_rotation_grid():
    img = make_grid(3, 3, 32, 8)
    assert layout.guess_cell_size(img) == 32


def test_guess_cell_size_prefers_32_over_16():
    # A 16px grid also happens to divide evenly, but 32 is tried first and
    # matches rule 1 (rotations) — should be preferred.
    img = make_grid(3, 3, 32, 8)
    assert img.size == (96, 96)
    assert layout.guess_cell_size(img) == 32


def test_guess_cell_size_none_for_plain_sprite():
    img = make_grid(1, 1, 32, 1)
    assert layout.guess_cell_size(img) is None


def test_detect_layout_without_cell_uses_guess():
    img = make_grid(8, 8, 32, 64)
    result = layout.detect_layout(img)
    assert result["kind"] == "variations"


GAME_ASSETS_DIR = os.environ.get("GAME_ASSETS_DIR")
# The original web-download filename, before `assets adopt` (task 5.2) moved
# and renamed it into the convention layout -- this test now points at its
# post-adopt path.
REAL_ROTATION_FILE = "/Volumes/Data/Dropbox/games/mimlings/work/mochi-bunny/mochi-bunny-rot8-32.png"


@pytest.mark.skipif(
    not os.path.isfile(REAL_ROTATION_FILE),
    reason="GAME_ASSETS_DIR workspace / adopted mimlings rotation file not present on this machine",
)
def test_real_web_download_rotation_grid():
    result = layout.detect_layout(REAL_ROTATION_FILE, cell=32)
    assert result["kind"] == "rotations"
    assert result["dirs"] == ["s", "se", "e", "ne", "n", "nw", "w", "sw"]
