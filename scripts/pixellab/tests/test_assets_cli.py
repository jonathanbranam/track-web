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
        {"id": "a", "subject": "mochi-bunny", "kind": "sprite", "status": "unreviewed"},
        {"id": "b", "subject": "mochi-bunny", "kind": "sprite", "status": "approved"},
        {"id": "c", "subject": "otter", "kind": "sprite", "status": "candidate"},
    ])
    code, output = run_assets(["status", "mimlings", "--json"], env)
    assert code == 0
    data = json.loads(output)
    assert data["counts"] == {"unreviewed": 1, "approved": 1, "candidate": 1}
    assert set(data["waiting_for_review"]) == {"a", "c"}


def test_status_reference_counted_but_not_waiting(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [
        {"id": "shot-1", "subject": "thronglets", "kind": "reference", "status": "reference"},
        {"id": "shot-2", "subject": "thronglets", "kind": "reference", "status": "reference"},
        {"id": "shot-3", "subject": "thronglets", "kind": "reference", "status": "reference"},
        {"id": "shot-4", "subject": "thronglets", "kind": "reference", "status": "reference"},
        {"id": "shot-5", "subject": "thronglets", "kind": "reference", "status": "reference"},
        {"id": "a", "subject": "mochi-bunny", "kind": "sprite", "status": "unreviewed"},
    ])
    code, output = run_assets(["status", "mimlings", "--json"], env)
    assert code == 0
    data = json.loads(output)
    assert data["counts"] == {"reference": 5, "unreviewed": 1}
    assert data["waiting_for_review"] == ["a"]

    code, human_output = run_assets(["status", "mimlings"], env)
    assert code == 0
    assert "reference: 5" in human_output
    assert "waiting for review (1):" in human_output
    assert "shot-1" not in human_output


def test_status_human_lists_waiting_by_subject(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [
        {"id": "mochi-bunny-idle-s-32-5f", "subject": "mochi-bunny", "kind": "animation", "status": "unreviewed"},
    ])
    code, output = run_assets(["status", "mimlings"], env)
    assert code == 0
    assert "mochi-bunny" in output
    assert "mochi-bunny-idle-s-32-5f" in output


def test_status_no_game_summarises_all(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"}])
    make_game(tmp_path, "otter_game", [{"id": "b", "subject": "y", "kind": "sprite", "status": "approved"}])
    code, output = run_assets(["status", "--json"], env)
    assert code == 0
    data = json.loads(output)
    assert set(data["games"].keys()) == {"mimlings", "otter_game"}
    assert data["games"]["mimlings"]["counts"] == {"unreviewed": 1}


def test_unknown_game_fails_with_suggestion_and_creates_nothing(tmp_path, capsys):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [])
    make_game(tmp_path, "otter_game", [])
    for argv in (
        ["status", "otter-game"],
        ["review", "otter-game", "--serve", "--port", "0"],
        ["mark", "otter-game", "a", "approved"],
    ):
        code, _ = run_assets(argv, env)
        err = capsys.readouterr().err
        assert code == 1, argv
        assert 'Did you mean "otter_game"?' in err
        assert "Games: mimlings, otter_game" in err
        assert "npm run assets -- init otter-game" in err
    assert sorted(p.name for p in tmp_path.iterdir()) == ["mimlings", "otter_game"]


def test_existing_folder_without_manifest_gets_layout(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    (tmp_path / "oldgame").mkdir()
    (tmp_path / "oldgame" / "loose.png").write_bytes(b"")
    code, _ = run_assets(["status", "oldgame"], env)
    assert code == 0
    for sub in manifest.STANDARD_SUBDIRS:
        assert (tmp_path / "oldgame" / sub).is_dir()
    assert (tmp_path / "oldgame" / "manifest.yaml").is_file()


def test_init_creates_layout_and_is_idempotent(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    code, out = run_assets(["init", "newgame"], env)
    assert code == 0
    assert "created" in out
    for sub in manifest.STANDARD_SUBDIRS:
        assert (tmp_path / "newgame" / sub).is_dir()
    assert (tmp_path / "newgame" / "manifest.yaml").is_file()
    code, out = run_assets(["init", "newgame", "--json"], env)
    assert code == 0
    assert json.loads(out) == {"game": "newgame", "path": str(tmp_path / "newgame"), "created": False}


def test_init_refuses_near_duplicate_unless_forced(tmp_path, capsys):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "otter_game", [])
    code, _ = run_assets(["init", "Otter-Game"], env)
    assert code == 1
    assert '"otter_game" already exists' in capsys.readouterr().err
    assert not (tmp_path / "Otter-Game").exists()
    code, out = run_assets(["init", "Otter-Game", "--force", "--json"], env)
    assert code == 0
    assert json.loads(out)["created"] is True
    assert (tmp_path / "Otter-Game" / "manifest.yaml").is_file()


def test_mark_legal_transition_writes_history(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"}])
    code, output = run_assets(["mark", "mimlings", "a", "in-review", "--note", "check ears"], env)
    assert code == 0
    m = manifest.Manifest(tmp_path / "mimlings")
    entry = m.find("a")
    assert entry["status"] == "in-review"
    assert entry["history"][-1]["note"] == "check ears"


def test_mark_illegal_transition_fails_and_leaves_manifest(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"}])
    code, output = run_assets(["mark", "mimlings", "a", "shipped"], env)
    assert code == 1
    m = manifest.Manifest(tmp_path / "mimlings")
    assert m.find("a")["status"] == "unreviewed"


def test_mark_force_overrides(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [{"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"}])
    code, _ = run_assets(["mark", "mimlings", "a", "shipped", "--force"], env)
    assert code == 0
    m = manifest.Manifest(tmp_path / "mimlings")
    assert m.find("a")["status"] == "shipped"


def test_mark_multiple_ids(tmp_path):
    env = {"GAME_ASSETS_DIR": str(tmp_path)}
    make_game(tmp_path, "mimlings", [
        {"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"},
        {"id": "b", "subject": "x", "kind": "sprite", "status": "unreviewed"},
    ])
    code, _ = run_assets(["mark", "mimlings", "a", "b", "approved"], env)
    assert code == 0
    m = manifest.Manifest(tmp_path / "mimlings")
    assert m.find("a")["status"] == "approved"
    assert m.find("b")["status"] == "approved"
