from __future__ import annotations

import json
import os

import pytest
from PIL import Image, ImageChops

from pixellab_tools import manifest, naming, pack


def setup_game(tmp_path, name="mimlings"):
    game_dir = manifest.ensure_workspace(tmp_path, name)
    m = manifest.Manifest(game_dir)
    return game_dir, m


def make_rotations_png(path, cell=32):
    img = Image.new("RGBA", (cell * 3, cell * 3), (0, 0, 0, 0))
    colors = [(i * 20, 0, 0, 255) for i in range(8)]
    for i in range(8):
        col, row = i % 3, i // 3
        img.paste(colors[i], (col * cell, row * cell, (col + 1) * cell, (row + 1) * cell))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return colors


def make_animation_png(path, cell=32, frames=5, cols=3):
    rows = -(-frames // cols)
    img = Image.new("RGBA", (cell * cols, cell * rows), (0, 0, 0, 0))
    colors = [(0, i * 20, 0, 255) for i in range(frames)]
    for i in range(frames):
        col, row = i % cols, i // cols
        img.paste(colors[i], (col * cell, row * cell, (col + 1) * cell, (row + 1) * cell))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return colors


def add_rotations_entry(m, game_dir, subject="mochi-bunny", status="approved"):
    rel = f"work/{subject}/{subject}-rot8-32.png"
    colors = make_rotations_png(game_dir / rel)
    m.add({
        "id": f"{subject}-rot8-32", "subject": subject, "kind": "rotations",
        "file": rel, "status": status,
        "layout": {"cell": [32, 32], "cols": 3, "rows": 3, "frames": 8, "order": "row-major", "dirs": list(naming.DIRECTIONS)},
        "tags": [], "source": {"tool": "pixellab-web", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    return colors


def add_animation_entry(m, game_dir, subject="mochi-bunny", anim="idle", dir_="s", frames=5, cols=3, status="approved"):
    rel = f"work/{subject}/{subject}-{anim}-{dir_}-32-{frames}f.png"
    colors = make_animation_png(game_dir / rel, frames=frames, cols=cols)
    m.add({
        "id": f"{subject}-{anim}-{dir_}-32-{frames}f", "subject": subject, "kind": "animation",
        "anim": anim, "dir": dir_, "file": rel, "status": status,
        "layout": {"cell": [32, 32], "cols": cols, "rows": -(-frames // cols), "frames": frames, "order": "row-major"},
        "tags": [], "source": {"tool": "pixellab-web", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    return colors


def test_pack_pixel_exactness_and_tag_ranges(tmp_path):
    game_dir, m = setup_game(tmp_path)
    rot_colors = add_rotations_entry(m, game_dir)
    idle_colors = add_animation_entry(m, game_dir, frames=5)
    m.save()

    png_path, json_path = pack.pack(game_dir, m, "mochi-bunny")
    assert png_path == game_dir / "dist" / "mochi-bunny.png"
    assert json_path == game_dir / "dist" / "mochi-bunny.json"

    data = json.loads(json_path.read_text())
    assert len(data["frames"]) == 13
    assert set(data["frames"].keys()) == {str(i) for i in range(13)}

    tags = {t["name"]: (t["from"], t["to"]) for t in data["meta"]["frameTags"]}
    for i, d in enumerate(naming.DIRECTIONS):
        assert tags[f"rot-{d}"] == (i, i)
    assert tags["idle-s"] == (8, 12)

    sheet = Image.open(png_path).convert("RGBA")
    for i in range(8):
        frame = data["frames"][str(i)]["frame"]
        cell = sheet.crop((frame["x"], frame["y"], frame["x"] + frame["w"], frame["y"] + frame["h"]))
        expected = Image.new("RGBA", (32, 32), rot_colors[i])
        assert ImageChops.difference(cell, expected).getbbox() is None

    for i in range(5):
        frame = data["frames"][str(8 + i)]["frame"]
        cell = sheet.crop((frame["x"], frame["y"], frame["x"] + frame["w"], frame["y"] + frame["h"]))
        expected = Image.new("RGBA", (32, 32), idle_colors[i])
        assert ImageChops.difference(cell, expected).getbbox() is None

    # Both source entries got marked packed.
    assert m.find("mochi-bunny-rot8-32")["status"] == "packed"
    assert m.find("mochi-bunny-idle-s-32-5f")["status"] == "packed"


def test_pack_fails_with_nothing_written_on_no_approved_assets(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_rotations_entry(m, game_dir, status="named")
    m.save()
    with pytest.raises(pack.PackError, match="no approved"):
        pack.pack(game_dir, m, "mochi-bunny")
    assert not (game_dir / "dist" / "mochi-bunny.png").exists()


def test_pack_fails_on_mixed_cell_sizes(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_rotations_entry(m, game_dir)  # 32px
    rel = "work/mochi-bunny/mochi-bunny-s-16-face.png"
    (game_dir / rel).parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (16, 16), (1, 2, 3, 255)).save(game_dir / rel)
    m.add({
        "id": "mochi-bunny-s-16-face", "subject": "mochi-bunny", "kind": "sprite", "dir": "s",
        "file": rel, "status": "approved", "tags": [],
        "source": {"tool": "pixellab-web", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    m.save()
    with pytest.raises(pack.PackError, match="mixed cell sizes"):
        pack.pack(game_dir, m, "mochi-bunny")
    assert not (game_dir / "dist" / "mochi-bunny.png").exists()


def test_pack_columns_capped_at_16(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_animation_entry(m, game_dir, anim="long", frames=20, cols=20)
    m.save()
    png_path, json_path = pack.pack(game_dir, m, "mochi-bunny")
    data = json.loads(json_path.read_text())
    assert data["meta"]["size"]["w"] == 16 * 32
    assert data["meta"]["size"]["h"] == 2 * 32  # 20 frames / 16 cols -> 2 rows


def test_pack_sprite_kind_tagged_by_direction(tmp_path):
    game_dir, m = setup_game(tmp_path)
    rel = "work/mochi-bunny/mochi-bunny-n-32-edit.png"
    (game_dir / rel).parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (32, 32), (9, 9, 9, 255)).save(game_dir / rel)
    m.add({
        "id": "mochi-bunny-n-32-edit", "subject": "mochi-bunny", "kind": "sprite", "dir": "n",
        "file": rel, "status": "approved", "tags": [],
        "source": {"tool": "derived", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    m.save()
    png_path, json_path = pack.pack(game_dir, m, "mochi-bunny")
    data = json.loads(json_path.read_text())
    tags = {t["name"]: (t["from"], t["to"]) for t in data["meta"]["frameTags"]}
    assert tags["n"] == (0, 0)


ASEPRITE_BIN = "/Applications/Aseprite.app/Contents/MacOS/aseprite"
REAL_ASEPRITE_SOURCE = "/Volumes/Data/Dropbox/games/otter_game/work/otter/otter-source-v1.aseprite"


@pytest.mark.skipif(
    not (os.path.isfile(ASEPRITE_BIN) and os.path.isfile(REAL_ASEPRITE_SOURCE)),
    reason="Aseprite binary or adopted otter source not present on this machine",
)
def test_pack_real_aseprite_source(tmp_path):
    game_dir, m = setup_game(tmp_path, "otter_game")
    rel = "work/otter/otter-source-v1.aseprite"
    dest = game_dir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    import shutil

    shutil.copy(REAL_ASEPRITE_SOURCE, dest)
    m.add({
        "id": "otter-source-v1", "subject": "otter", "kind": "source",
        "file": rel, "status": "approved", "tags": [],
        "source": {"tool": "aseprite", "original": "Otter_first.aseprite"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    m.save()
    png_path, json_path = pack.pack(game_dir, m, "otter")
    data = json.loads(json_path.read_text())
    assert len(data["frames"]) == 6
    sheet = Image.open(png_path)
    assert sheet.size == (6 * 64, 64)
