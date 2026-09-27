from __future__ import annotations

import io
import json

from pixellab_tools import assets_cli, manifest


def run_assets(argv, env):
    out = io.StringIO()
    code = assets_cli.run(argv, env=env, out=out)
    return code, out.getvalue()


def make_game(tmp_path, name, entries):
    game_dir = manifest.ensure_workspace(tmp_path, name)
    m = manifest.Manifest(game_dir)
    for e in entries:
        m.add(e)
    m.save()
    return game_dir


def test_status_per_status_counts_and_json(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [
        {"id": "a", "subject": "mochi-bunny", "kind": "sprite", "status": "named"},
        {"id": "b", "subject": "mochi-bunny", "kind": "sprite", "status": "approved"},
        {"id": "c", "subject": "otter", "kind": "sprite", "status": "candidate"},
    ])
    code, output = run_assets(["status", "mimlings", "--json"], env)
    assert code == 0
    data = json.loads(output)
    assert data["counts"] == {"named": 1, "approved": 1, "candidate": 1}
    assert set(data["waiting_for_review"]) == {"a", "c"}


def test_status_human_lists_waiting_by_subject(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [
        {"id": "mochi-bunny-idle-s-32-5f", "subject": "mochi-bunny", "kind": "animation", "status": "named"},
    ])
    code, output = run_assets(["status", "mimlings"], env)
    assert code == 0
    assert "mochi-bunny" in output
    assert "mochi-bunny-idle-s-32-5f" in output


def test_status_no_game_summarises_all(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "named"}])
    make_game(tmp_path, "otter_game", [{"id": "b", "subject": "y", "kind": "sprite", "status": "approved"}])
    code, output = run_assets(["status", "--json"], env)
    assert code == 0
    data = json.loads(output)
    assert set(data["games"].keys()) == {"mimlings", "otter_game"}
    assert data["games"]["mimlings"]["counts"] == {"named": 1}


def test_status_creates_workspace_on_first_use(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    code, _ = run_assets(["status", "newgame"], env)
    assert code == 0
    game_dir = tmp_path / "newgame"
    for sub in manifest.STANDARD_SUBDIRS:
        assert (game_dir / sub).is_dir()
    assert (game_dir / "manifest.yaml").is_file()


def test_mark_legal_transition_writes_history(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "named"}])
    code, output = run_assets(["mark", "mimlings", "a", "in-review", "--note", "check ears"], env)
    assert code == 0
    m = manifest.Manifest(tmp_path / "mimlings")
    entry = m.find("a")
    assert entry["status"] == "in-review"
    assert entry["history"][-1]["note"] == "check ears"


def test_mark_illegal_transition_fails_and_leaves_manifest(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "named"}])
    code, output = run_assets(["mark", "mimlings", "a", "shipped"], env)
    assert code == 1
    m = manifest.Manifest(tmp_path / "mimlings")
    assert m.find("a")["status"] == "named"


def test_mark_force_overrides(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "named"}])
    code, _ = run_assets(["mark", "mimlings", "a", "shipped", "--force"], env)
    assert code == 0
    m = manifest.Manifest(tmp_path / "mimlings")
    assert m.find("a")["status"] == "shipped"


def test_mark_multiple_ids(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [
        {"id": "a", "subject": "x", "kind": "sprite", "status": "named"},
        {"id": "b", "subject": "x", "kind": "sprite", "status": "named"},
    ])
    code, _ = run_assets(["mark", "mimlings", "a", "b", "approved"], env)
    assert code == 0
    m = manifest.Manifest(tmp_path / "mimlings")
    assert m.find("a")["status"] == "approved"
    assert m.find("b")["status"] == "approved"
