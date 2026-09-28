from __future__ import annotations

import filecmp
import os

import pytest

from pixellab_tools import adopt, manifest


def write_plan(path, moves):
    import io

    from ruamel.yaml import YAML

    y = YAML()
    buf = io.StringIO()
    y.dump({"moves": moves}, buf)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(buf.getvalue())


def snapshot(root):
    """A comparable snapshot of every file's relative path + content."""
    files = {}
    for dirpath, _dirnames, filenames in os.walk(root):
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root)
            with open(full, "rb") as fh:
                files[rel] = fh.read()
    return files


def test_apply_then_undo_is_byte_identical(tmp_path):
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    src_dir = game_dir / "mb-animations"
    src_dir.mkdir()
    (src_dir / "mb-south.png").write_bytes(b"south-bytes")

    before = snapshot(game_dir)

    plan_path = game_dir / "_migration" / "test-adopt.yaml"
    write_plan(
        plan_path,
        [
            {
                "from": "mb-animations/mb-south.png",
                "to": "work/mochi-bunny/mochi-bunny-s-32.png",
                "entry": {
                    "id": "mochi-bunny-s-32",
                    "subject": "mochi-bunny",
                    "kind": "sprite",
                    "dir": "s",
                    "status": "unreviewed",
                },
            }
        ],
    )

    m = manifest.Manifest(game_dir)
    undo_path = adopt.apply_plan(game_dir, plan_path, m)
    assert (game_dir / "work" / "mochi-bunny" / "mochi-bunny-s-32.png").read_bytes() == b"south-bytes"
    assert not (game_dir / "mb-animations" / "mb-south.png").exists()
    # mb-animations/ is now empty -> removed by cleanup
    assert not (game_dir / "mb-animations").exists()
    assert m.find("mochi-bunny-s-32") is not None

    m2 = manifest.Manifest(game_dir)
    adopt.undo(game_dir, undo_path, m2)

    after = snapshot(game_dir)
    # Ignore the plan/manifest/undo-record files themselves; compare the
    # adopted asset's original location.
    assert after.get(os.path.join("mb-animations", "mb-south.png")) == before.get(
        os.path.join("mb-animations", "mb-south.png")
    )
    assert not (game_dir / "work" / "mochi-bunny" / "mochi-bunny-s-32.png").exists()
    assert manifest.Manifest(game_dir).find("mochi-bunny-s-32") is None


def test_validate_missing_source(tmp_path):
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(plan_path, [{"from": "nope.png", "to": "work/x/nope.png", "entry": {"id": "x", "subject": "x", "kind": "sprite", "status": "unreviewed"}}])
    m = manifest.Manifest(game_dir)
    with pytest.raises(adopt.AdoptError) as excinfo:
        adopt.apply_plan(game_dir, plan_path, m)
    assert any("missing source" in e for e in excinfo.value.errors)
    # Nothing written.
    assert m.find("x") is None


def test_validate_refuses_overwrite(tmp_path):
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    (game_dir / "a.png").write_bytes(b"a")
    (game_dir / "work" / "x").mkdir(parents=True, exist_ok=True)
    (game_dir / "work" / "x" / "b.png").write_bytes(b"existing")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(plan_path, [{"from": "a.png", "to": "work/x/b.png", "entry": {"id": "x", "subject": "x", "kind": "sprite", "status": "unreviewed"}}])
    m = manifest.Manifest(game_dir)
    with pytest.raises(adopt.AdoptError) as excinfo:
        adopt.apply_plan(game_dir, plan_path, m)
    assert any("already exists" in e for e in excinfo.value.errors)
    assert (game_dir / "work" / "x" / "b.png").read_bytes() == b"existing"


def test_validate_stops_before_any_change_on_duplicate_id(tmp_path):
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    (game_dir / "a.png").write_bytes(b"a")
    (game_dir / "b.png").write_bytes(b"b")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(
        plan_path,
        [
            {"from": "a.png", "to": "work/x/a.png", "entry": {"id": "dup", "subject": "x", "kind": "sprite", "status": "unreviewed"}},
            {"from": "b.png", "to": "work/x/b.png", "entry": {"id": "dup", "subject": "x", "kind": "sprite", "status": "unreviewed"}},
        ],
    )
    m = manifest.Manifest(game_dir)
    with pytest.raises(adopt.AdoptError):
        adopt.apply_plan(game_dir, plan_path, m)
    # Nothing moved for either entry.
    assert (game_dir / "a.png").exists()
    assert (game_dir / "b.png").exists()


def test_dry_run_changes_nothing(tmp_path):
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    (game_dir / "a.png").write_bytes(b"a")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(plan_path, [{"from": "a.png", "to": "work/x/a.png", "entry": {"id": "x", "subject": "x", "kind": "sprite", "status": "unreviewed"}}])
    m = manifest.Manifest(game_dir)
    result = adopt.apply_plan(game_dir, plan_path, m, dry_run=True)
    assert result["moves"][0]["to"] == "work/x/a.png"
    assert (game_dir / "a.png").exists()
    assert not (game_dir / "work" / "x" / "a.png").exists()
    assert m.find("x") is None


def test_ds_store_never_blocks_directory_removal(tmp_path):
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    d = game_dir / "old-dir"
    d.mkdir()
    (d / ".DS_Store").write_bytes(b"junk")
    (d / "only.png").write_bytes(b"data")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(plan_path, [{"from": "old-dir/only.png", "to": "work/x/only.png", "entry": {"id": "x", "subject": "x", "kind": "sprite", "status": "unreviewed"}}])
    m = manifest.Manifest(game_dir)
    adopt.apply_plan(game_dir, plan_path, m)
    assert not d.exists()


def test_directory_move_for_reference_set(tmp_path):
    # D2: a ``kind: reference`` entry with no status registers as
    # "reference" (not "unreviewed") -- Manifest.add fills it in.
    game_dir = manifest.ensure_workspace(tmp_path, "otter_game")
    ref_dir = game_dir / "reference art" / "animals"
    ref_dir.mkdir(parents=True)
    (ref_dir / "otter_1.png").write_bytes(b"otter-ref")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(
        plan_path,
        [
            {
                "from": "reference art/animals",
                "to": "reference/animals",
                "entry": {"id": "animals-reference", "subject": "animals", "kind": "reference"},
            }
        ],
    )
    m = manifest.Manifest(game_dir)
    adopt.apply_plan(game_dir, plan_path, m)
    assert (game_dir / "reference" / "animals" / "otter_1.png").read_bytes() == b"otter-ref"
    assert not (game_dir / "reference art").exists()
    assert m.find("animals-reference")["status"] == "reference"


def test_adopt_plan_entry_says_named_is_stored_as_unreviewed(tmp_path):
    # D2: an old adopt plan that still says "named" is normalised the same
    # way D1 migrates a loaded manifest.
    game_dir = manifest.ensure_workspace(tmp_path, "mimlings")
    (game_dir / "a.png").write_bytes(b"a")
    plan_path = game_dir / "_migration" / "p.yaml"
    write_plan(
        plan_path,
        [{"from": "a.png", "to": "work/x/a.png", "entry": {"id": "x", "subject": "x", "kind": "sprite", "status": "named"}}],
    )
    m = manifest.Manifest(game_dir)
    adopt.apply_plan(game_dir, plan_path, m)
    assert m.find("x")["status"] == "unreviewed"
