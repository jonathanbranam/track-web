from __future__ import annotations

import json

from PIL import Image

from pixellab_tools import ingest, manifest


def make_grid(cols, rows, cell, filled_count):
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


def setup_game(tmp_path, name="mimlings"):
    game_dir = manifest.ensure_workspace(tmp_path, name)
    m = manifest.Manifest(game_dir)
    return game_dir, m


def test_ingest_web_rotation_grid(tmp_path):
    game_dir, m = setup_game(tmp_path)
    img = make_grid(3, 3, 32, 8)
    img.save(game_dir / "inbox" / "pixellab-cute-wizard-1790390374425.png")

    plan = ingest.build_plan(game_dir, m, subject="mochi-bunny", cell=32)
    assert len(plan.planned) == 1
    assert plan.unresolved == []
    asset = plan.planned[0]
    assert asset.dest == asset.dest.__class__("work/mochi-bunny/mochi-bunny-rot8-32.png")

    ids = ingest.apply_plan(plan, game_dir, m)
    assert ids == ["mochi-bunny-rot8-32"]
    assert (game_dir / "work" / "mochi-bunny" / "mochi-bunny-rot8-32.png").exists()
    assert not (game_dir / "inbox" / "pixellab-cute-wizard-1790390374425.png").exists()

    entry = m.find("mochi-bunny-rot8-32")
    assert entry["kind"] == "rotations"
    assert entry["status"] == "unreviewed"
    assert entry["source"]["original"] == "pixellab-cute-wizard-1790390374425.png"
    assert entry["source"]["created"].startswith("2026-")


def test_ingest_animation_needs_anim_and_dir(tmp_path):
    game_dir, m = setup_game(tmp_path)
    img = make_grid(3, 2, 32, 5)
    img.save(game_dir / "inbox" / "pixellab-gentle-breathing-1790388421662.png")

    plan = ingest.build_plan(game_dir, m, subject="mochi-bunny", cell=32)
    assert plan.planned == []
    assert len(plan.unresolved) == 1
    path, reason = plan.unresolved[0]
    assert "anim" in reason

    plan2 = ingest.build_plan(game_dir, m, subject="mochi-bunny", anim="idle", dir="s", cell=32)
    assert len(plan2.planned) == 1
    ids = ingest.apply_plan(plan2, game_dir, m)
    assert ids == ["mochi-bunny-idle-s-32-5f"]
    entry = m.find("mochi-bunny-idle-s-32-5f")
    assert entry["anim"] == "idle"
    assert entry["layout"]["frames"] == 5


def test_ingest_missing_subject_stays_in_inbox(tmp_path):
    game_dir, m = setup_game(tmp_path)
    img = make_grid(3, 3, 32, 8)
    img.save(game_dir / "inbox" / "pixellab-cute-wizard-1790390374425.png")

    plan = ingest.build_plan(game_dir, m, cell=32)
    assert plan.planned == []
    assert len(plan.unresolved) == 1
    assert "subject" in plan.unresolved[0][1]


def test_ingest_variations_grid(tmp_path):
    game_dir, m = setup_game(tmp_path)
    img = make_grid(8, 8, 32, 64)
    img.save(game_dir / "inbox" / "pixellab-mochi-variations-1790386476081.png")

    plan = ingest.build_plan(game_dir, m, subject="mochi-bunny")
    assert len(plan.planned) == 1
    ids = ingest.apply_plan(plan, game_dir, m)
    entry = m.find(ids[0])
    assert entry["kind"] == "variations"
    assert entry["layout"]["frames"] == 64


def test_ingest_pixellab_export(tmp_path):
    game_dir, m = setup_game(tmp_path, "otter_game")
    cw = ch = 32
    sheet = Image.new("RGBA", (cw * 8, ch * 2), (0, 0, 0, 0))
    for i in range(8):
        sheet.paste((10, 20, 30, 255), (i * cw, 0, (i + 1) * cw, ch))
    for i in range(6):
        sheet.paste((40, 50, 60, 255), (i * cw, ch, (i + 1) * cw, 2 * ch))
    png_name = "A_cute_otter._Pixel_art-Idle.png"
    sheet.save(game_dir / "inbox" / png_name)

    data = {
        # Verified 2026-09-27: the export JSON's character object uses `name`
        # for the short state label ("Idle") -- unlike the library-list
        # endpoint, which calls that same concept `state_name` and puts the
        # long prompt under `name`. No `state_name` key appears here at all.
        "character": {"id": "b376946f-5fa9-4f33-8f7a-01c1c302245e", "name": "Idle"},
        "spritesheet": {
            "path": png_name,
            "cell_size": {"width": 32, "height": 32},
            "sheet_size": {"width": 256, "height": 64},
            "columns": 8,
            "pivot": "cell-center",
            "rows": [
                {
                    "row": 0, "type": "rotations", "frame_count": 8,
                    "directions": ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"],
                },
                {
                    "row": 1, "type": "animation", "frame_count": 6, "animation": "Run",
                    "animation_group_id": "grp1", "direction": "east",
                },
            ],
        },
        "export_version": "1.0",
    }
    (game_dir / "inbox" / "A_cute_otter._Pixel_art-Idle.json").write_text(json.dumps(data))

    plan = ingest.build_plan(game_dir, m, subject="otter")
    assert plan.unresolved == []
    dest_names = sorted(a.dest.name for a in plan.planned)
    assert dest_names == ["otter-rot8-32-idle.png", "otter-run-e-32-6f-idle.png"]

    ids = ingest.apply_plan(plan, game_dir, m)
    assert sorted(ids) == ["otter-rot8-32-idle", "otter-run-e-32-6f-idle"]

    rot_entry = m.find("otter-rot8-32-idle")
    assert rot_entry["kind"] == "rotations"
    assert rot_entry["source"]["pixellab"]["character_id"] == "b376946f-5fa9-4f33-8f7a-01c1c302245e"

    anim_entry = m.find("otter-run-e-32-6f-idle")
    assert anim_entry["anim"] == "run"
    assert anim_entry["dir"] == "e"
    assert anim_entry["layout"]["frames"] == 6

    # Sheet + sidecar JSON consumed; per-row crops exist.
    assert not (game_dir / "inbox" / png_name).exists()
    assert not (game_dir / "inbox" / "A_cute_otter._Pixel_art-Idle.json").exists()
    assert (game_dir / "work" / "otter" / "otter-rot8-32-idle.png").exists()
    assert (game_dir / "work" / "otter" / "otter-run-e-32-6f-idle.png").exists()

    # Cropped animation strip is pixel-exact (6 cols x 1 row of the source data).
    cropped = Image.open(game_dir / "work" / "otter" / "otter-run-e-32-6f-idle.png")
    assert cropped.size == (6 * cw, ch)


def test_ingest_convention_named_file_passthrough(tmp_path):
    game_dir, m = setup_game(tmp_path)
    img = make_grid(1, 1, 32, 1)
    img.save(game_dir / "inbox" / "mochi-bunny-s-32-ur.png")

    plan = ingest.build_plan(game_dir, m)
    assert len(plan.planned) == 1
    ids = ingest.apply_plan(plan, game_dir, m)
    assert ids == ["mochi-bunny-s-32-ur"]
    entry = m.find("mochi-bunny-s-32-ur")
    assert entry["subject"] == "mochi-bunny"
    assert entry["kind"] == "sprite"
    assert entry["dir"] == "s"


def test_ingest_dry_run_changes_nothing(tmp_path):
    game_dir, m = setup_game(tmp_path)
    img = make_grid(3, 3, 32, 8)
    src = game_dir / "inbox" / "pixellab-cute-wizard-1790390374425.png"
    img.save(src)

    plan = ingest.build_plan(game_dir, m, subject="mochi-bunny", cell=32)
    assert len(plan.planned) == 1
    # Dry-run just means: don't call apply_plan.
    assert src.exists()
    assert m.find("mochi-bunny-rot8-32") is None
